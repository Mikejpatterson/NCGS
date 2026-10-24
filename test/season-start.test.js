// The season on show (src/app/10-data.js seasonOf, seasonsList): the organiser's chosen season wins (owner, 24 October).
// Loaded from the source with stubs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '../src/app/10-data.js'), 'utf8');
const line = name => src.split('\n').find(l => l.startsWith(`const ${name} = `));
const make = (rounds, setting) => new Function('D', 'isDemo', `${line('seasonOf')}\n${line('seasonsList')}\nreturn { seasonOf, seasonsList };`)(
  { rounds: () => rounds, setting: (k, d) => (k === 'season' && setting ? setting : d) }, r => !!r.demo);
const r2026 = [{ season: 2026, status: 'final' }, { season: 2026, status: 'final' }];

test('before any switch: the latest season with a played round', () => {
  assert.equal(make(r2026).seasonOf(), 2026);
});
test('a 2027 round booked early does not move the season on by itself', () => {
  assert.equal(make([...r2026, { season: 2027, status: 'upcoming' }]).seasonOf(), 2026);
});
test('once the organiser starts 2027, it is the season on show, before any 2027 round', () => {
  const s = make([...r2026, { season: 2027, status: 'upcoming' }], '2027');
  assert.equal(s.seasonOf(), 2027);
  assert.deepStrictEqual(s.seasonsList(), [2027, 2026]);
});
test('demo rounds never set the season', () => {
  assert.equal(make([...r2026, { season: 2030, status: 'live', demo: true }]).seasonOf(), 2026);
});
