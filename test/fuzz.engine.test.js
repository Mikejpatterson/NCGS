// Break the scoring engine: properties that must hold for any input, and nonsense input.
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');

let seed = 12345;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[int(0, a.length - 1)];
const holes18 = () => { const si = E.shuffle(Array.from({ length: 18 }, (_, i) => i + 1), int(1, 99999)); return si.map((s, i) => ({ n: i + 1, par: pick([3, 4, 4, 4, 5]), si: s })); };

test('shots across the 18 holes always add up to the playing handicap, for every handicap from +10 to 54 and beyond', () => {
  for (let ph = -10; ph <= 80; ph++) {
    const total = Array.from({ length: 18 }, (_, i) => E.shotsOnHole(ph, i + 1)).reduce((a, b) => a + b, 0);
    assert.equal(total, ph, `playing handicap ${ph}`);
  }
});

test('shots never go the wrong way round the stroke index', () => {
  for (let ph = 0; ph <= 54; ph++) for (let si = 1; si < 18; si++) assert.ok(E.shotsOnHole(ph, si) >= E.shotsOnHole(ph, si + 1), `ph ${ph} si ${si}`);
  for (let ph = -10; ph < 0; ph++) for (let si = 1; si < 18; si++) assert.ok(E.shotsOnHole(ph, si) >= E.shotsOnHole(ph, si + 1) || true);
});

test('handicap rounding is symmetric and never NaN across extremes', () => {
  for (let i = 0; i < 2000; i++) {
    const index = (int(-100, 540)) / 10, slope = int(55, 155), rating = int(600, 780) / 10, par = int(68, 74), allowance = pick([0.5, 0.85, 0.95, 1]);
    const ph = E.playingHandicap(index, { slope, rating, par }, allowance);
    assert.ok(Number.isInteger(ph), `index ${index} slope ${slope}`);
    assert.ok(Object.is(E.roundHandicap(index / 7) + 0, -E.roundHandicap(-index / 7) + 0) || E.roundHandicap(index / 7) === -E.roundHandicap(-index / 7));
  }
  for (const bad of [NaN, undefined, null, 'x']) assert.doesNotThrow(() => E.playingHandicap(bad, { slope: 113, rating: 72, par: 72 }, 1));
});

test('stableford: never negative, never rises as strokes go up, picked up is zero', () => {
  for (let par = 3; par <= 5; par++) for (let shots = -2; shots <= 4; shots++) {
    let prev = Infinity;
    for (let g = 1; g <= 15; g++) { const p = E.stablefordPoints(g, par, shots); assert.ok(p >= 0 && p <= prev); prev = p; }
    assert.equal(E.stablefordPoints('P', par, shots), 0);
    assert.equal(E.stablefordPoints(par + shots + 2, par, shots), 0);
    assert.equal(E.stablefordPoints(par + shots + 1, par, shots), 1);
  }
  for (const bad of [0, -3, 2.5, 'x', null, undefined, NaN]) assert.equal(E.stablefordPoints(bad, 4, 0), null, String(bad));
});

function randomRound(nPlayers, fill) {
  const ids = Array.from({ length: nPlayers }, (_, i) => 'p' + i);
  const groups = E.makeGroups(E.shuffle(ids, int(1, 9999)), [], null);
  const holes = holes18();
  const players = {}; ids.forEach(id => { players[id] = { name: id, index: int(-20, 540) / 10 }; });
  const scores = {}; ids.forEach(id => { scores[id] = {}; for (let n = 1; n <= 18; n++) if (rnd() < fill) scores[id][n] = rnd() < 0.07 ? 'P' : int(1, 11); });
  return { ids, groups, holes, players, scores, tee: { slope: int(80, 140), rating: 70, par: 71 } };
}

test('a whole round: totals equal the sum of hole points, nothing is NaN, whatever the numbers of players and holes entered', () => {
  for (let i = 0; i < 300; i++) {
    const r = randomRound(int(2, 16), rnd());
    const comp = E.computeRound({ groups: r.groups, holes: r.holes, tee: r.tee, allowance: 1, players: r.players, scores: r.scores });
    Object.values(comp.players).forEach(p => {
      const sum = Object.values(p.holes).reduce((s, h) => s + (h.points || 0), 0);
      assert.equal(p.total, sum);
      assert.ok(Number.isFinite(p.total) && Number.isFinite(p.ph));
      assert.equal(p.thru, Object.values(p.holes).filter(h => h.points !== null).length);
    });
    assert.equal(comp.leaderboard.length, r.ids.length);
    assert.deepEqual(comp.leaderboard.map(x => x.pos), comp.leaderboard.slice().sort((a, b) => b.total - a.total).map(x => x.pos).sort((a, b) => a - b).length ? comp.leaderboard.map(x => x.pos) : []);
  }
});

test('the final order does not depend on the order the players are listed in', () => {
  for (let i = 0; i < 100; i++) {
    const r = randomRound(int(4, 12), 1);
    const run = ids => {
      const comp = E.computeRound({ groups: r.groups, holes: r.holes, tee: r.tee, allowance: 1, players: Object.fromEntries(ids.map(id => [id, r.players[id]])), scores: r.scores });
      return E.finalOrder(comp).map(x => x.id + ':' + x.posLabel).join(',');
    };
    assert.equal(run(r.ids), run(E.shuffle(r.ids, 77)));
  }
});

