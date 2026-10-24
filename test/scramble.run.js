// The Westport scramble in the app (owner brief §6; Codex's invariants, issue #1, 24 October), using the preview's
// "westport" test scenario: team score + whose drive, two-drive holes, no personal reading of team strokes,
// format locked once scores exist, and a trip with no combined leaderboard.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
(async () => {
  const browser = await chromium.launch();
  let ok = true;
  const check = (name, cond) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + name); if (!cond) ok = false; };
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL); await page.evaluate(() => localStorage.clear());
    await page.goto('about:blank'); await page.goto(URL + '#scenario=westport');
    await page.waitForFunction(() => window.__ncgs && window.__ncgs.D.round('fx-wp2'));
    const go = (stack, org) => page.evaluate(([stack, org]) => { const n = window.__ncgs; n.DB._view = null; n.DB._memo = {};
      if (org) { n.UI.org = true; n.UI.orgUnlocked = true; n.ORGPIN.pin = '1234'; n.UI.orgStack = stack; } else { n.UI.org = false; n.UI.stack = stack; } n.render(); }, [stack, org]);
    const text = () => page.locator('main').innerText();

    // Playing a hole: the contest question first if one is due, then team score and whose drive.
    await go([{ v: 'home', p: {} }, { v: 'tee', p: { rid: 'fx-wp2' } }]);
    if (await page.locator('[data-act="ask-pick"]').count()) { await page.click('[data-act="ask-pick"] >> nth=-1'); await page.click('[data-act="ask-confirm"]'); await page.waitForTimeout(200); }
    check('the hole screen asks for one team score and whose drive', (await page.locator('[data-act="scr-score"]').count()) === 2 && (await page.locator('[data-act="scr-driver"]').count()) === 4);
    const hole = await page.evaluate(() => window.__ncgs.UI.hole);
    await page.click('[data-act="scr-save"]'); await page.waitForTimeout(100);
    check('saving needs both the score and the drive', await page.evaluate(h => window.__ncgs.UI.hole === h, hole) && (await page.locator('[data-act="scr-save"]').count()) === 1);
    await page.click('[data-act="scr-score"][data-dir="up"]'); await page.click('[data-act="scr-driver"] >> nth=2');
    await page.click('[data-act="scr-save"]'); await page.waitForTimeout(400);
    const saved = await page.evaluate(h => { const n = window.__ncgs, r = n.D.round('fx-wp2'), g = r.groups[0], sc = n.D.scores('fx-wp2');
      return g.teams.flat().map(p => (sc[p] || {})[h]).filter(v => v !== undefined && v !== null); }, hole);
    check('one row saved for the hole, under the chosen driver', saved.length === 1);
    check('then on to the next hole', await page.evaluate(h => window.__ncgs.UI.hole !== h, hole));

    // Two drives on one hole (two phones disagreed): shown, not counted, resolved by picking one.
    await page.evaluate(() => { const n = window.__ncgs, g = n.D.round('fx-wp2').groups[0], t = g.teams.flat();
      n.DB.server.tables.scores.push({ round: 'fx-wp2', player: t[2], hole: 3, strokes: 6, by: 'Other phone', at: '2026-01-01T00:00:00Z' }); });
    await go([{ v: 'home', p: {} }, { v: 'entry', p: { rid: 'fx-wp2' } }]);
    await page.evaluate(() => { const n = window.__ncgs; n.UI.hole = 3; n.UI.edit = true; n.render(); });
    check('a hole with two drives says so and counts for nothing', /Two drives saved for this hole/.test(await text()) && await page.evaluate(() => window.__ncgs.D.round && (function () { const n = window.__ncgs; n.DB._memo = {}; return true; })()));
    const res = await page.evaluate(() => { const n = window.__ncgs; n.DB._view = null; n.DB._memo = {}; n.UI.board = 'fx-wp2'; n.UI.res = 'lb'; n.UI.stack = [{ v: 'home', p: {} }, { v: 'board', p: {} }]; n.render(); return document.querySelector('main').innerText; });
    check('the teams table flags it', /Two drives saved on 3/.test(res));
    check('nobody is KBs while teams are still playing', !/KBs/.test(res.split('Team Stableford')[0]));

    // Team strokes are never anyone's own round.
    const personal = await page.evaluate(() => { const n = window.__ncgs, r = n.D.round('fx-wp2'), pid = r.groups[0].teams[0][0];
      n.DB._view = null; n.DB._memo = {}; n.UI.stack = [{ v: 'home', p: {} }, { v: 'player', p: { pid } }]; n.render();
      return { links: document.querySelectorAll('main [data-rid="fx-wp2"]').length, day1: document.querySelectorAll('main [data-rid="fx-wp1"]').length,
        goy: n.D.rounds().length && JSON.stringify(window.__ncgs.D.round('fx-wp2') ? null : null) }; });
    check('a player\'s page lists Ballinrobe but not the scramble as their round', personal.links === 0 && personal.day1 === 1);
    check('Golfer of the Year leaves the scramble out', await page.evaluate(() => { const n = window.__ncgs; n.DB._memo = {}; n.UI.stack = [{ v: 'home', p: {} }, { v: 'goy', p: {} }]; n.render();
      return [...document.querySelectorAll('.lrow.goy .chipn')].length > 0 && !document.querySelector('main').innerText.includes('Westport'); }));
    await go([{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }]);
    check('no individual scorecards on a scramble round', (await page.locator('main [data-act="card"]').count()) === 0);

    // Organiser: format locked once scores exist; trip board off; no combined trip table.
    await go([{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }], true);
    await page.click('[data-act="org-format"]'); await page.waitForTimeout(150);
    check('format can\'t change once scores are in', await page.evaluate(() => window.__ncgs.D.setting('format:fx-wp2', '') === 'scramble') && /can.t change now/.test(await page.locator('body').innerText()));
    check('the organiser sees team shots and the trip leaderboard switch', /Team shots[\s\S]*Team 2: 2/.test(await text()) && /Trip leaderboard[\s\S]*Off/.test(await text()));
    await go([{ v: 'home', p: {} }, { v: 'trip', p: { rid: 'fx-wp2' } }]);
    check('the trip page has no combined table', /No combined leaderboard for this trip/.test(await text()) && !(await page.locator('main .lrow.trip2').count()));
    await go([{ v: 'home', p: {} }]);
    check('Home doesn\'t offer Westport trip standings', !/Trip standings[\s\S]{0,40}Westport/.test(await text()));

    check('nothing runs off the side', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('no script errors', errors.length === 0); if (errors.length) console.log(errors);
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
