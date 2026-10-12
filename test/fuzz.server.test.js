// Break the server: bad input, wrong types, silly values. Nothing may throw, corrupt data, or write without the PIN.
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../src/server.js');

const ROUND = { id: 'r9', season: 2027, seq: 1, course: 'cab', tee: 'yellow', status: 'live', groups: [{ id: 'g1', n: 1, teams: [['a', 'b'], ['c', 'd']] }], contests: [], kb: null };
const fresh = () => { const s = N.createServer(N.memoryStore()); s.api({ op: 'seed', data: { members: ['a', 'b', 'c', 'd'].map(id => ({ id, name: id, index: 10, active: true })), rounds: [ROUND] } }); return s; };
const scores = s => s.api({ op: 'load' }).tables.scores;
const save = (s, hole, sc, extra) => s.api(Object.assign({ op: 'saveHole', round: 'r9', grp: 'g1', hole, scores: sc, by: 'T' }, extra || {}));

test('holes outside 1 to 18 are refused', () => {
  const s = fresh();
  for (const h of [0, -1, 19, 99, 1.5, NaN, 'x', null, undefined, Infinity]) {
    const r = save(s, h, { a: { v: 4, base: null } });
    assert.ok(r.error, `hole ${String(h)} should be refused`);
  }
  assert.equal(scores(s).length, 0);
});

test('silly stroke values are refused', () => {
  const s = fresh();
  for (const v of [-1, 0, 0.5, 2.5, 100, 1e9, 'abc', '', {}, [], true, NaN, Infinity]) {
    const r = save(s, 1, { a: { v, base: null } });
    assert.ok(r.error, `strokes ${JSON.stringify(v)} should be refused`);
  }
  assert.equal(scores(s).length, 0);
  assert.equal(save(s, 1, { a: { v: 'P', base: null } }).ok, true);
  assert.equal(save(s, 2, { a: { v: 9, base: null } }).ok, true);
});

test('a player who is not in the round cannot be scored', () => {
  const s = fresh();
  const r = save(s, 1, { zed: { v: 4, base: null } });
  assert.ok(r.error);
  assert.equal(scores(s).length, 0);
});

test('a group that is not in the round cannot score', () => {
  const s = fresh();
  assert.ok(save(s, 1, { a: { v: 4, base: null } }, { grp: 'g9' }).error);
  assert.equal(scores(s).length, 0);
});

test('missing or wrong-typed fields never throw', () => {
  const s = fresh();
  const junk = [undefined, null, 0, 1, '', 'x', [], {}, true, () => 1];
  for (const op of ['saveHole', 'put', 'remove', 'restore', 'backupNow', 'setPin', 'ask', 'weather', 'photoPut', 'photoGet', 'seed', 'since', 'load', 'checkPin', 'nope', undefined, null, 5]) {
    for (const j of junk) {
      let r;
      assert.doesNotThrow(() => { r = s.api({ op, round: j, grp: j, hole: j, scores: j, table: j, rows: j, pin: j, data: j, v: j, question: j, lat: j, lon: j, dataUrl: j, id: j, newPin: j }); }, `${String(op)} with ${String(j)}`);
      assert.ok(r && typeof r === 'object');
    }
  }
  assert.doesNotThrow(() => s.api(null));
  assert.doesNotThrow(() => s.api(undefined));
  assert.doesNotThrow(() => s.api('x'));
});

test('writes to organiser tables need the PIN, every time', () => {
  const s = fresh();
  for (const t of ['members', 'courses', 'rounds', 'scores', 'claims', 'winners', 'settings']) {
    const r = s.api({ op: 'put', table: t, rows: [{ id: 'evil', name: 'evil', key: 'x', value: 'y', round: 'r9', player: 'a', hole: 1, grp: 'g1' }] });
    assert.equal(r.error, 'pin', t);
    assert.equal(s.api({ op: 'remove', table: t, rows: [{ id: 'a', round: 'r9', player: 'a', hole: 1, key: 'x', grp: 'g1' }] }).error, 'pin', t);
  }
  assert.equal(s.api({ op: 'put', table: 'members', rows: [{ id: 'e', name: 'e' }], pin: 'wrong' }).error, 'pin');
  assert.equal(s.api({ op: 'put', table: 'members', rows: [{ id: 'e', name: 'e' }], pin: 1234 }).ok, true); // a number 1234 is the same PIN
  assert.equal(s.api({ op: 'put', table: 'members', rows: [{ id: 'e2', name: 'e' }], pin: ' 1234 ' }).error, 'pin');
});

