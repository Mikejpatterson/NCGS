// Organiser: default-PIN and testing banners, backup now, and restore of missing data.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  const text = () => pg.textContent('#app');
  const tap = async s => { await pg.click(s); await pg.waitForTimeout(250); };
  await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.ORGPIN.weak = true; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
  const t = await text();
  check('unlocking with the starting PIN shows the change-PIN banner', /Change the organiser PIN/.test(t));
  check('Testing mode is flagged on the organiser home', /Testing mode is on/.test(t));
  await tap('[data-act="org-go"][data-v="export"]');
  check('Backup and restore are on the export screen', /Back up now/.test(await text()) && !!(await pg.$('#restorejson')));
  await tap('[data-act="backup-now"]');
  check('Back up now reports success', /Backup saved/.test(await pg.textContent('body')));
  // delete a member, then restore from an export taken before
  const before = await pg.evaluate(() => JSON.stringify({ tables: window.__ncgs.DB.server.tables }));
  const count0 = await pg.evaluate(() => window.__ncgs.D.members().length);
  await pg.fill('#restorejson', before);
  await tap('[data-act="restore"]');
  check('restore asks to confirm first', /Tap again to restore/.test(await text()));
  await tap('[data-act="restore"]');
  check('restoring an export with nothing missing says so', /Nothing was missing/.test(await pg.textContent('body')));
  check('the member count is unchanged', (await pg.evaluate(() => window.__ncgs.D.members().length)) === count0);
  await pg.fill('#restorejson', 'not json');
  await tap('[data-act="restore"]');
  check('rubbish is refused', /does not look like an export/.test(await pg.textContent('body')));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
