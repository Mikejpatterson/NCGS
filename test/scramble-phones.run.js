// Scramble on real phones against a local copy of the real server (Codex's review of #41, 25 October): the actual save
// path (scrSave), a stale offline phone choosing a different driver, a reload with the save still queued, recovery on
// the phone, and the organiser's Change a player locked once a scramble has scores.
// Run: node tools/devserver.js 8766 & node test/scramble-phones.run.js   (needs a full build with the fixture as seed)
const { chromium } = require('playwright');
const BASE = 'http://localhost:8766';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
const api = async req => (await fetch(BASE + '/api', { method: 'POST', body: JSON.stringify(req) })).json();
const state = async () => (await fetch(BASE + '/__state')).json();
const fault = async mode => fetch(BASE + '/__fault', { method: 'POST', body: JSON.stringify({ mode }) });
let browser;
const rows = async () => (await state()).tables.scores.filter(s => s.round === 'scr' && s.hole === 1).map(s => s.player + ':' + s.strokes).sort().join(',');

async function phone(pid) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(pid + ': ' + e.message));
  await pg.goto(BASE + '/'); await pg.waitForSelector('.brand');
  await pg.evaluate(p => { window.__ncgs.DB.prefs.me = p; window.__ncgs.render(); }, pid);
  const ph = { ctx, pg, pid };
  ph.sync = () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())).catch(() => {});
  ph.hole = async n => { await pg.evaluate(n => { const x = window.__ncgs; x.UI.org = false; x.UI.hole = n; x.UI.edit = true; x.UI.stack = [{ v: 'home', p: {} }, { v: 'entry', p: { rid: 'scr' } }]; x.render(); }, n); await pg.waitForTimeout(150); };
  ph.set = async (score, driver) => {   // through the real buttons
    await pg.click('[data-act="scr-score"][data-dir="up"]'); await pg.waitForTimeout(30);
    for (let i = 0; i < 12; i++) {
      const v = Number((await pg.$eval('.scr-val', e => e.textContent)).trim());
      if (v === score) break;
      await pg.click(`[data-act="scr-score"][data-dir="${v > score ? 'down' : 'up'}"]`); await pg.waitForTimeout(30);
    }
    const on = await pg.$eval(`[data-act="scr-driver"][data-pid="${driver}"]`, e => e.getAttribute('aria-checked'));
    if (on !== 'true') await pg.click(`[data-act="scr-driver"][data-pid="${driver}"]`);
    await pg.click('[data-act="scr-save"]'); await pg.waitForTimeout(250);
  };
  ph.close = () => ctx.close();
  return ph;
}

