// Scramble saves against the real server code (src/server.js, memory store). Codex's challenge on issue #1, 24 October:
// saveHole checks each player's row on its own, so a team can end up with two drives on a hole. That hole must stay
// unresolved (no points, no drive counted, team not complete, no KBs) until a phone that has seen both picks one.
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../src/server.js');
const E = require('../src/engine.js');

const TEAM = ['a', 'b', 'c', 'd'];
const ROUND = { id: 'w2', season: 2026, seq: 2, course: 'cab', tee: 'yellow', status: 'live', groups: [{ id: 'g1', n: 1, teams: [['a', 'b'], ['c', 'd']] }] };
const holes = Array.from({ length: 18 }, (_, i) => ({ n: i + 1, par: 4, si: i + 1 }));
function server() {
  const s = N.createServer(N.memoryStore());
  s.api({ op: 'seed', data: { members: TEAM.map(id => ({ id, name: id.toUpperCase(), index: 10, active: true })), rounds: [ROUND] } });
  return s;
}
const stored = s => { const out = {}; s.api({ op: 'load' }).tables.scores.filter(x => x.round === 'w2').forEach(x => { (out[x.player] = out[x.player] || {})[x.hole] = x.strokes; }); return out; };
const seen = (s, n) => { const st = stored(s); return Object.fromEntries(TEAM.map(p => [p, (st[p] || {})[n] === undefined ? null : st[p][n]])); };
// What scrSave sends: the driver gets the team score, everyone else is cleared, each with the value this phone last saw.
const phoneSave = (s, n, driver, score, base) => s.api({ op: 'saveHole', round: 'w2', grp: 'g1', hole: n,
  scores: Object.fromEntries(TEAM.map(p => [p, { v: p === driver ? score : null, base: base[p] }])), by: 'phone' });
const team = s => { const st = stored(s); return E.scrambleTeam(TEAM, holes, (p, n) => (st[p] || {})[n], 0); };

test('Codex\'s sequence: a stale driver change leaves two drives, kept and unresolved, until resolved', () => {
  const s = server();
  phoneSave(s, 1, 'a', 5, seen(s, 1));                        // A's drive, 5
  const stale = seen(s, 1);                                   // a phone that saw A 5, then lost signal
  phoneSave(s, 1, 'a', 6, seen(s, 1));                        // another phone corrects A to 6
  const r = phoneSave(s, 1, 'b', 4, stale);                   // the stale phone: B's drive, 4
  assert.equal(r.ok, true);
  assert.deepEqual(r.conflicts.map(c => [c.player, c.server]), [['a', 6]]);   // A's row is protected
  const st = stored(s); assert.equal(st.a[1], 6); assert.equal(st.b[1], 4);   // both kept, nothing dropped
  let t = team(s);
  assert.deepEqual(t.doubles, [1]); assert.equal(t.holes[1].points, null); assert.equal(t.drives.a + t.drives.b, 0);
  assert.equal(t.complete, false); assert.equal(t.played, 0);
  // A phone that has seen both picks B 4: A is cleared with its own value as the base.
  const fix = phoneSave(s, 1, 'b', 4, seen(s, 1));
  assert.equal(fix.ok, true); assert.deepEqual(fix.conflicts || [], []);
  t = team(s);
  assert.deepEqual(t.doubles, []); assert.equal(t.holes[1].driver, 'b'); assert.equal(t.holes[1].points, 2); assert.equal(t.drives.b, 1);
});

test('two offline phones choose different drivers from the same starting point: flagged, not guessed', () => {
  const s = server();
  phoneSave(s, 2, 'a', 5, seen(s, 2));
  const base = seen(s, 2);
  phoneSave(s, 2, 'c', 5, base);                              // phone 1: it was C's drive
  phoneSave(s, 2, 'd', 5, base);                              // phone 2: no, D's
  const st = stored(s); assert.equal((st.a || {})[2], undefined); assert.equal(st.c[2], 5); assert.equal(st.d[2], 5);
  const t = team(s); assert.deepEqual(t.doubles, [2]); assert.equal(t.holes[2].points, null);
});

test('two phones change the same driver\'s score: the later one is told, one row remains', () => {
  const s = server();
  phoneSave(s, 3, 'a', 5, seen(s, 3));
  const base = seen(s, 3);
  phoneSave(s, 3, 'a', 4, base);
  const r = phoneSave(s, 3, 'a', 6, base);
  assert.deepEqual(r.conflicts.map(c => [c.player, c.server, c.mine]), [['a', 4, 6]]);
  const t = team(s); assert.deepEqual(t.doubles, []); assert.equal(t.holes[3].gross, 4); assert.equal(t.drives.a, 1);
});

test('a team with an unresolved hole is never complete, so it is never ranked KBs by the golden rule', () => {
  const s = server();
  for (let n = 1; n <= 18; n++) phoneSave(s, n, n === 18 ? 'a' : TEAM[n % 4], 4, seen(s, n));
  const base = seen(s, 18);
  phoneSave(s, 18, 'b', 4, base); phoneSave(s, 18, 'c', 4, base);   // hole 18 ends up with two drives
  const t = team(s);
  assert.equal(t.complete, false); assert.equal(t.failed, false); assert.deepEqual(t.doubles, [18]);
  assert.deepEqual(E.scrambleStandings([Object.assign({ id: 'g1', name: 'Team 1' }, t), Object.assign({ id: 'g2', name: 'Team 2' }, t)]).filter(x => x.kb), []);
});
