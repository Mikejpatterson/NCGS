// Scramble scoring (Westport day two, owner brief §6): src/engine.js scrambleTeam / scrambleStandings.
const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/engine.js');
const holes = Array.from({ length: 18 }, (_, i) => ({ n: i + 1, par: 4, si: i + 1 }));
const team = ['a', 'b', 'c', 'd'];
// rows[n] = [driver, strokes]: the team score sits in the driver's row
const play = (rows, shots, min) => E.scrambleTeam(team, holes, (p, n) => (rows[n] && rows[n][0] === p ? rows[n][1] : null), shots, min);
const full = (strokes, drivers) => Object.fromEntries(holes.map(h => [h.n, [drivers[(h.n - 1) % drivers.length], strokes]]));

test('one team score per hole, from the driver\'s row: par 4 in 4 is 2 points', () => {
  const t = play({ 1: ['a', 4], 2: ['b', 3] }, 0);
  assert.equal(t.holes[1].points, 2); assert.equal(t.holes[1].driver, 'a');
  assert.equal(t.holes[2].points, 3); assert.equal(t.total, 5); assert.equal(t.played, 2);
  assert.deepStrictEqual(t.drives, { a: 1, b: 1, c: 0, d: 0 });
});
test('team shots are the organiser\'s manual allowance, given by stroke index', () => {
  const t = play({ 1: ['a', 4], 3: ['a', 4] }, 2);
  assert.equal(t.holes[1].shots, 1); assert.equal(t.holes[1].points, 3);
  assert.equal(t.holes[3].shots, 0); assert.equal(t.holes[3].points, 2);
});
test('a pick-up scores 0', () => { assert.equal(play({ 1: ['a', 'P'] }, 0).holes[1].points, 0); });
test('two drives recorded on one hole are flagged, not guessed', () => {
  const t = E.scrambleTeam(team, holes, (p, n) => (n === 5 && (p === 'a' || p === 'b') ? 4 : null), 0);
  assert.deepStrictEqual(t.doubles, [5]); assert.equal(t.holes[5].points, null); assert.equal(t.complete, false);
});
test('drive minimum: finished with everyone on 3+ is fine; finished without is the golden rule', () => {
  assert.equal(play(full(4, ['a', 'b', 'c', 'd']), 0).failed, false);
  const t = play(full(4, ['a', 'a', 'a', 'a', 'b', 'b', 'c', 'c', 'c']), 0);   // d never drives
  assert.equal(t.complete, true); assert.deepStrictEqual(t.short, ['d']); assert.equal(t.failed, true);
});
test('at risk once the remaining holes are all needed for players short of drives', () => {
  const rows = {}; for (let n = 1; n <= 15; n++) rows[n] = ['a', 4];   // b, c, d need 9 drives, 3 holes left
  assert.equal(play(rows, 0).atRisk, true);
  assert.equal(play(rows, 0).impossible, true);   // 9 needed, 3 left
  const ok = {}; for (let n = 1; n <= 6; n++) ok[n] = ['a', 4];        // need 9, 12 left
  assert.equal(play(ok, 0).atRisk, false);
  const tight = {}; for (let n = 1; n <= 9; n++) tight[n] = ['a', 4];   // b, c, d need 9, 9 left: every hole must go to them
  assert.equal(play(tight, 0).atRisk, true); assert.equal(play(tight, 0).impossible, false);
});
test('teams ranked by points with countback; bottom team is KBs; a failed team is KBs whatever its points', () => {
  const mk = (id, strokes, drivers) => Object.assign({ id, name: id }, play(full(strokes, drivers), 0));
  let s = E.scrambleStandings([mk('t1', 4, team), mk('t2', 3, team), mk('t3', 5, team)]);
  assert.deepStrictEqual(s.map(t => t.id), ['t2', 't1', 't3']);
  assert.deepStrictEqual(s.filter(t => t.kb).map(t => t.id), ['t3']);
  s = E.scrambleStandings([mk('t1', 4, team), mk('t2', 3, ['a', 'b', 'c']), mk('t3', 5, team)]);
  assert.deepStrictEqual(s.filter(t => t.kb).map(t => t.id), ['t2']);
});
test('level on points: back nine countback decides', () => {
  const a = full(4, team), b = full(4, team);
  a[1] = ['a', 3]; a[18] = ['a', 5];   // same total, worse back nine
  const s = E.scrambleStandings([Object.assign({ id: 'A', name: 'A' }, play(a, 0)), Object.assign({ id: 'B', name: 'B' }, play(b, 0))]);
  assert.equal(s[0].total, s[1].total); assert.deepStrictEqual(s.map(t => t.id), ['B', 'A']);
});

test('nobody is KBs while teams are still playing', () => {
  const part = {}; for (let n = 1; n <= 9; n++) part[n] = ['a', 5];
  const s = E.scrambleStandings([Object.assign({ id: 't1', name: 't1' }, play(full(4, team), 0)), Object.assign({ id: 't2', name: 't2' }, play(part, 0))]);
  assert.deepStrictEqual(s.filter(t => t.kb), []);
});
