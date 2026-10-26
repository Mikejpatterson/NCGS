// Owner decisions, 23 October: an upcoming round without a date is not shown to members as Next round,
// and a player's page opened from an archived season stays on that season.
// Run against the invented fixture preview (NCGS_FIXTURE=1 node build.js, then serve dist/).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
(async () => {
  const browser = await chromium.launch();
  let ok = true;
  const check = (name, cond) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + name); if (!cond) ok = false; };
  try {
    const errors = [];
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    page.on('pageerror', e => errors.push(e.message));
    const fresh = async () => { await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.brand'); };
    const redraw = fn => page.evaluate(fn);

    // --- An undated upcoming round stays off Home until it has a date
    await fresh();
    await redraw(() => { const n = window.__ncgs; const t = n.DB.server.tables;
      t.rounds = t.rounds.filter(r => r.status === 'final');
      t.rounds.push({ ...t.rounds[0], id: 'undated-fixture', date: '', name: 'Undated fixture round', trip: null, trip_day: null, status: 'upcoming', results: null, groups: [], source: null });
      n.DB._view = null; n.DB._memo = {}; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
    check('an undated upcoming round is not shown as Next round', !(await page.locator('.home-announcement').count()) && !(await page.getByText('Undated fixture round').count()) && (await page.locator('.home-season-intro').count()) === 1);
    // With nothing featured, Home hides the Hole tab; if it is ever shown, it must not open the undated round.
    if (await page.locator('#tabs [data-tab="hole"]').isVisible()) { await page.click('#tabs [data-tab="hole"]'); await page.waitForTimeout(200); }
    check('the Hole tab does not open the undated round', await page.evaluate(() => !JSON.stringify(window.__ncgs.UI.stack).includes('undated-fixture')));
    await redraw(() => { const n = window.__ncgs; n.DB.server.tables.rounds.find(r => r.id === 'undated-fixture').date = '2026-11-14'; n.DB._view = null; n.DB._memo = {}; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
    check('once it has a date, it is the Next round', (await page.locator('.home-announcement').count()) === 1 && (await page.getByText('Undated fixture round').count()) > 0);
    await redraw(() => { const n = window.__ncgs; n.DB.server.tables.rounds.find(r => r.id === 'undated-fixture').date = ''; n.DB._view = null; n.DB._memo = {}; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
    const orgText = await page.evaluate(() => document.body.innerText);
    check('the organiser still sees it, with a reminder to set the date', /Undated fixture round/.test(orgText) && /members see the round once it has one/.test(orgText));

    // --- Year context: an archived GOY table opens players on that season
    await fresh();
    const setup = await redraw(() => { const n = window.__ncgs; const t = n.DB.server.tables;
      const finals = t.rounds.filter(r => r.status === 'final');
      finals[0].season = 2025;                     // one archived season
      n.DB._view = null; n.DB._memo = {}; n.UI.year = 2025; n.UI.stack = [{ v: 'home', p: {} }, { v: 'goy', p: {} }]; n.render();
      const first = document.querySelector('.lrow.goy'); return first ? { pid: first.dataset.pid, year: first.dataset.year, total: first.querySelector('.tot').textContent.trim() } : null; });
    check('the archived GOY table links players with its year', !!setup && setup.year === '2025');
    await page.click('.lrow.goy'); await page.waitForTimeout(200);
    const archived = await page.evaluate(() => ({ cap: document.querySelector('.tiles .tile.flag .cap').textContent, two: document.querySelector('.tiles').classList.contains('two'),
      best: document.querySelectorAll('.tiles .tile')[1].querySelector('.bignum').textContent.trim(), firstSec: (document.querySelector('.sec .sec-label, .sec h2, .sec .label') || {}).textContent }));
    check('the player page stays on 2025', archived.cap === 'GOY 2025' && archived.two);
    check('its Best 3 matches the 2025 table', setup && archived.best === setup.total);
    check('the career figures below are labelled as all seasons', await page.evaluate(() => [...document.querySelectorAll('.sec-label, h2')].some(e => /Numbers · all seasons/.test(e.textContent))));
    await page.evaluate(() => window.__ncgs.UI.stack.pop()); await page.evaluate(() => window.__ncgs.render());
    check('back on GOY the year is still 2025', await page.evaluate(() => window.__ncgs.UI.year === 2025 && !!document.querySelector('.lrow.goy[data-year="2025"]')));

    // --- Opened from anywhere else, the page shows the current season
    await redraw(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }, { v: 'players', p: {} }]; n.render(); });
    await page.click('.prow'); await page.waitForTimeout(200);
    const current = await page.evaluate(() => ({ cap: document.querySelector('.tiles .tile.flag .cap').textContent, n: document.querySelectorAll('.tiles .tile').length }));
    // "To beat" shows only when there is someone to beat (journey 4 review), so the leader has two tiles.
    check('from the Players list it shows the current season', current.cap === 'GOY' && current.n >= 2);

    check('nothing runs off the side', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('no script errors', errors.length === 0); if (errors.length) console.log(errors);
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
