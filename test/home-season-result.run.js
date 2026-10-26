// A same-day result must not displace the season the organiser explicitly opens.
// Invented fixture only. Exercise the actual two-tap Settings switch and its undo.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
(async () => {
  const browser = await chromium.launch();
  let ok = true;
  const check = (name, cond) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + name); if (!cond) ok = false; };
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const fresh = async (hash = '') => {
      await page.goto(URL); await page.evaluate(() => localStorage.clear());
      await page.goto('about:blank'); await page.goto(URL + hash); await page.waitForSelector('.brand');
    };
    const home = () => page.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
    const settings = () => page.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.ORGPIN.pin = '1234'; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'settings', p: {} }]; n.render(); });
    await fresh();
    await page.evaluate(() => {
      const n = window.__ncgs, t = n.DB.server.tables;
      t.rounds = t.rounds.filter(r => r.status === 'final' && !/^demo/.test(r.id));
      t.rounds.forEach(r => { r.season = 2026; });
      const d = new Date(), last = t.rounds[t.rounds.length - 1];
      last.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      n.DB._view = null; n.DB._memo = {}; n.render();
    });
    check('the current season result leads Home on its round day', await page.locator('.hero.home .now [data-act="leaderboard"]').count() > 0);
    await settings();
    await page.click('[data-act="season-next"]'); await page.click('[data-act="season-next"]');
    await home();
    check('the real Settings control starts 2027', await page.evaluate(() => window.__ncgs.D.setting('season', '') === '2027'));
    const intro = await page.locator('.home-season-intro').count() ? await page.locator('.home-season-intro').innerText() : '';
    check('2027 immediately leads Home despite today\'s 2026 result', /2027/.test(intro) && /A fresh scorecard/.test(intro));
    check('the previous season result no longer occupies the hero', await page.locator('.hero.home .now [data-act="leaderboard"]').count() === 0);
    await settings();
    await page.click('[data-act="season-back"]'); await page.click('[data-act="season-back"]');
    await home();
    check('undo restores the 2026 same-day result', await page.locator('.hero.home .now [data-act="leaderboard"]').count() > 0);

    await fresh('#scenario=westport');
    await page.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.ORGPIN.pin = '1234'; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }]; n.render(); });
    const groups = page.locator('[data-act="org-go"][data-v="groups"]');
    check('live scramble summary says teams fixed without offering withdrawal', /teams fixed/.test(await groups.innerText()) && !/withdraw/i.test(await groups.innerText()));
    await groups.click();
    check('the destination agrees and has no withdrawal controls', /teams are fixed/.test(await page.locator('main').innerText()) && await page.locator('[data-act="grp-withdraw"],[data-act="grp-pick"]').count() === 0);
    check('no script errors', errors.length === 0);
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
