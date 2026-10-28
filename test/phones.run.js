// Several simulated phones against a local copy of the real server: offline entry, clashing scores, server outages, reloads.
// Run: sh tools/check.sh   (starts the dev server on 8766)  or:  node tools/devserver.js 8766 & node test/phones.run.js
const { chromium } = require('playwright');
const BASE = 'http://localhost:8766';
let ok = true; const errs = [];
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
const api = async req => (await fetch(BASE + '/api', { method: 'POST', body: JSON.stringify(req) })).json();
const state = async () => (await fetch(BASE + '/__state')).json();
const fault = async mode => fetch(BASE + '/__fault', { method: 'POST', body: JSON.stringify({ mode }) });
const reset = async () => { await fetch(BASE + '/__reset', { method: 'POST' }); };
let browser;
async function phone(pid, sw) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: sw ? 'allow' : 'block' });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(pid + ': ' + e.message));
  await pg.goto(BASE + '/'); await pg.waitForSelector('.brand');
  if (sw) { await pg.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await pg.reload(); await pg.waitForSelector('.brand'); await pg.waitForTimeout(500); }
  await pg.evaluate(p => { window.__ncgs.DB.prefs.me = p; window.__ncgs.render(); }, pid);
  const ph = { ctx, pg, pid };
  ph.sync = () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync()));
  ph.go = async () => { await pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); }); await pg.waitForTimeout(150); await pg.click('#tabs .tab:nth-child(2)', { timeout: 4000 }).catch(() => {}); await pg.waitForTimeout(250); };
  ph.score = async (vals, save = true) => { // vals: { pid: strokes }
    if (!(await pg.$('[data-act="save"]'))) { await pg.click('[data-act="enter"]'); await pg.waitForTimeout(150); }
    for (const [p, v] of Object.entries(vals)) {
      for (let i = 0; i < 14; i++) {
        const cur = await pg.$eval(`.stv[data-pid="${p}"]`, e => e.dataset.n); const n = cur === '' ? NaN : Number(cur);
        if (n === v) break;
        await pg.click(`[data-act="set"][data-pid="${p}"][data-dir="${Number.isInteger(n) && n > v ? 'down' : 'up'}"]`); await pg.waitForTimeout(40);
      }
    }
    if (save) { await pg.click('[data-act="save"]'); await pg.waitForTimeout(250); }
  };
  ph.close = () => ctx.close();
  return ph;
}
const G1 = ['mike-p', 'sean', 'kieran', 'derek'], G2 = ['john-k', 'colin', 'damien', 'mike-f'];
async function setupRound(status = 'live') {
  await reset();
  const st = await state();
  const ids = st.tables.members.map(m => m.id);
  const use = [...G1, ...G2].every(i => ids.includes(i)) ? [G1, G2] : [ids.slice(0, 4), ids.slice(4, 8)];
  const c = st.tables.courses.find(x => x.holes && x.tees);
  const tee = Object.keys(c.tees)[0];
  const r = { id: 'e2e', season: 2026, seq: 99, date: '2026-10-12', name: 'E2E round', course: c.id, tee, first_tee: '10:00', interval: 8, status, source: 'organiser', groups: use.map((g, i) => ({ id: 'g' + (i + 1), n: i + 1, teeTime: '10:0' + i, startHole: 1, teams: [g.slice(0, 2), g.slice(2)] })), contests: [], kb: null };
  const res = await api({ op: 'put', table: 'rounds', rows: [r], pin: '1234' });
  if (!res.ok) throw new Error('could not make the round ' + JSON.stringify(res));
  return { round: r, g1: use[0], g2: use[1] };
}
const serverScores = async () => (await state()).tables.scores.filter(s => s.round === 'e2e');

