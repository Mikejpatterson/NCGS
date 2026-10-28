// A whole golf day, end to end, against a local copy of the real server (structural review M7).
// Two rounds in a fresh season, three groups of four, all 18 holes. Group 1 of the second round is scored on a phone
// through the real screens, with the server down for three holes in the middle; the other groups save over HTTP as
// phones do. The organiser finalises each round on the organiser screen. Every player's points and the Golfer of the
// Year table are then checked against figures worked out here, independently of the app's scoring code.
// Run: node tools/devserver.js 8766 &  then  node test/fullday.run.js   (after a full build with the fixture seed)
const { chromium } = require('playwright');
const BASE = 'http://localhost:8766';
const PIN = '1234';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
const api = async req => (await fetch(BASE + '/api', { method: 'POST', body: JSON.stringify(req) })).json();
const state = async () => (await fetch(BASE + '/__state')).json();
const fault = async mode => fetch(BASE + '/__fault', { method: 'POST', body: JSON.stringify({ mode }) });

// ---- Scoring worked out here, from the rules in CLAUDE.md, not from src/engine.js ----
function playingHandicap(index, tee) { return Math.round(index * tee.slope / 113 + (tee.rating - tee.par)); }   // 100% allowance
function shotsOn(ph, si) { if (ph <= 0) return 0; return Math.floor(ph / 18) + (si <= ph % 18 ? 1 : 0); }
function points(gross, par, shots) { return Math.max(0, par + shots - gross + 2); }
const grossFor = (i, n, par, round) => par + ((i + n + round) % 3) - 1;   // par-1 .. par+1, deterministic

