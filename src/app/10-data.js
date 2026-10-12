/* ---------- Data: one shared copy, kept on every phone ----------
   The phone keeps the last copy it saw, so the app opens instantly and works without signal.
   Changes are applied on the phone at once and queued; the queue is sent when there is signal,
   and never dropped until the server has it. Other phones' changes arrive every few seconds. */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};
const NS = BOOT.mode === 'live' ? 'ncgs' : 'ncgs-preview';
const KEY = { cache: NS + '-cache-v1', outbox: NS + '-outbox-v1', prefs: NS + '-prefs-v1', local: NS + '-server-v1' };
const TABLES = NCGS.TABLES;

const DB = {
  server: LS.get(KEY.cache, null) || { ver: 0, tables: {} },
  outbox: LS.get(KEY.outbox, []),
  prefs: Object.assign({ me: null, drafts: {} }, LS.get(KEY.prefs, {})),
  conflicts: [],
  online: true,
  loaded: false,
  lastSync: 0,
  saveOk: true,
  _view: null,
  _memo: {}
};
TABLES.forEach(t => { DB.server.tables[t] = DB.server.tables[t] || []; });
DB.loaded = DB.server.ver > 0;

const FAILED = {};
function persist(k, v) { const ok = LS.set(KEY[k], v); if (ok) delete FAILED[k]; else FAILED[k] = 1; DB.saveOk = !Object.keys(FAILED).length; return ok; }
function savePrefs() { persist('prefs', DB.prefs); }
function saveOutbox() { persist('outbox', DB.outbox); }
function saveCache() { LS.set(KEY.cache, DB.server); }

/* ----- Talking to the server ----- */
function localServer() {
  let data = LS.get(KEY.local, null);
  const store = NCGS.memoryStore(data, d => LS.set(KEY.local, d));
  if (window.NCGS_TEST_ASK) { store.getSecret = k => (k === 'ANTHROPIC_KEY' ? 'test' : null); store.postJson = (u, h, b) => ({ status: 200, json: { content: [{ type: 'text', text: window.NCGS_TEST_ASK(b) }] } }); }
  const srv = NCGS.createServer(store);
  if (!data) {
    srv.api({ op: 'seed', data: window.NCGS_SEED, note: 'NCGS 2026 season from Marbella_2026_Final_Workbook.xlsx' });
    if (window.NCGS_DEMO) srv.api({ op: 'put', table: 'rounds', rows: window.NCGS_DEMO.rounds, pin: store.getPin(), log: { action: 'Demo round added', detail: 'Preview only' } });
    if (window.NCGS_DEMO) srv.api({ op: 'put', table: 'claims', rows: window.NCGS_DEMO.claims, pin: store.getPin() });
    if (window.NCGS_DEMO) window.NCGS_DEMO.holes.forEach(h => srv.api(h));
  }
  return srv;
}
function call(req) {
  if (BOOT.mode === 'live') {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    return fetch(BOOT.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req), redirect: 'follow', cache: 'no-store', signal: ctl.signal })
      .then(r => { if (!r.ok) throw Object.assign(new Error('http ' + r.status), { net: true }); return r.json(); })
      .catch(e => { if (e && e.net === undefined) e.net = true; throw e; })
      .finally(() => clearTimeout(timer));
  }
  return new Promise(res => setTimeout(() => res(clone(localServer().api(clone(req)))), 60));
}

/* ----- The phone's view: the server copy plus anything still waiting to be sent ----- */
function rowKey(t, r) { return NCGS.keyOf(t, r); }
function upsertRows(tables, t, rows) {
  const list = tables[t];
  const idx = {};
  list.forEach((r, i) => { idx[rowKey(t, r)] = i; });
  rows.forEach(r => { const k = rowKey(t, r); if (idx[k] !== undefined) list[idx[k]] = Object.assign({}, list[idx[k]], r); else { idx[k] = list.length; list.push(r); } });
}
function removeKeys(tables, t, keys) {
  const drop = new Set(keys);
  tables[t] = tables[t].filter(r => !drop.has(rowKey(t, r)));
}
function applyLocal(tables, req) {
  if (req.op === 'saveHole') {
    const pids = Object.keys(req.scores || {});
    const rows = pids.filter(pid => req.scores[pid].v !== null).map(pid => ({ round: req.round, player: pid, hole: Number(req.hole), strokes: req.scores[pid].v, by: req.by, at: '' }));
    removeKeys(tables, 'scores', pids.filter(pid => req.scores[pid].v === null).map(pid => rowKey('scores', { round: req.round, player: pid, hole: Number(req.hole) })));
    upsertRows(tables, 'scores', rows);
    if (req.claim !== undefined) {
      const k = rowKey('claims', { round: req.round, hole: Number(req.hole), grp: req.grp });
      removeKeys(tables, 'claims', [k]);
      if (req.claim) upsertRows(tables, 'claims', [{ round: req.round, hole: Number(req.hole), grp: req.grp, player: req.claim, at: new Date().toISOString() }]);
    }
    const r = tables.rounds.find(x => x.id === req.round);
    if (r && r.status === 'upcoming') r.status = 'live';
  } else if (req.op === 'put') {
    upsertRows(tables, req.table, req.rows);
  } else if (req.op === 'remove') {
    const keys = req.rows.map(r => rowKey(req.table, r));
    removeKeys(tables, req.table, keys);
    if (req.table === 'rounds') ['scores', 'claims', 'winners', 'checks', 'cards'].forEach(t => { tables[t] = tables[t].filter(r => !keys.includes(String(r.round))); });
  }
}
function view() {
  if (DB._view) return DB._view;
  const t = clone(DB.server.tables);
  DB.outbox.forEach(item => applyLocal(t, item.req));
  DB._view = t;
  DB._memo = {};
  return t;
}
function changed() { DB._view = null; DB._memo = {}; }
function memo(key, fn) { view(); if (!(key in DB._memo)) DB._memo[key] = fn(); return DB._memo[key]; }

