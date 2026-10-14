const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../src/server.js');

/* A small stand-in for Google Sheets, enough to run the real sheet storage code. */
function fakeSpreadsheet() {
  const sheets = {};
  function makeSheet(name) {
    const cells = []; // rows of strings
    const sh = {
      name,
      cells,
      getLastRow: () => { let n = cells.length; while (n > 0 && (cells[n - 1] || []).every(c => c === '' || c === undefined)) n--; return n; },
      max: 1000,
      getMaxRows() { return sh.max; },
      insertRowsAfter(after, n) { sh.max += n; },
      setFrozenRows: () => {},
      deleteRow: r => { cells.splice(r - 1, 1); },
      getRange: (r, c, nr, nc) => ({
        setValues(vals) { if (r - 1 + vals.length > sh.max) throw new Error('out of bounds'); vals.forEach((row, i) => { cells[r - 1 + i] = cells[r - 1 + i] || []; row.forEach((v, j) => { cells[r - 1 + i][c - 1 + j] = String(v); }); }); return this; },
        getValues() { return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((cells[r - 1 + i] || [])[c - 1 + j] ?? ''))); },
        setNumberFormat() { return this; },
        setFontWeight() { return this; }
      })
    };
    return sh;
  }
  return {
    sheets,
    getSheetByName: n => sheets[n] || null,
    insertSheet: n => (sheets[n] = makeSheet(n))
  };
}
const fakeProps = () => { const m = {}; return { getProperty: k => (k in m ? m[k] : null), setProperty: (k, v) => { m[k] = v; } }; };
const fakeCache = () => { const m = {}; return { get: k => (k in m ? m[k] : null), put: (k, v) => { m[k] = v; } }; };
const fakeLock = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };

const ROUND = { id: 'r9', season: 2027, seq: 1, course: 'cab', tee: 'yellow', status: 'live', groups: [{ id: 'g1', n: 1, teams: [['a', 'b'], ['c', 'd']] }], contests: [{ type: 'ntp', hole: 7 }] };

function servers() {
  const ss = fakeSpreadsheet();
  const sheet = N.createServer(N.sheetStore(ss, fakeProps(), fakeCache(), fakeLock, () => null));
  const mem = N.createServer(N.memoryStore());
  return { ss, list: [['sheet', sheet], ['memory', mem]] };
}

test('both stores: seed, load and fetch only what changed', () => {
  for (const [kind, s] of servers().list) {
    const r = s.api({ op: 'seed', data: { members: [{ id: 'a', name: 'Al', index: 12.4, active: true }], rounds: [ROUND] } });
    assert.equal(r.ok, true, kind);
    const all = s.api({ op: 'load' });
    assert.equal(all.tables.members[0].index, 12.4, kind);
    assert.equal(all.tables.members[0].active, true, kind);
    assert.deepEqual(all.tables.rounds[0].groups, ROUND.groups, kind);
    assert.equal(s.api({ op: 'since', v: all.ver }).same, true, kind);
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 1, scores: { a: { v: 5, base: null }, b: { v: 'P', base: null } }, by: 'Al' });
    const d = s.api({ op: 'since', v: all.ver });
    assert.equal(d.tables.scores.length, 2, kind);
    assert.deepEqual(d.tables.scores.map(x => x.strokes).sort(), [5, 'P'].sort(), kind);
    assert.equal(d.tables.members, undefined, kind);
  }
});

test('a score changed on another phone is not overwritten: it comes back as a conflict', () => {
  for (const [kind, s] of servers().list) {
    s.api({ op: 'seed', data: { rounds: [ROUND] } });
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 3, scores: { a: { v: 5, base: null } }, by: 'Phone 1' });
    const second = s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 3, scores: { a: { v: 6, base: null }, b: { v: 4, base: null } }, by: 'Phone 2' });
    assert.deepEqual(second.conflicts, [{ player: 'a', server: 5, mine: 6 }], kind);
    const sc = s.api({ op: 'load' }).tables.scores;
    assert.equal(sc.find(x => x.player === 'a').strokes, 5, kind);
    assert.equal(sc.find(x => x.player === 'b').strokes, 4, kind);
    // the same phone changing its own saved score is fine, and logged
    const third = s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 3, scores: { a: { v: 6, base: 5 } }, by: 'Phone 1', names: { a: 'Al' } });
    assert.deepEqual(third.conflicts, [], kind);
    const log = s.api({ op: 'load' }).tables.log;
    assert.ok(log.some(l => l.action === 'Score changed' && /Al 5 → 6/.test(l.detail)), kind);
  }
});

