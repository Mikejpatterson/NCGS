// A leaderboard row whose round or player can't be found falls back to a plain player link (src/app/20-society.js dropRow).
// Found by Codex review of PR #36: the fallback must not read the missing round. Loaded from the source with stubs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '../src/app/20-society.js'), 'utf8');
const start = src.indexOf('function dropRow(');
const body = src.slice(start, src.indexOf('\n}\n', start) + 2);
const make = (round, comp) => new Function('D', 'computeR', 'UI', 'myGroup', 'cardParts', `${body}; return dropRow;`)(
  { round: () => round }, () => comp, { open: {} }, () => null, () => ({ table: '' }));

test('missing round: plain player link, no year, no crash', () => {
  const html = make(undefined, null)('gone', { id: 'p1' }, 'Name');
  assert.match(html, /data-act="player" data-pid="p1" data-year=""/);
});
test('round found but player missing: link carries the round\'s year', () => {
  const html = make({ id: 'r1', season: 2025 }, { players: {} })('r1', { id: 'p1' }, 'Name');
  assert.match(html, /data-year="2025"/);
});
