// Screen-purpose regressions: usable round context, complete course entry, edit retention and archive navigation.
// Fictional data only. Runs through the existing organiser test entry point.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true;
const check = (name, value) => { console.log((value ? 'PASS  ' : 'FAIL  ') + name); if (!value) ok = false; };
(async () => {
  const browser = await chromium.launch();
  try {
    const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const fresh = async scene => {
      await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank');
      await p.goto(URL + '#scenario=' + scene); await p.waitForSelector('.brand');
    };
    const org = (v, params = {}) => p.evaluate(([v, params]) => {
      const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true;
      n.UI.formState = null; n.UI.formError = null; n.UI.scrollTop = true; n.UI.orgStack = [{ v: 'home', p: {} }].concat(v === 'home' ? [] : [{ v, p: params }]); n.render();
    }, [v, params]);
    const sync = () => p.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
    const redraw = () => p.evaluate(() => window.__ncgs.render());

    await fresh('today');
    const groupNames = await p.evaluate(() => {
      const n = window.__ncgs, r = n.D.rounds().find(r => r.status === 'live'), g = r.groups[0];
      n.DB.prefs.me = g.teams.flat()[0]; n.UI.org = false; n.UI.playRid = r.id; n.UI.rtab = 'groups'; n.UI.rtabPicked = true;
      n.UI.stack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: r.id } }]; n.render(); return g.teams.flat().map(n.D.nameOf);
    });
    check('round Groups starts near the top of the phone rather than below a full personal panel', await p.locator('.rp-groups').evaluate(e => e.getBoundingClientRect().top < 320));
    check('tee time and group stay visible while the personal detail is collapsed', /Group 1/.test(await p.locator('.rp-your-toggle').innerText()) && !await p.locator('#round-your-group').isVisible());
    await p.locator('.rp-your-toggle').click();
    const groupText = await p.locator('.rp-you').innerText();
    check('the group disclosure exposes every other golfer and keeps KBs distinct', groupNames.slice(1).every(name => groupText.includes(name)) && /With/.test(groupText) && /Against/.test(groupText) && /KB with/.test(groupText));
    await redraw();
    check('your explicit group disclosure choice survives a redraw', await p.locator('#round-your-group').isVisible());
    await p.locator('.rp-go [data-act="play"]').click();
    check('the compact header still resumes the actual scoring screen', await p.locator('.entry, .ask').count() > 0);

    await fresh('westport');
    const teamNames = await p.evaluate(() => {
      const n = window.__ncgs, r = n.D.round('fx-wp2'), g = r.groups[0]; n.DB.prefs.me = g.teams.flat()[0];
      n.UI.org = false; n.UI.rtab = 'groups'; n.UI.rtabPicked = true; n.UI.stack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: r.id } }]; n.UI.scrollTop = true; n.render();
      return g.teams.flat().slice(1).map(n.D.nameOf);
    });
    await p.locator('.rp-your-toggle').click();
    const teamText = await p.locator('.rp-you').innerText();
    check('scramble group details retain all three teammates without buggy opponents or KB partners', teamNames.every(name => teamText.includes(name)) && !/Against|KB with/.test(teamText));
    await p.locator('.round-trip-link').click();
    check('the Westport trip route still shows separate daily results and no aggregate standings', /No combined leaderboard/.test(await p.locator('main').innerText()) && await p.locator('.trip2').count() === 0);

    await fresh('between'); await org('course');
    const courseCount = await p.evaluate(() => window.__ncgs.D.courses().length);
    await p.fill('#c-name', 'Journey fixture course'); await p.fill('#c-area', 'Invented area');
    check('tees are offered before optional description and location', await p.locator('#t-name-0').isVisible() && !await p.locator('#c-about').isVisible());
    check('both nines exist and the front nine is immediately editable', await p.locator('#h-par-0').isVisible() && !await p.locator('#h-par-17').isVisible());
    await p.locator('#course-back > summary').focus(); await p.keyboard.press('Enter');
    await p.selectOption('#h-par-0', '4'); await p.fill('#h-si-0', '1');
    await p.selectOption('#h-par-17', '5'); await p.fill('#h-si-17', '18'); await p.fill('#h-m-17', '450');
    await p.locator('form[data-form="course"] [type="submit"]').click();
    check('a partial scorecard is refused without creating a course', /Every hole needs/.test(await p.locator('.err').innerText()) && await p.evaluate(count => window.__ncgs.D.courses().length === count, courseCount));
    check('validation preserves the name and both nines of typed work', await p.inputValue('#c-name') === 'Journey fixture course' && await p.inputValue('#h-si-0') === '1' && await p.inputValue('#h-si-17') === '18' && await p.inputValue('#h-m-17') === '450');
    check('validation keeps the open back nine and brings its error into view', await p.locator('#course-back').evaluate(e => e.open) && await p.locator('.err').evaluate(e => e.getBoundingClientRect().top >= 0 && e.getBoundingClientRect().bottom <= innerHeight));
    await redraw();
    check('an incidental redraw also preserves the edited course values', await p.inputValue('#c-name') === 'Journey fixture course' && await p.inputValue('#h-m-17') === '450');
    await p.focus('#c-name'); await p.locator('#c-name').evaluate(e => e.setSelectionRange(3, 7)); await redraw();
    check('redraw preserves the caret selection while editing a course name', await p.locator('#c-name').evaluate(e => document.activeElement === e && e.selectionStart === 3 && e.selectionEnd === 7));
    const existing = await p.evaluate(() => { const c = window.__ncgs.D.courses()[0]; return { id: c.id, name: c.name }; });
    await org('course', { cid: existing.id });
    check('course edits do not leak into another course', await p.inputValue('#c-name') === existing.name);

    await org('course'); await p.fill('#c-name', 'Coordinates fixture'); await p.locator('#course-about > summary').click(); await p.fill('#c-lat', '100');
    await p.locator('form[data-form="course"] [type="submit"]').click();
    check('invalid optional coordinates are explained without losing the draft', /Latitude must/.test(await p.locator('.err').innerText()) && await p.inputValue('#c-name') === 'Coordinates fixture' && await p.inputValue('#c-lat') === '100');
    await p.fill('#c-lat', '53.81'); await p.fill('#c-lon', '-9.57'); await p.locator('form[data-form="course"] [type="submit"]').click(); await sync();
    check('corrected optional coordinates save without requiring a scorecard', await p.evaluate(() => { const c = window.__ncgs.D.courses().find(c => c.name === 'Coordinates fixture'); return c && c.lat === 53.81 && c.lon === -9.57 && !c.holes; }));

    await p.evaluate(() => { const n = window.__ncgs; n.put('courses', [{ id: 'journey-other', name: 'Other fixture course', tees: { white: { name: 'White', slope: 124, rating: 71.2, par: 70 } }, holes: null }]); });
    await sync(); await org('details');
    await p.fill('#f-date', '2027-03-14'); await p.fill('#f-tee-time', '10:24');
    await p.locator('#round-trip-options > summary').click(); await p.fill('#f-trip', 'Journey fixture trip'); await p.fill('#f-day', '2');
    await p.selectOption('#f-course', 'journey-other');
    check('changing course preserves the schedule and trip being entered', await p.inputValue('#f-date') === '2027-03-14' && await p.inputValue('#f-tee-time') === '10:24' && await p.inputValue('#f-trip') === 'Journey fixture trip');
    check('changing course still regenerates valid tee choices', await p.inputValue('#f-tee') === 'white');
    await p.fill('#f-ntp', '19'); await p.fill('#f-ld', '12'); await p.locator('form[data-form="details"] [type="submit"]').click();
    check('an invalid contest hole is reported rather than silently dropped', /whole numbers from 1 to 18/.test(await p.locator('.err').innerText()) && await p.inputValue('#f-ntp') === '19' && await p.inputValue('#f-date') === '2027-03-14');
    await p.fill('#f-ntp', '7'); await p.fill('#f-ld', '7'); await p.locator('form[data-form="details"] [type="submit"]').click();
    check('a duplicate contest is refused without wiping the entered round', /One contest per hole/.test(await p.locator('.err').innerText()) && await p.inputValue('#f-date') === '2027-03-14' && await p.inputValue('#f-trip') === 'Journey fixture trip');
    await p.fill('#f-ld', '12'); await p.locator('form[data-form="details"] [type="submit"]').click(); await sync();
    check('correcting the error saves the originally entered schedule, trip and contests', await p.evaluate(() => { const r = window.__ncgs.D.rounds().find(r => r.trip === 'Journey fixture trip'); return r && r.course === 'journey-other' && r.tee === 'white' && r.date === '2027-03-14' && r.first_tee === '10:24' && r.trip_day === 2 && r.contests.map(c => c.hole).join() === '7,12'; }));

    await fresh('eventday'); await org('home');
    const setup = p.locator('[data-key^="setup-checks-"]');
    check('a ready round exposes Groups and Details without a wall of completed checks', await setup.count() > 0 && await p.locator('[data-act="org-go"][data-v="groups"]').count() > 0 && await p.locator('.chk.on').count() === 0);
    await setup.click();
    check('the completed setup checks remain reachable', /Course and tees/.test(await p.locator('main').innerText()));
    check('missing optional setup is not falsely ticked as complete', await p.locator('[data-key^="setup-checks-"]').evaluate(e => { const n = window.__ncgs, r = n.D.round(e.dataset.key.replace('setup-checks-', '')); const rows = [...e.closest('.card').querySelectorAll('[data-v="details"]')]; const contest = rows.find(x => x.innerText.startsWith('Contests')); return !contest || (r.contests?.length ? !!contest.querySelector('.c-g') : !contest.querySelector('.c-g') && /optional/.test(contest.innerText)); }));
    await org('export'); await p.locator('#export-restore > summary').click();
    const backup = JSON.stringify({ tables: { members: [] } }); await p.fill('#restorejson', backup); await redraw();
    check('a pasted restore survives redraw while the restore section stays open', await p.inputValue('#restorejson') === backup && await p.locator('#export-restore').evaluate(e => e.open));
    await p.evaluate(() => { const create = window.NCGS.createServer; window.__journeyRestoreCalls = 0; window.NCGS.createServer = (...args) => { const s = create(...args), api = s.api; s.api = req => { if (req.op === 'restore') window.__journeyRestoreCalls++; return api(req); }; return s; }; });
    await p.locator('[data-act="restore"]').click();
    check('restore still requires its explicit second confirmation and retains the pasted backup', /Tap again to restore/.test(await p.locator('[data-act="restore"]').innerText()) && await p.inputValue('#restorejson') === backup);
    check('first confirmation has made no restore request', await p.evaluate(() => window.__journeyRestoreCalls === 0));
    const existingScores = await p.evaluate(() => JSON.stringify(window.__ncgs.DB.server.tables.scores));
    await p.locator('[data-act="restore"]').click(); await sync();
    check('the confirmed restore sends once and leaves existing scores intact', await p.evaluate(scores => window.__journeyRestoreCalls === 1 && JSON.stringify(window.__ncgs.DB.server.tables.scores) === scores, existingScores));

    await fresh('between'); await org('settings');
    check('season opening is presented before seldom-changed society defaults', await p.locator('[data-act="season-next"]').evaluate(e => e.getBoundingClientRect().top < document.getElementById('s-name').getBoundingClientRect().top));
    await p.locator('[data-act="season-next"]').click(); await p.locator('[data-act="season-next"]').click(); await sync();
    await p.locator('[data-act="back"]').first().click(); await p.locator('[data-act="org-exit"]').click();
    check('the fresh season does not present last season’s round as its own', await p.locator('[data-act="round"] .hs-t').count() === 0 && /Browse past seasons/.test(await p.locator('[data-act="rounds"]').innerText()));
    await p.locator('[data-act="rounds"]').click(); await p.locator('[data-act="year"][data-y="2026"]').click();
    await p.locator('[data-act="round"]').first().click();
    check('a past round provides a direct route to its trip results', await p.locator('.round-trip-link').isVisible());
    await p.locator('.round-trip-link').click();
    check('the trip identifies its archived season', /2026/.test(await p.locator('header').innerText()));
    await p.locator('.trip2').first().click();
    check('a golfer opened from that trip stays in its season', /GOY 2026/.test(await p.locator('.tiles').innerText()) && await p.locator('.tiles .tile').nth(1).locator('.bignum').innerText() !== '0');
    for (let i = 0; i < 5 && await p.locator('[data-act="back"]').count(); i++) await p.locator('[data-act="back"]').first().click();
    check('returning Home still leads with the newly opened season', /2027/.test(await p.locator('.home-season-intro').innerText()));
    check('no script errors', errors.length === 0);
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