test('rounds that are final or not started refuse scores; organiser changes need the PIN', () => {
  for (const [kind, s] of servers().list) {
    s.api({ op: 'seed', data: { rounds: [Object.assign({}, ROUND, { status: 'final' })] } });
    assert.equal(s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 1, scores: { a: { v: 4, base: null } } }).error, 'final', kind);
    assert.equal(s.api({ op: 'put', table: 'members', rows: [{ id: 'x', name: 'X' }] }).error, 'pin', kind);
    assert.equal(s.api({ op: 'put', table: 'members', rows: [{ id: 'x', name: 'X' }], pin: '1234' }).ok, true, kind);
    assert.equal(s.api({ op: 'put', table: 'cards', rows: [{ round: 'r9', grp: 'g1', at: 'now', by: 'Al' }] }).ok, true, kind);
    assert.equal(s.api({ op: 'checkPin', pin: '0000' }).ok, false, kind);
    assert.equal(s.api({ op: 'setPin', pin: '1234', newPin: '2468' }).ok, true, kind);
    assert.equal(s.api({ op: 'checkPin', pin: '2468' }).ok, true, kind);
    // the PIN is never sent to phones
    assert.ok(!JSON.stringify(s.api({ op: 'load' })).includes('2468'), kind);
  }
});

test('contest claims: one per group per hole; clearing a claim reaches other phones', () => {
  for (const [kind, s] of servers().list) {
    s.api({ op: 'seed', data: { rounds: [ROUND] } });
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 7, scores: {}, claim: 'c' });
    const v = s.api({ op: 'load' }).ver;
    assert.equal(s.api({ op: 'load' }).tables.claims[0].player, 'c', kind);
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 7, scores: {}, claim: null });
    const d = s.api({ op: 'since', v });
    assert.equal(s.api({ op: 'load' }).tables.claims.length, 0, kind);
    assert.equal(d.tables.deleted[0].tbl, 'claims', kind);
  }
});

test('deleting a round removes its scores too', () => {
  for (const [kind, s] of servers().list) {
    s.api({ op: 'seed', data: { rounds: [ROUND] } });
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 1, scores: { a: { v: 4, base: null } } });
    s.api({ op: 'remove', table: 'rounds', rows: [{ id: 'r9' }], pin: '1234' });
    const all = s.api({ op: 'load' });
    assert.equal(all.tables.rounds.length, 0, kind);
    assert.equal(all.tables.scores.length, 0, kind);
  }
});

test('the sheet keeps tee times, dates and pick-ups as written', () => {
  const { ss, list } = servers();
  const s = list[0][1];
  s.api({ op: 'seed', data: { rounds: [Object.assign({}, ROUND, { first_tee: '09:10', date: '2026-10-08' })] } });
  s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 2, scores: { a: { v: 'P', base: null } } });
  const rounds = ss.sheets.rounds.cells;
  assert.deepEqual(rounds[0].slice(0, 3), ['id', 'season', 'seq']);
  const r = s.api({ op: 'load' }).tables.rounds[0];
  assert.equal(r.first_tee, '09:10');
  assert.equal(r.date, '2026-10-08');
  assert.equal(s.api({ op: 'load' }).tables.scores[0].strokes, 'P');
});

test('unknown requests and bad photos are refused politely', () => {
  const s = N.createServer(N.memoryStore());
  assert.equal(s.api({ op: 'nope' }).error, 'bad');
  assert.equal(s.api({ op: 'photoPut', dataUrl: 'hello' }).error, 'bad');
  const ok = s.api({ op: 'photoPut', dataUrl: 'data:image/jpeg;base64,AAAA' });
  assert.equal(s.api({ op: 'photoGet', id: ok.id }).dataUrl, 'data:image/jpeg;base64,AAAA');
});

