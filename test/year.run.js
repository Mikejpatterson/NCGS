// A second season appears: the year picker shows up, picks the right rounds, and nothing on the front page is tied to one year.
// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/year.run.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  const text = () => pg.textContent('#app');
  const tap = async s => { await pg.click(s); await pg.waitForTimeout(150); };
  check('with one season there is no year picker and no year in the header', !(await pg.$('.seg.year')) && !/20\d\d season/.test(await pg.textContent('.hero.home')));
  await tap('[data-act="goy"]');
  check('Golfer of the Year shows no picker with a single season', !(await pg.$('.seg.year')) && /2026 · best 3 scores count/.test(await text()));
  await tap('[data-act="back"]');
  // an earlier season arrives: a copy of a finished round, dated 2025
  await pg.evaluate(() => {
    const r = Object.assign({}, window.__ncgs.D.rounds().find(x => x.status === 'final' && x.season === 2026));
    r.id = '2025-test-round'; r.season = 2025; r.seq = 1; r.date = '2025-10-10'; r.name = 'Old Course 2025'; r.trip = null; r.trip_day = null;
    const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.put('rounds', [r]);
  });
  await pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())); await pg.waitForTimeout(300);
  await pg.evaluate(() => { window.__ncgs.UI.stack = [{ v: 'home', p: {} }]; window.__ncgs.render(); });
  await tap('[data-act="rounds"]');
  const labels = () => pg.$$eval('.seg.year button', e => e.map(x => x.textContent + (x.classList.contains('on') ? '*' : '')));
  check('Past rounds shows 2026 and 2025, with the current season chosen', JSON.stringify(await labels()) === JSON.stringify(['2026*', '2025']));
  check('and lists only that season\'s rounds', !/Old Course 2025/.test(await text()));
  await tap('.seg.year button[data-y="2025"]');
  check('choosing 2025 shows the 2025 round and not the 2026 ones', /Old Course 2025/.test(await text()) && !/Rio Real/.test(await text()) && JSON.stringify(await labels()) === JSON.stringify(['2026', '2025*']));
  await tap('[data-act="back"]'); await tap('[data-act="goy"]');
  check('Golfer of the Year keeps the chosen year and says which', /2025 · best 3 scores count/.test(await text()));
  await tap('.seg.year button[data-y="2026"]');
  check('and switches back to the current season', /2026 · best 3 scores count/.test(await text()));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close();
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
