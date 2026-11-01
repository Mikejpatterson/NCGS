// Reviewer's stress test, 1 November: a screen that fails to draw is noted in the change log, without personal data.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
(async () => {
  const b = await chromium.launch();
  try {
    const pg = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    const sync = () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
    await sync();
    // Make one screen fail to draw: Players of a round, with the members list made to throw.
    const toast = await pg.evaluate(() => {
      const n = window.__ncgs, real = n.D.member;
      let once = true; n.D.member = (...a) => { if (once) { once = false; throw new Error('test fault'); } return real(...a); };
      n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }, { v: 'who', p: { then: n.D.rounds()[0].id } }];
      n.DB.prefs.me = 'secret-person-id';
      try { n.render(); } finally { n.D.member = real; }
      const t = document.querySelector('.toast'); return t ? t.textContent : '';
    });
    check('the player sees the new wording', /Something went wrong on that screen\. It has been noted\./.test(toast), toast);
    check('the app steps back to a working screen', await pg.evaluate(() => { const s = window.__ncgs.UI.stack; return s[s.length - 1].v !== 'who'; }));
    await sync();
    const rows = await pg.evaluate(() => window.__ncgs.DB.server.tables.log.filter(l => l.action === 'Screen problem'));
    check('one "Screen problem" note reaches the change log', rows.length === 1, JSON.stringify(rows));
    check('it names the screen and the error', rows[0] && /^who: test fault/.test(rows[0].detail), rows[0] && rows[0].detail);
    check('it holds no ids or names', rows[0] && !/secret-person-id|then|rid/.test(rows[0].detail + rows[0].by) && rows[0].by === 'App');
    // The same fault again in this visit is not noted twice.
    await pg.evaluate(() => { const n = window.__ncgs, real = n.D.member; let once = true; n.D.member = (...a) => { if (once) { once = false; throw new Error('test fault'); } return real(...a); }; n.UI.stack = [{ v: 'home', p: {} }, { v: 'who', p: { then: n.D.rounds()[0].id } }]; try { n.render(); } finally { n.D.member = real; } });
    await sync();
    check('the same fault is noted only once per visit', (await pg.evaluate(() => window.__ncgs.DB.server.tables.log.filter(l => l.action === 'Screen problem').length)) === 1);
    check('no uncaught script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
