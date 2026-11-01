// Owner, 1 November (option A): one phone per group keeps the score. The first time a phone in a group opens Hole, it
// asks once. No gives a read-only view with no scoring controls and no contest card; "I'm keeping score" switches.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
const SCORING = '[data-act="set"], [data-act="save"], [data-act="pickup"], [data-act="clear"], .stepper, [data-act="edit-hole"], [data-act="fix-hole"], [data-act="goto-hole"], [data-act="intro-scrim"], .introcard';
(async () => {
  const b = await chromium.launch();
  try {
    for (const [w, scale] of [[390, 1], [360, 1.35]]) {
      const pg = await (await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: true })).newPage();
      pg.on('pageerror', e => errs.push(e.message));
      await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
      if (scale !== 1) await pg.addStyleTag({ content: `html{font-size:${scale * 100}%}` });
      const tag = w === 390 ? '' : ' (360px, 135% text)';
      const top = () => pg.evaluate(() => { const s = window.__ncgs.UI.stack; return s[s.length - 1].v; });
      const home = () => pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
      const hole = async () => { await pg.click('#tabs .tab:nth-child(2)'); await pg.waitForTimeout(250); };
      const fits = () => pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#app button, #app .row')].every(e => { const r = e.getBoundingClientRect(); return r.width === 0 || (r.left >= -1 && r.right <= innerWidth + 1); }));
      const me = await pg.evaluate(() => { const n = window.__ncgs, r = n.D.round(n.liveRid()); const pid = r.groups[0].teams.flat()[1]; n.DB.prefs.me = pid; n.render(); return pid; });
      await home(); await hole();
      check('the first Hole tap asks "Are you keeping the score for Group 1?"' + tag, await top() === 'scorer' && /Are you keeping the score for Group 1\?/.test(await pg.locator('main').innerText()), await top());
      check('with "Yes, I\'m keeping score" and "No, just following"' + tag, !!(await pg.$('[data-act="scorer-yes"]')) && !!(await pg.$('[data-act="scorer-no"]')));
      check('the question fits' + tag, await fits());
      await pg.click('[data-act="scorer-no"]'); await pg.waitForTimeout(250);
      check('No opens the group view' + tag, await top() === 'follow', await top());
      check('it has no scoring controls and no contest card' + tag, !(await pg.$(SCORING)));
      const txt = await pg.locator('main').innerText();
      check('it shows where the group is, its points, Buggy Wars and a way to Results' + tag, /Thru \d+|Not started|Finished/.test(txt) && /Stableford points/i.test(txt) && /Buggy Wars/i.test(txt) && !!(await pg.$('[data-act="tab"][data-tab="board"]')), txt.slice(0, 200));
      check('and says one phone per group keeps the score, with a link to switch' + tag, /One phone per group keeps the score/.test(txt) && !!(await pg.$('[data-act="scorer-yes"]')));
      check('the group view fits' + tag, await fits());
      // A name opens that player's card, read-only.
      const nameRow = await pg.$('.follow-top ~ section [data-act="toggle"]');
      if (nameRow) { await nameRow.click(); await pg.waitForTimeout(200); }
      check('a player\'s card opens read-only' + tag, !(await pg.$('[data-act="fix-hole"]')) && !/Tap a score to change it/.test(await pg.locator('main').innerText()));
      // Not asked again; Results' Buggy Wars board can't be used to change a hole.
      await home(); await hole();
      check('Hole goes straight to the group view next time' + tag, await top() === 'follow', await top());
      await pg.evaluate(() => { const n = window.__ncgs; n.UI.res = 'bw'; n.UI.stack = [{ v: 'home', p: {} }, { v: 'board', p: { rid: n.liveRid() } }]; n.render(); });
      await pg.waitForTimeout(200);
      check('Results gives a follower no way to change a hole' + tag, !(await pg.$('[data-act="edit-hole"], [data-act="fix-hole"]')));
      check('the answer is kept on this phone after a reload' + tag, await (async () => { await pg.reload(); await pg.waitForFunction(() => window.__ncgs && window.__ncgs.DB.loaded); await pg.evaluate(m => { window.__ncgs.DB.prefs.me = m; window.__ncgs.render(); }, me); await home(); await hole(); return await top() === 'follow'; })());
      // Switch.
      await pg.click('[data-act="scorer-yes"]'); await pg.waitForTimeout(300);
      check('"I\'m keeping score" switches to the scoring screen' + tag, ['tee', 'entry', 'finish'].includes(await top()) && !!(await pg.$('[data-act="set"], .stepper, [data-act="intro-scrim"]')), await top());
      await home(); await hole();
      check('and stays a scorer' + tag, await top() !== 'scorer' && await top() !== 'follow', await top());
      await pg.context().close();
    }
    // A phone not playing picks a player via "Who are you?": that counts as keeping score, no second question.
    const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    const pid = await pg.evaluate(() => { const n = window.__ncgs; n.DB.prefs.me = null; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); return n.D.round(n.liveRid()).groups[0].teams.flat()[0]; });
    await pg.click('#tabs .tab:nth-child(2)').catch(() => {}); await pg.waitForTimeout(250);
    const v0 = await pg.evaluate(() => { const s = window.__ncgs.UI.stack; return s[s.length - 1].v; });
    if (v0 === 'who') { await pg.click(`[data-act="pick"][data-id="${pid}"]`); await pg.waitForTimeout(300); }
    const v1 = await pg.evaluate(() => { const s = window.__ncgs.UI.stack; return s[s.length - 1].v; });
    check('picking a player on "Who are you?" to go in counts as keeping score', v0 === 'who' && v1 !== 'scorer' && v1 !== 'follow', `${v0} → ${v1}`);
    // Scramble rounds get the same question; following shows the team's total.
    await pg.evaluate(() => { localStorage.clear(); });
    await pg.reload(); await pg.waitForFunction(() => window.__ncgs && window.__ncgs.DB.loaded);
    await pg.evaluate(() => { const n = window.__ncgs, rid = n.liveRid(); n.ORGPIN.pin = '1234'; n.put('settings', [{ key: 'format:' + rid, value: 'scramble' }]); n.DB.prefs.me = n.D.round(rid).groups[0].teams.flat()[0]; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
    await pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
    await pg.click('#tabs .tab:nth-child(2)').catch(() => {}); await pg.waitForTimeout(250);
    const sv = await pg.evaluate(() => { const s = window.__ncgs.UI.stack; return s[s.length - 1].v; });
    check('a scramble round asks the same question', sv === 'scorer' && /One phone per team keeps the score/.test(await pg.locator('main').innerText()), sv);
    if (sv === 'scorer') { await pg.click('[data-act="scorer-no"]'); await pg.waitForTimeout(250); }
    check('and following a scramble shows the team, with no scoring controls', /Team Stableford/.test(await pg.locator('main').innerText()) && !(await pg.$(SCORING)));
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