(async () => {
  await fetch(BASE + '/__reset', { method: 'POST' });
  const st = await state();
  const members = st.tables.members.filter(m => m.active !== false && !String(m.id).startsWith('guest-'));
  const course = st.tables.courses.find(c => c.holes && c.tees);
  const teeKey = Object.keys(course.tees)[0], tee = course.tees[teeKey];
  const holes = course.holes;
  if (members.length < 12) throw new Error('the fixture needs 12 members');
  const players = members.slice(0, 12).map(m => m.id);
  const idx = Object.fromEntries(members.map(m => [m.id, m.index]));
  const groups = [0, 1, 2].map(g => ({ id: 'g' + (g + 1), n: g + 1, teeTime: `10:${String(g * 8).padStart(2, '0')}`, startHole: 1, teams: [players.slice(g * 4, g * 4 + 2), players.slice(g * 4 + 2, g * 4 + 4)] }));
  const round = (id, seq, date) => ({ id, season: 2030, seq, date, name: 'Full day ' + seq, course: course.id, tee: teeKey, first_tee: '10:00', interval: 8, status: 'live', source: 'organiser', groups, contests: [], kb: null });
  await api({ op: 'put', table: 'settings', pin: PIN, rows: [{ key: 'season', value: '2030' }] });

  const saveGroup = async (rid, g, ri, from = 1, to = 18) => {
    for (let n = from; n <= to; n++) {
      const scores = Object.fromEntries(g.teams.flat().map(pid => [pid, { v: grossFor(players.indexOf(pid), n, holes[n - 1].par, ri), base: null }]));
      const r = await api({ op: 'saveHole', round: rid, grp: g.id, hole: n, scores, by: 'Test' });
      if (!r.ok) throw new Error('save failed ' + JSON.stringify(r));
    }
  };

  const browser = await chromium.launch();
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(BASE + '/'); await pg.waitForSelector('.brand');
    return { ctx, pg, sync: () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())) };
  };
  const finalise = async (o, rid) => {
    await o.sync();
    await o.pg.evaluate(rid => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid } }]; n.render(); }, rid);
    await o.pg.click('[data-act="finalise"]'); await o.pg.waitForTimeout(300);
    await o.sync(); await o.pg.waitForTimeout(300);
  };

  try {
    const org = await open();

    /* Round 1: everyone saves over HTTP, the organiser finalises. */
    await api({ op: 'put', table: 'rounds', pin: PIN, rows: [round('fd-1', 1, '2030-05-01')] });
    for (const g of groups) await saveGroup('fd-1', g, 1);
    await finalise(org, 'fd-1');
    check('round 1 is final after the organiser taps Finalise', (await state()).tables.rounds.find(r => r.id === 'fd-1').status === 'final');

    /* Round 2: group 1 on a phone, through the screens, with the server down for holes 7 to 9. */
    await api({ op: 'put', table: 'rounds', pin: PIN, rows: [round('fd-2', 2, '2030-05-02')] });
    await Promise.all([saveGroup('fd-2', groups[1], 2), saveGroup('fd-2', groups[2], 2)]);
    const ph = await open();
    await ph.sync();
    await ph.pg.evaluate(p => { const n = window.__ncgs; n.DB.prefs.me = p; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); }, groups[0].teams[0][0]);
    await ph.pg.click('#tabs .tab:nth-child(2)'); await ph.pg.waitForTimeout(250);
    let queuedInOutage = 0;
    for (let n = 1; n <= 18; n++) {
      if (n === 7) await fault('down');
      if (!(await ph.pg.$('[data-act="save"]'))) { await ph.pg.click('[data-act="enter"]').catch(() => {}); await ph.pg.waitForTimeout(150); }
      const shown = await ph.pg.$eval('.entn', e => Number(e.textContent));
      if (shown !== n) throw new Error(`the phone is on hole ${shown}, expected ${n}`);
      for (const pid of groups[0].teams.flat()) {
        const want = grossFor(players.indexOf(pid), n, holes[n - 1].par, 2);
        for (let i = 0; i < 14; i++) {
          const cur = await ph.pg.$eval(`.stv[data-pid="${pid}"]`, e => e.dataset.n); const v = cur === '' ? NaN : Number(cur);
          if (v === want) break;
          await ph.pg.click(`[data-act="set"][data-pid="${pid}"][data-dir="${Number.isInteger(v) && v > want ? 'down' : 'up'}"]`); await ph.pg.waitForTimeout(30);
        }
      }
      await ph.pg.click('[data-act="save"]'); await ph.pg.waitForTimeout(200);
      if (n === 9) { queuedInOutage = await ph.pg.evaluate(() => window.__ncgs.DB.outbox.length); await fault('none'); }
      if (n < 18) { await ph.pg.click('[data-act="next"]'); await ph.pg.waitForTimeout(200); }
    }
    check('during the outage the phone kept its saves', queuedInOutage >= 3, 'queued ' + queuedInOutage);
    for (let i = 0; i < 4; i++) { await ph.sync(); await ph.pg.waitForTimeout(300); }
    const g1rows = (await state()).tables.scores.filter(s => s.round === 'fd-2' && groups[0].teams.flat().includes(s.player));
    check('every one of group 1\'s 72 scores reached the server', g1rows.length === 72, 'server has ' + g1rows.length);
    check('none was changed on the way', g1rows.every(s => s.strokes === grossFor(players.indexOf(s.player), s.hole, holes[s.hole - 1].par, 2)));
    await finalise(org, 'fd-2');
    const rounds = (await state()).tables.rounds;
    check('round 2 is final', rounds.find(r => r.id === 'fd-2').status === 'final');
    check('both rounds have all 432 scores', (await state()).tables.scores.filter(s => /^fd-/.test(s.round)).length === 432);

    /* The app's results against the figures worked out here. */
    const expect = ri => Object.fromEntries(players.map(pid => {
      const ph = playingHandicap(idx[pid], tee);
      return [pid, holes.reduce((t, h, i) => t + points(grossFor(players.indexOf(pid), i + 1, h.par, ri), h.par, shotsOn(ph, h.si)), 0)];
    }));
    const e1 = expect(1), e2 = expect(2);
    await org.sync();
    const app = await org.pg.evaluate(() => { const n = window.__ncgs; const r = rid => n.resultsOf(rid).rows.map(x => ({ id: x.id, total: x.total, pos: x.pos })); return { r1: r('fd-1'), r2: r('fd-2'), season: n.seasonOf(), goy: n.goy(2030).map(x => ({ id: x.id, total: x.total })) }; });
    const totals = rows => Object.fromEntries(rows.map(x => [x.id, x.total]));
    const diff = (a, b) => players.filter(p => a[p] !== b[p]).map(p => `${p}: app ${a[p]} vs ${b[p]}`).join('; ');
    check('round 1: every player\'s Stableford points match', !diff(totals(app.r1), e1), diff(totals(app.r1), e1));
    check('round 2: every player\'s Stableford points match', !diff(totals(app.r2), e2), diff(totals(app.r2), e2));
    const ordered = rows => rows.every((x, i) => i === 0 || rows[i - 1].total >= x.total) && rows[0].pos === 1;
    check('both leaderboards are in points order with a winner', ordered(app.r1) && ordered(app.r2));
    check('Golfer of the Year is on the new season', app.season === 2030, String(app.season));
    const goyWant = Object.fromEntries(players.map(p => [p, e1[p] + e2[p]]));   // best 3 count; only 2 rounds played
    check('Golfer of the Year: each player\'s total is both rounds added', !diff(totals(app.goy), goyWant), diff(totals(app.goy), goyWant));
    check('Golfer of the Year is in points order', app.goy.every((x, i) => i === 0 || app.goy[i - 1].total >= x.total));
    await ph.ctx.close(); await org.ctx.close();
  } catch (e) {
    console.log('FAIL  harness error: ' + e.message); ok = false;
  } finally { await fault('none'); }
  check('no script errors on any phone', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
