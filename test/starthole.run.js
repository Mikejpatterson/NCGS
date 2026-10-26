// A group can be set to start on another hole, from the group's own options on the Groups screen. It saves at once.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'groups', p: { rid: 'fx-r3' } }]; n.UI.draft = null; n.render(); });
  if (!(await pg.$('[data-act="grp-group"]'))) { await pg.click('[data-act="org-draw"][data-kind="random"]'); await pg.waitForTimeout(200); }
  check('the start hole is not on show until a group is opened', !(await pg.$('select[data-change="grp-start"]')));
  await pg.click('[data-act="grp-group"][data-gi="0"]'); await pg.waitForTimeout(100);
  check('the group\'s options offer a start hole', !!(await pg.$('#sh-0')));
  await pg.selectOption('#sh-0', '10'); await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())); await pg.waitForTimeout(300);
  check('the group shows it starts on hole 10', /starts hole 10/.test(await pg.textContent('#app')));
  check('the start hole is saved on the round', await pg.evaluate(() => window.__ncgs.D.round('fx-r3').groups[0].startHole === 10));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