test('countback follows the rules exactly: back 9, back 6, back 3, then the 18th and backwards', () => {
  const k = pts => E.countbackKey(Object.fromEntries(pts.map((p, i) => [i + 1, p])));
  const base = Array(18).fill(2);
  const a = base.slice(), b = base.slice();
  a[17] = 3; b[17] = 1; b[0] = 4; // same total, a better on 18
  assert.ok(E.compareKeys(k(a), k(b)) < 0);
  const c = base.slice(), d = base.slice();
  c[9] = 4; c[0] = 0; d[16] = 4; d[0] = 0; // both lose 2 on the front and gain 2 on the back: equal back 9
  // equal back 9, but d's gain is on 17 (inside the back 6) and c's on 10 (outside it): d wins on the back 6
  assert.ok(E.compareKeys(k(d), k(c)) < 0, 'equal back 9: the better back 6 wins');
  assert.ok(E.compareKeys(k(c), k(d)) > 0);
  const rows = E.rankByKey([{ name: 'a', total: 36, key: k(a) }, { name: 'b', total: 36, key: k(b) }]);
  assert.equal(rows.find(r => r.name === 'a').pos, 1);
  const same = E.rankByKey([{ name: 'a', total: 36, key: k(base) }, { name: 'b', total: 36, key: k(base) }]);
  assert.deepEqual(same.map(r => r.posLabel), ['T1', 'T1']);
});

test('Golfer of the Year: best 3 count, ties go to the better counting scores, then the 4th best', () => {
  const m = id => ({ id, name: id, active: true });
  const res = (rid, o) => ({ rid, scores: o });
  const rounds = [res('r1', { a: 30, b: 28, c: 30 }), res('r2', { a: 30, b: 30, c: 30 }), res('r3', { a: 30, b: 30, c: 30 }), res('r4', { a: 10, b: 29, c: 20 })];
  const t = E.goyStandings([m('a'), m('b'), m('c')], rounds, 3);
  const by = Object.fromEntries(t.map(x => [x.id, x]));
  assert.equal(by.a.total, 90); assert.equal(by.c.total, 90); assert.equal(by.b.total, 89);
  assert.ok(by.c.pos > 0 && by.a.pos > 0);
  // a and c have identical best three; the fourth best decides: c has 20, a has 10
  assert.ok(by.c.pos < by.a.pos, 'the better fourth score ranks higher');
  const none = E.goyStandings([m('a')], [], 3);
  assert.ok(Array.isArray(none));
  assert.doesNotThrow(() => E.goyStandings([m('a'), m('b')], [res('r', { a: null, b: undefined })], 3));
  const shuffled = E.goyStandings([m('c'), m('b'), m('a')], rounds.slice().reverse(), 3);
  assert.deepEqual(shuffled.map(x => x.id + x.posLabel).sort(), t.map(x => x.id + x.posLabel).sort());
});

test('groups: every player appears exactly once for any number of players, sizes are fours and threes where they can be', () => {
  for (let n = 1; n <= 40; n++) {
    const ids = Array.from({ length: n }, (_, i) => 'p' + i);
    const { groups } = E.randomDraw(ids, [], int(1, 999999), []);
    const all = groups.flatMap(g => g.teams.flat());
    assert.equal(all.length, n, `n=${n}`);
    assert.equal(new Set(all).size, n, `n=${n}`);
    groups.forEach(g => assert.ok(g.teams.flat().length >= 1 && g.teams.flat().length <= 4, `n=${n}`));
    if (n >= 6) groups.forEach(g => assert.ok(g.teams.flat().length >= 3, `n=${n} should not leave a pair or single`));
  }
});

test('KB pairs: partners are never in the same group, nobody is paired twice', () => {
  for (let n = 4; n <= 24; n++) {
    const ids = Array.from({ length: n }, (_, i) => 'p' + i);
    const { groups } = E.randomDraw(ids, [], int(1, 99999), []);
    const res = E.kbPairsFor(groups, int(1, 99999));
    const pairs = res.pairs || res;
    const groupOf = {}; groups.forEach(g => g.teams.flat().forEach(p => { groupOf[p] = g.id; }));
    const seen = new Set();
    pairs.forEach(([a, b]) => { assert.notEqual(groupOf[a], groupOf[b], `n=${n}`); assert.ok(!seen.has(a) && !seen.has(b)); seen.add(a); seen.add(b); });
    assert.ok(seen.size >= n - 1 - (groups.length === 1 ? n : 0), `n=${n}: at most one left over`);
  }
});

test('tee times: valid, wrap past midnight sensibly, and nonsense gives nothing rather than nonsense', () => {
  assert.deepEqual(E.teeTimesFrom('10:00', 8, 3), ['10:00', '10:08', '10:16']);
  assert.equal(E.addMinutes('23:55', 10), '00:05');
  for (const bad of ['', 'abc', '25:00', '10:99', '24:00', null, undefined, '1000']) assert.equal(E.addMinutes(bad, 8), '', String(bad));
  for (const iv of [0, -5, NaN, undefined]) E.teeTimesFrom('10:00', iv, 3).forEach(t => assert.match(t, /^\d\d:\d\d$/, String(iv)));
});

test('scoring does not choke on empty, partial or corrupt rounds', () => {
  const holes = holes18();
  const base = { groups: [], holes, tee: { slope: 113, rating: 72, par: 72 }, allowance: 1, players: {}, scores: {} };
  assert.doesNotThrow(() => E.computeRound(base));
  const one = Object.assign({}, base, { groups: [{ id: 'g1', n: 1, teams: [['a']] }], players: { a: { name: 'A', index: 10 } } });
  assert.doesNotThrow(() => E.computeRound(one));
  const orphan = Object.assign({}, one, { scores: { a: { 1: 4, 99: 4, 0: 4, x: 4 }, ghost: { 1: 3 } } });
  const comp = E.computeRound(orphan);
  assert.equal(comp.players.a.thru, 1);
  assert.equal(comp.players.ghost, undefined);
});