function merge(resp, full) {
  if (!resp || resp.same) { if (resp) DB.server.ver = resp.ver; return false; }
  if (full) {
    TABLES.forEach(t => { resp.tables[t] = resp.tables[t] || []; });
    DB.server.tables = resp.tables; DB.server.ver = resp.ver; saveCache(); changed(); return true;
  }
  // Deletions first, and never remove a row that was re-created after the deletion.
  (resp.tables.deleted || []).forEach(d => {
    if (DB.server.tables[d.tbl]) DB.server.tables[d.tbl] = DB.server.tables[d.tbl].filter(r => rowKey(d.tbl, r) !== d.k || (r.ver || 0) > (d.ver || 0));
  });
  Object.keys(resp.tables || {}).forEach(t => {
    if (t === 'deleted') return;
    const fresh = resp.tables[t].filter(r => !(resp.tables.deleted || []).some(d => d.tbl === t && d.k === rowKey(t, r) && (d.ver || 0) > (r.ver || 0)));
    upsertRows(DB.server.tables, t, fresh);
  });
  DB.server.ver = resp.ver;
  saveCache();
  changed();
  return true;
}

let syncing = null;
function sync() {
  if (syncing) return syncing;
  const full = !DB.server.ver;
  const req = full ? { op: 'load' } : { op: 'since', v: DB.server.ver };
  syncing = call(req).then(resp => {
    syncing = null;
    if (resp.error) { DB.online = true; return; }
    DB.online = true;
    DB.lastSync = Date.now();
    const was = DB.loaded;
    DB.loaded = true;
    if (merge(resp, full) || !was) render();
  }).catch(() => { syncing = null; DB.online = false; DB.lastSync = Date.now(); render(); });
  return syncing;
}

let flushing = false;
let retryTimer = null;
/* Errors that mean "try again later" (server busy, lock timeout) keep the change queued.
   Errors that mean "never" (round finalised or deleted, bad PIN) move it to a kept list so it is not lost silently. */
const RETRY_ERRORS = { server: 1 };
function reject(item, resp) {
  DB.prefs.rejected = (DB.prefs.rejected || []).concat([{ req: item.req, error: resp.error, message: resp.message || '', at: new Date().toISOString() }]).slice(-50);
  savePrefs();
}
async function flush() {
  if (flushing || !DB.outbox.length) return;
  flushing = true;
  let sent = 0;
  try {
    while (DB.outbox.length) {
      const item = DB.outbox[0];
      let resp;
      try { resp = await call(item.req); } catch (e) { resp = null; }
      if (!resp || (resp.error && RETRY_ERRORS[resp.error])) {
        DB.online = !!resp;
        item.tries = (item.tries || 0) + 1;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(flush, Math.min(30000, 4000 * (1 + item.tries)));
        break;
      }
      DB.online = true;
      DB.outbox.shift();
      saveOutbox();
      sent += 1;
      if (resp.error) {
        if (resp.error !== 'pin') reject(item, resp);
        toast(resp.error === 'pin' ? 'Organiser PIN needed for that' : resp.error === 'final' ? 'That round is final, so that score was not saved' : resp.message || 'That change was not saved');
      } else if (resp.conflicts && resp.conflicts.length) {
        resp.conflicts.forEach(c => DB.conflicts.push({ round: item.req.round, grp: item.req.grp, hole: Number(item.req.hole), player: c.player, server: c.server, mine: c.mine }));
        tick();
      }
      try { if (item.done) item.done(resp); } catch (e) { /* a screen callback must not stop the queue */ }
    }
  } finally {
    flushing = false;
    changed();
  }
  if (sent) { await sync(); render(); }
}

