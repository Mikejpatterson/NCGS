// Owner, 1 November: putting Brian in pot A locked the pots ("The draw has started") after one tap, with no way out.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
(async () => {
  const b = await chromium.launch();
  try {
    const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    const sync = () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
    await sync();
    const ids = await pg.evaluate(() => {
      const n = window.__ncgs; n.ORGPIN.pin = '1234';
      const c = n.D.courses().find(x => x.holes && x.tees);
      n.put('rounds', [{ id: 'pots-1', season: 2026, seq: 95, name: 'Pots test', date: '2026-12-01', course: c.id, tee: Object.keys(c.tees)[0], first_tee: '10:00', interval: 10, status: 'upcoming', source: 'organiser', groups: [], contests: [], kb: null }]);
      n.put('settings', [{ key: 'pots:pots-1', value: JSON.stringify({ pots: [[], [], [], []], show: false }) }]);
      return n.D.regulars().slice(0, 3).map(m => m.id);
    });
    await sync();
    const open = v => pg.evaluate(v => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'drawhome', p: { rid: 'pots-1' } }].concat(v ? [{ v, p: { rid: 'pots-1' } }] : []); n.render(); }, v);
    await open('pots');
    await pg.click(`[data-act="draw-pot"][data-pid="${ids[0]}"][data-p="0"]`); await pg.waitForTimeout(200);
    check('after one name in pot A, the pots are not "fixed"', !/the pots are fixed/.test(await pg.locator('main').innerText()));
    check('and the next player can still be put in a pot', !(await pg.$(`[data-act="draw-pot"][data-pid="${ids[1]}"][data-p="1"][disabled]`)));
    await pg.click(`[data-act="draw-pot"][data-pid="${ids[1]}"][data-p="1"]`); await pg.waitForTimeout(200);
    await pg.click(`[data-act="draw-pot"][data-pid="${ids[0]}"][data-p="2"]`); await pg.waitForTimeout(200);
    const pots = await pg.evaluate(() => JSON.parse(window.__ncgs.view().settings.find(s => s.key === 'pots:pots-1').value).pots);
    check('names can be moved between pots freely', pots[2].includes(ids[0]) && pots[1].includes(ids[1]) && !pots[0].includes(ids[0]), JSON.stringify(pots));
    await open(null);
    check('Breakfast draw does not say "Under way" or offer a restart', !/Fixed now the draw has started|Restart the draw/.test(await pg.locator('main').innerText()));
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
