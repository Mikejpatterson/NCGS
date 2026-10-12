const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const CFG = require('../data/trip-config.json');

const TEE = CFG.course.tees.yellow; // Cabopino yellow: slope 130, rating 69.1, par 71
const HOLES = CFG.course.holes;

test('playing handicap follows WHS: unrounded course handicap, allowance, one rounding', () => {
  const w = E.handicapWorking(12.4, TEE, 0.95);
  assert.equal(w.courseHandicap.toFixed(2), '12.37');
  assert.equal(w.beforeRounding.toFixed(2), '11.75');
  assert.equal(w.playing, 12);
  // Rounding twice (old method) would give 11 for the same golfer
  assert.equal(Math.round(Math.round(w.courseHandicap) * 0.95), 11);
  assert.equal(E.playingHandicap(20.1, TEE, 0.95), 20);
  assert.equal(E.playingHandicap(14.8, TEE, 0.95), 14);
  assert.equal(E.playingHandicap(8.6, TEE, 0.95), 8);
  assert.equal(E.playingHandicap(0, TEE, 0.95), -2); // scratch gives shots back at this tee
  assert.equal(E.roundHandicap(11.5), 12);
  assert.equal(E.roundHandicap(-1.5), -2);
});

test('shots per hole by stroke index, including over 18 and plus handicaps', () => {
  assert.equal(E.shotsOnHole(12, 12), 1);
  assert.equal(E.shotsOnHole(12, 13), 0);
  assert.equal(E.shotsOnHole(20, 1), 2);
  assert.equal(E.shotsOnHole(20, 2), 2);
  assert.equal(E.shotsOnHole(20, 3), 1);
  assert.equal(E.shotsOnHole(36, 18), 2);
  assert.equal(E.shotsOnHole(0, 1), 0);
  assert.equal(E.shotsOnHole(-2, 18), -1);
  assert.equal(E.shotsOnHole(-2, 17), -1);
  assert.equal(E.shotsOnHole(-2, 16), 0);
  const total = n => HOLES.reduce((s, h) => s + E.shotsOnHole(n, h.si), 0);
  [0, 5, 12, 18, 20, 27, 36].forEach(n => assert.equal(total(n), n));
});

test('Stableford points, pick-ups and blanks', () => {
  assert.equal(E.stablefordPoints(4, 4, 1), 3);   // net birdie
  assert.equal(E.stablefordPoints(4, 4, 0), 2);   // par
  assert.equal(E.stablefordPoints(7, 4, 1), 0);   // net double bogey
  assert.equal(E.stablefordPoints(9, 4, 1), 0);   // never negative
  assert.equal(E.stablefordPoints(2, 4, 2), 6);
  assert.equal(E.stablefordPoints('P', 4, 1), 0); // picked up
  assert.equal(E.stablefordPoints(undefined, 4, 1), null);
  assert.equal(E.stablefordPoints(0, 4, 1), null);
  assert.equal(E.scoreName(5, 4), 'Bogey');
  assert.equal(E.scoreName(6, 4), 'Double');
  assert.equal(E.scoreName(1, 3), 'Hole in one');
  assert.equal(E.scoreName(9, 4), '+5');
});

test('Cabopino card: par 71, distances converted from metres', () => {
  assert.equal(HOLES.reduce((s, h) => s + h.par, 0), 71);
  assert.equal(HOLES.reduce((s, h) => s + h.metres, 0), 5170);
  assert.deepEqual(HOLES.map(h => h.si).slice().sort((a, b) => a - b), Array.from({ length: 18 }, (_, i) => i + 1));
  assert.equal(E.metresToYards(309), 338); // hole 1; Golfshot shows 335 to the green centre
  assert.equal(E.metresToYards(378), 413);
});

