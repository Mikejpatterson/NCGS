// Owner, 31 October: going into a round from a phone set to someone who isn't in a group sent you to "Who are you?",
// and picking a name sent you straight back there. Now only the round's players are listed, and picking one goes in.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
(async () => {
  const b = await chromium.launch();
  try {
    const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    await pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
    const setup = await pg.evaluate(() => {
      const n = window.__ncgs; n.ORGPIN.pin = '1234';
      const regs = n.D.regulars(); const four = regs.slice(0, 4).map(m => m.id); const outsider = regs[regs.length - 1].id;
      const base = { season: 2026, seq: 90, date: n.todayIso(), course: n.D.courses().find(c => c.holes && c.tees).id, first_tee: '10:00', interval: 10, status: 'upcoming', source: 'organiser', contests: [], kb: null };
      base.tee = Object.keys(n.D.course(base.course).tees)[0];
      n.put('rounds', [Object.assign({ id: 'who-1', name: 'Who test', groups: [{ id: 'g1', n: 1, teeTime: '10:00', startHole: 1, teams: [four.slice(0, 2), four.slice(2)] }] }, base),
                       Object.assign({ id: 'who-2', name: 'No groups yet', groups: [] }, base, { seq: 91 })]);
      n.DB.prefs.me = outsider; return { four, outsider };
    });
    await pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
    const enter = async rid => { await pg.evaluate(rid => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); const b = document.createElement('button'); b.dataset.act = 'play'; b.dataset.rid = rid; b.id = 'go-in'; b.textContent = 'go'; document.getElementById('app').appendChild(b); }, rid); await pg.evaluate(() => document.getElementById('go-in').click()); await pg.waitForTimeout(250); };
    const view = () => pg.evaluate(() => { const s = window.__ncgs.UI.stack; return s[s.length - 1].v; });

    await enter('who-1');
    check('a phone set to someone not playing is asked who it is', await view() === 'who');
    const ids = await pg.$$eval('[data-act="pick"]', e => e.map(x => x.dataset.id));
    check('only the four players in the round are listed', ids.length === 4 && setup.four.every(id => ids.includes(id)), ids.join());
    check('it says why', /isn't in a group for Who test/.test(await pg.locator('main').innerText()));
    await pg.click(`[data-act="pick"][data-id="${setup.four[2]}"]`); await pg.waitForTimeout(300);
    const v = await view();
    check('picking a player goes into the round, not back to "Who are you?"', v !== 'who', v);
    check('the phone is now that player', await pg.evaluate(() => window.__ncgs.DB.prefs.me) === setup.four[2]);

    await enter('who-2');
    check('a round with no groups explains that, instead of a list that goes nowhere', await view() === 'who' && !(await pg.$('[data-act="pick"]')) && /no groups for No groups yet/.test(await pg.locator('main').innerText()));
    await pg.evaluate(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }, { v: 'who', p: { then: null } }]; n.render(); });
    check('"Who are you?" from Home still lists every member', (await pg.$$('[data-act="pick"]')).length >= 8);
    const over = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check('fits the screen', !over);
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
