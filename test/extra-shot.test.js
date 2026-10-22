// The "extra shot" line after saving a hole (src/app/30-play.js extraShotLines). Pure function, loaded from the source.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '../src/app/30-play.js'), 'utf8');
const body = src.slice(src.indexOf('function extraShotLines('), src.indexOf('/* A nine\'s holes as a small grid:'));
const extraShotLines = new Function(`${body}; return extraShotLines;`)();
const teams = [['mike', 'sean'], ['cathal', 'dom']];
const name = id => ({ mike: 'Mike', sean: 'Sean', cathal: 'Cathal', dom: 'Dom' })[id];
const run = s => extraShotLines(teams, id => s[id], 16, name).map(x => ({ team: x.team, text: x.text }));

test('nobody has an edge when the highest on each side match', () => {
  assert.deepStrictEqual(run({ mike: 1, sean: 0, cathal: 1, dom: 0 }), []);
});
test('one player with an extra shot on the other buggy', () => {
  assert.deepStrictEqual(run({ mike: 1, sean: 0, cathal: 0, dom: 0 }), [{ team: 0, text: 'Mike has an extra shot on Buggy\u00a02 on\u00a016' }]);
});
test('both partners, and the other buggy', () => {
  assert.deepStrictEqual(run({ mike: 0, sean: 0, cathal: 1, dom: 1 }), [{ team: 1, text: 'Cathal and Dom have an extra shot on Buggy\u00a01 on\u00a016' }]);
});
test('two extra shots', () => {
  assert.deepStrictEqual(run({ mike: 2, sean: 0, cathal: 0, dom: 0 }), [{ team: 0, text: 'Mike has two extra shots on Buggy\u00a02 on\u00a016' }]);
});
test('partners with different edges', () => {
  assert.deepStrictEqual(run({ mike: 2, sean: 1, cathal: 0, dom: 0 }), [{ team: 0, text: 'Mike has two extra shots and Sean an extra shot on Buggy\u00a02 on\u00a016' }]);
});
test('an extra shot counts against the other buggy\'s highest, not its lowest', () => {
  assert.deepStrictEqual(run({ mike: 1, sean: 1, cathal: 1, dom: 0 }), []);
});
test('the card parts: who has the shot, where, and whose badges', () => {
  assert.deepStrictEqual(extraShotLines(teams, id => ({ cathal: 1 })[id] || 0, 16, name),
    [{ team: 1, pids: ['cathal'], who: 'Cathal has an extra shot', where: 'on Buggy\u00a01 on\u00a016', text: 'Cathal has an extra shot on Buggy\u00a01 on\u00a016' }]);
});
