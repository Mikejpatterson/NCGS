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
  const stepTo = async (pg, pid, v) => { for (let i = 0; i < 12; i++) { const cur = await pg.$eval(`.stv[data-pid="${pid}"]`, e => e.dataset.n); const n = cur === '' ? NaN : Number(cur); if (n === v) return; await pg.click(`[data-act="set"][data-pid="${pid}"][data-dir="${Number.isInteger(n) && n > v ? 'down' : 'up'}"]`); await pg.waitForTimeout(60); } throw new Error('could not step to ' + v); };
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
  check('home: next round first, then Past rounds, Golfer of the Year, Players tiles, a quiet Organiser link, and no year in the header', !/2026 season/.test(t) && /Past rounds\s*8 played/.test(t) && /Golfer of the Year\s*Sean leads on 115/.test(t) && /Players\s*12 golfers/.test(t) && !!(await page.$('.foot [data-act="org"]')) && !(await page.$('.links [data-act="org"]')));
  check('home: the list of past rounds is not on the front page', !/Kieran, Sean/.test(t));
  await tap('[data-act="trip"]');
  t = await text();
  check('home: Trip standings tile opens the whole-trip table with a link to each day', /Marbella/.test(t) && /All 3 rounds count/.test(t) && (await page.$$('[data-act="leaderboard"]')).length === 3);
  await tap('[data-act="back"]');
  await tap('[data-act="rounds"]');
  t = await text();
  check('past rounds screen lists all eight; Westport shows the tie', (await page.$$('[data-act="round"]')).length >= 8 && /Kieran, Sean/.test(t));

  // A past trip round (GameBook order, KBs, contests, groups)
  await tap('[data-act="round"][data-rid="2026-rio-real"]');
  t = await text();
  check('round: GameBook order kept (Mike F 10th ahead of Damien on 23)', /10[A-Za-z]{2,3}Mike F2311[A-Za-z]{2,3}Damien23/.test(t));
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
  check('Irish round: level scores share a position', /T1[A-Za-z]{2,3}Kieran32T1[A-Za-z]{2,3}Sean32/.test(t) && /From the society sheet/.test(t));
  await tap('[data-act="back"]');
  await tap('[data-act="back"]');

  // GOY table
  await tap('[data-act="goy"]');
  t = await text();
  check('GOY: Colin 3rd and John K 4th on 100', /3[A-Za-z]{2,3}Colin383428100/.test(t) && /4[A-Za-z]{2,3}John K363331100/.test(t));
  await tap('[data-act="back"]');

  // Demo round: play
  await tap('[data-act="round"][data-rid="demo-cabopino"]');
  t = await text();
  check('live round page: groups, KBs and Play now', /Group|Groups/.test(t) && /KBs/.test(t) && !!(await page.$('[data-act="play"]')));
  await shot('04-round-live', true);
  await tap('[data-act="play"]');
  check('Play now asks who you are first', /Who are you\?/.test(await text()));
  await tap('[data-act="pick"][data-id="mike-p"]');
  await page.waitForSelector('.entry .stepper');
  t = await text();
  check('hole tab goes straight to entering scores: hole 15, par 3 with nearest the pin, buggies as blue and red tiles instead of pills', /Hole\s*15/i.test(t) && /Par\s*3\s*Index\s*14/.test(t) && /Nearest the pin/.test(t) && !/Buggy 1/.test(t) && (await page.$$('.tiles.b1 .ptile')).length === 2 && (await page.$$('.tiles.b2 .ptile')).length === 2);
  check('hole 15 entry fits on one iPhone screen', await fits());
  await shot('05-tee');
  check('hole screen: no All groups or Enter scores step, the tab bar and a tappable hole number, no Home or Results pills on top', !(await page.$('.pillbtn')) && !(await page.$('.tee')) && !(await page.$('.entback')) && !!(await page.$('.tab.on[data-tab="hole"]')) && !!(await page.$('.holebtn')) && !!(await page.$('.entry .stepper')));
  await tap('.holebtn');
  check('go to hole: all 18 shown, scored ones filled, hole 15 ringed as next', (await page.$$('.hs')).length === 18 && (await page.$$('.hs.done')).length === 14 && (await page.$eval('.hs.nxt', e => e.textContent)) === '15');
  await shot('05b-holes');
  await tap('.hs[data-n="3"]');
  t = await text();
  check('go to hole: a scored hole opens to change it', /Hole\s*3/i.test(t) && /Save changes/.test(t));
  await page.goBack(); await page.waitForTimeout(300);
  check('the phone back gesture returns to the hole screen', /Hole\s*15/i.test(await text()) && !!(await page.$('.entry .stepper')));
  await tap('.holebtn'); await tap('.hs[data-n="17"]');
  t = await text();
  check('go to hole: a later hole can be scored early', /Hole\s*17/i.test(t) && /4 scores to go/.test(t));
  await tap('.tab[data-tab="hole"]');
  check('the Hole tab from there returns to the hole screen', /Hole\s*15/i.test(await text()) && !!(await page.$('.entry .stepper')));
  await tap('.holebtn'); await tap('[data-act="holes-close"]');
  check('the hole picker closes with Done', !(await page.$('.hs-sheet')));
  const pids = await page.$$eval('.stepper', els => els.map(e => e.querySelector('[data-pid]').dataset.pid));
  for (const pid of pids) await stepTo(page, pid, 3);
  await shot('06-entry');
  { const pid = pids[0];
    await page.waitForTimeout(50);
    const rowH = () => page.$eval(`.stepper:has([data-pid="${pid}"])`, e => Math.round(e.closest('.pr').getBoundingClientRect().height));
    const h0 = await rowH();
    await page.click(`[data-act="set"][data-pid="${pid}"][data-dir="up"]`); await page.waitForTimeout(80);
    check('entry: the row does not jump in height when a score goes in', (await rowH()) === h0);
    await page.click(`[data-act="clear"][data-pid="${pid}"]`); await page.waitForTimeout(80);
    check('entry: tapping the score clears it back to par', (await page.$eval(`.stv[data-pid="${pid}"]`, e => e.dataset.n)) === '' && /Par \d/.test(await page.$eval(`.stv[data-pid="${pid}"]`, e => e.textContent)) && (await rowH()) === h0);
    const mid = () => page.$eval(`.stv[data-pid="${pid}"]`, e => ({ n: Number(e.dataset.n), text: e.textContent, row: e.closest('.pr').textContent }));
    const btn = sel => page.$eval(`[data-pid="${pid}"]${sel}`, e => ({ off: e.disabled, on: e.classList.contains('on'), bg: getComputedStyle(e).backgroundColor }));
    await stepTo(page, pid, 4);
    let m = await mid();
    check('entry: strokes carry their points, the word sits under them', /^\d+\d$/.test(m.text.replace(/[^\d]/g, '')) && m.n === 4 && !!(await page.$eval(`.stv[data-pid="${pid}"] small`, e => e.textContent.trim())) && !(await page.$(`.pr-score`)));
    await page.click(`[data-pid="${pid}"][data-v="P"]`); await page.waitForTimeout(80);
    m = await mid(); const pu = m.n;
    check('entry: a pick-up shows its scratch strokes with 0 points and the word Scratch', pu > 4 && /Scratch/.test(m.text) && /0$/.test(m.text.replace(/Scratch/, '')) && !/Picked up/.test(m.row));
    let up = await btn('[data-dir="up"]'), pk = await btn('.pu');
    check('entry: on a scratch + is off and Pick up is green', up.off && pk.on && pk.bg !== (await page.$eval(`[data-pid="${pid}"][data-dir="down"]`, e => getComputedStyle(e).backgroundColor)));
    await page.click(`[data-act="set"][data-pid="${pid}"][data-dir="down"]`); await page.waitForTimeout(80);
    m = await mid();
    check('entry: minus from a pick-up goes down one from those strokes', m.n === pu - 1 && !/Scratch/.test(m.text));
    await page.click(`[data-act="set"][data-pid="${pid}"][data-dir="up"]`); await page.waitForTimeout(80);
    m = await mid(); pk = await btn('.pu');
    check('entry: plus up to 0 points becomes a pick-up and stops there', m.n === pu && /Scratch/.test(m.text) && pk.on);
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
  check('next hole is 16', /Hole\s*16/i.test(await text()));

  // Reload keeps everything (phone copy + queue)
  await page.reload();
  await page.waitForSelector('.entry .stepper');
  check('reload opens straight on the next hole', /Hole\s*16/i.test(await text()));

  // Buggy Wars and leaderboard
  await tap('.tab[data-tab="board"]');
  t = await text();
  check('one Results tab bar, no separate Buggy tab', (await page.$$('.tab')).length === 4 && !(await page.$('.tab[data-tab="match"]')) && /Results/.test(await page.textContent('#tabs')) && /Leaderboard/.test(t));
  check('Results has Scores, Buggy Wars, Contests and Stats pills, Scores first', JSON.stringify(await page.$$eval('.pills button', b => b.map(x => x.textContent.trim()))) === JSON.stringify(['Scores', 'Buggy Wars', 'Contests', 'Stats']) && await page.$eval('.pills button.on', e => e.textContent.trim()) === 'Scores');
  check('leaderboard: Stableford and KBs, no drinks (contests are on their own pill)', /Stableford|Demo round/.test(t) && /KBs/.test(t) && !/drinks|Buying/i.test(t) && !/Nearest the pin/.test(t));
  await tap('[data-act="respill"][data-p="bw"]');
  t = await text();
  check('Buggy Wars board with front/back/overall', /Front nine/.test(t) && /Overall/.test(t));
  check('Buggy Wars shows only my own group, no group pills', (await page.$$('[data-act="mgroup"]')).length === 0 && (await page.$$('.mrow')).length > 0);
  check('Buggy Wars opens at the top, not scrolled to the current hole', await page.evaluate(() => window.scrollY) === 0);
  await shot('08-match', true);
  await tap('[data-act="respill"][data-p="ct"]');
  t = await text();
  check('Contests pill: nearest the pin and longest drive', /Nearest the pin/.test(t) && /Longest drive/.test(t));
  check('Contests rows are tidy: hole under the name, winner on one line', /Hole\s*\d+/.test(t) && (await page.$$eval('.ct-r .b', els => els.every(e => e.getBoundingClientRect().height < 28))));
  await shot('08b-contests', true);
  await tap('[data-act="respill"][data-p="lb"]');
  t = await text();
  // Rules checker
  await tap('.tab[data-tab="rules"]');
  t = await text();
  check('rules tab: heading, ideas to tap and an ask bar', /What happened/.test(t) && (await page.$$('.sit')).length >= 4 && !!(await page.$('#askin')) && await page.$eval('.tab.on, .tab[aria-current="page"]', e => e.dataset.tab) === 'rules');
  await page.fill('#askin', 'Ball in the water?');
  await tap('.send');
  await page.waitForSelector('.bub.err');
  t = await text();
  check('rules: with no key switched on it says so plainly', /not switched on/.test(t) && /Ball in the water\?/.test(t));
  await page.evaluate(() => { window.NCGS_TEST_ASK = body => 'Take relief.\n\n- Drop in the relief area\n- One penalty stroke **Rule 17.1**'; });
  await page.fill('#askin', 'And if it is a red area?');
  await page.press('#askin', 'Enter');
  await page.waitForSelector('.msg.ai .bub:not(.err):not(.wait)');
  t = await text();
  check('rules: verdict first and big, steps under it, rule number as a chip, my question stays', (await page.$eval('.msg.ai:last-of-type .verdict', e => e.textContent)) === 'Take relief.' && !!(await page.$('.bub .ab')) && (await page.$eval('.rulechip', e => e.textContent)) === 'Rule 17.1' && /red area/.test(t));
  check('rules: a microphone button sits beside the box', !!(await page.$('.askbar .mic')) && JSON.stringify(await page.$$eval('.tab', b => b.map(x => x.dataset.tab))) === JSON.stringify(['home', 'hole', 'board', 'rules']));
  check('rules: the input is still there and empty for the next question', (await page.$eval('#askin', e => e.value)) === '');
  await shot('08c-rules', true);
  await tap('[data-act="ask-clear"]');
  check('rules: New question clears the chat', (await page.$$('.sit')).length >= 4);
  await tap('.tab[data-tab="board"]');
  t = await text();
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
  await page2.waitForSelector('.entry .stepper');
  await page.click('.tab[data-tab="hole"]');
  await page.waitForSelector('.entry .stepper');
  for (const pid of pids) await stepTo(page2, pid, 5);   // the second phone is part way through typing when the first one saves
  for (const pid of pids) await stepTo(page, pid, 4);
  await page.click('[data-act="save"]');
  await sync();
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

  // Groups and KB pairs go together: a round with groups and nothing saved for KBs still shows valid pairs
  await page.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; const base = n.D.round('demo-cabopino'); n.put('rounds', [Object.assign({}, base, { id: 'kb-none', name: 'KB none', status: 'upcoming', kb: null, date: '2026-12-01' })]); n.DB.prefs.me = 'mike-p'; n.UI.rtab = 'kb'; n.UI.stack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'kb-none' } }]; n.render(); });
  await page.waitForTimeout(250);
  check('a round with groups always shows KB pairs, none left out', (await page.$$('.kbcard')).length === 6 && !/not drawn yet/.test(await text()));
  await page.evaluate(() => { const n = window.__ncgs; n.UI.rtab = 'groups'; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });

  // Organiser
  await page.evaluate(() => { window.__ncgs.UI.org = false; });
  await tap('.tab[data-tab="home"]');
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
  const pairs = await page.$$eval('.row', els => els.filter(e => e.querySelector('.chip')).length);
  check('KB pairs made', pairs === 5);
  await tap('[data-act="org-kb-save"]');
  // The round is now on the home screen as the next round
  await page.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.orgStack = [{ v: 'home', p: {} }]; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
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
  await page.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.orgStack = [{ v: 'home', p: {} }]; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
  await page.waitForTimeout(100);
  await shot('17-se-home');
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('no sideways scrolling on a small iPhone', !overflowX);

  // Leaving a group out of the KBs, and turning KBs off for the round (organiser)
  await page.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.kbDraft = null; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'kb', p: { rid: 'kb-none' } }]; n.render(); });
  await page.waitForTimeout(250);
  const kbPage = await text();
  check('organiser KBs: every group listed with In, and the pairs below', /Groups in the KBs/.test(kbPage) && (await page.$$('[data-act="org-kb-group"]')).length >= 2);
  await tap('[data-act="org-kb-group"]');
  await page.waitForTimeout(250);
  const kbLeft = await page.evaluate(() => { const r = window.__ncgs.D.round('kb-none'); const out = new Set(r.groups.filter(g => g.noKb).flatMap(g => g.teams.flat())); return { out: out.size, bad: (r.kb || []).flat().some(p => out.has(p)), pairs: (r.kb || []).length }; });
  check('leaving a group out: nobody from it is in a pair', kbLeft.out > 0 && !kbLeft.bad && kbLeft.pairs > 0, JSON.stringify(kbLeft));
  await tap('[data-act="org-kb-clear"]');
  await page.waitForTimeout(250);
  check('KBs off: no pairs for the round and a Turn KBs back on button', !(await page.evaluate(() => (window.__ncgs.D.round('kb-none').kb || []).length)) && !!(await page.$('[data-act="org-kb-on"]')));
  await tap('[data-act="org-kb-on"]');
  await page.waitForTimeout(250);
  check('KBs back on: pairs drawn again', (await page.evaluate(() => (window.__ncgs.D.round('kb-none').kb || []).length)) > 0);
  await page.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
  check('no script errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  results.forEach(r => console.log(r.join('  ')));
  console.log(`${results.filter(r => r[0] === 'PASS').length}/${results.length} passed`);
  process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
})();