test('the version is published only after the rows are written', () => {
  const store = N.memoryStore();
  const seen = [];
  const origUpsert = store.upsert;
  store.upsert = (t, rows) => { seen.push([t, store.getVer()]); return origUpsert(t, rows); };
  const s = N.createServer(store);
  s.api({ op: 'seed', data: { rounds: [ROUND] } });
  const before = store.getVer();
  seen.length = 0;
  s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 2, scores: { a: { v: 4, base: null } }, by: 'x' });
  assert.ok(seen.length > 0 && seen.every(([, v]) => v === before), 'every write happened before the version moved');
  assert.equal(store.getVer(), before + 1);
});

test('the sheet grows when a table passes its row limit', () => {
  const ss = fakeSpreadsheet();
  const s = N.createServer(N.sheetStore(ss, fakeProps(), fakeCache(), fakeLock, () => null));
  const big = Object.assign({}, ROUND, { groups: [{ id: 'g1', n: 1, teams: [Array.from({ length: 60 }, (_, p) => 'p' + p)] }] });
  s.api({ op: 'seed', data: { rounds: [big] } });
  for (let h = 1; h <= 18; h++) {
    const scores = {};
    for (let p = 0; p < 60; p++) scores['p' + p] = { v: 4, base: null };
    const r = s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: h, scores, by: 'x' });
    assert.equal(r.error, undefined, 'hole ' + h);
  }
  assert.equal(s.api({ op: 'load' }).tables.scores.length, 18 * 60);
});

test('a re-created score is newer than the tombstone that deleted it', () => {
  const s = N.createServer(N.memoryStore());
  s.api({ op: 'seed', data: { rounds: [ROUND] } });
  s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 3, scores: { a: { v: 4, base: null } }, by: 'x' });
  s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 3, scores: { a: { v: null, base: 4 } }, by: 'x' });
  s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 3, scores: { a: { v: 5, base: null } }, by: 'x' });
  const d = s.api({ op: 'since', v: 0 });
  const row = d.tables.scores.find(x => x.player === 'a');
  const tomb = d.tables.deleted.find(x => x.tbl === 'scores');
  assert.ok(row.ver > tomb.ver);
});

test('first-time setup works before Drive access is granted (photos folder is only made when a photo is saved)', () => {
  const ss = fakeSpreadsheet();
  ss.getSheets = () => Object.values(ss.sheets);
  ss.deleteSheet = () => {};
  ss.getUrl = () => 'u';
  ss.getId = () => 'sid';
  const props = fakeProps();
  let driveCalls = 0;
  global.PropertiesService = { getScriptProperties: () => props };
  global.CacheService = { getScriptCache: fakeCache };
  global.LockService = fakeLock;
  global.SpreadsheetApp = { create: () => ss, openById: () => ss };
  global.DriveApp = { createFolder() { driveCalls++; throw new Error('Specified permissions are not sufficient to call DriveApp.createFolder'); }, getFolderById() { throw new Error('no'); } };
  global.ContentService = { createTextOutput: t => ({ t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } };
  try {
    const app = N.appsScript({ members: [{ id: 'a', name: 'A', full: 'A', index: 10, active: true }] });
    const hit = o => JSON.parse(app.http({ postData: { contents: JSON.stringify(o) } }).t);
    const first = hit({ op: 'load' });
    assert.equal(first.error, undefined);
    assert.equal(first.tables.members.length, 1);
    assert.equal(props.getProperty('READY'), '1');
    assert.equal(driveCalls, 0);
  } finally {
    ['PropertiesService', 'CacheService', 'LockService', 'SpreadsheetApp', 'DriveApp', 'ContentService'].forEach(k => delete global[k]);
  }
});

test('changing one player\'s past score leaves the rest of the group alone, and a stale change is refused', () => {
  for (const [kind, s] of servers().list) {
    s.api({ op: 'seed', data: { rounds: [ROUND] } });
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 2, scores: { a: { v: 4, base: null }, b: { v: 5, base: null }, c: { v: 6, base: null } }, by: 'Al' });
    const fix = s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 2, scores: { b: { v: 4, base: 5 } }, by: 'Al', names: { b: 'Bo' } });
    assert.deepEqual(fix.conflicts, [], kind);
    const at = () => Object.fromEntries(s.api({ op: 'load' }).tables.scores.filter(x => x.hole === 2).map(x => [x.player, x.strokes]));
    assert.deepEqual(at(), { a: 4, b: 4, c: 6 }, kind);
    // another phone had already changed Bo to 7 while this sheet still showed 4 -> refused, nothing lost
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 2, scores: { b: { v: 7, base: 4 } }, by: 'Phone 2' });
    const stale = s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 2, scores: { b: { v: 3, base: 4 } }, by: 'Al' });
    assert.deepEqual(stale.conflicts, [{ player: 'b', server: 7, mine: 3 }], kind);
    assert.deepEqual(at(), { a: 4, b: 7, c: 6 }, kind);
  }
});

