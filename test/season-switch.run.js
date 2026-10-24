// Owner, 24 October: the organiser starts each new season by hand in Settings. Golfer of the Year then starts fresh,
// the old season stays reachable, and the switch can be undone. Run against the invented fixture preview.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
(async () => {
  const browser = await chromium.launch();
  let ok = true;
  const check = (name, cond) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + name); if (!cond) ok = false; };
  try {
    const errors = [];
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.brand');
    const go = (stack, org) => page.evaluate(([stack, org]) => { const n = window.__ncgs; n.DB._view = null; n.DB._memo = {};
      if (org) { n.UI.org = true; n.UI.orgUnlocked = true; n.ORGPIN.pin = '1234'; n.UI.orgStack = stack; } else { n.UI.org = false; n.UI.stack = stack; } n.render(); }, [stack, org]);
    // A finished 2026 season with its trip; nothing live today.
    await page.evaluate(() => { const n = window.__ncgs; const t = n.DB.server.tables; t.rounds = t.rounds.filter(r => r.status === 'final'); t.rounds.forEach(r => { r.season = 2026; }); });

    await go([{ v: 'home', p: {} }], false);
    check('before the switch, Home shows 2026', /2026/.test(await page.locator('.home-season-intro').innerText()));

    await go([{ v: 'home', p: {} }, { v: 'settings', p: {} }], true);
    check('Settings shows the current season and the switch', /Current season\s*2026/.test(await page.locator('body').innerText()) && (await page.locator('[data-act="season-next"]').count()) === 1);
    await page.click('[data-act="season-next"]');
    check('the first tap only asks to confirm', /Tap again to start the 2027 season/.test(await page.locator('[data-act="season-next"]').innerText()) && await page.evaluate(() => !window.__ncgs.D.setting('season', '')));
    await page.click('[data-act="season-next"]'); await page.waitForTimeout(200);
    check('the second tap starts 2027', await page.evaluate(() => window.__ncgs.D.setting('season', '') === '2027'));
    check('the change is in the organiser log', await page.evaluate(() => (window.__ncgs.DB.server.tables.log || []).some(l => l.action === 'Season started' && l.detail === '2027')));

    await go([{ v: 'home', p: {} }], false);
    const home = await page.locator('.home-season-intro').innerText();
    check('Home shows 2027 and a fresh scorecard', /2027/.test(home) && /A fresh scorecard/.test(home));
    check('last season\'s trip is not offered as this season\'s', !(await page.locator('[data-act="trip"]').count()));

    await go([{ v: 'home', p: {} }, { v: 'goy', p: {} }], false);
    const goy = await page.locator('body').innerText();
    check('Golfer of the Year 2027 is empty, and says so', /No rounds played in 2027 yet/.test(goy) && !(await page.locator('.leadcard').count()));
    check('the year picker offers 2027 and 2026', await page.evaluate(() => [...document.querySelectorAll('.seg.year button')].map(b => b.textContent).join() === '2027,2026'));
    check('the year picker is readable and big enough to tap', await page.evaluate(() => [...document.querySelectorAll('.seg.year button')].every(b => {
      const c = getComputedStyle(b).color.match(/\d+/g).map(Number); return b.getBoundingClientRect().height >= 44 && c[0] + c[1] + c[2] < 300; })));
    await page.click('.seg.year button[data-y="2026"]'); await page.waitForTimeout(150);
    check('2026 is still there in full', (await page.locator('.lrow.goy').count()) > 0 && (await page.locator('.lrow.goy[data-year="2026"]').count()) > 0);
    await page.click('.lrow.goy'); await page.waitForTimeout(150);
    check('a player opened from 2026 stays on 2026', (await page.locator('.tiles .tile.flag .cap').innerText()) === 'GOY 2026');

    await go([{ v: 'home', p: {} }, { v: 'settings', p: {} }], true);
    await page.click('[data-act="season-back"]'); await page.click('[data-act="season-back"]'); await page.waitForTimeout(200);
    check('going back restores 2026', await page.evaluate(() => window.__ncgs.D.setting('season', '') === '2026'));

    await page.evaluate(() => { const t = window.__ncgs.DB.server.tables; t.rounds[0].status = 'live'; });
    await go([{ v: 'home', p: {} }, { v: 'settings', p: {} }], true);
    check('no switching while a round is being played', !(await page.locator('[data-act="season-next"]').count()) && /After today's round is finished/.test(await page.locator('body').innerText()));

    check('nothing runs off the side', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('no script errors', errors.length === 0); if (errors.length) console.log(errors);
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