function send(req, done) {
  DB.outbox.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), req, done });
  saveOutbox();
  changed();
  flush();
}
/* Organiser writes carry the PIN typed this session. */
const ORGPIN = { pin: null };
function put(table, rows, log) { send({ op: 'put', table, rows, pin: ORGPIN.pin, log }); }
function removeRows(table, rows, log) { send({ op: 'remove', table, rows, pin: ORGPIN.pin, log }); }

/* ----- Reading the data ----- */
const D = {
  members: () => memo('members', () => view().members.slice().sort((a, b) => a.name.localeCompare(b.name))),
  active: () => D.members().filter(m => m.active !== false),
  member: id => view().members.find(m => m.id === id) || null,
  nameOf: id => (D.member(id) || { name: id || '' }).name,
  courses: () => view().courses.slice().sort((a, b) => a.name.localeCompare(b.name)),
  course: id => view().courses.find(c => c.id === id) || null,
  rounds: () => memo('rounds', () => view().rounds.slice().sort((a, b) => (a.season || 0) - (b.season || 0) || (a.seq || 0) - (b.seq || 0) || String(a.date || '').localeCompare(String(b.date || '')))),
  round: id => view().rounds.find(r => r.id === id) || null,
  setting: (k, d) => { const s = view().settings.find(x => x.key === k); return s && s.value !== null && s.value !== '' ? s.value : d; },
  scores: rid => memo('sc:' + rid, () => {
    const out = {};
    view().scores.forEach(s => { if (s.round === rid) (out[s.player] = out[s.player] || {})[s.hole] = s.strokes; });
    return out;
  }),
  claims: rid => memo('cl:' + rid, () => {
    const out = {};
    view().claims.filter(c => c.round === rid).sort((a, b) => String(a.at).localeCompare(String(b.at)))
      .forEach(c => (out[c.hole] = out[c.hole] || []).push({ pid: c.player, gid: c.grp, at: c.at }));
    return out;
  }),
  winners: rid => memo('wn:' + rid, () => Object.fromEntries(view().winners.filter(w => w.round === rid).map(w => [w.hole, w.player]))),
  check: (rid, gid, nine) => { const c = view().checks.find(x => x.round === rid && x.grp === gid && x.nine === nine); return c ? Object.assign({}, c.data || {}, { photo: c.photo }) : null; },
  card: (rid, gid) => view().cards.find(x => x.round === rid && x.grp === gid) || null,
  log: () => view().log.slice().sort((a, b) => String(b.at).localeCompare(String(a.at))),
  society: () => D.setting('society', 'NCGS'),
  goyBest: () => Number(D.setting('goy_best', 3)) || 3,
  allowance: () => { const a = Number(D.setting('allowance', 1)); return isFinite(a) && a > 0 ? a : 1; }
};

/* ----- Rounds ----- */
const isDemo = r => r && r.source === 'demo';
const courseOf = r => (r ? D.course(r.course) : null);
function teeOf(r) {
  const c = courseOf(r);
  if (!c || !c.tees || !r.tee || !c.tees[r.tee]) return null;
  const t = Object.assign({}, c.tees[r.tee]);
  if (c.holes && c.holes.length === 18) t.par = c.holes.reduce((s, h) => s + h.par, 0);
  return t;
}
function holesOf(r) {
  const c = courseOf(r);
  return c && c.holes && c.holes.length === 18 ? c.holes.map(h => Object.assign({}, h, { yards: h.m ? E.metresToYards(h.m) : null })) : null;
}
const canScore = r => !!(r && holesOf(r) && teeOf(r) && r.groups && r.groups.length);
const allowanceOf = r => (r && r.allowance ? r.allowance : D.allowance());
const roundName = r => r.name || (courseOf(r) || {}).name || 'Round';
function roundWhen(r) {
  const bits = [];
  if (r.date) bits.push(fmtDate(r.date));
  if (r.trip) bits.push(`${r.trip}${r.trip_day ? ' day ' + r.trip_day : ''}`);
  return bits.join(' · ');
}
function roundWhenShort(r) {
  const bits = [];
  if (r.trip) bits.push(r.trip);
  if (r.date) bits.push(fmtDate(r.date, true));
  return bits.join(' · ');
}
function computeR(rid) {
  return memo('comp:' + rid, () => {
    const r = D.round(rid);
    if (!canScore(r)) return null;
    const players = {};
    r.groups.forEach(g => g.teams.flat().forEach(pid => { const m = D.member(pid) || { id: pid, name: pid, index: 0 }; players[pid] = m; }));
    return E.computeRound({ groups: r.groups, holes: holesOf(r), tee: teeOf(r), allowance: allowanceOf(r), players, scores: D.scores(rid), phOverride: r.ph });
  });
}
const hasCards = r => r && r.source !== 'imported' && canScore(r);
const liveRid = () => { const r = D.rounds().find(x => x.status === 'live'); return r ? r.id : null; };
const upcoming = () => D.rounds().filter(r => r.status === 'upcoming').sort((a, b) => String(a.date || '9').localeCompare(String(b.date || '9')));
function myGroup(rid) {
  const r = D.round(rid);
  return r && r.groups ? r.groups.find(g => g.teams.flat().includes(DB.prefs.me)) || null : null;
}
function groupNo(rid, gid) { const r = D.round(rid); const g = r && r.groups ? r.groups.find(x => x.id === gid) : null; return g ? g.n : '?'; }
function contestOn(rid, n) { const r = D.round(rid); return ((r && r.contests) || []).find(c => c.hole === n) || null; }
function claimLeader(rid, n, exceptGid) {
  const list = (D.claims(rid)[n] || []).filter(c => c.gid !== exceptGid);
  return list.length ? list[list.length - 1] : null;
}