/* ---- Rules checker ---- */
function askServer(opts) {
  const store = N.memoryStore();
  const calls = [];
  const secrets = Object.assign({}, opts.secrets);
  const cache = {};
  if (opts.secrets) store.getSecret = k => secrets[k];
  if (opts.reply) store.postJson = (url, headers, body) => { calls.push({ url, headers, body }); return opts.reply(); };
  store.cacheGet = k => cache[k]; store.cachePut = (k, v) => { cache[k] = v; };
  return { s: N.createServer(store, { now: () => '2026-10-12T10:00:00.000Z' }), calls };
}
const ok = () => ({ status: 200, json: { content: [{ type: 'text', text: 'Take a drop. One penalty stroke (Rule 17.1).' }] } });

test('rules checker: off until a key is set, and never reaches the network without one', () => {
  const { s, calls } = askServer({ reply: ok });
  assert.equal(s.api({ op: 'ask', question: 'Ball in the water?' }).error, 'nokey');
  const b = askServer({ secrets: {}, reply: ok });
  assert.equal(b.s.api({ op: 'ask', question: 'Ball in the water?' }).error, 'nokey');
  assert.equal(calls.length + b.calls.length, 0);
});

test('rules checker: sends the question with the key kept server-side, searches only the official rules sites, and is golf rules only', () => {
  const { s, calls } = askServer({ secrets: { ANTHROPIC_KEY: 'sk-test' }, reply: ok });
  const r = s.api({ op: 'ask', question: '  Ball in the water?  ', history: [
    { role: 'assistant', text: 'orphan first' }, { role: 'user', text: 'Hi' }, { role: 'assistant', text: 'Hello' }, { role: 'user', text: 'dangling' }
  ] });
  assert.equal(r.answer, 'Take a drop. One penalty stroke (Rule 17.1).');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers['x-api-key'], 'sk-test');
  assert.doesNotMatch(calls[0].body.system, /Buggy Wars|NCGS|countback/i);
  assert.match(calls[0].body.system, /Rules of Golf/);
  const tool = calls[0].body.tools[0];
  assert.equal(tool.type, 'web_search_20250305');
  assert.deepEqual(tool.allowed_domains, ['randa.org', 'usga.org']);
  const m = calls[0].body.messages;
  assert.equal(m[0].role, 'user');
  assert.equal(m[m.length - 1].content, 'Ball in the water?');
  assert.ok(m.every((x, i) => i === 0 || x.role !== m[i - 1].role), 'roles alternate');
  assert.ok(!JSON.stringify(r).includes('sk-test'));
});

test('rules checker: refuses empty or very long questions, stops at the daily cap, and survives an API failure', () => {
  const a = askServer({ secrets: { ANTHROPIC_KEY: 'k', ASK_DAILY_CAP: '2' }, reply: ok });
  assert.equal(a.s.api({ op: 'ask', question: '   ' }).error, 'bad');
  assert.equal(a.s.api({ op: 'ask', question: 'x'.repeat(601) }).error, 'bad');
  assert.ok(a.s.api({ op: 'ask', question: 'one' }).answer);
  assert.ok(a.s.api({ op: 'ask', question: 'two' }).answer);
  assert.equal(a.s.api({ op: 'ask', question: 'three' }).error, 'limit');
  assert.equal(a.calls.length, 2);
  const f = askServer({ secrets: { ANTHROPIC_KEY: 'k' }, reply: () => ({ status: 529, json: { error: {} } }) });
  assert.equal(f.s.api({ op: 'ask', question: 'Is this ok?' }).error, 'upstream');
});

