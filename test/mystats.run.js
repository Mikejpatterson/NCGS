// KBs: the bottom row is highlighted and nothing mentions drinks. Player and society stats pages.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  const text = () => pg.textContent('#app');
  const tap = async s => { await pg.click(s); await pg.waitForTimeout(200); };
  await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
  await tap('[data-act="demo-fill"]');
  // a finished, organiser-made copy of the demo round so hole-by-hole numbers count
  await pg.evaluate(() => {
    const n = window.__ncgs; const base = n.D.round('demo-cabopino');
    n.put('rounds', [Object.assign({}, base, { id: 'real-1', source: 'organiser', status: 'final', name: 'Cabopino', date: '2026-10-01', season: 2026 })]);
    const sc = n.D.scores('demo-cabopino'), rows = [];
    Object.keys(sc).forEach(pid => Object.keys(sc[pid]).forEach(h => rows.push({ round: 'real-1', player: pid, hole: Number(h), strokes: sc[pid][h], by: 'test', at: '' })));
    n.put('scores', rows);
  });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'board', p: {} }]; n.UI.board = 'demo-cabopino'; n.UI.res = 'lb'; n.render(); });
  const rows = await pg.$$('.lrow');
  const kbRows = await pg.evaluate(() => { const s = [...document.querySelectorAll('.sec')].find(x => /^KBs/.test(x.querySelector('.sec-label')?.textContent || '')); return s ? [...s.querySelectorAll('.lrow')].map(r => r.classList.contains('low')) : null; });
  check('a KBs table is shown', !!kbRows && kbRows.length >= 2);
  check('only the bottom row is highlighted', !!kbRows && kbRows[kbRows.length - 1] === true && kbRows.slice(0, -1).every(x => !x));
  check('no drinks or buying wording on Results', !/drinks|buying/i.test(await text()));
  for (const pill of ['bw', 'ct', 'st']) { if (await pg.$(`.seg.pills button[data-p="${pill}"]`)) { await tap(`.seg.pills button[data-p="${pill}"]`); check('no drinks wording on ' + pill, !/drinks|buying/i.test(await text())); } }
  // society stats from the home tile
  await pg.evaluate(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
  await tap('[data-act="stats"]');
  const t = await text();
  check('Stats page lists KBs, wins and averages', /KBs/.test(t) && /Average points/.test(t) && /Round wins/.test(t));
  // a player's own page
  await tap('.lrow[data-act="player"]');
  const pt = await text();
  check('player page shows a scores chart and their numbers', !!(await pg.$('svg.chart')) && /Numbers/.test(pt) && /Average/.test(pt) && /KBs/.test(pt));
  check('hole-by-hole numbers appear for a scored round', /Birdies/.test(pt) && /Par 4s/.test(pt));
  check('no script errors', errs.length === 0);
  if (errs.length) console.log(errs);
  await pg.screenshot({ path: '/tmp/player.png', fullPage: false });
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
