// Contest claims in playing order, through the app's own screens (Codex's counterexample, issue #1, 24 October):
// g1's A is beaten by g2's B and g3 says Nobody, but g1's save arrives last (no signal). Home and the after-hole
// question must still show B. Run against the invented fixture preview (the demo round has three groups, 10:00/08/16).
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
(async () => {
  const browser = await chromium.launch();
  let ok = true;
  const check = (name, cond) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + name); if (!cond) ok = false; };
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.__ncgs && window.__ncgs.D.rounds().some(r => r.status === 'live'));
    const setClaims = rows => page.evaluate(rows => { const n = window.__ncgs; const r = n.D.rounds().find(x => x.status === 'live');
      n.DB.server.tables.claims = n.DB.server.tables.claims.filter(c => !(c.round === r.id && c.hole === 7)).concat(rows.map(x => Object.assign({ round: r.id, hole: 7 }, x)));
      n.DB._view = null; n.DB._memo = {}; n.render(); }, rows);
    const info = await page.evaluate(() => { const n = window.__ncgs; const r = n.D.rounds().find(x => x.status === 'live');
      const p = gid => r.groups.find(g => g.id === gid).teams[0][0]; return { rid: r.id, A: p('g1'), B: p('g2'), C: r.groups[0].teams[1][0], nameB: n.D.nameOf(p('g2')), nameA: n.D.nameOf(p('g1')) }; });
    await setClaims([
      { grp: 'g2', player: info.B, at: '2026-05-14T10:15:00Z' },
      { grp: 'g3', player: '_nobody', at: '2026-05-14T10:30:00Z' },
      { grp: 'g1', player: info.A, at: '2026-05-14T11:00:00Z' }]);
    const order = await page.evaluate(rid => window.__ncgs.D.claims(rid)[7].map(c => c.gid).join(), info.rid);
    check('claims are read in playing order, not arrival order', order === 'g1,g2,g3');
    // Home's live contest list (the player is in g1)
    await page.evaluate(() => { const n = window.__ncgs; const r = n.D.rounds().find(x => x.status === 'live'); n.DB.prefs.me = r.groups[0].teams[0][0]; n.UI.stack = [{ v: 'home', p: {} }]; n.DB._view = null; n.DB._memo = {}; n.render(); });
    const home = await page.locator('.home-contests').innerText().catch(() => '');
    check('Home shows B leading hole 7, not the late-arriving A', new RegExp(`Hole 7[\\s\\S]*${info.nameB}`).test(home) && !new RegExp(`Hole 7\\s*\\n\\s*${info.nameA}`).test(home));
    // A group correcting its earlier nominee later still can't overtake a later group.
    await setClaims([
      { grp: 'g2', player: info.B, at: '2026-05-14T10:15:00Z' },
      { grp: 'g3', player: '_nobody', at: '2026-05-14T10:30:00Z' },
      { grp: 'g1', player: info.C, at: '2026-05-14T12:00:00Z' }]);
    check('a group changing its nominee later doesn\'t overtake', await page.evaluate(rid => { const l = window.__ncgs.D.claims(rid)[7].filter(c => c.pid !== '_nobody'); return l[l.length - 1].gid === 'g2'; }, info.rid));
    // A removed group's nominee can't win when every current group says Nobody (Codex, #39).
    await setClaims([
      { grp: 'g-removed', player: info.C, at: '2026-05-14T10:00:00Z' },
      { grp: 'g1', player: '_nobody', at: '2026-05-14T10:20:00Z' },
      { grp: 'g2', player: '_nobody', at: '2026-05-14T10:30:00Z' },
      { grp: 'g3', player: '_nobody', at: '2026-05-14T10:40:00Z' }]);
    check('a removed group\'s claim is left out', await page.evaluate(rid => window.__ncgs.D.claims(rid)[7].every(c => c.gid !== 'g-removed'), info.rid));
    const home2 = await page.locator('.home-contests').innerText().catch(() => '');
    check('Home shows Nobody for hole 7, not the removed group\'s player', !new RegExp(`Hole 7\\s*\\n\\s*${await page.evaluate(id => window.__ncgs.D.nameOf(id), info.C)}`).test(home2));
    check('no script errors', errors.length === 0); if (errors.length) console.log(errors);
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
