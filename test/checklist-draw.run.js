// Stress test 2b (1 November): for a round with pots, the setup checklist points at the breakfast draw, not Groups.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
(async () => {
  const b = await chromium.launch();
  try {
    const pg = await (await b.newContext({ viewport: { width: 360, height: 780 } })).newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    const sync = () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
    await sync();
    await pg.evaluate(() => {
      const n = window.__ncgs; n.ORGPIN.pin = '1234';
      n.DB.server.tables.rounds.filter(r => r.status !== 'final').forEach(r => n.send({ op: 'remove', table: 'rounds', rows: [{ id: r.id }], pin: '1234', withScores: true }));
      const c = n.D.courses().find(x => x.holes && x.tees), ids = n.D.regulars().slice(0, 3).map(m => m.id);
      n.put('rounds', [{ id: 'cl-1', season: 2026, seq: 96, name: 'Draw day', date: '2026-12-05', course: c.id, tee: Object.keys(c.tees)[0], first_tee: '10:00', interval: 10, status: 'upcoming', source: 'organiser', groups: [], contests: [], kb: null }]);
      n.put('settings', [{ key: 'pots:cl-1', value: JSON.stringify({ pots: [[ids[0]], [ids[1]], [ids[2]], []], show: false }) }]);
    });
    await sync();
    await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
    const row = await pg.$('[data-act="org-go"][data-v="drawhome"][data-rid="cl-1"]');
    check('the checklist line opens the breakfast draw', !!row);
    check('and says how many are in the pots', row && /Breakfast draw · 3 players in the pots/.test(await row.innerText()), row && await row.innerText());
    check('it no longer sends the organiser to Groups', !(await pg.$('[data-act="org-go"][data-v="groups"][data-rid="cl-1"]')));
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
