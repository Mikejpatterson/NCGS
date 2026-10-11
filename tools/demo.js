// Preview only: a demo round at Cabopino so the scoring can be tried. Clearly labelled "Demo" in the app,
// never counted in Golfer of the Year, and never loaded into the live app.
const fs = require('fs');
const path = require('path');
const E = require('../src/engine.js');
const SEED = require('../data/seed.json');

const course = SEED.courses.find(c => c.id === 'cabopino');
const tee = course.tees.yellow;
const day1 = SEED.rounds.find(r => r.id === '2026-cabopino');
const groups = day1.groups.map((g, i) => Object.assign({}, g, { teeTime: E.addMinutes('10:00', i * 8) }));
const round = {
  id: 'demo-cabopino', season: null, seq: 0, date: null, name: 'Demo round', course: 'cabopino', tee: 'yellow',
  first_tee: '10:00', interval: 8, trip: null, trip_day: null, status: 'live', source: 'demo',
  groups, kb: day1.kb, contests: [{ type: 'ntp', hole: 7 }, { type: 'ld', hole: 12 }, { type: 'ntp', hole: 15 }],
  ph: null, allowance: 1, results: null, note: 'Demo scores for trying the app'
};
let seed = 20261011;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const holes = [];
groups.forEach(g => {
  for (let n = 1; n <= 14; n++) {
    const h = course.holes[n - 1];
    const scores = {};
    g.teams.flat().forEach(pid => {
      const m = SEED.members.find(x => x.id === pid);
      const shots = E.shotsOnHole(E.playingHandicap(m.index, tee, 1), h.si);
      const x = rnd();
      const d = x < 0.05 ? -2 : x < 0.22 ? -1 : x < 0.6 ? 0 : x < 0.85 ? 1 : x < 0.96 ? 2 : 3;
      scores[pid] = { v: x > 0.985 ? 'P' : Math.max(2, h.par + shots + d), base: null };
    });
    holes.push({ op: 'saveHole', round: round.id, grp: g.id, hole: n, scores, by: 'Demo', claim: n === 7 && g.id === 'g1' ? 'john-k' : n === 12 && g.id === 'g2' ? 'sean' : undefined });
  }
});
holes.forEach(h => { if (h.claim === undefined) delete h.claim; });
fs.writeFileSync(path.join(__dirname, '..', 'data', 'demo.json'), JSON.stringify({ rounds: [round], claims: [], holes }));
console.log(`Demo: ${holes.length} hole saves across ${groups.length} groups`);
