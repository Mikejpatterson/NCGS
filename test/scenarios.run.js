// The preview's test scenarios (src/preview/scenarios.js): each one opens with Home in the right situation.
// Run against the invented fixture preview. Set NCGS_SCENARIO_SHOTS=<dir> to save a Home screenshot of each.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
const SHOTS = process.env.NCGS_SCENARIO_SHOTS;
const year = new Date().getFullYear();
const EXPECT = {
  today: { has: ['.home-live-ticket'], text: /Continue/ },
  between: { has: ['.home-season-intro'], text: new RegExp(`${year}[\\s\\S]*Between rounds`) },
  undated: { has: ['.home-season-intro'], not: /Autumn outing/ },
  announced: { has: ['.home-announcement'], text: /Autumn outing[\s\S]*in 23 days/ },
  ready: { has: ['.home-announcement'], text: /Autumn outing[\s\S]*in 3 days/ },
  eventday: { has: ['.home-announcement'], text: /Today[\s\S]*Autumn outing/ },
  preseason: { has: ['.home-season-intro'], text: new RegExp(`${year + 1}[\\s\\S]*A fresh scorecard`), not: /Athenry/ },
  'preseason-announced': { has: ['.home-announcement'], text: new RegExp(`The ${year + 1} season[\\s\\S]*Athenry`, 'i') },
  westport: { has: ['.home-live-ticket'], text: /Westport[\s\S]*Continue/ }
};
(async () => {
  const browser = await chromium.launch();
  let ok = true;
  const check = (name, cond) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + name); if (!cond) ok = false; };
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: SHOTS ? 2 : 1 })).newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.brand');
    check('Home links to the test scenarios in the preview', (await page.locator('[data-act="scenarios"]').count()) === 1);
    await page.click('[data-act="scenarios"]'); await page.waitForTimeout(150);
    const listed = await page.evaluate(() => [...document.querySelectorAll('[data-act="scenario-pick"]')].map(b => b.dataset.id));
    check('every scenario is listed', listed.join() === Object.keys(EXPECT).join());
    for (const id of Object.keys(EXPECT)) {
      // (In the round-in-progress scenario the app reopens on your hole, so go to the list directly.)
      if (id !== 'today') { await page.goto('about:blank'); await page.goto(URL); await page.waitForSelector('main .hero, main header');
        await page.evaluate(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }, { v: 'scenarios', p: {} }]; n.render(); }); await page.waitForTimeout(100);
        await Promise.all([page.waitForNavigation(), page.click(`[data-act="scenario-pick"][data-id="${id}"]`)]); }
      else { await page.goto('about:blank'); await page.goto(URL + '#scenario=today'); }
      await page.waitForSelector('.brand'); await page.waitForTimeout(300);
      const e = EXPECT[id], body = await page.locator('main').innerText();
      const has = (await Promise.all(e.has.map(s => page.locator(s).count()))).every(n => n > 0);
      check(`${id}: Home shows the right situation`, has && (!e.text || e.text.test(body)) && (!e.not || !e.not.test(body)) && await page.evaluate(id => window.NCGS_SCENARIOS.current === id, id));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/scenario-${id}.png` });
    }
    // The undated round is hidden from members but the organiser is reminded to date it.
    await page.goto('about:blank'); await page.goto(URL + '#scenario=undated'); await page.waitForSelector('.brand');
    await page.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
    check('undated: the organiser sees the round and the date reminder', /Autumn outing[\s\S]*members see the round once it has one/.test(await page.locator('main').innerText()));
    // Tapping around a scenario persists like normal; choosing it again starts afresh.
    // A scenario link pasted into a tab that's already open still switches.
    await Promise.all([page.waitForNavigation(), page.evaluate(() => { location.hash = 'scenario=preseason'; })]); await page.waitForSelector('.brand');
    check('preseason: Settings shows the next season open', await page.evaluate(() => window.__ncgs.D.setting('season', '') === String(new Date().getFullYear() + 1)));
    check('no script errors', errors.length === 0); if (errors.length) console.log(errors);
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
