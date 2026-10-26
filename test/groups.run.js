// One Groups screen for every round (owner, 26 October), through the real buttons in the preview:
// before play: move (to a full group = swap), add, replace, take out, tee-time order, KB pairs kept valid, all logged;
// a player with scores stays put; once play starts, only a withdrawal, which the group's hole screen turns into pick-ups.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true;
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };

async function open(b, scenario, w = 390, h = 844) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true })).newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank'); await p.goto(URL + '#scenario=' + scenario);
  await p.waitForSelector('.brand');
  p.rid = await p.evaluate(() => { const r = window.__ncgs.D.rounds().find(r => r.status !== 'final' && r.groups && r.groups.length); return r && r.id; });
  p.groups = () => p.evaluate(rid => window.__ncgs.D.round(rid).groups.map(g => ({ id: g.id, t: g.teeTime, ids: g.teams.flat(), teams: g.teams })), p.rid);
  p.screen = () => p.evaluate(rid => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.ORGPIN.pin = '1234'; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid } }, { v: 'groups', p: { rid } }]; n.render(); }, p.rid).then(() => p.waitForTimeout(150));
  p.tap = async sel => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
  return p;
}
const kbOk = p => p.evaluate(rid => { const n = window.__ncgs, r = n.D.round(rid), E = window.Engine; return !r.kb || E.kbValid(E.kbGroups(r), r.kb); }, p.rid);

