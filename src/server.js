/* NCGS data service.
 * One set of rules for every copy of the data: the Google Sheet behind the live app,
 * the in-browser copy used by the preview, and the in-memory copy used by the tests.
 * Every row carries a version number, so phones only fetch what changed since they last looked. */
var NCGS = (function () {
  'use strict';

  /* ---------- What is stored ---------- */
  var SCHEMA = {
    members: { key: ['id'], cols: { id: 's', name: 's', full: 's', index: 'n', active: 'b' } },
    courses: { key: ['id'], cols: { id: 's', name: 's', area: 's', about: 's', lat: 'n', lon: 'n', tees: 'j', holes: 'j' } },
    rounds: {
      key: ['id'],
      cols: {
        id: 's', season: 'n', seq: 'n', date: 's', name: 's', course: 's', tee: 's', first_tee: 's', interval: 'n',
        trip: 's', trip_day: 'n', status: 's', source: 's', groups: 'j', kb: 'j', contests: 'j', ph: 'j',
        allowance: 'n', results: 'j', note: 's'
      }
    },
    scores: { key: ['round', 'player', 'hole'], cols: { round: 's', player: 's', hole: 'n', strokes: 'v', by: 's', at: 's' } },
    claims: { key: ['round', 'hole', 'grp'], cols: { round: 's', hole: 'n', grp: 's', player: 's', at: 's' } },
    winners: { key: ['round', 'hole'], cols: { round: 's', hole: 'n', player: 's' } },
    checks: { key: ['round', 'grp', 'nine'], cols: { round: 's', grp: 's', nine: 's', data: 'j', photo: 's' } },
    cards: { key: ['round', 'grp'], cols: { round: 's', grp: 's', at: 's', by: 's', note: 's' } },
    log: { key: ['id'], cols: { id: 's', at: 's', by: 's', action: 's', detail: 's' } },
    settings: { key: ['key'], cols: { key: 's', value: 's' } },
    deleted: { key: ['tbl', 'k'], cols: { tbl: 's', k: 's' } }
  };
  var TABLES = Object.keys(SCHEMA);
  var PLAYER_TABLES = { checks: 1, cards: 1, log: 1 };
  var DEFAULT_PIN = '1234';

  function keyOf(table, row) {
    return SCHEMA[table].key.map(function (k) { return String(row[k]); }).join('|');
  }

  /* Cell text <-> value. Everything is kept as plain text in the sheet so Sheets never
     turns a tee time into a date or "P" into something else. */
  function toCell(type, v) {
    if (v === null || v === undefined) return '';
    if (type === 'j') return JSON.stringify(v);
    if (type === 'b') return v ? 'yes' : 'no';
    return String(v);
  }
  function fromCell(type, c) {
    if (c === '' || c === null || c === undefined) return type === 'b' ? false : null;
    if (Object.prototype.toString.call(c) === '[object Date]') c = Utilities.formatDate(c, 'Europe/Dublin', 'yyyy-MM-dd');
    var s = String(c);
    if (type === 'n') { var n = Number(s); return isFinite(n) ? n : null; }
    if (type === 'b') return /^(yes|true|1|y)$/i.test(s);
    if (type === 'j') { try { return JSON.parse(s); } catch (e) { return null; } }
    if (type === 'v') { if (/^p$/i.test(s)) return 'P'; var m = Number(s); return isFinite(m) && s.trim() !== '' ? m : s; }
    return s;
  }
  function clean(table, row) {
    var out = {};
    var cols = SCHEMA[table].cols;
    Object.keys(cols).forEach(function (c) { out[c] = row[c] === undefined ? null : row[c]; });
    out.ver = row.ver || 0;
    return out;
  }

  /* ---------- Storage: in memory (preview, tests) ---------- */
  function memoryStore(initial, onChange) {
    var data = initial && initial.tables ? JSON.parse(JSON.stringify(initial)) : { tables: {}, ver: 0, pin: DEFAULT_PIN, photos: {} };
    TABLES.forEach(function (t) { data.tables[t] = data.tables[t] || []; });
    data.photos = data.photos || {};
    function save() { if (onChange) onChange(data); }
    return {
      kind: 'memory',
      read: function (t) { return data.tables[t].map(function (r) { return JSON.parse(JSON.stringify(r)); }); },
      upsert: function (t, rows) {
        var idx = {};
        data.tables[t].forEach(function (r, i) { idx[keyOf(t, r)] = i; });
        rows.forEach(function (r) {
          var k = keyOf(t, r);
          var row = JSON.parse(JSON.stringify(r));
          if (idx[k] !== undefined) data.tables[t][idx[k]] = row;
          else { idx[k] = data.tables[t].length; data.tables[t].push(row); }
        });
        save();
      },
      remove: function (t, keys) {
        var drop = {};
        keys.forEach(function (k) { drop[k] = 1; });
        data.tables[t] = data.tables[t].filter(function (r) { return !drop[keyOf(t, r)]; });
        save();
      },
      getVer: function () { return data.ver; },
      setVer: function (v) { data.ver = v; save(); },
      getPin: function () { return data.pin || DEFAULT_PIN; },
      setPin: function (p) { data.pin = p; save(); },
      putPhoto: function (dataUrl) { var id = 'ph' + (Object.keys(data.photos).length + 1) + '-' + Date.now(); data.photos[id] = dataUrl; save(); return id; },
      getPhoto: function (id) { return data.photos[id] || null; },
      lock: function (fn) { return fn(); },
      cacheGet: function () { return null; },
      cachePut: function () {},
      fetchJson: null,
      dump: function () { return data; }
    };
  }

  /* ---------- Storage: Google Sheet (the live app) ---------- */
  function sheetStore(ss, props, cache, lockSvc, folder) {
    var sheets = {};
    function sheet(t) {
      if (sheets[t]) return sheets[t];
      var sh = ss.getSheetByName(t);
      var head = Object.keys(SCHEMA[t].cols).concat(['ver']);
      if (!sh) {
        sh = ss.insertSheet(t);
        sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
        sh.setFrozenRows(1);
        sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
      }
      sheets[t] = sh;
      return sh;
    }
    function head(t) { return Object.keys(SCHEMA[t].cols).concat(['ver']); }
    function readRaw(t) {
      var sh = sheet(t);
      var last = sh.getLastRow();
      if (last < 2) return [];
      return sh.getRange(2, 1, last - 1, head(t).length).getValues();
    }
    function toRow(t, vals) {
      var cols = SCHEMA[t].cols;
      var o = {};
      head(t).forEach(function (c, i) { o[c] = c === 'ver' ? (Number(vals[i]) || 0) : fromCell(cols[c], vals[i]); });
      return o;
    }
    function toVals(t, row) {
      var cols = SCHEMA[t].cols;
      return head(t).map(function (c) { return c === 'ver' ? String(row.ver || 0) : toCell(cols[c], row[c]); });
    }
    return {
      kind: 'sheet',
      read: function (t) {
        return readRaw(t).filter(function (v) { return v.join('') !== ''; }).map(function (v) { return toRow(t, v); });
      },
      upsert: function (t, rows) {
        if (!rows.length) return;
        var sh = sheet(t);
        var raw = readRaw(t);
        var idx = {};
        raw.forEach(function (v, i) { idx[keyOf(t, toRow(t, v))] = i; });
        var fresh = [];
        rows.forEach(function (r) {
          var k = keyOf(t, r);
          if (idx[k] !== undefined) sh.getRange(idx[k] + 2, 1, 1, head(t).length).setNumberFormat('@').setValues([toVals(t, r)]);
          else { idx[k] = raw.length + fresh.length; fresh.push(toVals(t, r)); }
        });
        if (fresh.length) {
          var start = Math.max(sh.getLastRow(), 1) + 1;
          var need = start + fresh.length - 1 - sh.getMaxRows();
          if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need + 200);
          sh.getRange(start, 1, fresh.length, head(t).length).setNumberFormat('@').setValues(fresh);
        }
      },
      remove: function (t, keys) {
        var sh = sheet(t);
        var raw = readRaw(t);
        var drop = {};
        keys.forEach(function (k) { drop[k] = 1; });
        for (var i = raw.length - 1; i >= 0; i--) if (drop[keyOf(t, toRow(t, raw[i]))]) sh.deleteRow(i + 2);
      },
      getVer: function () { return Number(props.getProperty('VER') || 0); },
      setVer: function (v) { props.setProperty('VER', String(v)); cache.put('VER', String(v), 21600); },
      getPin: function () { return props.getProperty('PIN') || DEFAULT_PIN; },
      setPin: function (p) { props.setProperty('PIN', String(p)); },
      putPhoto: function (dataUrl) {
        var m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
        var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'card-' + Date.now() + '.jpg');
        return folder().createFile(blob).getId();
      },
      getPhoto: function (id) {
        var b = DriveApp.getFileById(id).getBlob();
        return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
      },
      lock: function (fn) {
        var l = lockSvc.getScriptLock();
        l.waitLock(20000);
        try { return fn(); } finally { l.releaseLock(); }
      },
      cacheGet: function (k) { return cache.get(k); },
      cachePut: function (k, v, s) { try { cache.put(k, v, s || 600); } catch (e) { /* too big to cache */ } },
      fetchJson: function (url) { return JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText()); }
    };
  }

  /* ---------- The service ---------- */
  function createServer(store, opts) {
    opts = opts || {};
    var now = opts.now || function () { return new Date().toISOString(); };

    function err(code, message) { var e = new Error(message || code); e.code = code; return e; }
    // The new version is only published (commit) after its rows are written, so a poll never skips them.
    function bump() { return store.getVer() + 1; }
    function commit(v) { store.setVer(v); return v; }
    function pinOk(pin) { return pin !== undefined && pin !== null && String(pin) === String(store.getPin()); }
    function stamp(t, rows, v) { return rows.map(function (r) { var c = clean(t, r); c.ver = v; return c; }); }
    function logRow(v, by, action, detail) {
      return { id: 'L' + v + '-' + Math.random().toString(36).slice(2, 7), at: now(), by: by || '', action: action, detail: detail || '' };
    }
    function find(t, pred) { var rows = store.read(t); for (var i = 0; i < rows.length; i++) if (pred(rows[i])) return rows[i]; return null; }

    var ops = {};

    ops.load = function () {
      var tables = {};
      TABLES.forEach(function (t) { tables[t] = store.read(t); });
      return { ver: store.getVer(), tables: tables };
    };

    ops.since = function (req) {
      var v = Number(req.v || 0);
      var cached = store.cacheGet('VER');
      var cur = cached !== null && cached !== undefined ? Number(cached) : store.getVer();
      if (v >= cur) return { ver: cur, same: true };
      var tables = {};
      TABLES.forEach(function (t) {
        var rows = store.read(t).filter(function (r) { return (r.ver || 0) > v; });
        if (rows.length) tables[t] = rows;
      });
      return { ver: cur, tables: tables };
    };

    ops.checkPin = function (req) { return { ok: pinOk(req.pin) }; };

    ops.setPin = function (req) {
      if (!pinOk(req.pin)) throw err('pin', 'That PIN did not match.');
      if (!/^\d{4,8}$/.test(String(req.newPin || ''))) throw err('bad', 'Use 4 to 8 digits.');
      return store.lock(function () {
        store.setPin(String(req.newPin));
        var v = bump();
        store.upsert('log', stamp('log', [logRow(v, 'Organiser', 'Organiser PIN changed', '')], v));
        commit(v);
        return { ok: true, ver: v };
      });
    };

    /* One hole for one group. A score that another phone changed since this phone last saw it
       is not overwritten: it comes back as a conflict for a person to decide. */
    ops.saveHole = function (req) {
      return store.lock(function () {
        var round = find('rounds', function (r) { return r.id === req.round; });
        if (!round) throw err('missing', 'That round no longer exists.');
        var org = pinOk(req.pin);
        if (round.status === 'final') throw err('final', 'This round is final.');
        var starting = round.status === 'upcoming' && round.groups && round.groups.length;
        if (round.status !== 'live' && !starting) throw err('notlive', 'This round has not started.');
        var hole = Number(req.hole);
        var existing = {};
        store.read('scores').forEach(function (s) { if (s.round === req.round && s.hole === hole) existing[s.player] = s.strokes; });
        var conflicts = [];
        var rows = [];
        var clears = [];
        var changes = [];
        Object.keys(req.scores || {}).forEach(function (pid) {
          var want = req.scores[pid].v;
          var base = req.scores[pid].base;
          var cur = existing[pid] === undefined ? null : existing[pid];
          if (cur === want) return;
          if (base !== undefined && cur !== (base === undefined ? null : base) && !req.force) {
            conflicts.push({ player: pid, server: cur, mine: want });
            return;
          }
          if (cur !== null) changes.push({ player: pid, from: cur, to: want === null ? 'cleared' : want });
          if (want === null) clears.push(keyOf('scores', { round: req.round, player: pid, hole: hole }));
          else rows.push({ round: req.round, player: pid, hole: hole, strokes: want, by: req.by || '', at: now() });
        });
        var claimRows = [];
        var claimRemove = [];
        if (req.claim !== undefined) {
          var curClaim = find('claims', function (c) { return c.round === req.round && c.hole === hole && c.grp === req.grp; });
          var wantClaim = req.claim || null;
          if ((curClaim ? curClaim.player : null) !== wantClaim) {
            if (wantClaim) claimRows.push({ round: req.round, hole: hole, grp: req.grp, player: wantClaim, at: now() });
            else if (curClaim) claimRemove.push(keyOf('claims', curClaim));
          }
        }
        if (!rows.length && !clears.length && !claimRows.length && !claimRemove.length) {
          return { ok: true, ver: store.getVer(), conflicts: conflicts, changed: 0 };
        }
        var v = bump();
        if (starting) {
          round.status = 'live';
          store.upsert('rounds', stamp('rounds', [round], v));
          store.upsert('log', stamp('log', [logRow(v, req.by, 'Round started', 'First score saved')], v));
        }
        store.upsert('scores', stamp('scores', rows, v));
        if (clears.length) {
          store.remove('scores', clears);
          store.upsert('deleted', stamp('deleted', clears.map(function (k) { return { tbl: 'scores', k: k }; }), v));
        }
        if (claimRows.length) store.upsert('claims', stamp('claims', claimRows, v));
        if (claimRemove.length) {
          store.remove('claims', claimRemove);
          store.upsert('deleted', stamp('deleted', claimRemove.map(function (k) { return { tbl: 'claims', k: k }; }), v));
        }
        if (changes.length) {
          var names = req.names || {};
          var detail = (req.label || ('Hole ' + hole)) + ': ' + changes.map(function (c) {
            return (names[c.player] || c.player) + ' ' + (c.from === 'P' ? 'picked up' : c.from) + ' → ' + (c.to === 'P' ? 'picked up' : c.to);
          }).join(', ');
          store.upsert('log', stamp('log', [logRow(v, req.by, org ? 'Score corrected' : 'Score changed', detail)], v));
        }
        commit(v);
        return { ok: true, ver: v, conflicts: conflicts, changed: rows.length + clears.length };
      });
    };

    /* Organiser changes (and the few things players may write: card checks, submitted cards, log). */
    ops.put = function (req) {
      var t = req.table;
      if (!SCHEMA[t] || t === 'deleted') throw err('bad', 'Unknown table');
      if (!PLAYER_TABLES[t] && !pinOk(req.pin)) throw err('pin', 'Organiser PIN needed.');
      return store.lock(function () {
        var v = bump();
        store.upsert(t, stamp(t, req.rows || [], v));
        if (req.log) store.upsert('log', stamp('log', [logRow(v, req.log.by || 'Organiser', req.log.action, req.log.detail)], v));
        commit(v);
        return { ok: true, ver: v };
      });
    };

    ops.remove = function (req) {
      var t = req.table;
      if (!SCHEMA[t] || t === 'deleted' || t === 'log') throw err('bad', 'Unknown table');
      if (!pinOk(req.pin)) throw err('pin', 'Organiser PIN needed.');
      return store.lock(function () {
        var v = bump();
        var keys = (req.rows || []).map(function (r) { return keyOf(t, r); });
        store.remove(t, keys);
        store.upsert('deleted', stamp('deleted', keys.map(function (k) { return { tbl: t, k: k }; }), v));
        if (t === 'rounds') {
          // a deleted round takes its scores, claims, winners, checks and cards with it
          ['scores', 'claims', 'winners', 'checks', 'cards'].forEach(function (dt) {
            var gone = store.read(dt).filter(function (r) { return keys.indexOf(String(r.round)) >= 0; }).map(function (r) { return keyOf(dt, r); });
            if (gone.length) {
              store.remove(dt, gone);
              store.upsert('deleted', stamp('deleted', gone.map(function (k) { return { tbl: dt, k: k }; }), v));
            }
          });
        }
        if (req.log) store.upsert('log', stamp('log', [logRow(v, req.log.by || 'Organiser', req.log.action, req.log.detail)], v));
        commit(v);
        return { ok: true, ver: v };
      });
    };

    ops.photoPut = function (req) {
      if (!/^data:image\/(jpeg|png);base64,/.test(String(req.dataUrl || ''))) throw err('bad', 'Not a photo');
      if (String(req.dataUrl).length > 3000000) throw err('bad', 'Photo too large');
      return { id: store.putPhoto(req.dataUrl) };
    };
    ops.photoGet = function (req) { return { dataUrl: store.getPhoto(String(req.id)) }; };

    /* Forecast for a course on a day, from Open-Meteo (free, no key). Cached for an hour. */
    ops.weather = function (req) {
      if (!store.fetchJson) return { days: null };
      var lat = Number(req.lat), lon = Number(req.lon);
      if (!isFinite(lat) || !isFinite(lon)) return { days: null };
      var ck = 'wx:' + lat.toFixed(3) + ',' + lon.toFixed(3);
      var hit = store.cacheGet(ck);
      if (hit) return JSON.parse(hit);
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
        '&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=10';
      var j = store.fetchJson(url);
      var out = { days: j && j.daily ? j.daily : null, hours: j && j.hourly ? j.hourly : null, at: now() };
      store.cachePut(ck, JSON.stringify(out), 3600);
      return out;
    };

    /* Fill an empty store with the society's starting data. */
    ops.seed = function (req) {
      return store.lock(function () {
        var empty = store.read('members').length === 0 && store.read('rounds').length === 0;
        if (!empty && !req.force) return { ok: false, reason: 'not empty' };
        var v = bump();
        TABLES.forEach(function (t) {
          var rows = (req.data && req.data[t]) || [];
          if (rows.length) store.upsert(t, stamp(t, rows, v));
        });
        store.upsert('log', stamp('log', [logRow(v, 'Setup', 'Data loaded', req.note || 'Starting data')], v));
        commit(v);
        return { ok: true, ver: v };
      });
    };

    function api(req) {
      var fn = ops[req && req.op];
      if (!fn) return { error: 'bad', message: 'Unknown request' };
      try { return fn(req); } catch (e) { return { error: e.code || 'server', message: String(e.message || e) }; }
    }
    return { api: api, ops: ops };
  }

  /* ---------- Google Apps Script entry ---------- */
  function appsScript(seed) {
    var props = PropertiesService.getScriptProperties();
    function folder() {
      var id = props.getProperty('PHOTOS');
      if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreate below */ } }
      var f = DriveApp.createFolder('NCGS card photos');
      props.setProperty('PHOTOS', f.getId());
      return f;
    }
    function spreadsheet() {
      var id = props.getProperty('SHEET');
      if (id) return SpreadsheetApp.openById(id);
      var ss = SpreadsheetApp.create('NCGS data');
      props.setProperty('SHEET', ss.getId());
      return ss;
    }
    function server() {
      var ss = spreadsheet();
      return createServer(sheetStore(ss, props, CacheService.getScriptCache(), LockService, folder));
    }
    function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
    return {
      http: function (e) {
        var req = {};
        try {
          if (e && e.postData && e.postData.contents) req = JSON.parse(e.postData.contents);
          else if (e && e.parameter && e.parameter.q) req = JSON.parse(e.parameter.q);
        } catch (x) { return json({ error: 'bad', message: 'Unreadable request' }); }
        if (!req.op) return json({ ok: true, app: 'NCGS', ver: Number(props.getProperty('VER') || 0) });
        return json(server().api(req));
      },
      setup: function () {
        var ss = spreadsheet();
        var s = server();
        TABLES.forEach(function (t) { sheetStore(ss, props, CacheService.getScriptCache(), LockService, folder).read(t); });
        var first = ss.getSheetByName('Sheet1');
        if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
        var r = seed ? s.api({ op: 'seed', data: seed, note: 'NCGS 2026 season from Marbella_2026_Final_Workbook.xlsx' }) : { ok: true };
        folder();
        return { sheet: ss.getUrl(), seeded: r };
      }
    };
  }

  var api = { SCHEMA: SCHEMA, TABLES: TABLES, keyOf: keyOf, memoryStore: memoryStore, sheetStore: sheetStore, createServer: createServer, appsScript: appsScript, toCell: toCell, fromCell: fromCell };
  if (typeof module === 'object' && module.exports) module.exports = api;
  return api;
})();
