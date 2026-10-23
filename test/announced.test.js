// Upcoming rounds members can see (src/app/20-society.js announced; upcoming in src/app/10-data.js): only once they have a date. Loaded from the source.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const read = f => fs.readFileSync(require('path').join(__dirname, '../src/app/' + f), 'utf8');
const src = read('10-data.js') + '\n' + read('20-society.js');
const pick = name => src.split('\n').find(l => l.startsWith(`const ${name} = `));
const make = rounds => new Function('D', `${pick('upcoming')}\n${pick('announced')}\nreturn { upcoming, announced };`)({ rounds: () => rounds });

test('an undated upcoming round is upcoming but not announced', () => {
  const { upcoming, announced } = make([{ id: 'a', status: 'upcoming', date: '' }, { id: 'b', status: 'final', date: '2026-05-14' }]);
  assert.deepStrictEqual(upcoming().map(r => r.id), ['a']);
  assert.deepStrictEqual(announced(), []);
});
test('dated upcoming rounds are announced, soonest first', () => {
  const { announced } = make([{ id: 'late', status: 'upcoming', date: '2026-12-01' }, { id: 'none', status: 'upcoming' }, { id: 'soon', status: 'upcoming', date: '2026-11-14' }]);
  assert.deepStrictEqual(announced().map(r => r.id), ['soon', 'late']);
});
test('live and finished rounds are never announced', () => {
  const { announced } = make([{ id: 'l', status: 'live', date: '2026-10-23' }, { id: 'f', status: 'final', date: '2026-10-01' }]);
  assert.deepStrictEqual(announced(), []);
});
