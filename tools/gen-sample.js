// Builds data/sample-day1.json: demo scores for Day 1 at Cabopino, every group through hole 14.
// Group 1 is written by hand so its Buggy Wars match has wins, halves and a changing lead.
// Groups 2 and 3 use a fixed random seed, so the file is the same every time.
const fs = require('fs');
const path = require('path');
const E = require('../src/engine.js');
const CFG = require('../data/trip-config.json');

const tee = CFG.course.tees.yellow;
const holes = CFG.course.holes;
const r1 = CFG.rounds.find(r => r.id === 'r1');
const THRU = 14;

const hand = {
  //        1  2  3  4  5  6  7  8  9 10 11 12  13 14
  pat:    [4, 5, 5, 5, 5, 4, 3, 5, 4, 5, 6, 5, 3, 6],
  dermot: [6, 5, 6, 7, 5, 6, 4, 5, 6, 5, 6, 6, 'P', 7],
  sean:   [5, 6, 4, 5, 6, 5, 4, 4, 6, 5, 5, 6, 4, 5],
  mick:   [4, 5, 5, 4, 5, 5, 3, 5, 5, 4, 5, 6, 4, 6]
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261014);

function demoGross(par, shots, ph) {
  const r = rng();
  // strokes over net par: mostly net pars and bogeys, the odd net birdie and blow-up
  const d = r < 0.02 ? -2 : r < 0.18 ? -1 : r < 0.62 ? 0 : r < 0.90 ? 1 : r < 0.97 ? 2 : 3;
  const g = Math.max(1, par + shots + d);
  if (E.stablefordPoints(g, par, shots) === 0 && ph >= 18 && rng() < 0.6) return 'P';
  return g;
}

const scores = {};
r1.groups.forEach(g => g.teams.flat().forEach(pid => {
  scores[pid] = {};
  const p = CFG.players.find(x => x.id === pid);
  const ph = E.playingHandicap(p.index, tee, CFG.allowance);
  for (let n = 1; n <= THRU; n++) {
    const h = holes[n - 1];
    scores[pid][n] = hand[pid] ? hand[pid][n - 1] : demoGross(h.par, E.shotsOnHole(ph, h.si), ph);
  }
}));

const t = (hh, mm) => `2026-10-14T${hh}:${mm}:00+02:00`;
const sample = {
  note: 'Demo scores for testing. Not real results.',
  scores: { r1: scores },
  scorers: { r1: { g1: 'sean', g2: 'liam', g3: 'joe' } },
  claims: {
    r1: {
      7: [{ pid: 'pat', gid: 'g1', at: t('11', '02') }, { pid: 'liam', gid: 'g2', at: t('11', '12') }],
      12: [{ pid: 'mick', gid: 'g1', at: t('12', '05') }, { pid: 'ger', gid: 'g2', at: t('12', '16') }]
    }
  },
  log: [
    { at: t('09', '30'), by: 'Organiser', action: 'Round 1 published', detail: 'Groups, buggies and tee times for Wednesday 14 October' },
    { at: t('09', '31'), by: 'Organiser', action: 'Handicaps set', detail: '95% of course handicap, rounded once (WHS)' }
  ]
};

fs.writeFileSync(path.join(__dirname, '..', 'data', 'sample-day1.json'), JSON.stringify(sample, null, 1));

const players = Object.fromEntries(CFG.players.map(p => [p.id, p]));
const res = E.computeRound({ groups: r1.groups, holes, tee, allowance: CFG.allowance, players, scores });
res.groups.forEach(g => console.log(`Group ${g.n}: front ${g.matches.front.status.text} | back ${g.matches.back.status.text} | overall ${g.matches.overall.status.text}`));
res.leaderboard.forEach(r => console.log(r.posLabel.padStart(3), r.name.padEnd(8), r.total, 'thru', r.thru, 'ph', res.players[r.id].ph));
res.pairs.forEach(p => console.log(p.label.padEnd(18), p.total, p.lowest ? '<- lowest' : ''));