test('rules checker: joins the answer text and returns only official rule sources', () => {
  const reply = () => ({ status: 200, json: { content: [
    { type: 'server_tool_use', name: 'web_search' },
    { type: 'web_search_tool_result', content: [] },
    { type: 'text', text: 'Replay the ball. ', citations: [
      { type: 'web_search_result_location', url: 'https://www.randa.org/en/rog/the-rules-of-golf/rule-11', title: 'Rule 11' },
      { type: 'web_search_result_location', url: 'https://evil.example/randa.org', title: 'Fake' }] },
    { type: 'text', text: 'No penalty (Rule 11.1).', citations: [
      { type: 'web_search_result_location', url: 'https://www.randa.org/en/rog/the-rules-of-golf/rule-11', title: 'Rule 11' }] }
  ] } });
  const { s } = askServer({ secrets: { ANTHROPIC_KEY: 'k' }, reply });
  const r = s.api({ op: 'ask', question: 'My ball hit another ball on the green' });
  assert.equal(r.answer, 'Replay the ball. No penalty (Rule 11.1).');
  assert.deepEqual(r.sources, [{ url: 'https://www.randa.org/en/rog/the-rules-of-golf/rule-11', title: 'Rule 11' }]);
});

test('rules checker: turns the checker\'s JSON into a question or a ruling card, ignores chatter around it, and never passes on junk', () => {
  const say = text => () => ({ status: 200, json: { content: [{ type: 'text', text }] } });
  const ask = text => askServer({ secrets: { ANTHROPIC_KEY: 'k' }, reply: say(text) }).s.api({ op: 'ask', question: 'Mick is in the bushes' });
  const q = ask('{"type":"ask","question":"Is the ball inside red or yellow stakes?","options":[{"label":"Red stakes or line","tag":"red"},{"label":"Yellow","tag":"<script>"},{"label":""},{"label":"Not sure"}]}');
  assert.equal(q.card.type, 'ask');
  assert.deepEqual(q.card.options, [{ label: 'Red stakes or line', tag: 'red' }, { label: 'Yellow' }, { label: 'Not sure' }]);
  const r = ask('Let me check the rules.\n```json\n{"type":"ruling","topic":"Unplayable ball","rule":"Rule 19","verdict":"1 penalty shot","intro":"Mick picks one:","steps":["Drop within **2 club-lengths**","","b","c","d","e"],"note":"Count it."}\n```');
  assert.equal(r.card.type, 'ruling');
  assert.equal(r.card.verdict, '1 penalty shot');
  assert.equal(r.card.steps.length, 4, 'empty steps dropped, at most four');
  assert.equal(JSON.parse(r.answer).verdict, '1 penalty shot', 'the text kept for the conversation is the clean card');
  // a mid-search chatter block that has no card, then the card
  const both = askServer({ secrets: { ANTHROPIC_KEY: 'k' }, reply: () => ({ status: 200, json: { content: [{ type: 'text', text: 'Searching…' }, { type: 'text', text: '{"type":"ruling","verdict":"No penalty"}' }] } }) }).s.api({ op: 'ask', question: 'x' });
  assert.equal(both.card.verdict, 'No penalty');
  // junk or half-formed cards fall back to plain text with no card
  for (const bad of ['Take a drop.', '{"type":"ask","question":"Q","options":[{"label":"only one"}]}', '{"type":"ruling"}', '{"type":"other"}', '{broken']) {
    const x = ask(bad);
    assert.equal(x.card, null, bad);
    assert.equal(x.answer, bad);
  }
});

