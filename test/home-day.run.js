// Home tells you your day (plan batch B, 26 October): before play, your tee time and who you're with;
// on the day a round is finalised, its result leads Home and the next round moves to "Also on".
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true;
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
(async () => {
  const b = await chromium.launch();
  try {
    const errs = [];
    const p = await (await b.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true })).newPage();
    p.on('pageerror', e => errs.push(e.message));
    const fresh = async () => { await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand'); };

    // 1. Groups are out for the next round; nothing is live.
    await fresh();
    const a = await p.evaluate(() => {
      const n = window.__ncgs; n.D.round('demo-cabopino').status = 'final';
      const r = n.D.rounds().find(x => x.status === 'upcoming' && x.groups && x.groups.length);
      const g = r.groups[1], me = g.teams.flat()[0]; n.DB.prefs.me = me; n.render();
      const el = document.querySelector('.now-you');
      return { t: el ? el.innerText : '', tee: g.teeTime, mates: g.teams.flat().filter(x => x !== me).map(n.D.nameOf) };
    });
    check('before play: "You\'re off at <tee time> with <the other three>"', a.t.startsWith(`You're off at ${a.tee} with`) && a.mates.every(m => a.t.includes(m)), a.t);
    const fits = await p.evaluate(() => { const el = document.querySelector('.now-you'); return el.scrollWidth <= el.clientWidth + 1; });
    check('the line wraps inside the card at 360px', fits);

    // 2. Someone not in a group sees no such line.
    const none = await p.evaluate(() => { const n = window.__ncgs; const r = n.D.rounds().find(x => x.status === 'upcoming'); const inIt = new Set(r.groups.flatMap(g => g.teams.flat())); const out = n.D.active().find(m => !inIt.has(m.id)); if (!out) return 'skip'; n.DB.prefs.me = out.id; n.render(); return !document.querySelector('.now-you'); });
    check('someone not playing gets no tee-time line', none === true || none === 'skip', String(none));

    // 3. A round finalised today leads Home.
    await fresh();
    const c = await p.evaluate(() => {
      const n = window.__ncgs; n.D.round('demo-cabopino').status = 'final';
      const fin = n.D.rounds().filter(r => r.status === 'final' && !/^demo/.test(r.id)).slice(-1)[0];
      const d = new Date(); fin.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      n.render();
      const card = document.querySelector('.hero.home .now');
      return { name: n.roundName ? n.roundName(fin) : fin.id, card: card ? card.innerText : '', main: document.querySelector('main').innerText, act: card && card.querySelector('.go') ? card.querySelector('.go').dataset.act : '' };
    });
    check('finalise day: the card says Today · Final and who won', /Today/.test(c.card) && /Final/.test(c.card) && / won/.test(c.card), c.card.replace(/\s+/g, ' '));
    check('its button opens the results', c.act === 'leaderboard');
    check('the next round moves to "Also on"', /Also on/.test(c.main));
    check('no "Last round" row repeating the same round', !/Last round/.test(c.main));

    // 4. A trip with no combined board (Westport): Home still has a way to each day, with who won day 1.
    await p.goto(URL); await p.evaluate(() => localStorage.clear());
    await p.goto('about:blank'); await p.goto(URL + '#scenario=westport');
    await p.waitForFunction(() => window.__ncgs && window.__ncgs.D.round('fx-wp2'));
    const w = await p.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); const row = [...document.querySelectorAll('.hs-row')].find(e => e.dataset.act === 'trip'); return row ? row.innerText : ''; });
    check('Westport day: a trip row says "Day 1: … won · Day 2: live"', /Westport/.test(w) && /Day 1: .+ won/.test(w) && /Day 2: live/.test(w), w.replace(/\s+/g, ' '));
    await p.click('.hs-row[data-act="trip"]'); await p.waitForTimeout(150);
    check('and it opens the trip page', /Day 1/.test(await p.locator('main').innerText()) && !!(await p.$('[data-act="back"]')));
    check('no script errors', errs.length === 0, errs.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  // home-day is already called by layout.run.js in CI: keep the season/result boundary covered there too.
  if (ok) {
    const result = require('child_process').spawnSync(process.execPath,
      [...process.execArgv, require('path').join(__dirname, 'home-season-result.run.js')], { stdio: 'inherit', env: process.env });
    if (result.error) console.error(result.error);
    if (result.status !== 0) ok = false;
  }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
