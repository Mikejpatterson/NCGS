// Builds data/fixture-seed.json: made-up members, rounds and scores so the preview can be built and
// screenshotted without the society's real data. Every name here is invented. Same file every time.
// Run: node tools/make-fixture.js     Use: NCGS_FIXTURE=1 node build.js
const fs = require('fs');
const path = require('path');
const E = require('../src/engine.js');
const CFG = require('../data/trip-config.json');
const DEMO = require('../data/demo.json');

// The demo round (preview only) refers to these member ids, so the fixture uses the same ids with invented names.
const NAMES = {
  'john-w': 'Aidan', 'john-k': 'Bartley', colin: 'Cathal', damien: 'Donnacha',
  'mike-p': 'Eoghan', sean: 'Fiachra', peadar: 'Gearóid', dave: 'Hugh',
  'mike-f': 'Ivor', derek: 'Jarlath', brian: 'Kevin', kieran: 'Lorcan'
};
const ids = Object.keys(NAMES);
const members = ids.map((id, i) => ({ id, name: NAMES[id], full: NAMES[id] + ' Fixture', index: +(4.2 + i * 2.3).toFixed(1), active: true }));
members.push({ id: 'guest-x', name: 'Ultan', full: 'Ultan Fixture', index: 18.4, active: false });

const c = CFG.course;
const course = { id: 'cabopino', name: c.name, area: 'Marbella', tees: c.tees, holes: c.holes.map(h => ({ n: h.n, par: h.par, si: h.si, m: h.metres })) };
const teeKey = 'yellow', tee = course.tees[teeKey];

let seed = 20261018;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const groups = DEMO.rounds[0].groups.map(g => ({ id: g.id, n: g.n, teeTime: g.teeTime, startHole: 1, teams: g.teams }));
const kb = DEMO.rounds[0].kb;

function finished(id, seq, date, name, trip, day) {
  const ph = {}, scores = [];
  members.filter(m => m.active).forEach(m => {
    ph[m.id] = E.playingHandicap(m.index, tee, 1);
    course.holes.forEach(h => {
      const shots = E.shotsOnHole(ph[m.id], h.si);
      const x = rnd();
      const d = x < 0.05 ? -2 : x < 0.22 ? -1 : x < 0.6 ? 0 : x < 0.85 ? 1 : x < 0.96 ? 2 : 3;
      const strokes = x > 0.985 ? 'P' : Math.max(2, h.par + shots + d);
      scores.push({ round: id, player: m.id, hole: h.n, strokes, by: 'Fixture', at: date + 'T14:00:00Z' });
    });
  });
  const round = {
    id, season: 2026, seq, date, name, course: course.id, tee: teeKey, first_tee: '09:00', interval: 8, trip, trip_day: day,
    status: 'final', source: 'organiser', groups, kb, contests: [{ type: 'ntp', hole: 7 }, { type: 'ld', hole: 12 }],
    ph, allowance: 1, results: { snap: { holes: course.holes, tee } }, note: ''
  };
  return { round, scores };
}

const a = finished('fx-r1', 1, '2026-05-14', 'Cabopino', 'Marbella', 1);
const b = finished('fx-r2', 2, '2026-05-15', 'Cabopino, the long-named second day of the trip', 'Marbella', 2);
const upcoming = {
  id: 'fx-r3', season: 2026, seq: 3, date: '2026-11-20', name: 'Cabopino', course: course.id, tee: teeKey, first_tee: '10:00', interval: 8,
  trip: null, trip_day: null, status: 'upcoming', source: 'organiser', groups, kb, contests: [], ph: null, allowance: 1, results: null, note: ''
};

const out = { note: 'Invented fixture data for design review and tests. Not real people or results.', members, courses: [course], rounds: [a.round, b.round, upcoming], scores: [...a.scores, ...b.scores] };
fs.writeFileSync(path.join(__dirname, '..', 'data', 'fixture-seed.json'), JSON.stringify(out) + '\n');
console.log(`Fixture: ${members.length} members, ${out.rounds.length} rounds, ${out.scores.length} scores`);
