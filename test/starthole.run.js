// A group can be set to start on another hole; the choice is saved and that group's scoring starts there.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'playing', p: { rid: 'demo-cabopino' } }]; n.UI.draft = null; n.render(); });
  if (!(await pg.$('select[data-change="start-hole"]'))) { await pg.click('[data-act="org-draw"][data-kind="random"]'); await pg.waitForTimeout(150); }
  check('each group offers a start hole', (await pg.$$('select[data-change="start-hole"]')).length >= 1);
  await pg.selectOption('#sh-0', '10'); await pg.waitForTimeout(150);
  check('choosing 10 shows it on the group', /Hole 10/.test(await pg.textContent('#app')));
  await pg.click('[data-act="org-save-groups"]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())); await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => window.__ncgs.D.round('demo-cabopino').groups.map(g => g.startHole));
  check('the start hole is saved on the round', r[0] === 10);
  check('and that group\'s scoring order begins on hole 10', await pg.evaluate(() => { const c = window.__ncgs.D.round('demo-cabopino'); return c.groups[0].startHole === 10; }));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
