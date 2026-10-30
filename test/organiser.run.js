// Organiser: next-up checklist, and a guest joining in place of a member from the Groups screen.
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
  // A guest joins in place of a member, from the one Groups screen (the old "Change a player" screen was folded
  // into Groups on 26 October; moving, swapping, taking out and protecting players with scores are in groups.run.js).
  await tap('[data-act="org-go"][data-v="round"][data-rid="next-1"]');
  check('the round has one Groups row and no separate Change a player', /Groups/.test(await text()) && !/Change a player/.test(await text()));
  await tap('[data-act="org-go"][data-v="groups"][data-rid="next-1"]');
  const first = await pg.evaluate(() => document.querySelector('[data-act="grp-pick"]').dataset.pid);
  await tap(`[data-act="grp-pick"][data-pid="${first}"]`);
  await tap(`[data-act="grp-replace"][data-pid="${first}"]`);
  check('Replace asks who plays instead, with a way to add a guest', /Who plays instead of/.test(await text()) && /New guest/.test(await text()));
  await tap('.grp-people [data-act="org-go"][data-v="guest"]');
  await pg.fill('#g-name', 'Paddy Guest'); await pg.fill('#g-index', '18.4');
  await pg.click('form[data-form="guest"] button[type="submit"]'); await pg.waitForTimeout(300);
  const guest = await pg.evaluate(() => (window.__ncgs.D.members().find(m => m.name === 'Paddy Guest') || {}).id);
  check('the guest is a member with a guest id', /^guest-/.test(guest || ''));
  // Saving the guest goes back to Groups with the replacement still open, so the new guest can be picked at once.
  check('back on Groups, the new guest is offered as the replacement', !!(await pg.$(`[data-act="grp-replace-with"][data-new="${guest}"]`)));
  await tap(`[data-act="grp-replace-with"][data-new="${guest}"]`);
  await pg.waitForTimeout(300);
  const inRound = await pg.evaluate(() => window.__ncgs.D.round('next-1').groups.flatMap(g => g.teams.flat()));
  check('the guest is now in the groups and the other player is out', inRound.includes(guest) && !inRound.includes(first));
  check('the change is in the log', await pg.evaluate(() => window.__ncgs.DB.server.tables.log.some(l => l.action === 'Groups changed' && /Paddy Guest in for/.test(l.detail))));
  // guests are not on the Players list or in Golfer of the Year
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'players', p: {} }]; n.render(); });
  check('guests do not appear in Players', !/Paddy Guest/.test(await text()));
  const inGoy = await pg.evaluate(() => window.__ncgs.D.regulars().some(m => m.name === 'Paddy Guest'));
  check('guests are not regulars', !inGoy);
  // Round details at a 360px phone with iPhone-like date and time boxes (Safari gives them a wide minimum width):
  // every box stays inside its column and on screen (owner's screenshot, 29 October).
  await pg.setViewportSize({ width: 360, height: 780 });
  await pg.addStyleTag({ content: 'input[type=date], input[type=time] { min-width: 300px; }' });
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'details', p: { rid: 'next-1' } }]; n.UI.formState = null; n.render(); });
  await pg.waitForTimeout(200);
  const spill = await pg.evaluate(() => [...document.querySelectorAll('form[data-form="details"] .field')].filter(el => {
    const r = el.getBoundingClientRect(), col = el.closest('.fld').getBoundingClientRect();
    return r.right > col.right + 1 || r.right > innerWidth;
  }).map(el => el.id));
  check('round details: no box spills into the next one or off a 360px screen', spill.length === 0);
  if (spill.length) console.log('  spilling:', spill.join(', '));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED');
  if (!ok) process.exit(1);
  const journeys = require('child_process').spawnSync(process.execPath,
    [...process.execArgv, require('path').join(__dirname, 'screen-journeys.run.js')], { stdio: 'inherit', env: process.env });
  if (journeys.error) console.error(journeys.error);
  process.exit(journeys.status === 0 ? 0 : journeys.status || 1);
})();
