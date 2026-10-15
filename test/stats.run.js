// Results has a Stats pill with fun facts once there are hole-by-hole scores.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
  await pg.click('[data-act="demo-fill"]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'board', p: {} }]; n.UI.res = 'lb'; n.render(); });
  check('a Stats pill appears on Results', !!(await pg.$('.seg.pills button[data-p="st"]')));
  await pg.click('.seg.pills button[data-p="st"]'); await pg.waitForTimeout(200);
  const t = await pg.textContent('#app');
  check('it shows the round in numbers with several facts', /The round in numbers/.test(t) && (await pg.$$('.sbadges .sbd')).length >= 3);
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await pg.screenshot({ path: '/tmp/stats.png' });
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
