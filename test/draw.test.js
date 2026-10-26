// Breakfast draw (owner brief §7; Codex review on issue #1, 26 October): src/draw.js.
const test = require('node:test');
const assert = require('node:assert');
const D = require('../src/draw.js');

const pots = [['a1', 'a2', 'a3', 'a4'], ['b1', 'b2', 'b3', 'b4'], ['c1', 'c2', 'c3', 'c4'], ['d1', 'd2', 'd3', 'd4']];
// A seeded 32-bit source, so a test can replay a draw.
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
const row = (rid, ep, t, p, dev, pid) => ({ key: `draw:${rid}:${ep}:${t}:${p}:${dev}`, value: JSON.stringify({ pid, at: '2026-10-26T08:00:00Z' }) });
// Run a whole draw on one device, storing each pick as its own settings row, the way the app does.
function runDraw(ps, rand, together) {
  const rows = [];
  for (let i = 0; i < 100; i++) {
    const st = D.state(ps, D.picksFrom(rows, 'r', 1));
    if (!st.next.length) return { rows, st };
    D.draw(st, together ? st.next : st.next.slice(0, 1), rand).forEach(x => rows.push(row('r', 1, x.t, x.p, 'ipad', x.pid)));
  }
  throw new Error('draw did not finish');
}

test('16 players in four pots make four teams, one from each pot, nobody twice', () => {
  const { st } = runDraw(pots, seeded(7));
  assert.strictEqual(st.teams.length, 4);
  assert.ok(st.done);
  const all = st.teams.flatMap(t => t.slots.map(s => s.pid));
  assert.strictEqual(new Set(all).size, 16);
  st.teams.forEach(t => t.slots.forEach(s => assert.ok(pots[s.p].includes(s.pid), 'drawn from its own pot')));
  assert.deepStrictEqual(D.blockers(st), []);
});

test('all four together and one pot at a time both fill team 1 first, then team 2', () => {
  for (const together of [false, true]) {
    const rows = [];
    const st0 = D.state(pots, {});
    assert.deepStrictEqual(st0.next.map(s => s.t + ':' + s.p), ['0:0', '0:1', '0:2', '0:3']);
    D.draw(st0, together ? st0.next : st0.next.slice(0, 1), seeded(3)).forEach(x => rows.push(row('r', 1, x.t, x.p, 'ipad', x.pid)));
    const st1 = D.state(pots, D.picksFrom(rows, 'r', 1));
    assert.strictEqual(st1.current, together ? 1 : 0);
  }
});

test('the draw is worked out from the saved picks: reloading replays it and never redraws', () => {
  const { rows, st } = runDraw(pots, seeded(11));
  const again = D.state(pots, D.picksFrom(JSON.parse(JSON.stringify(rows)), 'r', 1));
  assert.deepStrictEqual(again.teams, st.teams);
  // half way: the same remaining names and the same next slot after a reload
  const half = rows.slice(0, 6);
  const a = D.state(pots, D.picksFrom(half, 'r', 1)), b = D.state(pots, D.picksFrom(half.map(r => ({ ...r })), 'r', 1));
  assert.deepStrictEqual(a.left, b.left);
  assert.deepStrictEqual(a.next, b.next);
});

test('a restart (new epoch) ignores the old picks but keeps them stored', () => {
  const { rows } = runDraw(pots, seeded(5));
  const st = D.state(pots, D.picksFrom(rows, 'r', 2));
  assert.ok(!st.started);
  assert.strictEqual(st.next.length, 4);
  assert.strictEqual(Object.keys(D.picksFrom(rows, 'r', 1)).length, 16, 'epoch 1 still readable');
});

test('two devices drawing the same place keep both rows and block the groups (never a silent winner)', () => {
  const rows = [row('r', 1, 0, 0, 'ipad', 'a1'), row('r', 1, 0, 0, 'phone', 'a2')];
  const st = D.state(pots, D.picksFrom(rows, 'r', 1));
  assert.strictEqual(st.conflicts.length, 1);
  assert.strictEqual(st.conflicts[0].rows.length, 2);
  assert.strictEqual(st.teams[0].slots[0].pid, null);
  assert.ok(D.blockers(st).some(w => /Two devices/.test(w)));
  // even the same name from two devices is a conflict: two reveals happened
  const same = D.state(pots, D.picksFrom([row('r', 1, 0, 0, 'ipad', 'a1'), row('r', 1, 0, 0, 'phone', 'a1')], 'r', 1));
  assert.strictEqual(same.conflicts.length, 1);
});

test('someone drawn twice (two devices, different places) is caught', () => {
  const rows = [row('r', 1, 0, 0, 'ipad', 'a1'), row('r', 1, 1, 0, 'phone', 'a1')];
  const st = D.state(pots, D.picksFrom(rows, 'r', 1));
  assert.deepStrictEqual(st.dup, ['a1']);
  assert.ok(D.blockers({ ...st, next: [] }).some(w => /drawn twice/.test(w)));
});