/* Results for any finished round. Imported rounds keep the order they came with. */
function resultsOf(rid) {
  return memo('res:' + rid, () => {
    const r = D.round(rid);
    if (!r) return null;
    if (r.source === 'imported' && r.results) {
      const order = r.results.order || [];
      let rows;
      if (r.results.ordered) rows = order.map(([id, total], i) => ({ id, name: D.nameOf(id), total, pos: i + 1, posLabel: String(i + 1) }));
      else rows = E.rankRows(order.map(([id, total]) => ({ id, name: D.nameOf(id), total })), 'total', 'desc');
      const kb = (r.results.kb || []).map(([a, b, total], i) => ({ pair: [a, b], name: `${D.nameOf(a)} & ${D.nameOf(b)}`, total, posLabel: String(i + 1) }));
      const c = r.results.contests || {};
      const contests = [];
      if (c.ntp !== undefined) contests.push({ type: 'ntp', hole: null, winner: c.ntp });
      if (c.ld !== undefined) contests.push({ type: 'ld', hole: null, winner: c.ld });
      return { rows, kb, contests, source: r.results.ordered ? 'recorded' : 'sheet' };
    }
    const comp = computeR(rid);
    if (!comp) return { rows: [], kb: [], contests: [] };
    const final = r.status === 'final';
    const rows = final ? E.finalOrder(comp) : comp.leaderboard;
    const kb = r.kb && r.kb.length ? E.kbStandings(comp, r.kb) : [];
    const wins = D.winners(rid);
    const contests = (r.contests || []).map(c => ({ type: c.type, hole: c.hole, winner: wins[c.hole] || null, lead: wins[c.hole] ? null : claimLeader(rid, c.hole, null) }));
    return { rows, kb, contests, comp, source: 'app' };
  });
}
/* Each player's Stableford points in a round, for Golfer of the Year and player pages. */
function pointsOf(rid) {
  const res = resultsOf(rid);
  return res ? Object.fromEntries(res.rows.map(x => [x.id, x.total])) : {};
}
/* The season on show: the latest one with a finished round (a round booked for next year does not move it on). */
const seasonOf = () => { const s = D.rounds().filter(r => r.season && !isDemo(r) && r.status !== 'upcoming').map(r => r.season); return s.length ? Math.max(...s) : new Date().getFullYear(); };
const seasonRounds = season => D.rounds().filter(r => r.season === season && !isDemo(r));
/* Every season that has results, newest first; and the one being looked at (the current season unless a year was picked). */
const seasonsList = () => [...new Set(D.rounds().filter(r => r.season && !isDemo(r) && (r.status === 'final' || r.status === 'live')).map(r => r.season))].sort((a, b) => b - a);
const yearOn = () => (UI.year && seasonsList().includes(UI.year) ? UI.year : seasonOf());
// A row of years, only once there is more than one season to choose between.
const yearPicker = () => {
  const ys = seasonsList();
  if (ys.length < 2) return '';
  return `<div class="seg year" role="group" aria-label="Year">${ys.map(y => `<button class="${y === yearOn() ? 'on' : ''}" data-act="year" data-y="${y}" aria-pressed="${y === yearOn()}">${y}</button>`).join('')}</div>`;
};
function goy(season) {
  return memo('goy:' + season, () => {
    const done = seasonRounds(season).filter(r => r.status === 'final');
    return E.goyStandings(view().members, done.map(r => ({ rid: r.id, scores: pointsOf(r.id) })), D.goyBest());
  });
}

/* ----- Writing ----- */
const byMe = () => D.nameOf(DB.prefs.me) || 'Someone';
function logEntry(action, detail) { put('log', [{ id: 'C' + Date.now() + Math.random().toString(36).slice(2, 5), at: new Date().toISOString(), by: ORGPIN.pin && UI.org ? 'Organiser' : byMe(), action, detail }]); }