test('restore puts back what is missing and never overwrites a row that exists', () => {
  for (const [kind, s] of servers().list) {
    s.api({ op: 'seed', data: { members: [{ id: 'a', name: 'Al', index: 12.4, active: true }, { id: 'b', name: 'Bo', index: 20, active: true }], rounds: [ROUND] } });
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 1, scores: { a: { v: 5, base: null } }, by: 'Al' });
    const backup = { tables: s.api({ op: 'load' }).tables };
    // later: Bo is deleted, and Al's hole 1 is corrected to 4 and hole 2 entered
    s.api({ op: 'remove', table: 'members', rows: [{ id: 'b' }], pin: '1234' });
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 1, scores: { a: { v: 4, base: 5 } }, by: 'Al' });
    s.api({ op: 'saveHole', round: 'r9', grp: 'g1', hole: 2, scores: { a: { v: 6, base: null } }, by: 'Al' });
    assert.equal(s.api({ op: 'restore', data: backup, pin: 'nope' }).error, 'pin', kind);
    assert.equal(s.api({ op: 'restore', data: { nothing: 1 }, pin: '1234' }).error, 'bad', kind);
    const r = s.api({ op: 'restore', data: backup, pin: '1234' });
    assert.equal(r.ok, true, kind);
    assert.deepEqual(r.tables, { members: 1 }, kind);
    const t = s.api({ op: 'load' }).tables;
    assert.deepEqual(t.members.map(m => m.id).sort(), ['a', 'b'], kind);
    const sc = Object.fromEntries(t.scores.map(x => [x.hole, x.strokes]));
    assert.deepEqual(sc, { 1: 4, 2: 6 }, kind); // the newer scores are untouched
    // the restored member reaches phones that already deleted it
    const d = s.api({ op: 'since', v: 0 });
    assert.ok(d.tables.members.some(m => m.id === 'b'), kind);
    assert.ok(t.log.some(l => l.action === 'Restored from a backup'), kind);
    assert.equal(s.api({ op: 'restore', data: backup, pin: '1234' }).restored, 0, kind); // second time: nothing missing
  }
});

test('backupNow needs the PIN and is logged', () => {
  const ss = fakeSpreadsheet();
  let made = 0;
  const store = N.sheetStore(ss, fakeProps(), fakeCache(), fakeLock, () => null);
  store.backup = () => { made++; return { name: 'NCGS backup test', url: 'u' }; };
  const s = N.createServer(store);
  assert.equal(s.api({ op: 'backupNow', pin: 'x' }).error, 'pin');
  assert.equal(made, 0);
  const r = s.api({ op: 'backupNow', pin: '1234' });
  assert.equal(r.ok, true); assert.equal(r.name, 'NCGS backup test'); assert.equal(made, 1);
  assert.ok(s.api({ op: 'load' }).tables.log.some(l => l.action === 'Backup made'));
});

test('the server reports its build on every kind of answer', () => {
  for (const [kind, s] of servers().list) {
    s.api({ op: 'seed', data: { rounds: [ROUND] } });
    const a = s.api({ op: 'load' });
    assert.equal(typeof a.build, 'string', kind);
    assert.equal(s.api({ op: 'since', v: 0 }).build, a.build, kind);
    assert.equal(s.api({ op: 'since', v: a.ver }).build, a.build, kind);
  }
});

test('a finished round can carry its course card in results without disturbing anything else', () => {
  for (const [kind, s] of servers().list) {
    s.api({ op: 'seed', data: { rounds: [ROUND] } });
    const snap = { holes: [{ n: 1, par: 4, si: 7 }], tee: { name: 'Yellow', slope: 120, rating: 70.1, par: 71 } };
    s.api({ op: 'put', table: 'rounds', pin: '1234', rows: [Object.assign({}, ROUND, { status: 'final', results: { snap } })] });
    const r = s.api({ op: 'load' }).tables.rounds.find(x => x.id === 'r9');
    assert.deepEqual(r.results.snap, snap, kind);
    assert.equal(r.status, 'final', kind);
  }
});

test('rules checker: keeps the official wording ("quote") on a ruling, trimmed, and drops it when it is missing', () => {
  const say = text => () => ({ status: 200, json: { content: [{ type: 'text', text }] } });
  const ask = text => askServer({ secrets: { ANTHROPIC_KEY: 'k' }, reply: say(text) }).s.api({ op: 'ask', question: 'Ball moved' });
  const r = ask('{"type":"ruling","rule":"Rule 9.4","verdict":"1 penalty shot","quote":"  If a player lifts or deliberately touches their ball in play,   they get one penalty stroke.  "}');
  assert.equal(r.card.quote, 'If a player lifts or deliberately touches their ball in play, they get one penalty stroke.');
  assert.equal(ask('{"type":"ruling","verdict":"No penalty"}').card.quote, '');
  assert.equal(ask('{"type":"ruling","verdict":"No penalty","quote":' + JSON.stringify('x'.repeat(900)) + '}').card.quote.length, 700, 'long quotes are cut, never passed on whole');
});