test('a pick from outside its pot is caught', () => {
  const st = D.state(pots, D.picksFrom([row('r', 1, 0, 0, 'ipad', 'b1')], 'r', 1));
  assert.strictEqual(st.stray.length, 1);
});

test('short pot: the last team gets nobody from it, and the groups wait for the committee', () => {
  const ps = pots.map((x, i) => (i === 3 ? x.slice(0, 3) : x));
  const { st } = runDraw(ps, seeded(9));
  assert.ok(st.done);
  assert.deepStrictEqual(st.short, [4]);
  assert.strictEqual(st.teams[3].slots[3].pid, null);
  assert.ok(D.blockers(st).some(w => /Team 4 is short/.test(w)));
  assert.deepStrictEqual(D.blockers(st, { shortOk: [4] }), []);
});

test('the groups cannot be made while picks are unsaved, unfinished or not started', () => {
  assert.ok(D.blockers(D.state(pots, {})).some(w => /Nobody has been drawn/.test(w)));
  const half = D.state(pots, D.picksFrom([row('r', 1, 0, 0, 'ipad', 'a1')], 'r', 1));
  assert.ok(D.blockers(half).some(w => /not finished/.test(w)));
  const { st } = runDraw(pots, seeded(2));
  assert.ok(D.blockers(st, { pending: true }).some(w => /not saved/.test(w)));
});

test('groups follow draw order, tee times from the first tee, the inner split is only storage', () => {
  const { st } = runDraw(pots, seeded(4));
  const add = (t, m) => { const [h, mm] = t.split(':').map(Number); const x = h * 60 + mm + m; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
  const g = D.groupsFrom(st, '10:00', 10, add);
  assert.deepStrictEqual(g.map(x => x.teeTime), ['10:00', '10:10', '10:20', '10:30']);
  assert.deepStrictEqual(g[0].teams.flat(), st.teams[0].slots.map(s => s.pid));
  const ps = pots.map((x, i) => (i === 3 ? x.slice(0, 3) : x));
  const short = runDraw(ps, seeded(9)).st;
  assert.deepStrictEqual(D.groupsFrom(short, '', 0, add)[3].teams.map(x => x.length), [2, 1]);
});

test('unbiased pick: rejection sampling throws away the biased top range', () => {
  // n = 3: the top 0x100000000 % 3 = 1 value is rejected
  const vals = [0xFFFFFFFF, 5];
  assert.strictEqual(D.pickIndex(3, () => vals.shift()), 2);
  const counts = [0, 0, 0, 0, 0];
  const r = seeded(1);
  for (let i = 0; i < 50000; i++) counts[D.pickIndex(5, r)]++;
  counts.forEach(c => assert.ok(Math.abs(c - 10000) < 600, 'roughly even: ' + counts));
  assert.throws(() => D.pickIndex(0, r));
});

test('pots: nobody in two pots, no empty pot', () => {
  assert.deepStrictEqual(D.potProblems(pots), []);
  assert.ok(D.potProblems([['a'], ['a']]).some(w => /pot A and pot B/.test(w)));
  assert.ok(D.potProblems([['a'], []]).some(w => /Pot B is empty/.test(w)));
});

test('rows from other rounds, bad values and other settings are ignored', () => {
  const rows = [row('other', 1, 0, 0, 'ipad', 'a1'), { key: 'draw:r:1:0:0:ipad', value: 'not json' }, { key: 'pots:r', value: '{}' }];
  assert.deepStrictEqual(D.picksFrom(rows, 'r', 1), {});
});

test('after a handover, a late pick from the old device for a new place is a conflict', () => {
  // the iPad drew team 1 pot A (confirmed, kept); the phone took over; the iPad, still offline, then drew pot B
  const rows = [row('r', 1, 0, 0, 'ipad', 'a1'), row('r', 1, 0, 1, 'ipad', 'b2')];
  const st = D.state(pots, D.picksFrom(rows, 'r', 1), { holder: 'phone', keep: ['0:0'] });
  assert.strictEqual(st.teams[0].slots[0].pid, 'a1', 'the kept pick stands');
  assert.strictEqual(st.teams[0].slots[1].pid, null);
  assert.strictEqual(st.conflicts.length, 1);
  // the new holder's own picks are fine
  const ok = D.state(pots, D.picksFrom([row('r', 1, 0, 0, 'ipad', 'a1'), row('r', 1, 0, 1, 'phone', 'b2')], 'r', 1), { holder: 'phone', keep: ['0:0'] });
  assert.strictEqual(ok.conflicts.length, 0);
});