test('a player cannot write to the deleted table, edit the log, or sign as the organiser', () => {
  const s = fresh();
  assert.ok(s.api({ op: 'put', table: 'deleted', rows: [{ tbl: 'scores', k: 'x' }], pin: '1234' }).error);
  const row = { id: 'L-mine', at: 'x', by: 'Organiser', action: 'a', detail: 'first' };
  assert.equal(s.api({ op: 'put', table: 'log', rows: [row] }).ok, true);
  const log = () => s.api({ op: 'load' }).tables.log;
  assert.equal(log().find(l => l.id === 'L-mine').by, 'Player', 'signing as Organiser without the PIN is not allowed');
  s.api({ op: 'put', table: 'log', rows: [Object.assign({}, row, { detail: 'rewritten', by: 'Al' })] });
  assert.equal(log().find(l => l.id === 'L-mine').detail, 'first', 'an existing log entry cannot be rewritten');
});

test('rows with missing keys are refused rather than stored as "undefined"', () => {
  const s = fresh();
  const r = s.api({ op: 'put', table: 'members', rows: [{ name: 'No id' }], pin: '1234' });
  assert.ok(r.error);
  assert.ok(!s.api({ op: 'load' }).tables.members.some(m => m.name === 'No id'));
});

test('a final round takes no more scores; an unknown round takes none', () => {
  const s = fresh();
  s.api({ op: 'put', table: 'rounds', rows: [Object.assign({}, ROUND, { status: 'final' })], pin: '1234' });
  assert.equal(save(s, 1, { a: { v: 4, base: null } }).error, 'final');
  assert.equal(s.api({ op: 'saveHole', round: 'nope', grp: 'g1', hole: 1, scores: { a: { v: 4 } } }).error, 'missing');
});

test('two phones saving the same hole: the second is a conflict, not an overwrite, and force is organiser-only', () => {
  const s = fresh();
  assert.equal(save(s, 3, { a: { v: 5, base: null } }).ok, true);
  const second = save(s, 3, { a: { v: 6, base: null } });
  assert.equal(second.conflicts.length, 1);
  assert.equal(scores(s)[0].strokes, 5);
  const forced = save(s, 3, { a: { v: 6, base: null } }, { force: true });
  assert.equal(scores(s)[0].strokes === 6 ? 'overwritten' : 'kept', 'kept', 'a player must not be able to force an overwrite without the PIN');
  assert.ok(forced);
  const org = save(s, 3, { a: { v: 6, base: null } }, { force: true, pin: '1234' });
  assert.equal(scores(s)[0].strokes, 6);
  assert.ok(org.ok);
});

test('hostile text is stored as text and never changes data shape', () => {
  const s = fresh();
  const name = '<img src=x onerror=alert(1)>"\'\; DROP TABLE';
  assert.equal(s.api({ op: 'put', table: 'members', rows: [{ id: 'x1', name, full: name, index: 5, active: true }], pin: '1234' }).ok, true);
  assert.equal(s.api({ op: 'load' }).tables.members.find(m => m.id === 'x1').name, name);
});

test('huge payloads are refused or bounded', () => {
  const s = fresh();
  const big = 'x'.repeat(300000);
  const r = s.api({ op: 'put', table: 'members', rows: [{ id: 'big', name: big, index: 1, active: true }], pin: '1234' });
  assert.ok(r.error, 'a 300 KB name should be refused');
  const many = Array.from({ length: 5000 }, (_, i) => ({ id: 'm' + i, name: 'n' + i, index: 1, active: true }));
  assert.ok(s.api({ op: 'put', table: 'members', rows: many, pin: '1234' }).error, '5000 rows in one write should be refused');
});

test('PIN guessing is slowed down: repeated wrong PINs get locked out', () => {
  const s = fresh();
  let last;
  for (let i = 0; i < 12; i++) last = s.api({ op: 'checkPin', pin: String(1000 + i) });
  const ok = s.api({ op: 'checkPin', pin: '1234' });
  assert.ok(ok.ok === false && ok.locked === true, 'after many wrong PINs even the right one should wait');
});
