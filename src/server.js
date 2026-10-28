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
  // Settings keyed "<kind>:<round id>[:…]" that belong to one round and go when it is deleted.
  var ROUND_SETTINGS = { wd: 1, format: 1, teamshots: 1, pots: 1, draw: 1, drawdev: 1, drawepoch: 1, drawshort: 1, drawpace: 1 };
  var DEFAULT_PIN = '1234';
  // Stamped by build.js with a fingerprint of this file, so the app can tell whether the live server is the latest.
  var BUILD = '__BUILD__';

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
    var cacheMap = {};
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
      setVer: function (v) { data.ver = v; cacheMap.VER = String(v); save(); },
      getPin: function () { return data.pin || DEFAULT_PIN; },
      setPin: function (p) { data.pin = p; save(); },
      putPhoto: function (dataUrl) { var id = 'ph' + (Object.keys(data.photos).length + 1) + '-' + Date.now(); data.photos[id] = dataUrl; save(); return id; },
      getPhoto: function (id) { return data.photos[id] || null; },
      lock: function (fn) { return fn(); },
      cacheGet: function (k) { return Object.prototype.hasOwnProperty.call(cacheMap, k) ? cacheMap[k] : null; },
      cachePut: function (k, v) { cacheMap[k] = v; },
      fetchJson: null,
      backup: function () { return { name: 'in-memory copy', url: '' }; },
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
      fetchJson: function (url) { return JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText()); },
      backup: function () {
        var fid = props.getProperty('BACKUPS'), dir = null;
        if (fid) { try { dir = DriveApp.getFolderById(fid); } catch (e) { dir = null; } }
        if (!dir) { dir = DriveApp.createFolder('NCGS backups'); props.setProperty('BACKUPS', dir.getId()); }
        var name = 'NCGS backup ' + Utilities.formatDate(new Date(), 'Europe/Dublin', 'yyyy-MM-dd HH:mm');
        var copy;
        try {
          /* A fresh spreadsheet holding a copy of every tab. A plain file copy would also copy the script attached to the sheet, which shows up as an "Untitled project". */
          var snap = SpreadsheetApp.create(name);
          ss.getSheets().forEach(function (sh) { sh.copyTo(snap).setName(sh.getName()); });
          var blank = snap.getSheets()[0];
          if (snap.getSheets().length > 1 && blank.getName() !== ss.getSheets()[0].getName()) snap.deleteSheet(blank);
          copy = DriveApp.getFileById(snap.getId());
          copy.moveTo(dir);
        } catch (e) {
          copy = DriveApp.getFileById(ss.getId()).makeCopy(name, dir);
        }
        // keep the newest 14 copies
        var files = [], it = dir.getFiles();
        while (it.hasNext()) files.push(it.next());
        files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
        files.slice(14).forEach(function (f) { f.setTrashed(true); });
        return { name: name, url: copy.getUrl() };
      },
      getSecret: function (k) { return props.getProperty(k); },
      postJson: function (url, headers, body) {
        var r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: headers, payload: JSON.stringify(body), muteHttpExceptions: true });
        var text = r.getContentText(), j = null;
        try { j = JSON.parse(text); } catch (e) { /* not JSON */ }
        return { status: r.getResponseCode(), json: j };
      }
    };
  }


  /* ---------- Rules checker ---------- */
  var ASK_SYSTEM = [
    'You are a golf rules referee. You answer questions about the Rules of Golf as published by the R&A and the USGA, and nothing else. If asked about anything that is not a golf rule, say you only cover the Rules of Golf.',
    'The people asking are experienced club golfers standing on a course, speaking into a phone. Their question comes from voice dictation, so it may be rambling, loosely worded or slightly garbled. Work out the exact situation and answer that, not a generic version of it. If one fact would change the answer (for example whether the ball was putted or chipped onto the green, in play, or in a bunker), do not give both answers: ask the person that one thing first (Kind 1 below), then give one clear ruling.',
    'Before you answer, use the web search tool to read the current official Rules of Golf on randa.org or usga.org, so that you are not relying on memory. Check the exact rule, its wording and any penalty. Check whether the stroke play or match play version matters. Society days are stroke play or Stableford, which the Rules treat as stroke play (Rule 21.1), unless the person says it was match play.',
    'How to answer: reply with ONE JSON object and nothing else (no text before or after it, no code fences). It is one of two kinds.',
    'Kind 1, a question, whenever one missing fact the person has not told you would change the ruling (for example "Did you putt the ball onto the green, or chip it on?" with options "Putted", "Chipped", "Not sure"): {"type":"ask","question":"Is the ball inside red or yellow stakes?","options":[{"label":"Red stakes or line","tag":"red"},{"label":"Yellow stakes or line","tag":"yellow"},{"label":"No stakes, just bushes"},{"label":"Not sure"}]}. 2 to 5 options, each a few words, the last one "Not sure" when that makes sense. "tag" is optional and only "red" or "yellow". Ask at most one question, never when the situation is already clear, and never again once the person has answered one: then give the ruling.',
    'Kind 2, the ruling: {"type":"ruling","topic":"Unplayable ball","rule":"Rule 19","verdict":"1 penalty shot","intro":"Mick picks one of these:","steps":["Drop within **2 club-lengths**, no nearer the hole","Go **back on a line** from the flag through the ball, as far as he likes","Play again from **where he last hit**"],"note":"Count the penalty in Mick\'s score for the hole."}. "verdict" is the answer in a few plain words that can be read out, for example "No penalty" or "1 penalty shot" or "Play it as it lies". "topic" is two or three words. "rule" is the rule number, for example "Rule 11.1". "intro" is one short line leading into the steps and may be left out. "steps" are the things the player does or may choose between, 0 to 4 of them, each one short sentence, with the key words in **bold**; leave "steps" out when the verdict says it all. "note" is one or two short sentences with the reason, the match play difference, or the one thing that would change the answer; it may be left out. Use the player\'s name if they gave one. Mention a Local Rule or Committee decision only if it could change the answer. Keep the whole thing under about 120 words. "quote" is the official wording of that rule, copied word for word from the page you read, at most 600 characters and only the part that decides this case; leave "quote" out unless you copied it exactly from the official page, and never write it from memory.',
    'Never guess. If the rules do not clearly cover it, or you could not find the rule, say so plainly. Never invent a rule number. Treat the search result for the current edition as the authority over anything you remember.'
  ].join('\n');

  /* ---------- The service ---------- */
  function createServer(store, opts) {
    opts = opts || {};
    var now = opts.now || function () { return new Date().toISOString(); };

    function err(code, message) { var e = new Error(message || code); e.code = code; return e; }
    // The new version is only published (commit) after its rows are written, so a poll never skips them.
    function bump() { return store.getVer() + 1; }
    function commit(v) { store.setVer(v); return v; }
    /* The organiser PIN. Ten wrong guesses in ten minutes lock the PIN for everyone until the window passes;
       scoring from a phone never needs the PIN, so a round carries on. */
    var LOCK_AFTER = 10;
    function wrongCount() { return Number(store.cacheGet('pinfail') || 0); }
    function locked() { return wrongCount() >= LOCK_AFTER; }
    function pinOk(pin) {
      if (pin === undefined || pin === null) return false;
      if (locked()) return false;
      if (String(pin) === String(store.getPin())) { if (wrongCount()) store.cachePut('pinfail', '0', 600); return true; }
      store.cachePut('pinfail', String(wrongCount() + 1), 600);
      return false;
    }
    var MAX_CELL = 40000, MAX_ROWS = 400;
    /* Refuses rows that would not fit a sheet cell, are missing their key, or come in huge batches. */
    function checkRows(t, rows) {
      if (!Array.isArray(rows)) throw err('bad', 'Rows expected');
      if (rows.length > MAX_ROWS) throw err('bad', 'Too many rows in one go');
      rows.forEach(function (r) {
        if (!r || typeof r !== 'object' || Array.isArray(r)) throw err('bad', 'Unreadable row');
        SCHEMA[t].key.forEach(function (k) { if (r[k] === undefined || r[k] === null || r[k] === '') throw err('bad', 'A row is missing its ' + k); });
        Object.keys(SCHEMA[t].cols).forEach(function (c) {
          var v = r[c];
          if (v !== undefined && v !== null && toCell(SCHEMA[t].cols[c], v).length > MAX_CELL) throw err('bad', 'That is too long to store');
        });
      });
    }
    function stamp(t, rows, v) { return rows.map(function (r) { var c = clean(t, r); c.ver = v; return c; }); }
    function logRow(v, by, action, detail) {
      return { id: 'L' + v + '-' + Math.random().toString(36).slice(2, 7), at: now(), by: by || '', action: action, detail: detail || '' };
    }
    function find(t, pred) { var rows = store.read(t); for (var i = 0; i < rows.length; i++) if (pred(rows[i])) return rows[i]; return null; }

    var ops = {};

    ops.load = function () {
      var tables = {};
      TABLES.forEach(function (t) { tables[t] = store.read(t); });
      return { ver: store.getVer(), build: BUILD, tables: tables };
    };

    ops.since = function (req) {
      var v = Number(req.v || 0);
      var cached = store.cacheGet('VER');
      var cur = cached !== null && cached !== undefined ? Number(cached) : store.getVer();
      // The cached version expires after 6 h without a save (every morning). Put it back, so only the first poll
      // after that reads Script Properties, not every poll until the next save (structural review H4).
      // Short-lived on purpose: if a save lands between the read and this put, the stale value lasts a minute at most.
      if (cached === null || cached === undefined) store.cachePut('VER', String(cur), 60);
      if (v >= cur) return { ver: cur, same: true, build: BUILD };
      var tables = {};
      TABLES.forEach(function (t) {
        var rows = store.read(t).filter(function (r) { return (r.ver || 0) > v; });
        if (rows.length) tables[t] = rows;
      });
      return { ver: cur, build: BUILD, tables: tables };
    };

    ops.checkPin = function (req) { var ok = pinOk(req.pin); return ok ? { ok: true } : { ok: false, locked: locked() }; };

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
        var hole = Number(req.hole);
        if (req.hole === null || req.hole === '' || typeof req.hole === 'boolean' || !isFinite(hole) || Math.floor(hole) !== hole || hole < 1 || hole > 18) throw err('bad', 'That is not a hole on the course.');
        var grp = (round.groups || []).filter(function (g) { return g.id === req.grp; })[0];
        if (!grp) throw err('bad', 'That group is not in this round.');
        var inGroup = {};
        grp.teams.forEach(function (t) { t.forEach(function (pid) { inGroup[pid] = 1; }); });
        var sc = req.scores && typeof req.scores === 'object' ? req.scores : {};
        Object.keys(sc).forEach(function (pid) {
          if (!inGroup[pid]) throw err('bad', 'That player is not in this group.');
          var w = sc[pid] && sc[pid].v;
          if (w !== null && w !== 'P' && !(typeof w === 'number' && isFinite(w) && Math.floor(w) === w && w >= 1 && w <= 25)) throw err('bad', 'That is not a score.');
        });
        if (round.status === 'final') throw err('final', 'This round is final.');
        var starting = round.status === 'upcoming' && round.groups && round.groups.length;
        if (round.status !== 'live' && !starting) throw err('notlive', 'This round has not started.');
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
          if (base !== undefined && cur !== (base === undefined ? null : base) && !(req.force && org)) {
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
          if (wantClaim && wantClaim !== '_nobody' && !inGroup[wantClaim]) throw err('bad', 'That player is not in this group.');
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
      var org = pinOk(req.pin);
      if (!PLAYER_TABLES[t] && !org) throw err('pin', 'Organiser PIN needed.');
      var rows = req.rows === undefined ? [] : req.rows;
      checkRows(t, rows);
      if (t === 'log' && !org) {
        // a phone may add to the log but never edit it, and never sign as the organiser
        var have = {};
        store.read('log').forEach(function (r) { have[r.id] = 1; });
        rows = rows.filter(function (r) { return !have[r.id]; }).map(function (r) { return Object.assign({}, r, { by: String(r.by) === 'Organiser' ? 'Player' : r.by }); });
        if (!rows.length) return { ok: true, ver: store.getVer() };
      }
      return store.lock(function () {
        var v = bump();
        store.upsert(t, stamp(t, rows, v));
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
        var keys = (req.rows || []).map(function (r) { return keyOf(t, r); });
        // A round with scores is only deleted when the request says so: two taps on the wrong round must not wipe a
        // day's scores (structural review M4). The app sends withScores after saying how many scores go with it.
        if (t === 'rounds' && !req.withScores && store.read('scores').some(function (r) { return keys.indexOf(String(r.round)) >= 0; })) {
          throw err('scores', 'This round has scores. Delete it with its scores only if you mean to.');
        }
        var v = bump();
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
          // ...and the settings that belong to it (withdrawals, scramble format, team shots, pots and the draw), so a
          // new round that happens to get the same id doesn't inherit them (structural review H2).
          var goneSet = store.read('settings').filter(function (r) { var p = String(r.key).split(':'); return ROUND_SETTINGS[p[0]] && keys.indexOf(p[1]) >= 0; }).map(function (r) { return keyOf('settings', r); });
          if (goneSet.length) {
            store.remove('settings', goneSet);
            store.upsert('deleted', stamp('deleted', goneSet.map(function (k) { return { tbl: 'settings', k: k }; }), v));
          }
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

    /* A copy of the whole sheet in Drive, on demand (a daily one can be switched on too). */
    ops.backupNow = function (req) {
      if (!pinOk(req.pin)) throw err('pin', 'Organiser PIN needed.');
      if (!store.backup) throw err('bad', 'Backups are not available here.');
      var b = store.backup();
      return store.lock(function () {
        var v = bump();
        store.upsert('log', stamp('log', [logRow(v, 'Organiser', 'Backup made', b.name)], v));
        commit(v);
        return { ok: true, ver: v, name: b.name, url: b.url };
      });
    };

    /* Put back what has gone missing, from an Export. A row that exists now is never overwritten, so a
       score entered since the backup can never be lost to an old copy. */
    ops.restore = function (req) {
      if (!pinOk(req.pin)) throw err('pin', 'Organiser PIN needed.');
      var tables = req.data && req.data.tables;
      if (!tables || typeof tables !== 'object') throw err('bad', 'That is not an export from this app.');
      var plan = {}, total = 0;
      TABLES.forEach(function (t) {
        if (t === 'deleted' || t === 'log' || !Array.isArray(tables[t])) return;
        var have = {};
        store.read(t).forEach(function (r) { have[keyOf(t, r)] = 1; });
        var rows = [];
        tables[t].forEach(function (r) {
          if (!r || typeof r !== 'object') return;
          if (SCHEMA[t].key.some(function (k) { return r[k] === undefined || r[k] === null || r[k] === ''; })) return;
          if (!have[keyOf(t, r)]) { have[keyOf(t, r)] = 1; rows.push(r); }
        });
        if (rows.length) { plan[t] = rows; total += rows.length; }
      });
      if (!total) return { ok: true, restored: 0, tables: {} };
      return store.lock(function () {
        var v = bump(), counts = {};
        Object.keys(plan).forEach(function (t) { store.upsert(t, stamp(t, plan[t], v)); counts[t] = plan[t].length; });
        store.upsert('log', stamp('log', [logRow(v, 'Organiser', 'Restored from a backup', Object.keys(counts).map(function (t) { return counts[t] + ' ' + t; }).join(', '))], v));
        commit(v);
        return { ok: true, ver: v, restored: total, tables: counts };
      });
    };

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


    /* The checker answers with one JSON card ("ask" a question with tap answers, or a "ruling"). Anything else is passed on as plain text. */
    function cleanStr(x, n) { return typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, n) : ''; }
    function askCard(raw) {
      var a = raw.indexOf('{'), b = raw.lastIndexOf('}');
      if (a < 0 || b <= a) return null;
      var j; try { j = JSON.parse(raw.slice(a, b + 1)); } catch (e) { return null; }
      if (!j || typeof j !== 'object') return null;
      if (j.type === 'ask') {
        var opts = (Array.isArray(j.options) ? j.options : []).map(function (o) {
          var label = cleanStr(o && o.label, 60), c = { label: label };
          if (o && (o.tag === 'red' || o.tag === 'yellow')) c.tag = o.tag;
          return label ? c : null;
        }).filter(Boolean).slice(0, 5);
        var question = cleanStr(j.question, 200);
        return question && opts.length >= 2 ? { type: 'ask', question: question, options: opts } : null;
      }
      if (j.type === 'ruling') {
        var verdict = cleanStr(j.verdict, 120);
        if (!verdict) return null;
        return { type: 'ruling', topic: cleanStr(j.topic, 40), rule: cleanStr(j.rule, 30), verdict: verdict, intro: cleanStr(j.intro, 120),
          steps: (Array.isArray(j.steps) ? j.steps : []).map(function (x) { return cleanStr(x, 220); }).filter(Boolean).slice(0, 4), note: cleanStr(j.note, 300), quote: cleanStr(j.quote, 700) };
      }
      return null;
    }

    /* Rules checker: a question for Claude about the Rules of Golf, checked live against the official R&A / USGA rules.
       The key lives in the script properties (ANTHROPIC_KEY), never in the app. A daily cap stops a runaway bill. */
    ops.ask = function (req) {
      var q = String(req.question || '').trim();
      if (!q) throw err('bad', 'Ask a question first');
      if (q.length > 600) throw err('bad', 'That question is too long. Keep it to a couple of sentences.');
      if (!store.postJson || !store.getSecret) throw err('nokey', 'The rules checker is not switched on yet');
      var key = store.getSecret('ANTHROPIC_KEY');
      if (!key) throw err('nokey', 'The rules checker is not switched on yet');
      var day = now().slice(0, 10), ck = 'ask:' + day;
      var used = Number(store.cacheGet(ck) || 0), cap = Number(store.getSecret('ASK_DAILY_CAP') || 200);
      if (used >= cap) throw err('limit', 'The rules checker has had its fill for today. Try again tomorrow, or ask the organiser.');
      var messages = [];
      (Array.isArray(req.history) ? req.history.slice(-6) : []).forEach(function (m) {
        if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text) messages.push({ role: m.role, content: m.text.slice(0, 2500) });
      });
      while (messages.length && messages[0].role !== 'user') messages.shift();
      messages = messages.filter(function (m, i) { return i === 0 || m.role !== messages[i - 1].role; });
      if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();
      messages.push({ role: 'user', content: q });
      store.cachePut(ck, String(used + 1), 21600);
      var r = store.postJson('https://api.anthropic.com/v1/messages', { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        { model: store.getSecret('ASK_MODEL') || 'claude-sonnet-5-5', max_tokens: 1500, system: ASK_SYSTEM, messages: messages,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4, allowed_domains: ['randa.org', 'usga.org'] }] });
      var blocks = (r && r.json && r.json.content) || [], text = '', sources = [], seen = {}, card = null, last = '';
      blocks.forEach(function (b) {
        if (!b || b.type !== 'text' || !b.text) return;
        text += b.text;
        if (askCard(b.text)) last = b.text;
        (b.citations || []).forEach(function (c) {
          if (c && c.url && !seen[c.url] && /^https:\/\/([a-z0-9-]+\.)*(randa|usga)\.org(\/|$)/i.test(c.url)) { seen[c.url] = 1; sources.push({ url: c.url, title: String(c.title || c.url).slice(0, 120) }); }
        });
      });
      text = text.trim();
      if (!r || r.status !== 200 || !text) throw err('upstream', 'The rules checker could not answer just now. Try again in a minute.');
      card = askCard(last || text);
      return { answer: card ? JSON.stringify(card) : text, card: card, sources: sources.slice(0, 4) };
    };

    /* Fill an empty store with the society's starting data. */
    ops.seed = function (req) {
      return store.lock(function () {
        var empty = store.read('members').length === 0 && store.read('rounds').length === 0;
        if (!empty && !req.force) return { ok: false, reason: 'not empty' };
        if (!empty && !pinOk(req.pin)) throw err('pin', 'Organiser PIN needed.');   // loading over existing data is the organiser's call
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
    /* Google allows 50,000 Script Properties reads a day on a personal account, and every phone polls every 15 s
       during a round (structural review H4). Settings that never change once set (which spreadsheet, whether setup
       has run) are read from the script cache, which has no such daily limit, and only fall back to Properties. */
    var cache = CacheService.getScriptCache();
    function fixedProp(k) {
      var v = cache.get('p:' + k);
      if (v !== null && v !== undefined && v !== '') return v;
      v = props.getProperty(k);
      if (v !== null && v !== undefined && v !== '') { try { cache.put('p:' + k, v, 21600); } catch (e) { /* cache full */ } }
      return v;
    }
    function folder() {
      var id = props.getProperty('PHOTOS');
      if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreate below */ } }
      var f = DriveApp.createFolder('NCGS card photos');
      props.setProperty('PHOTOS', f.getId());
      return f;
    }
    function spreadsheet() {
      var id = fixedProp('SHEET');
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
    function ensureReady() {
      if (!seed || fixedProp('READY')) return;
      var lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        if (!props.getProperty('READY')) { api.setup(); props.setProperty('READY', '1'); }
      } finally { lock.releaseLock(); }
    }
    var api = {
      http: function (e) {
        ensureReady();
        var req = {};
        try {
          if (e && e.postData && e.postData.contents) req = JSON.parse(e.postData.contents);
          else if (e && e.parameter && e.parameter.q) req = JSON.parse(e.parameter.q);
        } catch (x) { return json({ error: 'bad', message: 'Unreadable request' }); }
        // Starting data is only ever loaded by setup(), inside Apps Script, never over the web.
        if (req.op === 'seed') return json({ error: 'bad', message: 'Not available' });
        if (!req.op) return json({ ok: true, app: 'NCGS', build: BUILD, ver: Number(cache.get('VER') || props.getProperty('VER') || 0) });
        return json(server().api(req));
      },
      backup: function () { return sheetStore(spreadsheet(), props, CacheService.getScriptCache(), LockService, folder).backup(); },
      installBackup: function () {
        var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'backup'; });
        if (!has) ScriptApp.newTrigger('backup').timeBased().everyDays(1).atHour(3).create();
        return { daily: true };
      },
      setup: function () {
        var ss = spreadsheet();
        var s = server();
        TABLES.forEach(function (t) { sheetStore(ss, props, CacheService.getScriptCache(), LockService, folder).read(t); });
        var first = ss.getSheetByName('Sheet1');
        if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
        var r = seed ? s.api({ op: 'seed', data: seed, note: 'NCGS 2026 season from Marbella_2026_Final_Workbook.xlsx' }) : { ok: true };
        return { sheet: ss.getUrl(), seeded: r };
      }
    };
    return api;
  }

  var api = { SCHEMA: SCHEMA, TABLES: TABLES, ROUND_SETTINGS: ROUND_SETTINGS, keyOf: keyOf, memoryStore: memoryStore, sheetStore: sheetStore, createServer: createServer, appsScript: appsScript, toCell: toCell, fromCell: fromCell };
  if (typeof module === 'object' && module.exports) module.exports = api;
  return api;
})();
