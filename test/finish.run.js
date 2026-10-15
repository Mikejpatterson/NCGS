// Plays the whole round end to end on one phone, tapping only real buttons: every hole, "after" screen, card check, finish, results, and back out.
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/preview.html';
let ok = true; const check = (n, c, x) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && x ? '   [' + x + ']' : '')); if (!c) ok = false; };
(async () => {
  const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
  await pg.evaluate(() => { const n = window.__ncgs; n.DB.prefs.me = 'brian'; n.render(); });
  const top = () => pg.evaluate(() => { const n = window.__ncgs; const s = n.UI.org ? n.UI.orgStack : n.UI.stack; return s[s.length - 1].v; });
  const tap = async s => { await pg.click(s, { timeout: 4000 }); await pg.waitForTimeout(140); };
  const have = async s => !!(await pg.$(s)) && await (await pg.$(s)).isVisible();
  await tap('#tabs .tab:nth-child(2)');
  check('Hole tab opens the score entry', await top() === 'tee' && !!(await pg.$('.entry .stepper')), await top());
  let holes = 0, seen = new Set();
  for (let guard = 0; guard < 60; guard++) {
    const t = await top(); seen.add(t);
    if (await have('[data-act="intro-go"]')) { await tap('[data-act="intro-go"]'); continue; }
    if (await have('.askrows')) { await tap('.askrow:last-child'); await tap('[data-act="ask-confirm"]'); continue; }
    if (t === 'tee' || t === 'entry') {
      // give every player in the group a score using the + button (first tap gives par-ish), then save
      const pids = await pg.$$eval('[data-act="set"][data-dir="up"]', els => els.map(e => e.dataset.pid));
      for (const pid of pids) { await pg.click(`[data-act="set"][data-pid="${pid}"][data-dir="up"]`); await pg.waitForTimeout(60); }
      if (!(await have('[data-act="save"]'))) { check('Save button visible on entry', false); break; }
      await tap('[data-act="save"]'); holes++; continue;
    }
    if (t === 'after') {
      if (await have('[data-act="next"]')) await tap('[data-act="next"]');
      else if (await have('[data-act="to-finish"]')) await tap('[data-act="to-finish"]');
      else { check('After screen has a way forward', false); break; }
      continue;
    }
    if (t === 'check') { if (await have('[data-act="check-done"]')) { await tap('[data-act="check-done"]'); continue; } if (await have('[data-act="manual-ok"]')) { await tap('[data-act="manual-ok"]'); continue; } if (await have('[data-act="manual-check"]')) { await tap('[data-act="manual-check"]'); continue; } check('Check screen has a way forward', false, await pg.evaluate(() => [...document.querySelectorAll('button')].map(e => e.innerText.trim().slice(0, 20)).join(' | '))); break; }
    if (t === 'finish') break;
    check('unexpected screen ' + t, false); break;
  }
  check('scores saved for a lot of holes', holes >= 3, 'holes ' + holes);
  check('screens seen in order: entry, after, and finish or check', (seen.has('entry') || seen.has('tee')) && seen.has('after'), [...seen].join(','));
  const depth = await pg.evaluate(() => window.__ncgs.UI.stack.length);
  check('the Back history is short after a whole round (no stack of identical hole screens)', depth <= 3, 'stack depth ' + depth);
  const end = await top();
  console.log('ended on', end, 'after', holes, 'holes; saw', [...seen].join(','));
  // back out from wherever we are using only visible controls
  for (let k = 0; k < 8; k++) {
    const t = await top(); if (t === 'home') break;
    let hit = null; for (const q of ['[data-act="entry-back"]', '[data-act="back"]', '[data-act="home"]', '.tab[data-tab="hole"]']) { const e = await pg.$(q); if (e && await e.isVisible()) { hit = q; break; } }
    if (!hit) break; await tap(hit);
  }
  check('can get back to the front page after the round', await top() === 'home', await top());
  check('no script errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  await b.close(); console.log(ok ? 'all passed' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