(async () => {
  const b = await chromium.launch();
  try {
    let p = await open(b, 'eventday');
    await p.screen();
    const g0 = await p.groups();
    check('the organiser\'s round page has one Groups row (no separate "Change a player")', await p.evaluate(rid => { const n = window.__ncgs; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid } }]; n.render(); const t = document.querySelector('main').innerText; return /Groups/.test(t) && !/Change a player|Groups and buggies/.test(t); }, p.rid));
    await p.screen();

    // Running late: the first group's player goes to the last group; it's full, so they swap with someone there.
    const late = g0[0].ids[0], lastG = g0.length - 1, other = g0[lastG].ids[3];
    await p.tap(`[data-act="grp-pick"][data-pid="${late}"]`);
    await p.tap(`[data-act="grp-move"][data-to="${lastG}"]`);
    check('moving into a full group asks who to swap with', /is full\. Tap who/.test(await p.locator('main').innerText()));
    await p.tap(`[data-act="grp-pick"][data-pid="${other}"]`);
    let g = await p.groups();
    check('the late player is in the last group, the other in the first, in the same buggy seats', g[lastG].ids.includes(late) && g[0].ids.includes(other) && g[0].teams[0][0] === other);
    check('KB pairs are still valid after the swap', await kbOk(p));
    // Home tells the late player their new tee time and who they're with (plan batch B).
    const homeLine = await p.evaluate(([rid, pid]) => { const n = window.__ncgs; n.DB.prefs.me = pid; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); const el = document.querySelector('.now-you'); const g = n.D.round(rid).groups.find(x => x.teams.flat().includes(pid)); const t = el ? el.innerText : ''; n.UI.org = true; n.render(); return { t, ok: !!el && t.includes(g.teeTime) && g.teams.flat().filter(x => x !== pid).every(x => t.includes(n.D.nameOf(x))) }; }, [p.rid, late]);
    check('Home: "You\'re off at <their tee time> with <their group>"', homeLine.ok, homeLine.t);

    // Take someone out: the group gets smaller, buggies redo themselves.
    const out = g[1].ids[1];
    await p.tap(`[data-act="grp-pick"][data-pid="${out}"]`); await p.tap('[data-act="grp-remove"]'); await p.tap('[data-act="grp-remove"]');
    g = await p.groups();
    check('taking someone out leaves a three-ball; the other buggy pair stays together', !g.flatMap(x => x.ids).includes(out) && g[1].ids.length === 3 && g[1].teams.length === 2 && g[1].teams.some(t => t.length === 2));
    check('KB pairs are still valid after taking someone out', await kbOk(p));

    // Now a group has room: a plain move works.
    const mover = g[0].ids[2];
    await p.tap(`[data-act="grp-pick"][data-pid="${mover}"]`); await p.tap('[data-act="grp-move"][data-to="1"]');
    g = await p.groups();
    check('a move into a group with room just moves them', g[1].ids.includes(mover) && g[0].ids.length === 3 && g[1].ids.length === 4);

    // Add someone: a guest from the form, then into the three-ball.
    await p.evaluate(rid => { const n = window.__ncgs; n.put('members', [{ id: 'guest-zed', name: 'Zed', full: 'Guest', index: 20, active: true }]); }, p.rid); await p.waitForTimeout(200);
    await p.screen();
    await p.tap('[data-act="grp-group"][data-gi="0"]');
    await p.tap('[data-act="grp-add"][data-new="guest-zed"]');
    g = await p.groups();
    check('a group with room takes a new player', g[0].ids.includes('guest-zed') && g[0].ids.length === 4);

    // Replace someone with the player taken out earlier.
    const rep = g[2].ids[0];
    await p.tap(`[data-act="grp-pick"][data-pid="${rep}"]`); await p.tap('[data-act="grp-replace"]'); await p.tap(`[data-act="grp-replace-with"][data-new="${out}"]`);
    g = await p.groups();
    check('replace puts the new player in the same seat', g[2].teams[0][0] === out && !g.flatMap(x => x.ids).includes(rep));

    // Tee times: the first group goes out last; times follow the order, group ids stay.
    const firstId = g[0].id;
    await p.tap('[data-act="grp-group"][data-gi="0"]'); await p.tap('[data-act="grp-order"]:has-text("Out last")');
    const g2 = await p.groups();
    check('a group can go out last; tee times follow the order', g2[g2.length - 1].id === firstId && g2.map(x => x.t).join() === g.map(x => x.t).join());
    check('every change is in the change log', (await p.evaluate(() => window.__ncgs.view().log.filter(l => l.action === 'Groups changed').length)) === 6);

    // Someone with scores stays put.
    const scored = g2[0].ids[0];
    await p.evaluate(([rid, pid]) => { window.__ncgs.DB.server.tables.scores.push({ round: rid, player: pid, hole: 1, strokes: 4, by: 'Test', at: '2026-01-01T00:00:00Z' }); window.__ncgs.DB._view = null; }, [p.rid, scored]);
    await p.screen(); await p.tap(`[data-act="grp-pick"][data-pid="${scored}"]`);
    check('a player with scores can\'t be moved, and the screen says why', /already has scores/.test(await p.locator('main').innerText()) && !(await p.$('[data-act="grp-move"]')));
    check('no script errors (before play)', !p.errs.length, p.errs.join(' | '));
    await p.close();

    // Live round: withdraw only; the group's hole screen picks up for them from that hole.
    p = await open(b, 'today');
    await p.screen();
    const lg = await p.groups();
    const wd = lg[1].ids[0];
    await p.tap(`[data-act="grp-pick"][data-pid="${wd}"]`);
    const t = await p.locator('main').innerText();
    check('once play has started, the only change offered is Withdraw', /Withdraw from hole \d+/.test(t) && !(await p.$('[data-act="grp-move"], [data-act="grp-remove"], [data-act="grp-replace"]')));
    const from = Number(await p.$eval('[data-act="grp-withdraw"]', e => e.dataset.from));
    await p.tap('[data-act="grp-withdraw"]'); await p.tap('[data-act="grp-withdraw"]');
    check('the withdrawal is saved and logged', await p.evaluate(([rid, pid]) => window.__ncgs.D.setting(`wd:${rid}:${pid}`, '') !== '' && window.__ncgs.view().log.some(l => l.action === 'Player withdrew'), [p.rid, wd]));
    const entry = await p.evaluate(([rid, pid, n]) => { const x = window.__ncgs; x.UI.org = false; x.DB.prefs.me = pid; x.UI.hole = n; x.UI.edit = true; x.UI.stack = [{ v: 'home', p: {} }, { v: 'entry', p: { rid } }]; x.render();
      const tile = [...document.querySelectorAll('.wdrow')].map(e => e.innerText).join(' ');
      return { tile, steppers: document.querySelectorAll(`.stepper [data-pid="${pid}"]`).length }; }, [p.rid, wd, from]);
    check('on the group\'s hole screen the player shows as Withdrawn, picked up, with no buttons', /Withdrawn/.test(entry.tile) && entry.steppers === 0, JSON.stringify(entry));
    check('no script errors (live)', !p.errs.length, p.errs.join(' | '));
    await p.close();

    // The screen fits: 360px, 390px with 135% text, iPad; nothing cut off, 44px targets.
    for (const [tag, w, h, z] of [['360', 360, 740, 1], ['390-135', 390, 844, 1.35], ['ipad', 1024, 1366, 1]]) {
      p = await open(b, 'eventday', w, h);
      if (z !== 1) await p.addStyleTag({ content: `html{font-size:${z * 100}%}` });
      await p.screen(); const pid = (await p.groups())[0].ids[0];
      await p.tap(`[data-act="grp-pick"][data-pid="${pid}"]`);
      const bad = await p.evaluate(() => { const out = []; if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page too wide');
        for (const e of document.querySelectorAll('#app button, #app [data-act]')) { const r = e.getBoundingClientRect(); if (r.width && (r.width < 44 || r.height < 44)) out.push(`small ${Math.round(r.width)}x${Math.round(r.height)} ${e.textContent.trim().slice(0, 20)}`);
          if (e.scrollWidth > e.clientWidth + 1) out.push('cut off ' + e.textContent.trim().slice(0, 20)); }
        return [...new Set(out)]; });
      check(`layout ${tag}: Groups with a player open`, !bad.length, bad.slice(0, 4).join(' | '));
      await p.close();
    }
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
