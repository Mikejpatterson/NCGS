// Organiser: next-up checklist, guests, and changing a player after the groups are saved.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  const text = () => pg.textContent('#app');
  const tap = async s => { await pg.click(s); await pg.waitForTimeout(250); };
  // an upcoming organiser round with groups and no scores yet
  await pg.evaluate(() => {
    const n = window.__ncgs; n.ORGPIN.pin = '1234';
    const base = n.D.round('demo-cabopino');
    n.put('rounds', [Object.assign({}, base, { id: 'next-1', source: 'organiser', status: 'upcoming', name: 'Next up test', date: '2026-10-20', season: 2026, first_tee: '', contests: null, kb: null })]);
    n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render();
  });
  await pg.waitForTimeout(300);
  let t = await text();
  check('Next up checklist is on the organiser home', /Next up/.test(t));
  check('it lists what is done and what is not', /Course and tees/.test(t) && /First tee time/.test(t) && /to do/.test(t));
  // guest through the player picker is covered by the form; add one directly from the late-change screen
  await tap('[data-act="org-go"][data-v="round"][data-rid="next-1"]');
  check('the round offers Change a player', /Change a player/.test(await text()));
  await tap('[data-act="org-go"][data-v="late"]');
  const first = await pg.evaluate(() => document.querySelector('[data-act="late-pick"]').dataset.pid);
  const firstName = await pg.evaluate(p => window.__ncgs.D.nameOf(p), first);
  await tap(`[data-act="late-pick"][data-pid="${first}"]`);
  check('picking a player shows who can swap in', /Swap in/.test(await text()) && /Add a guest/.test(await text()));
  // add a guest from here
  await tap('[data-act="org-go"][data-v="guest"]');
  await pg.fill('#g-name', 'Paddy Guest'); await pg.fill('#g-index', '18.4');
  await pg.click('form[data-form="guest"] button[type="submit"]'); await pg.waitForTimeout(300);
  const guest = await pg.evaluate(() => (window.__ncgs.D.members().find(m => m.name === 'Paddy Guest') || {}).id);
  check('the guest is a member with a guest id', /^guest-/.test(guest || ''));
  await tap(`[data-act="late-replace"][data-new="${guest}"]`);
  await pg.waitForTimeout(300);
  const inRound = await pg.evaluate(() => window.__ncgs.D.round('next-1').groups.flatMap(g => g.teams.flat()));
  check('the guest is now in the groups and the other player is out', inRound.includes(guest) && !inRound.includes(first));
  check('the change is in the log', await pg.evaluate(() => window.__ncgs.DB.server.tables.log.some(l => l.action === 'Player swapped')));
  // guests are not on the Players list or in Golfer of the Year
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'players', p: {} }]; n.render(); });
  check('guests do not appear in Players', !/Paddy Guest/.test(await text()));
  const inGoy = await pg.evaluate(() => window.__ncgs.D.regulars().some(m => m.name === 'Paddy Guest'));
  check('guests are not regulars', !inGoy);
  // drop someone out: needs a second tap
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'next-1' } }, { v: 'late', p: { rid: 'next-1' } }]; n.render(); });
  const second = await pg.evaluate(() => [...document.querySelectorAll('[data-act="late-pick"]')].map(x => x.dataset.pid).find(p => !p.startsWith('guest-')));
  await tap(`[data-act="late-pick"][data-pid="${second}"]`);
  await tap('[data-act="late-drop"]');
  check('dropping out asks first', /Tap again to take them out/.test(await text()));
  await tap('[data-act="late-drop"]');
  await pg.waitForTimeout(300);
  check('and then removes them from the groups', !(await pg.evaluate(() => window.__ncgs.D.round('next-1').groups.flatMap(g => g.teams.flat()))).includes(second));
  // a player who already has scores cannot be swapped
  await pg.evaluate(() => {
    const n = window.__ncgs; const pid = n.D.round('next-1').groups[0].teams.flat()[0];
    n.put('scores', [{ round: 'next-1', player: pid, hole: 1, strokes: 5, by: 'test', at: '' }]);
    n.UI.org = true; n.UI.late = { rid: 'next-1', pid }; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'next-1' } }, { v: 'late', p: { rid: 'next-1' } }]; n.render();
  });
  await pg.waitForTimeout(300);
  check('a player with scores is protected', /already has 1 score/.test(await text()) && !(await pg.$('[data-act="late-replace"]')));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