(async () => {
  browser = await chromium.launch();
  try {
    await fetch(BASE + '/__reset', { method: 'POST' });
    const st = await state();
    const ids = st.tables.members.filter(m => m.id.indexOf('guest') !== 0).map(m => m.id);
    const c = st.tables.courses.find(x => x.holes && x.tees);
    const T = ids.slice(0, 4), T2 = ids.slice(4, 8), spare = ids[8];
    const r = { id: 'scr', season: 2026, seq: 98, date: '2026-10-12', name: 'Scramble test', course: c.id, tee: Object.keys(c.tees)[0], first_tee: '10:00', interval: 10, status: 'live', source: 'organiser',
      groups: [{ id: 'g1', n: 1, teeTime: '10:00', startHole: 1, teams: [T.slice(0, 2), T.slice(2)] }, { id: 'g2', n: 2, teeTime: '10:10', startHole: 1, teams: [T2.slice(0, 2), T2.slice(2)] }], contests: [], kb: null };
    await api({ op: 'put', table: 'rounds', rows: [r], pin: '1234' });
    await api({ op: 'put', table: 'settings', rows: [{ key: 'format:scr', value: 'scramble' }], pin: '1234' });
    const [A, B] = T;
    const a = await phone(A), b = await phone(B);
    await a.sync(); await b.sync();

    await a.hole(1); await a.set(5, A); await a.sync();
    check('1. a phone saves the team score under the driver, and only there', (await rows()) === `${A}:5`, await rows());
    await b.sync();
    await b.ctx.setOffline(true);                                   // b saw A 5, then lost signal
    await a.hole(1); await a.set(6, A); await a.sync();             // a corrects to 6
    await b.hole(1); await b.set(4, B);                             // b, stale: it was B's drive, 4
    const queued = await b.pg.evaluate(() => window.__ncgs.DB.outbox.length);
    check('2. the offline phone keeps its save in the queue', queued > 0, 'queued ' + queued);
    // Reload with the save still queued. (Reloading with no network at all needs the offline app shell, which only
    // works over https on a real phone; here the page loads but the server is unreachable.)
    await fault('down'); await b.ctx.setOffline(false);
    await b.pg.reload(); await b.pg.waitForSelector('main'); await b.pg.waitForTimeout(300);
    check('3. a reload doesn\'t lose the queued save', await b.pg.evaluate(() => window.__ncgs.DB.outbox.length) === queued && (await rows()) === `${A}:6`);
    await fault('none'); await b.sync(); await b.pg.waitForTimeout(300); await b.sync();
    check('4. both drives are kept on the server, nothing overwritten', (await rows()) === [`${A}:6`, `${B}:4`].sort().join(','), await rows());
    check('5. the stale phone is told another phone changed it', await b.pg.evaluate(() => window.__ncgs.DB.conflicts.some(x => x.round === 'scr' && x.hole === 1)));
    await a.sync();
    await a.hole(1);
    check('6. the other phone sees the hole as two drives, not counted', /Two drives saved/.test(await a.pg.locator('main').innerText())
      && await a.pg.evaluate(() => { const x = window.__ncgs; x.DB._memo = {}; return x.D.round('scr') && true; }));
    // Exercise the roster guards BEFORE recovery, while both conflicting driver rows still exist.
    const org = await phone(A);
    await org.pg.evaluate(() => { const x = window.__ncgs; x.UI.org = true; x.UI.orgUnlocked = true; x.ORGPIN.pin = '1234'; x.UI.orgStack = [{ v: 'home', p: {} }, { v: 'late', p: { rid: 'scr' } }]; x.render(); });
    await org.pg.waitForTimeout(150);
    check('unresolved: the roster screen is locked while both driver rows remain', /can.t be swapped or taken out of this scramble/.test(await org.pg.locator('main').innerText())
      && !(await org.pg.locator('[data-act="late-replace"], [data-act="late-drop"]').count()) && (await rows()) === [`${A}:6`, `${B}:4`].sort().join(','));
    const unresolvedGroups = JSON.stringify((await state()).tables.rounds.find(x => x.id === 'scr').groups);
    const unresolvedRows = await rows();
    await org.pg.evaluate(([pid, np]) => { const m = document.createElement('button'); m.dataset.act = 'late-replace'; m.dataset.rid = 'scr'; m.dataset.pid = pid; m.dataset.new = np; document.body.appendChild(m); m.click(); m.remove();
      const d = document.createElement('button'); d.dataset.act = 'late-drop'; d.dataset.rid = 'scr'; d.dataset.pid = pid; document.body.appendChild(d); d.click(); d.click(); d.remove(); }, [T[3], spare]);
    await org.sync(); await org.pg.waitForTimeout(200);
    check('unresolved: direct swap/drop actions preserve the team and BOTH saved attempts', JSON.stringify((await state()).tables.rounds.find(x => x.id === 'scr').groups) === unresolvedGroups && (await rows()) === unresolvedRows);

    // Recovery on b: it has now seen both rows; it picks B 4 and the other row is cleared with its own value.
    await b.hole(1); await b.set(4, B); await b.sync();
    check('7. picking one drive resolves the hole as one unit', (await rows()) === `${B}:4`, await rows());
    await a.sync(); await a.hole(1);
    check('8. the other phone sees it resolved', !/Two drives saved/.test(await a.pg.locator('main').innerText()));

    // Change a player is locked once the scramble has scores, on the screen and in the action itself.
    await org.sync();
    await org.pg.evaluate(() => { const x = window.__ncgs; x.UI.org = true; x.UI.orgUnlocked = true; x.ORGPIN.pin = '1234'; x.UI.orgStack = [{ v: 'home', p: {} }, { v: 'late', p: { rid: 'scr' } }]; x.render(); });
    await org.pg.waitForTimeout(150);
    check('9. the screen says the teams are fixed and offers no swap', /can.t be swapped or taken out of this scramble/.test(await org.pg.locator('main').innerText()) && !(await org.pg.locator('[data-act="late-replace"], [data-act="late-drop"]').count()));
    const before = JSON.stringify((await state()).tables.rounds.find(x => x.id === 'scr').groups);
    // A teammate with no rows of their own (T[3]) is the case the per-player check missed.
    await org.pg.evaluate(([pid, np]) => { const m = document.createElement('button'); m.dataset.act = 'late-replace'; m.dataset.rid = 'scr'; m.dataset.pid = pid; m.dataset.new = np; document.body.appendChild(m); m.click();
      const d = document.createElement('button'); d.dataset.act = 'late-drop'; d.dataset.rid = 'scr'; d.dataset.pid = pid; document.body.appendChild(d); d.click(); d.click(); }, [T[3], spare]);
    await org.sync(); await org.pg.waitForTimeout(200);
    check('10. the swap and drop actions themselves refuse, and the teams are unchanged', JSON.stringify((await state()).tables.rounds.find(x => x.id === 'scr').groups) === before);
    // An ordinary round is unchanged: a player with no scores can still be swapped.
    const ind = Object.assign({}, r, { id: 'ind', name: 'Individual test', groups: [{ id: 'g1', n: 1, teeTime: '11:00', startHole: 1, teams: [T2.slice(0, 2), T2.slice(2)] }] });
    await api({ op: 'put', table: 'rounds', rows: [ind], pin: '1234' }); await org.sync();
    await org.pg.evaluate(([pid, np]) => { const m = document.createElement('button'); m.dataset.act = 'late-replace'; m.dataset.rid = 'ind'; m.dataset.pid = pid; m.dataset.new = np; document.body.appendChild(m); m.click(); }, [T2[3], spare]);
    await org.sync(); await org.pg.waitForTimeout(200);
    check('11. an individual round can still swap a player with no scores', (await state()).tables.rounds.find(x => x.id === 'ind').groups[0].teams.flat().includes(spare));
    await a.close(); await b.close(); await org.close();
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