(async () => {
  browser = await chromium.launch();
  try {
    /* 1. two phones, two groups: one phone's score reaches the other */
    let R = await setupRound();
    let a = await phone(R.g1[0]), b = await phone(R.g2[0]);
    await a.go(); await a.score(Object.fromEntries(R.g1.map(p => [p, 4])));
    await a.sync();
    check('1. a saved hole reaches the server', (await serverScores()).length === 4);
    await b.sync(); await b.pg.waitForTimeout(200);
    const seen = await b.pg.evaluate(() => Object.keys(window.__ncgs.D.scores('e2e')).length);
    check('1. the other phone sees it after a sync', seen === 4, 'saw ' + seen);

    /* 2. offline: hole 1 to 3 entered with no signal, nothing lost, all arrives on reconnect */
    await a.ctx.setOffline(true);
    for (let h = 2; h <= 4; h++) {
      await a.pg.click('[data-act="next"]').catch(() => {}); await a.pg.waitForTimeout(150);
      await a.score(Object.fromEntries(R.g1.map(p => [p, 3 + (h % 3)])));
    }
    const queued = await a.pg.evaluate(() => (window.__ncgs.DB.outbox || []).length);
    check('2. offline saves are queued on the phone', queued > 0, 'queued ' + queued);
    check('2. the server has not seen them yet', (await serverScores()).length === 4);
    await a.ctx.setOffline(false);
    await a.sync(); await a.pg.waitForTimeout(500); await a.sync();
    const all = await serverScores();
    check('2. everything arrives after reconnecting', all.length === 16, 'server has ' + all.length);
    check('2. the queue is empty afterwards', (await a.pg.evaluate(() => (window.__ncgs.DB.outbox || []).length)) === 0);

    /* 3. reload with unsent scores while the server is unreachable: they survive and go when it returns
       (the offline app shell itself needs https and a real phone: see the manual checks in the test plan) */
    await a.close(); await b.close();
    R = await setupRound();
    a = await phone(R.g1[0]);
    await a.go();
    await fault('down');
    await a.score(Object.fromEntries(R.g1.map(p => [p, 5])));
    await a.pg.reload(); await a.pg.waitForFunction(() => window.__ncgs && window.__ncgs.DB.loaded); await a.pg.waitForTimeout(800);
    const afterReload = await a.pg.evaluate(() => (window.__ncgs.DB.outbox || []).length);
    check('3. unsent scores survive a reload', afterReload > 0, 'outbox ' + afterReload);
    check('3. the phone still shows the scores it holds', (await a.pg.evaluate(() => Object.keys(window.__ncgs.D.scores('e2e')).length)) === 4);
    await fault('none');
    await a.sync(); await a.pg.waitForTimeout(500); await a.sync();
    check('3. and are sent when the server is back', (await serverScores()).length === 4, 'server ' + (await serverScores()).length);
    await a.close();

    /* 4. two phones score the same hole for the same players: no silent overwrite */
    R = await setupRound();
    a = await phone(R.g1[0]); b = await phone(R.g1[1]);
    await a.go(); await b.go();
    await a.ctx.setOffline(true);
    await a.score(Object.fromEntries(R.g1.map(p => [p, 4])));
    await b.score(Object.fromEntries(R.g1.map(p => [p, 6])));
    await b.sync();
    await a.ctx.setOffline(false);
    await a.sync(); await a.pg.waitForTimeout(500); await a.sync();
    let sc = await serverScores();
    check('4. the first score to arrive stays', sc.length === 4 && sc.every(s => s.strokes === 6), JSON.stringify(sc.map(s => s.strokes)));
    const conf = await a.pg.evaluate(() => window.__ncgs.DB.conflicts.length);
    check('4. the late phone is told about the clash', conf === 4, 'conflicts ' + conf);
    check('4. the clash is not lost: it is still on that phone', (await a.pg.evaluate(() => JSON.stringify(window.__ncgs.DB.conflicts))).includes('4'));
    // 4b. the phone restarts before anyone looks at the clash: it is still there (review M2)
    await a.pg.reload(); await a.pg.waitForFunction(() => window.__ncgs && window.__ncgs.DB.loaded); await a.pg.waitForTimeout(300);
    const kept4 = await a.pg.evaluate(() => window.__ncgs.DB.conflicts.map(c => c.mine).join(','));
    check('4b. after a restart the clash and this phone\'s scores are still there', kept4 === '4,4,4,4', kept4);
    await a.go();
    check('4b. and the hole screen still flags it ("Saved on two phones")', /Saved on two phones|Another phone saved/.test(await a.pg.locator('main').innerText()));
    await a.close(); await b.close();

    /* 5. the server goes away mid-round: scoring carries on, nothing is lost */
    R = await setupRound();
    a = await phone(R.g1[0]);
    await a.go();
    for (const mode of ['down', 'drop', 'slow']) {
      await fault(mode);
      const n0 = (await serverScores()).length;
      await a.pg.click('[data-act="next"]').catch(() => {}); await a.pg.waitForTimeout(100);
      await a.score(Object.fromEntries(R.g1.map(p => [p, 4])));
      check(`5. with the server ${mode}, the phone still takes the score`, (await a.pg.evaluate(() => (window.__ncgs.DB.outbox || []).length)) > 0 || (await serverScores()).length > n0);
      await fault('none');
      await a.pg.waitForTimeout(mode === 'slow' ? 4500 : 300);
      await a.sync(); await a.pg.waitForTimeout(700); await a.sync(); await a.pg.waitForTimeout(300);
      check(`5. after the ${mode} outage everything is on the server`, (await serverScores()).length >= n0 + 4);
    }
    const holes = new Set((await serverScores()).map(s => s.hole));
    check('5. no hole was skipped or doubled', holes.size === 3 && (await serverScores()).length === 12, [...holes].join(','));
    await a.close();

    /* 6. rapid taps */
    R = await setupRound();
    a = await phone(R.g1[0]);
    await a.go();
    await a.pg.click('[data-act="enter"]').catch(() => {}); await a.pg.waitForTimeout(150);
    await a.score(Object.fromEntries(R.g1.map(p => [p, 4])), false);
    const pt = await a.pg.$eval('[data-act="save"]', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    for (let i = 0; i < 3; i++) { await a.pg.mouse.click(pt[0], pt[1]); await a.pg.waitForTimeout(30); }
    await a.pg.waitForTimeout(400); await a.sync();
    check('6. a triple-tap on Save writes each score once', (await serverScores()).length === 4, 'rows ' + (await serverScores()).length);
    const logs = (await state()).tables.log.filter(l => /Score/.test(l.action)).length;
    check('6. and does not spam the change log', logs <= 1, 'log ' + logs);
    await a.close();

    /* 6b. on a slow connection a saved score never blinks out of the phone while it is being confirmed */
    R = await setupRound();
    a = await phone(R.g1[0]); await a.go();
    await fault('slow');
    await a.score(Object.fromEntries(R.g1.map(p => [p, 4])));
    let peak = 0, dips = 0;
    for (let i = 0; i < 40; i++) { const n = await a.pg.evaluate(() => Object.keys(window.__ncgs.D.scores('e2e')).length); if (n >= 4) peak = 4; else if (peak === 4) dips++; await a.pg.waitForTimeout(250); }
    check('6b. the score stays visible while the slow server confirms it', peak === 4 && dips === 0, 'peak ' + peak + ', blank for ' + dips + ' checks');
    await fault('none'); await a.close();

    /* 7. the round is finalised while a phone is still offline with a score */
    R = await setupRound();
    a = await phone(R.g1[0]); await a.go();
    await a.ctx.setOffline(true);
    await a.score(Object.fromEntries(R.g1.map(p => [p, 4])));
    await api({ op: 'put', table: 'rounds', rows: [Object.assign({}, R.round, { status: 'final' })], pin: '1234' });
    await a.ctx.setOffline(false);
    await a.sync(); await a.pg.waitForTimeout(500); await a.sync();
    check('7. a late score for a finished round is not added', (await serverScores()).length === 0);
    const kept = await a.pg.evaluate(() => (window.__ncgs.DB.prefs.rejected || []).length);
    check('7. it is kept on the phone, not thrown away', kept > 0, 'kept ' + kept);
    // ...and shown, not just a passing toast (review H1): on Home, on the hole screen, and to the organiser
    await a.pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
    check('7. Home says a change was not saved', /1 change not saved/.test(await a.pg.locator('main').innerText()));
    await a.pg.click('.rej-note'); await a.pg.waitForTimeout(150);
    const why = await a.pg.locator('main').innerText();
    check('7. tapping it says what and why', /Hole 1/.test(why) && /already final/.test(why), why.replace(/\s+/g, ' ').slice(0, 160));
    await a.sync(); await a.pg.waitForTimeout(300);
    const logged = (await state()).tables.log.filter(l => String(l.id).startsWith('rej:e2e:'));
    check('7. the organiser\'s log has it', logged.length === 1 && /already final/.test(logged[0].detail), JSON.stringify(logged));
    const o = await phone(R.g2[0]);
    await o.sync();
    await o.pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'e2e' } }]; n.render(); });
    check('7. the organiser\'s round page shows the score that was not saved', /1 score sent by a phone was not saved/.test(await o.pg.locator('main').innerText()));
    await o.close();
    await a.pg.click('[data-act="rejected-clear"]'); await a.pg.click('[data-act="rejected-clear"]'); await a.pg.waitForTimeout(150);
    check('7. the phone\'s list can be cleared', (await a.pg.evaluate(() => (window.__ncgs.DB.prefs.rejected || []).length)) === 0);
    await a.close();

    /* 7b. the server answers but keeps failing: the phone says it isn't reaching the server (review M3) */
    R = await setupRound();
    a = await phone(R.g1[0]); await a.go();
    await fault('error');
    await a.score(Object.fromEntries(R.g1.map(p => [p, 4])));
    for (let i = 0; i < 4; i++) { await a.pg.evaluate(() => window.__ncgs.flush()); await a.pg.waitForTimeout(100); }
    await a.pg.evaluate(() => window.__ncgs.render());
    check('7b. after repeated server errors the phone says so', /Not reaching the server/.test(await a.pg.locator('main').innerText()));
    await fault('none');
    await a.sync(); await a.pg.waitForTimeout(500); await a.sync(); await a.pg.evaluate(() => window.__ncgs.render());
    check('7b. and the scores go once the server recovers', (await serverScores()).length === 4 && !/Not reaching the server/.test(await a.pg.locator('main').innerText()));
    await a.close();

    /* 8. the organiser deletes the round under a phone that is mid-entry */
    R = await setupRound();
    a = await phone(R.g1[0]); await a.go();
    await a.score(Object.fromEntries(R.g1.map(p => [p, 4])), false);
    await api({ op: 'remove', table: 'rounds', rows: [{ id: 'e2e' }], pin: '1234', log: { action: 'Round deleted', detail: 'e2e' } });
    await a.sync(); await a.pg.waitForTimeout(400);
    await a.pg.click('[data-act="save"]').catch(() => {}); await a.pg.waitForTimeout(400); await a.sync();
    check('8. the phone does not crash when its round disappears', errs.length === 0, errs.slice(0, 2).join(' | '));
    check('8. and nothing is written for a round that no longer exists', (await serverScores()).length === 0);
    await a.close();

    /* 9. three phones in one group scoring different holes at once, then all agree */
    R = await setupRound();
    const ps = [await phone(R.g1[0]), await phone(R.g1[1]), await phone(R.g2[0])];
    for (const p of ps) await p.go();
    await Promise.all(ps.map((p, i) => p.score(Object.fromEntries((i === 2 ? R.g2 : R.g1).map(x => [x, 4 + i])))));
    for (const p of ps) { await p.sync(); }
    for (const p of ps) { await p.sync(); await p.pg.waitForTimeout(300); }
    const totals = await Promise.all(ps.map(p => p.pg.evaluate(() => JSON.stringify(window.__ncgs.DB.server.tables.scores.length))));
    check('9. every phone ends with the same scores', new Set(totals).size === 1, totals.join(','));
    for (const p of ps) await p.close();
  } catch (e) {
    console.log('FAIL  harness error: ' + e.message); ok = false;
  }
  check('no script errors on any phone', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
