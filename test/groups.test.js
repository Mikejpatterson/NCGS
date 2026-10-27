// One set of group-change rules for every round (owner, 26 October): src/groups.js.
const test = require('node:test');
const assert = require('node:assert');
const G = require('../src/groups.js');
const E = require('../src/engine.js');

const base = () => [
  { id: 'g1', n: 1, teeTime: '10:00', startHole: 1, teams: [['a', 'b'], ['c', 'd']] },
  { id: 'g2', n: 2, teeTime: '10:08', startHole: 1, teams: [['e', 'f'], ['g', 'h']] },
  { id: 'g3', n: 3, teeTime: '10:16', startHole: 1, teams: [['i', 'j'], ['k']] }
];
const tidy = g => G.tidy(g, '10:00', 8, E.addMinutes);
const flat = g => g.map(x => G.idsOf(x).join(''));

test('move a late player from the first group to the last; buggies refill the gap, tee times stay in order', () => {
  const g = tidy(G.apply(base(), { type: 'move', pid: 'b', to: 2 }));
  assert.deepStrictEqual(flat(g), ['acd', 'efgh', 'ijkb']);
  assert.deepStrictEqual(g[2].teams, [['i', 'j'], ['k', 'b']], 'b fills the three-ball\'s gap');
  assert.deepStrictEqual(g[0].teams, [['a'], ['c', 'd']]);
  assert.deepStrictEqual(g.map(x => x.teeTime), ['10:00', '10:08', '10:16']);
  assert.deepStrictEqual(g.map(x => x.id), ['g1', 'g2', 'g3'], 'ids stay (claims and checks are keyed by them)');
});

test('a full group refuses a fifth player, with a plain reason', () => {
  assert.throws(() => G.apply(base(), { type: 'move', pid: 'a', to: 1 }), /Group 2 already has 4/);
  assert.throws(() => G.apply(base(), { type: 'add', add: 'z', to: 0 }), /already has 4/);
});

test('swap two players between groups: each takes the other\'s buggy seat', () => {
  const g = G.apply(base(), { type: 'swap', pid: 'a', with: 'h' });
  assert.deepStrictEqual(g[0].teams, [['h', 'b'], ['c', 'd']]);
  assert.deepStrictEqual(g[1].teams, [['e', 'f'], ['g', 'a']]);
});

test('take a player out: the group gets smaller; an empty group disappears and the rest move up', () => {
  let g = tidy(G.apply(base(), { type: 'remove', pid: 'k' }));
  assert.deepStrictEqual(g[2].teams, [['i'], ['j']], 'a two-ball plays one against one');
  g = tidy(G.apply(G.apply(g, { type: 'remove', pid: 'i' }), { type: 'remove', pid: 'j' }));
  assert.strictEqual(g.length, 2);
});

test('replace a player with someone new: same seat, same buggy', () => {
  const g = G.apply(base(), { type: 'replace', pid: 'c', add: 'z' });
  assert.deepStrictEqual(g[0].teams, [['a', 'b'], ['z', 'd']]);
  assert.throws(() => G.apply(base(), { type: 'replace', pid: 'c', add: 'e' }), /Already playing/);
});

test('add a player to a three-ball, or start a new group at the end', () => {
  let g = G.apply(base(), { type: 'add', add: 'z', to: 2 });
  assert.deepStrictEqual(g[2].teams, [['i', 'j'], ['k', 'z']]);
  g = tidy(G.apply(base(), { type: 'add', add: 'z', to: 3 }, 'g9'));
  assert.strictEqual(g.length, 4);
  assert.deepStrictEqual([g[3].id, g[3].n, g[3].teeTime], ['g9', 4, '10:24']);
});

test('reorder groups: the first group can go out last; tee times follow the new order', () => {
  const g = tidy(G.apply(base(), { type: 'order', from: 0, to: 2 }));
  assert.deepStrictEqual(flat(g), ['efgh', 'ijk', 'abcd']);
  assert.deepStrictEqual(g.map(x => [x.id, x.n, x.teeTime]), [['g2', 1, '10:00'], ['g3', 2, '10:08'], ['g1', 3, '10:16']]);
});

test('other group details (start hole, KB off, the draw mark) survive a change', () => {
  const b = base(); b[0].startHole = 10; b[0].noKb = true; b[0].draw = 2;
  const g = G.apply(b, { type: 'move', pid: 'e', to: 2 });
  assert.deepStrictEqual([g[0].startHole, g[0].noKb, g[0].draw], [10, true, 2]);
});

test('KB pairs: still-valid pairs stay, only broken ones are re-paired across groups', () => {
  const kb = [['a', 'e'], ['b', 'f'], ['c', 'i'], ['d', 'j'], ['g', 'k']];
  // move b into f's group: b & f are now in the same group, so that pair breaks
  const g = G.apply(base(), { type: 'remove', pid: 'h' });
  const moved = G.apply(g, { type: 'move', pid: 'b', to: 1 });
  const res = G.repairKb(moved, kb, [], E.shuffle, 5);
  const keep = res.kb.filter(pr => kb.some(o => o.join() === pr.join()));
  assert.strictEqual(keep.length, 3, 'only one working pair had to be freed to fix the broken one');
  const groupOf = {}; moved.forEach(x => G.idsOf(x).forEach(p => { groupOf[p] = x.id; }));
  assert.ok(res.kb.every(([x, y]) => groupOf[x] !== groupOf[y]), 'partners are in different groups');
  assert.ok(res.changed.length >= 1);
});

test('KB repair avoids past partners when it can', () => {
  const groups = [{ id: 'g1', teams: [['a'], ['b']] }, { id: 'g2', teams: [['c'], ['d']] }];
  const res = G.repairKb(groups, [], [['a', 'c'], ['b', 'd']], E.shuffle, 1);
  assert.deepStrictEqual(res.kb.map(p => p.slice().sort().join('')).sort(), ['ad', 'bc']);
});

test('move a player into a new group at the end', () => {
  const g = tidy(G.apply(base(), { type: 'move', pid: 'a', to: 3 }, 'g4'));
  assert.deepStrictEqual(flat(g), ['bcd', 'efgh', 'ijk', 'a']);
  assert.deepStrictEqual([g[3].id, g[3].teeTime], ['g4', '10:24']);
});