test('match status: halves, separate nines, closed out, dormie', () => {
  const L = [{ long: 'Pat & Dermot', short: 'P&D' }, { long: 'Seán & Mick', short: 'S&M' }];
  const d = r => E.describeMatch(E.matchProgress(r), L).text;
  assert.equal(d([]), 'Not started');
  assert.equal(d(['H', 'H', null, null, null, null, null, null, null]), 'All square');
  assert.equal(d(['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H']), 'Halved');
  assert.equal(d(['A', 'H', 'B', 'B', null, null, null, null, null]), 'Seán & Mick 1 up');
  assert.equal(d(['A', 'A', 'A', 'A', 'H', 'H', 'H', null, null]), 'Pat & Dermot won 4 & 3');
  // closed result stays fixed even when later holes are played
  assert.equal(d(['A', 'A', 'A', 'A', 'H', 'H', 'H', 'B', 'B']), 'Pat & Dermot won 4 & 3');
  assert.equal(d(['A', 'A', 'H', 'H', 'H', 'H', 'H', null, null]), 'Pat & Dermot 2 up · dormie');
  assert.equal(d(['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'H']), 'Halved');
  assert.equal(d(['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'A']), 'Pat & Dermot won 1 up');
});

function miniRound(scores, opts = {}) {
  const players = {
    a1: { name: 'Pat', index: 0 }, a2: { name: 'Dermot', index: 0 },
    b1: { name: 'Seán', index: 0 }, b2: { name: 'Mick', index: 0 }
  };
  return E.computeRound({
    groups: [{ id: 'g1', n: 1, teeTime: '10:00', startHole: opts.start || 1, teams: [['a1', 'a2'], ['b1', 'b2']] }],
    holes: HOLES, tee: { slope: 113, rating: 71, par: 71 }, allowance: 1, players, scores,
    phOverride: opts.ph || { a1: 0, a2: 0, b1: 0, b2: 0 }
  });
}
const card = arr => Object.fromEntries(arr.map((v, i) => [i + 1, v]).filter(([, v]) => v !== undefined));

test('best ball per team decides each hole; halves and separate front, back, overall', () => {
  // Pars on Cabopino: 4 4 4 4 4 4 3 4 4 | 4 4 5 3 5 3 4 4 4
  const r = miniRound({
    a1: card([4, 5, 5, 4, 4, 4, 3, 4, 4, 5, 5, 6]),
    a2: card([5, 4, 5, 5, 4, 4, 3, 4, 4, 5, 5, 6]),
    b1: card([4, 5, 4, 5, 5, 4, 3, 4, 4, 4, 4, 6]),
    b2: card([5, 5, 5, 5, 5, 4, 3, 4, 4, 5, 5, 6])
  });
  const g = r.groups[0];
  assert.deepEqual([1, 2, 3, 4, 5].map(n => g.holes[n].result), ['H', 'A', 'B', 'A', 'A']);
  assert.deepEqual(g.holes[2].counting[0], ['a2']);
  assert.equal(g.matches.front.remaining, 0);
  // 2 up with 1 to play after hole 8 closes the front nine
  assert.equal(g.matches.front.status.text, 'Pat & Dermot won 2 & 1');
  assert.equal(g.matches.front.winner, 'A');
  assert.equal(g.matches.back.status.text, 'Seán & Mick 2 up');
  assert.equal(g.matches.overall.status.text, 'All square');
  assert.equal(g.nextHole, 13);
});

test('a hole only counts when all four scores are in; missing scores leave the round unfinished', () => {
  const r = miniRound({ a1: card([4, 4]), a2: card([4, 4]), b1: card([4, 4]), b2: card([4]) });
  const g = r.groups[0];
  assert.equal(g.holes[1].complete, true);
  assert.equal(g.holes[2].complete, false);
  assert.equal(g.holes[2].result, null);
  assert.equal(g.nextHole, 2);
  assert.equal(g.matches.front.played, 1);
  assert.equal(r.players.b2.thru, 1);
  assert.equal(g.complete, false);
});

test('starting on hole 10 keeps physical hole numbers and real front/back matches', () => {
  const s = {};
  ['a1', 'a2', 'b1', 'b2'].forEach(p => { s[p] = {}; });
  [10, 11, 12].forEach(n => { s.a1[n] = 3; s.a2[n] = 9; s.b1[n] = 9; s.b2[n] = 9; });
  // Hole 12 is par 5, so a 3 is an albatross for Pat
  const r = miniRound(s, { start: 10 });
  const g = r.groups[0];
  assert.deepEqual(g.order.slice(0, 3), [10, 11, 12]);
  assert.equal(g.order[9], 1);
  assert.equal(g.nextHole, 13);
  assert.equal(g.matches.back.status.text, 'Pat & Dermot 3 up');
  assert.equal(g.matches.front.status.text, 'Not started');
  assert.equal(g.matches.overall.status.text, 'Pat & Dermot 3 up');
});

test('a corrected score updates every dependent result', () => {
  const base = {
    a1: card([4, 4, 4]), a2: card([5, 5, 5]),
    b1: card([4, 4, 4]), b2: card([5, 5, 5])
  };
  const before = miniRound(base);
  assert.equal(before.groups[0].matches.front.status.text, 'All square');
  const fixed = JSON.parse(JSON.stringify(base));
  fixed.a1[2] = 3;
  const after = miniRound(fixed);
  assert.equal(after.groups[0].holes[2].result, 'A');
  assert.equal(after.groups[0].matches.front.status.text, 'Pat & Dermot 1 up');
  assert.equal(after.groups[0].matches.overall.status.text, 'Pat & Dermot 1 up');
  assert.equal(after.players.a1.total, before.players.a1.total + 1);
  assert.equal(after.leaderboard[0].name, 'Pat');
  assert.equal(after.pairs[0].label, 'Pat & Dermot');
});

test('leaderboard ties share a position and no countback is invented', () => {
  const rows = E.rankRows([
    { name: 'Ger', total: 38 }, { name: 'Mick', total: 30 }, { name: 'Tommy', total: 30 }, { name: 'Joe', total: 24 }
  ], 'total', 'desc');
  assert.deepEqual(rows.map(r => r.posLabel), ['1', 'T2', 'T2', '4']);
});

test('buggy pair totals follow each round\'s pairings, and changing partners is tracked', () => {
  const r1 = CFG.rounds.find(r => r.id === 'r1');
  const r2 = CFG.rounds.find(r => r.id === 'r2');
  assert.deepEqual(E.repeatedPartners([{ rid: 'r1', groups: r1.groups }, { rid: 'r2', groups: r2.groups }]), []);
  const dup = [{ rid: 'r1', groups: r1.groups }, { rid: 'r2', groups: r1.groups }];
  assert.equal(E.repeatedPartners(dup).length, 6);
  const r = miniRound({ a1: card([4]), a2: card([5]), b1: card([5]), b2: card([5]) });
  const lowest = r.pairs.filter(p => p.lowest);
  assert.equal(lowest.length, 1);
  assert.equal(lowest[0].label, 'Seán & Mick');
});

test('day three draw: reverse standings, leaders last, repeats flagged', () => {
  const standings = E.rankRows(CFG.players.map((p, i) => ({ id: p.id, name: p.name, total: 100 - i })), 'total', 'desc');
  const r1 = CFG.rounds.find(r => r.id === 'r1');
  const d = E.proposeDraw(standings, [{ rid: 'r1', groups: r1.groups }], ['10:00', '10:08', '10:16']);
  assert.equal(d.groups.length, 3);
  const leaders = standings.slice(0, 4).map(r => r.id).sort();
  assert.deepEqual(d.groups[2].teams.flat().slice().sort(), leaders);
  assert.equal(d.groups[2].teeTime, '10:16');
  assert.deepEqual(d.groups[2].teams[0], [standings[0].id, standings[3].id]);
  d.repeats.forEach(rep => assert.ok(rep.rounds.includes('r1')));
});

test('sample data: Day 1 is complete to hole 14 for every group, with a live Buggy Wars match', () => {
  const SEED = require('../data/sample-day1.json');
  const players = Object.fromEntries(CFG.players.map(p => [p.id, p]));
  const r1 = CFG.rounds.find(r => r.id === 'r1');
  const r = E.computeRound({ groups: r1.groups, holes: HOLES, tee: TEE, allowance: CFG.allowance, players, scores: SEED.scores.r1 });
  r.groups.forEach(g => {
    assert.equal(g.holesDone, 14);
    assert.equal(g.nextHole, 15);
  });
  const g1 = r.groups[0];
  assert.equal(g1.matches.front.status.text, 'Pat & Dermot won 1 up');
  assert.equal(g1.matches.back.status.text, 'Seán & Mick 1 up');
  assert.equal(g1.matches.overall.status.text, 'All square');
  assert.equal(r.players.pat.ph, 12);
});

/* ---------- Scorecard photo check ---------- */
const FIX = require('../data/card-fixtures.json').cards;
const players4 = [{ id: 'pat', name: 'Pat' }, { id: 'dermot', name: 'Dermot' }, { id: 'sean', name: 'Seán' }, { id: 'mick', name: 'Mick' }];
const appCard = (() => {
  const SEED = require('../data/sample-day1.json');
  const s = JSON.parse(JSON.stringify(SEED.scores.r1));
  // back nine as entered in the test run: 15 Pat 3, Dermot 4, Seán 2, Mick picked up; 16-18 as on the test card except two app errors
  const back = { pat: [3, 4, 5, 4], dermot: [4, 5, 6, 5], sean: [2, 4, 4, 5], mick: ['P', 4, 5, 4] };
  Object.keys(back).forEach(p => back[p].forEach((v, i) => { s[p][15 + i] = v; }));
  return s;
})();
const F9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const B9 = [10, 11, 12, 13, 14, 15, 16, 17, 18];

test('card values: strokes, pick-up marks and unreadable cells', () => {
  assert.equal(E.cardValue({ value: 5 }), 5);
  assert.equal(E.cardValue({ value: 'X' }), 'P');
  assert.equal(E.cardValue('-'), 'P');
  assert.equal(E.cardValue({ value: '6' }), 6);
  assert.equal(E.cardValue({ value: null }), null);
  assert.equal(E.cardValue({ value: 0 }), null);
});

test('card rows match players by the names in the key, including short forms', () => {
  const m = E.matchCardRows(FIX['card-c-front-nine-reordered.jpg'].reading.players, players4, appCard);
  assert.deepEqual(m, { A: 'mick', B: 'sean', C: 'pat', D: 'dermot' });
});

test('card rows with no names are matched by the scores already in the app', () => {
  const rows = FIX['card-c-front-nine-reordered.jpg'].reading.players.map(p => Object.assign({}, p, { name: '' }));
  const m = E.matchCardRows(rows, players4, appCard);
  assert.deepEqual(m, { A: 'mick', B: 'sean', C: 'pat', D: 'dermot' });
});

test('card A: both real mistakes found, nothing else flagged', () => {
  const r = E.compareCard(FIX['card-a-front-nine-vertical.jpg'].reading, players4, appCard, HOLES, F9);
  assert.equal(r.checked, 36);
  assert.deepEqual(r.issues.map(i => [i.hole, i.pid, i.card, i.app, i.kind]), [[4, 'sean', 6, 5, 'differs'], [8, 'pat', 6, 5, 'differs']]);
});

test('card B: real mistakes found; the misread 9 is shown as unclear, not as a difference; pick-ups match', () => {
  const r = E.compareCard(FIX['card-b-back-nine-spanish.jpg'].reading, players4, appCard, HOLES, B9);
  assert.equal(r.checked, 36);
  const got = r.issues.map(i => [i.hole, i.pid, i.card, i.app, i.kind]);
  assert.deepEqual(got, [[16, 'sean', 9, 4, 'unclear'], [17, 'mick', 6, 5, 'differs'], [18, 'pat', 5, 4, 'differs']]);
});

test('card C: reordered key and strokes-with-points read correctly; one real mistake', () => {
  const r = E.compareCard(FIX['card-c-front-nine-reordered.jpg'].reading, players4, appCard, HOLES, F9);
  assert.deepEqual(r.issues.map(i => [i.hole, i.pid, i.card, i.app]), [[5, 'dermot', 6, 5]]);
  assert.equal(r.matched, 35);
});

test('holes not yet saved in the app are not checked; unreadable cells are raised', () => {
  const reading = { players: [{ letter: 'A', name: 'Pat', scores: { 1: { value: 4 }, 2: { value: null, note: 'smudged' } } }] };
  const app = { pat: { 1: 4, 2: 5 } };
  const r = E.compareCard(reading, players4, app, HOLES, [1, 2, 3]);
  assert.equal(r.checked, 2);
  assert.deepEqual(r.issues.map(i => i.kind), ['unreadable']);
});

test('a pick-up is shown as the strokes that net 0 points, and still scores 0', () => {
  const P = E.pickupStrokes;
  assert.equal(P(4, 0), 6);
  assert.equal(P(4, 2), 8);
  assert.equal(P(3, -1), 4);
  [[4, 0], [4, 2], [3, -1], [5, 1]].forEach(([par, shots]) => {
    assert.equal(E.stablefordPoints(P(par, shots), par, shots), 0);
    assert.equal(E.stablefordPoints(P(par, shots) - 1, par, shots), 1);
    assert.equal(E.stablefordPoints('P', par, shots), 0);
  });
});

test('roundStats: fun facts from hole by hole scores', () => {
  const holes = Array.from({ length: 18 }, (_, i) => ({ n: i + 1, par: 4, si: i + 1 }));
  const tee = { slope: 113, rating: 72, par: 72 };
  const card = (f) => { const c = {}; for (let n = 1; n <= 18; n++) c[n] = f(n); return c; };
  const comp = E.computeRound({
    groups: [{ id: 'g1', n: 1, teeTime: '', startHole: 1, teams: [['a', 'b']] }],
    holes, tee, allowance: 1, players: { a: { name: 'Ann', index: 0 }, b: { name: 'Bob', index: 0 } },
    scores: { a: card(n => (n >= 3 && n <= 6 ? 3 : n === 9 ? 8 : 4)), b: card(n => (n === 2 ? 'P' : n <= 9 ? 6 : 4)) }
  });
  const s = E.roundStats(comp, holes);
  assert.deepEqual(s.birdies.map(x => x.name), ['Ann']);
  assert.equal(s.birdies[0].count, 4);
  assert.equal(s.streak.name, 'Ann');
  assert.ok(s.streak.len === 9 && s.streak.from === 10);
  assert.deepEqual(s.scratches.map(x => x.name), ['Bob']);
  assert.deepEqual(s.blowup.map(x => x.name + x.n), ['Ann9']);
  assert.deepEqual(s.comeback.map(x => x.name), ['Bob']);
  assert.equal(s.bestNine.length, 1);
  assert.ok(s.hardest.length && s.easiest.length);
});
