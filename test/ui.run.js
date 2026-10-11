// Phone-sized run-through of the society app in preview mode (in-browser data).
// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/ui.run.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const URL = 'http://localhost:8765/preview.html';
const results = [];
const check = (name, ok, extra) => { results.push([ok ? 'PASS' : 'FAIL', name, extra || '']); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (name, full) => page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full });
  const stepTo = async (pg, pid, v) => { for (let i = 0; i < 12; i++) { const cur = await pg.$eval(`.stv[data-pid="${pid}"]`, e => e.textContent.trim()); const n = Number(cur); if (n === v) return; await pg.click(`[data-act="set"][data-pid="${pid}"][data-dir="${Number.isInteger(n) && n > v ? 'down' : 'up'}"]`); await pg.waitForTimeout(60); } throw new Error('could not step to ' + v); };
  const tap = async sel => { await page.click(sel); await page.waitForTimeout(120); };
  const text = async () => page.textContent('#app');
  const fits = async () => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  const sync = () => page.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.brand');
  await shot('01-home', true);
  let t = await text();
  check('home: next round first, then Past rounds, Standings, Players, Organiser tiles', /2026 season/.test(t) && /Past rounds\s*8 played/.test(t) && /Standings\s*Sean leads on 115/.test(t) && /Players\s*12 golfers/.test(t) && /Organiser/.test(t));
  check('home: the list of past rounds is not on the front page', !/Kieran, Sean 32/.test(t));
  await tap('[data-act="rounds"]');
  t = await text();
  check('past rounds screen lists all eight; Westport shows the tie', (await page.$$('[data-act="round"]')).length >= 8 && /Kieran, Sean 32/.test(t));

  // A past trip round (GameBook order, KBs, contests, groups)
  await tap('[data-act="round"][data-rid="2026-rio-real"]');
  t = await text();
  check('round: GameBook order kept (Mike F 10th ahead of Damien on 23)', /10Mike F2311Damien23/.test(t));
  check('round: KBs and contests from the sheet', /Sean & Peadar67/.test(t) && /Nearest the pinPeadar/.test(t) && /Longest driveMike P/.test(t));
  check('round: buggies listed under groups', /Mike P & Dave/.test(t));
  await shot('02-round-rio-real', true);
  await tap('[data-act="player"][data-pid="mike-p"]');
  t = await text();
  check('player: GOY 12th, best 3 = 66, to beat 16', /12th/.test(t) && /Best 366/.test(t) && /To beat16/.test(t));
  check('player: rounds list marks the counting three', (await page.$$('.pill.g')).length === 3);
  await shot('03-player', true);
  await tap('[data-act="back"]');
  await tap('[data-act="back"]');

  // An Irish round: points only, ties shown as ties
  await tap('[data-act="round"][data-rid="2026-westport"]');
  t = await text();
  check('Irish round: level scores share a position', /T1Kieran32T1Sean32/.test(t) && /From the 2026 sheet/.test(t));
  await tap('[data-act="back"]');
  await tap('[data-act="back"]');

  // GOY table
  await tap('[data-act="goy"]');
  t = await text();
  check('GOY: Colin 3rd and John K 4th on 100', /3Colin38 34 28100/.test(t) && /4John K36 33 31100/.test(t));
  await tap('[data-act="back"]');

  // Demo round: play
  await tap('[data-act="round"][data-rid="demo-cabopino"]');
  t = await text();
  check('live round page: groups, KBs and Play now', /Group|Groups/.test(t) && /KBs/.test(t) && !!(await page.$('[data-act="play"]')));
  await shot('04-round-live', true);
  await tap('[data-act="play"]');
  check('Play now asks who you are first', /Who are you\?/.test(await text()));
  await tap('[data-act="pick"][data-id="mike-p"]');
  await page.waitForSelector('[data-act="enter"]');
  t = await text();
  check('tee: hole 15, par 3 with nearest the pin, Buggy pills', /Hole\s*15/.test(t) && /Par\s*3\s*Index\s*14/.test(t) && /Nearest the pin/.test(t) && /Buggy 1/.test(t));
  check('tee fits on one iPhone screen', await fits());
  await shot('05-tee');
  await tap('[data-act="enter"]');
  const pids = await page.$$eval('.stepper', els => els.map(e => e.querySelector('[data-pid]').dataset.pid));
  for (const pid of pids) await stepTo(page, pid, 3);
  await shot('06-entry');
  { const pid = pids[0];
    await page.click(`[data-pid="${pid}"][data-v="P"]`); await page.waitForTimeout(80);
    const row = await page.$eval(`.stv[data-pid="${pid}"]`, e => e.closest('.pr').textContent);
    const shown = Number(await page.$eval(`.stv[data-pid="${pid}"]`, e => e.textContent));
    check('entry: a pick-up shows the strokes that net 0 points', Number.isInteger(shown) && /Picked up/.test(row) && /0/.test(row));
    await page.click(`[data-act="set"][data-pid="${pid}"][data-dir="down"]`); await page.waitForTimeout(80);
    check('entry: minus from a pick-up goes down one from those strokes', Number(await page.$eval(`.stv[data-pid="${pid}"]`, e => e.textContent)) === shown - 1);
    await stepTo(page, pid, 3); }
  t = await text();
  check('entry: save button ready', /Save hole 15/.test(t));
  await tap('[data-act="save"]');
  await page.waitForSelector('[data-act="undo"]');
  t = await text();
  check('after: result and next hole', /Saved/.test(t) && /Hole 16/.test(t));
  await shot('07-after');
  await tap('[data-act="undo"]');
  check('undo returns to the entry with the scores kept', /Save hole 15/.test(await text()));
  await tap('[data-act="save"]');
  await tap('[data-act="next"]');
  check('next hole is 16', /Hole\s*16/.test(await text()));

  // Reload keeps everything (phone copy + queue)
  await page.reload();
  await page.waitForSelector('[data-act="enter"]');
  check('reload opens straight on the next hole', /Hole\s*16/.test(await text()));

  // Buggy Wars and leaderboard
  await tap('.tab[data-tab="match"]');
  t = await text();
  check('Buggy Wars board with front/back/overall', /Front nine/.test(t) && /Overall/.test(t));
  await shot('08-match', true);
  await tap('.tab[data-tab="board"]');
  t = await text();
  check('leaderboard: Stableford, KBs, drinks, contests', /Stableford|Demo round/.test(t) && /KBs/.test(t) && /First round of drinks/.test(t) && /Contests/.test(t));
  await shot('09-board', true);
  // a player's card from the leaderboard
  await tap('[data-act="toggle"][data-key$="-mike-p"]');
  t = await text();
  check('leaderboard: tapping a name drops their card down in place', (await page.$$('.dropcard .sc')).length === 1 && /Leaderboard/.test(t));
  check('scorecard: Out/In totals and golf marks', /Out/.test(t) && /In/.test(t) && (await page.$$('.mk.bogey, .mk.double, .mk.birdie')).length > 3);
  check('scorecard fits on one iPhone screen', await page.evaluate(() => document.querySelector('.sc').getBoundingClientRect().bottom <= window.innerHeight + 140));
  await shot('10-scorecard', true);
  // Fix a past hole from the dropped-down card: a small sheet with minus and plus, no navigation
  await tap('.dropcard [data-act="fix-hole"][data-n="1"]');
  check('fix: tapping a score opens a small sheet over the same screen', !!(await page.$('.sheet.fixs')) && /Leaderboard/.test(await text()));
  const wasHole1 = Number((await page.$eval('.fx-val', e => e.textContent)).replace(/\D/g, ''));
  check('fix: Save is disabled until the score changes', await page.$eval('[data-act="fix-save"]', e => e.disabled));
  await tap('[data-act="fix-step"][data-d="1"]');
  check('fix: plus moves one stroke', Number((await page.$eval('.fx-val', e => e.textContent)).replace(/\D/g, '')) === wasHole1 + 1);
  const sheetEl = await page.$('.sheet.fixs');
  await tap('[data-act="fix-step"][data-d="1"]');
  check('fix: plus and minus redraw only the sheet (no flicker)', await sheetEl.evaluate(e => e.isConnected));
  await tap('[data-act="fix-step"][data-d="-1"]');
  await tap('[data-act="fix-pu"]');
  const puShown = Number((await page.$eval('.fx-val', e => e.textContent)).replace(/\D/g, ''));
  await tap('[data-act="fix-step"][data-d="-1"]');
  check('fix: from a pick-up, minus goes down one from the strokes shown (not to par)', Number((await page.$eval('.fx-val', e => e.textContent)).replace(/\D/g, '')) === puShown - 1 && !/p$/.test(await page.$eval('.fx-val', e => e.textContent)));
  for (let i = 0; i < 20; i++) {
    const cur = Number((await page.$eval('.fx-val', e => e.textContent)).replace(/\D/g, ''));
    if (cur === wasHole1 + 1) break;
    await tap(`[data-act="fix-step"][data-d="${cur > wasHole1 + 1 ? -1 : 1}"]`);
  }
  await tap('[data-act="fix-save"]');
  check('fix: saving closes the sheet and keeps you where you were', !(await page.$('.sheet.fixs')) && /Leaderboard/.test(await text()) && /hole 1: /.test(await page.$eval('.toast', e => e.textContent).catch(() => '')));
  const nowHole1 = await page.$eval('.dropcard tbody tr:first-child .fixcell', e => e.textContent.trim().replace(/\D/g, ''));
  check('fix: the new score shows on the card', Number(nowHole1) === Number(wasHole1) + 1);
  await tap('[data-act="toggle"][data-key$="-mike-p"]');
  check('leaderboard: tapping again closes it', (await page.$$('.dropcard')).length === 0);

  // Two phones, one score: the second phone does not overwrite
  const page2 = await ctx.newPage();
  page2.on('pageerror', e => errors.push('page2: ' + e.message));
  await page2.goto(URL);
  await page2.waitForSelector('[data-act="enter"]');
  await page2.click('[data-act="enter"]');
  await page.click('.tab[data-tab="hole"]');
  await page.click('[data-act="enter"]');
  for (const pid of pids) await stepTo(page, pid, 4);
  await page.click('[data-act="save"]');
  await sync();
  for (const pid of pids) await stepTo(page2, pid, 5);
  await page2.click('[data-act="save"]');
  await page2.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
  await page2.waitForTimeout(400);
  await page2.click('[data-act="next"]').catch(() => {});
  await page2.waitForTimeout(200);
  const conflicts = await page2.evaluate(() => window.__ncgs.DB.conflicts.length);
  check('second phone: conflict raised instead of overwriting', conflicts === 4, `conflicts ${conflicts}`);
  const kept = await page.evaluate(() => window.__ncgs.view().scores.filter(s => s.round === 'demo-cabopino' && s.hole === 16).map(s => s.strokes));
  await page.evaluate(() => window.__ncgs.sync());
  check('first phone\'s scores kept', kept.every(v => v === 4), JSON.stringify(kept));
  await page2.close();

  // Organiser
  await page.evaluate(() => { window.__ncgs.UI.org = false; });
  await tap('.tab[data-tab="board"]');
  await tap('[data-act="org"]');
  await page.fill('#pin', '0000');
  await tap('form[data-form="pin"] button');
  await page.waitForTimeout(200);
  check('organiser: wrong PIN refused', /did not match/.test(await text()));
  await page.fill('#pin', '1234');
  await tap('form[data-form="pin"] button');
  await page.waitForSelector('[data-act="org-new-round"]');
  await shot('11-org-home', true);
  // New round at Cabopino next Sunday
  await tap('[data-act="org-new-round"]');
  await page.selectOption('#f-course', 'cabopino');
  await page.waitForTimeout(100);
  await page.fill('#f-date', '2027-04-18');
  await page.fill('#f-tee-time', '09:30');
  await page.fill('#f-ntp', '7, 15');
  await page.fill('#f-ld', '12');
  await shot('12-org-details');
  await tap('form[data-form="details"] button[type="submit"]');
  await page.waitForTimeout(300);
  t = await text();
  check('new round created', /Cabopino/.test(t) && /Not drawn/.test(t));
  const newRid = await page.evaluate(() => window.__ncgs.UI.orgStack.slice(-1)[0].p.rid);
  await tap('[data-act="org-go"][data-v="playing"]');
  const ten = (await page.$$eval('[data-act="org-toggle-player"]', els => els.map(e => e.dataset.pid))).slice(0, 10);
  for (const pid of ten) await tap(`[data-act="org-toggle-player"][data-pid="${pid}"]`);
  await tap('[data-act="org-draw"][data-kind="random"]');
  t = await text();
  check('draw: 10 players make groups of 4, 3 and 3 with tee times', /Group 1/.test(t) && /Group 3/.test(t) && /09:30/.test(t) && /09:46/.test(t));
  // swap two players
  const order = await page.$$eval('[data-act="org-swap"]', els => els.map(e => e.dataset.pid));
  const a = order[0], b = order[5];
  await tap(`[data-act="org-swap"][data-pid="${a}"]`);
  await tap(`[data-act="org-swap"][data-pid="${b}"]`);
  const firstNow = await page.$eval('[data-act="org-swap"]', el => el.dataset.pid);
  check('tap two players to swap them', firstNow === b && a !== b);
  await shot('13-org-groups', true);
  await tap('[data-act="org-save-groups"]');
  await page.waitForTimeout(200);
  t = await text();
  check('groups saved on the round', /10 players · 3 groups/.test(t));
  await tap('[data-act="org-go"][data-v="kb"]');
  await tap('[data-act="org-kb-make"]');
  const pairs = await page.$$eval('.row', els => els.length);
  check('KB pairs made', pairs === 5);
  await tap('[data-act="org-kb-save"]');
  // The round is now on the home screen as the next round
  await page.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
  await page.waitForTimeout(100);
  t = await text();
  check('home shows the new round under Coming up', /Also on/.test(t) && /Sun 18 Apr/.test(t) && /09:30/.test(t) && /Past rounds\s*8 played/.test(t), t.slice(0, 200));
  await shot('14-home-with-next', true);

  // Members: add someone, change an index
  await tap('[data-act="org"]');
  await tap('[data-act="org-go"][data-v="members"]');
  await tap('[data-act="org-go"][data-v="member"][data-pid=""]');
  await page.fill('#m-name', 'Trevor');
  await page.fill('#m-index', '9.9');
  await tap('form[data-form="member"] button');
  await page.waitForTimeout(150);
  check('member added', /Trevor/.test(await text()));
  await tap('[data-act="org-go"][data-v="member"][data-pid="mike-p"]');
  await page.fill('#m-index', '60');
  await tap('form[data-form="member"] button');
  check('index validation', /run from \+10.0 to 54.0/.test(await text()));
  await page.fill('#m-index', '29.4');
  await tap('form[data-form="member"] button');
  await page.waitForTimeout(150);
  check('index saved', /29\.4/.test(await text()));
  await tap('[data-act="back"]');

  // Course: Rio Real has no card yet; adding one needs every hole
  await tap('[data-act="org-go"][data-v="courses"]');
  await tap('[data-act="org-go"][data-v="course"][data-cid="rio-real"]');
  await page.selectOption('#h-par-0', '4');
  await page.fill('#h-si-0', '5');
  await tap('form[data-form="course"] button[type="submit"]');
  check('course: half a card refused', /Every hole needs a par and an index/.test(await text()));
  await shot('15-org-course');
  await tap('[data-act="back"]');
  await tap('[data-act="back"]');

  // Demo round: finalise is blocked until the cards are in
  await tap('[data-act="org-go"][data-v="round"][data-rid="demo-cabopino"]');
  t = await text();
  check('finalise names what is blocking it', /cards? open/.test(t));
  await tap('[data-act="demo-fill"]').catch(() => {});
  await shot('16-org-round', true);

  // Change log records the work
  await page.evaluate(() => { const n = window.__ncgs; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
  await tap('[data-act="org-go"][data-v="log"]');
  t = await text();
  check('change log: groups, KBs, member and handicap changes', /Groups saved/.test(t) && /KBs saved/.test(t) && /Member added/.test(t) && /Handicap index changed/.test(t));

  // Small phone
  await page.setViewportSize({ width: 375, height: 548 });
  await page.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
  await page.waitForTimeout(100);
  await shot('17-se-home');
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('no sideways scrolling on a small iPhone', !overflowX);

  check('no script errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(`${results.filter(r => r[0] === 'PASS').length}/${results.length} passed`);
  process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
})();
