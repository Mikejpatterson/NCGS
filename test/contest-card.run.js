// Stress test item 4: the contest card ("Nearest the pin · Let's play") closes with a tap outside it, not only with
// its button; a tap on the card itself does not close it.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
(async () => {
  const b = await chromium.launch();
  try {
    const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForFunction(() => window.__ncgs && window.__ncgs.DB.loaded);
    const open = async () => { await pg.evaluate(() => { const n = window.__ncgs, rid = n.liveRid(); n.DB.prefs.me = n.D.round(rid).groups[0].teams.flat()[0]; n.DB.prefs.scorer = { [rid]: true }; n.DB.prefs.intro = {}; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); }); await pg.click('#tabs .tab:nth-child(2)'); await pg.waitForTimeout(300); };
    await open();
    check('the contest card shows on a contest hole', !!(await pg.$('[data-act="intro-scrim"]')));
    await pg.click('.introcard', { position: { x: 20, y: 20 } }); await pg.waitForTimeout(200);
    check('a tap on the card itself leaves it open', !!(await pg.$('[data-act="intro-scrim"]')));
    await pg.mouse.click(8, 60); await pg.waitForTimeout(250);
    check('a tap outside the card closes it', !(await pg.$('[data-act="intro-scrim"]')));
    check('and the score entry is there to use', !!(await pg.$('[data-act="save"], .stepper')));
    await open(); await pg.click('[data-act="intro-go"]'); await pg.waitForTimeout(200);
    check("Let's play still closes it", !(await pg.$('[data-act="intro-scrim"]')));
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
