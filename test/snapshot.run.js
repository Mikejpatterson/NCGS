// A finalised round keeps the course card it was played on; Settings says whether the server is current.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  const text = () => pg.textContent('#app');
  const tap = async s => { await pg.click(s); await pg.waitForTimeout(300); };
  await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
  await tap('[data-act="demo-fill"]');
  await pg.evaluate(() => {
    const n = window.__ncgs; const base = n.D.round('demo-cabopino');
    n.put('rounds', [Object.assign({}, base, { id: 'snap-1', source: 'organiser', status: 'live', name: 'Snapshot test', season: 2026, contests: null, kb: null })]);
    const sc = n.D.scores('demo-cabopino'), rows = [];
    Object.keys(sc).forEach(pid => Object.keys(sc[pid]).forEach(h => rows.push({ round: 'snap-1', player: pid, hole: Number(h), strokes: sc[pid][h], by: 'test', at: '' })));
    const have = new Set(rows.map(r => r.player + ':' + r.hole));
    base.groups.forEach(g => g.teams.flat().forEach(pid => { for (let h = 1; h <= 18; h++) if (!have.has(pid + ':' + h)) rows.push({ round: 'snap-1', player: pid, hole: h, strokes: 5, by: 'test', at: '' }); }));
    n.put('scores', rows);
  });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
  await tap('[data-act="org-go"][data-v="round"][data-rid="snap-1"]');
  const totals = () => pg.evaluate(() => JSON.stringify(window.__ncgs.D.rounds().find(r => r.id === 'snap-1') && (function () { const e = []; const r = window.__ncgs.D.round('snap-1'); return [r.status]; })()));
  await tap('[data-act="finalise"]');
  const fin = await pg.evaluate(() => { const r = window.__ncgs.D.round('snap-1'); return { status: r.status, snap: !!(r.results && r.results.snap && r.results.snap.holes.length === 18) }; });
  check('finalising saves the course card with the round', fin.status === 'final' && fin.snap);
  const before = await pg.evaluate(() => JSON.stringify(window.__ncgs.view().scores.filter(s => s.round === 'snap-1').length));
  // read the leaderboard totals through the app's own results
  const rowsOf = () => pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.board = 'snap-1'; n.UI.res = 'lb'; n.UI.stack = [{ v: 'board', p: {} }]; n.render(); return [...document.querySelectorAll('.lrow')].map(r => r.textContent.replace(/\s+/g, ' ').trim()).slice(0, 12).join('|'); });
  const a = await rowsOf();
  check('the leaderboard has totals', a.length > 10);
  // someone edits the course afterwards: every par up by one, every stroke index shuffled
  await pg.evaluate(() => {
    const n = window.__ncgs; n.ORGPIN.pin = '1234';
    const c = JSON.parse(JSON.stringify(n.D.course('cabopino')));
    c.holes = c.holes.map((h, i) => Object.assign({}, h, { par: h.par + 1, si: 18 - i }));
    n.put('courses', [c]);
  });
  await pg.waitForTimeout(400);
  const after = await rowsOf();
  check('editing the course later does not change a finished round', a === after);
  // Settings shows app and server status
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'settings', p: {} }]; n.render(); });
  const t = await text();
  check('Settings has an About section with the app and server', /About/.test(t) && /Server/.test(t) && /App/.test(t));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
