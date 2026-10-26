// UX review capture (owner, 26 October): every screen in the Westport, breakfast-draw and Groups situations, as each
// person sees it, saved in order with a plain caption, for Claude (process) and Codex (visual) to review separately.
// Invented fixture golfers only.  node tools/ux-capture.js <preview url> <outdir>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [URL, OUT] = process.argv.slice(2);
if (!URL || !OUT) { console.log('usage: node tools/ux-capture.js <preview url> <outdir>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const index = [];

async function session(b, scenario, size) {
  const [w, h] = size === 'ipad' ? [1024, 1366] : [390, 844];
  const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 1 })).newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank'); await p.goto(URL + '#scenario=' + scenario);
  await p.waitForSelector('.brand'); await p.evaluate(() => window.__ncgs.sync()); await p.waitForTimeout(200);
  p.size = size; p.w = w; p.h = h;
  return p;
}
let n = 0, sit = '';
async function shot(p, who, caption) {
  n++; await p.waitForTimeout(300);
  const full = await p.evaluate(() => document.getElementById('app').scrollHeight);
  await p.setViewportSize({ width: p.w, height: Math.min(3000, Math.max(p.h, full + 24)) }); await p.waitForTimeout(150);
  const file = `${String(n).padStart(2, '0')}-${sit}-${who}-${p.size}.png`;
  await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: p.w, height: p.h });
  index.push({ n, situation: sit, who, size: p.size, file, caption });
}
const tap = async (p, sel) => { try { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(300); return true; } catch (e) { console.log('could not tap', sel); return false; } };
const orgIn = async p => { await tap(p, '[data-act="org"]'); await p.fill('#pin', '1234'); await tap(p, 'form[data-form="pin"] button'); };
const member = (p, stack) => p.evaluate(s => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = s; n.render(); }, stack).then(() => p.waitForTimeout(250));

(async () => {
  const b = await chromium.launch();
  try {
    // 1. Before the trip: members see the pots.
    sit = 'pots-before';
    let p = await session(b, 'draw', 'phone');
    await shot(p, 'member', 'Home on the morning: the Westport card');
    await tap(p, '.now [data-act="round"]'); await shot(p, 'member', 'Round page opens on the pots');
    await p.close();

    // 2. Breakfast draw, as the organiser on the iPad (and the same on a phone).
    for (const size of ['ipad', 'phone']) {
      sit = 'draw';
      p = await session(b, 'draw', size);
      await orgIn(p); await shot(p, 'organiser', 'Organiser home');
      await tap(p, '[data-act="org-go"][data-v="round"][data-rid="fx-wp2"]'); await shot(p, 'organiser', 'The Westport round, organiser view');
      await tap(p, '[data-act="org-go"][data-v="drawhome"]'); await shot(p, 'organiser', 'Breakfast draw page');
      await tap(p, '[data-act="org-go"][data-v="pots"]'); await shot(p, 'organiser', 'Setting the pots');
      await tap(p, '[data-act="back"]'); await tap(p, '[data-act="org-go"][data-v="draw"]'); await shot(p, 'organiser', 'The stage before starting');
      await tap(p, '[data-act="draw-claim"]'); await p.waitForTimeout(1500); await shot(p, 'organiser', 'Ready to draw');
      await tap(p, '[data-act="draw-go"]'); await p.waitForTimeout(1300); await shot(p, 'organiser', 'Wheel spinning (pot A)');
      await p.waitForTimeout(2500); await shot(p, 'organiser', 'First name drawn');
      for (let i = 0; i < 3; i++) { await tap(p, '[data-act="draw-go"]'); await p.waitForTimeout(500); await tap(p, '[data-act="draw-skip"]'); }
      await shot(p, 'organiser', 'Team 1 complete');
      for (let i = 0; i < 40; i++) {
        const what = await p.evaluate(() => { const x = document.querySelector('[data-act="draw-next"]'); return x ? 'next:' + x.innerText : document.querySelector('[data-act="draw-go"]:not([disabled])') ? 'go' : 'wait'; });
        if (what.startsWith('next:See')) { await shot(p, 'organiser', 'Team 3 complete: the last team is whoever is left'); await tap(p, '[data-act="draw-next"]'); break; }
        if (what.startsWith('next')) await tap(p, '[data-act="draw-next"]');
        else if (what === 'go') { await tap(p, '[data-act="draw-go"]'); await p.waitForTimeout(500); await tap(p, '[data-act="draw-skip"]'); }
        else await p.waitForTimeout(400);
      }
      await p.waitForTimeout(2000); await shot(p, 'organiser', 'The groups (line-up) after the draw');
      if (size === 'phone') {
        await p.evaluate(() => { const n = window.__ncgs; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }]; n.render(); });
        await shot(p, 'organiser', 'The round after the draw');
        await tap(p, '[data-act="org-go"][data-v="groups"]'); await shot(p, 'organiser', 'Groups screen after the draw');
        sit = 'after-draw';
        await member(p, [{ v: 'home', p: {} }]); await shot(p, 'member', 'Home after the draw');
        await member(p, [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }]); await shot(p, 'member', 'Round page after the draw');
        await tap(p, '[data-act="rtab"][data-t="groups"]'); await shot(p, 'member', 'Groups tab');
      }
      await p.close();
    }

    // 3. Following the draw from another phone.
    sit = 'draw-watch';
    p = await session(b, 'draw', 'phone');
    await p.evaluate(() => { const n = window.__ncgs, rows = []; const pots = JSON.parse(n.D.setting('pots:fx-wp2')).pots;
      [0, 1, 2, 3].forEach(k => rows.push({ key: `draw:fx-wp2:1:0:${k}:other`, value: JSON.stringify({ pid: pots[k][0], at: '' }) }));
      rows.push({ key: 'draw:fx-wp2:1:1:0:other', value: JSON.stringify({ pid: pots[0][1], at: '' }) });
      rows.push({ key: 'drawdev:fx-wp2', value: JSON.stringify({ dev: 'other', at: '' }) }); n.ORGPIN.pin = '1234'; n.put('settings', rows); });
    await p.waitForTimeout(600);
    await member(p, [{ v: 'home', p: {} }]); await shot(p, 'member', 'Home while the draw is on');
    await member(p, [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }]); await shot(p, 'member', 'Following the draw');
    await p.close();

    // 4. Scramble day: a player scoring, results, the organiser.
    sit = 'scramble';
    p = await session(b, 'westport', 'phone');
    await shot(p, 'player', 'Home during the scramble');
    await tap(p, '.now [data-act="tab"][data-tab="hole"], [data-act="tab"][data-tab="hole"]');
    if (await p.$('[data-act="ask-pick"]')) { await shot(p, 'player', 'Contest question on arriving at a hole'); await tap(p, '[data-act="ask-pick"] >> nth=-1'); await tap(p, '[data-act="ask-confirm"]'); }
    if (await p.$('[data-act="intro-go"]')) { await shot(p, 'player', 'Contest hole pop-up'); await tap(p, '[data-act="intro-go"]'); }
    await shot(p, 'player', 'Hole screen: drive, then score');
    await tap(p, '[data-act="scr-driver"] >> nth=1'); await shot(p, 'player', 'Drive chosen (walking off the tee)');
    await tap(p, '[data-act="scr-score"][data-dir="up"]'); await shot(p, 'player', 'Score entered');
    await tap(p, '[data-act="scr-save"]'); await shot(p, 'player', 'After saving the hole');
    await tap(p, '#tabs .tab:nth-child(3)'); await shot(p, 'player', 'Results: teams and drives');
    await tap(p, '[data-act="respill"][data-p="ct"]'); await shot(p, 'player', 'Results: contests');
    await member(p, [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }]); await shot(p, 'player', 'Round page during the scramble');
    await member(p, [{ v: 'home', p: {} }, { v: 'trip', p: { rid: 'fx-wp2' } }]); await shot(p, 'player', 'Trip page');
    await member(p, [{ v: 'home', p: {} }]); await orgIn(p); await tap(p, '[data-act="org-go"][data-v="round"][data-rid="fx-wp2"]'); await shot(p, 'organiser', 'Organiser: the live scramble');
    await tap(p, '[data-act="org-go"][data-v="groups"]'); await shot(p, 'organiser', 'Organiser: Groups during the scramble');
    await tap(p, '[data-act="grp-pick"]'); await shot(p, 'organiser', 'Organiser: tapping a player during the scramble');
    await p.evaluate(() => { const n = window.__ncgs; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }, { v: 'teamshots', p: { rid: 'fx-wp2' } }]; n.render(); });
    await shot(p, 'organiser', 'Organiser: team shots');
    // Everyone finishes: complete every team's 18 holes with a driver who keeps each player at three drives.
    await p.evaluate(() => { const n = window.__ncgs, r = n.D.round('fx-wp2'), sc = n.DB.server.tables.scores;
      r.groups.forEach(g => { const team = g.teams.flat(); for (let h = 1; h <= 18; h++) if (!sc.some(s => s.round === 'fx-wp2' && s.hole === h && team.includes(s.player))) sc.push({ round: 'fx-wp2', player: team[h % 4], hole: h, strokes: 4, by: 'Phone', at: '2026-10-26T15:00:00Z' }); });
      n.DB._view = null; n.DB._memo = {}; });
    await member(p, [{ v: 'home', p: {} }, { v: 'scrambleFinish', p: { rid: 'fx-wp2' } }]); await shot(p, 'player', 'Our team finished');
    await member(p, [{ v: 'home', p: {} }, { v: 'board', p: {} }]); await shot(p, 'player', 'Results when every team has finished (KBs)');
    await member(p, [{ v: 'home', p: {} }]); await shot(p, 'player', 'Home when every team has finished');
    console.log('scramble errors:', p.errs.join(' | ') || 'none');
    await p.close();

    // 5. Changing groups on the day (any round) and a withdrawal mid-round.
    sit = 'groups-day';
    p = await session(b, 'eventday', 'phone');
    await orgIn(p); const rid = await p.evaluate(() => window.__ncgs.D.rounds().find(r => r.status === 'upcoming' && r.groups && r.groups.length).id);
    await tap(p, `[data-act="org-go"][data-v="round"][data-rid="${rid}"]`); await shot(p, 'organiser', 'Round page on the day');
    await tap(p, '[data-act="org-go"][data-v="groups"]'); await shot(p, 'organiser', 'Groups');
    const ids = await p.$$eval('[data-act="grp-pick"]', e => e.map(x => x.dataset.pid));
    await tap(p, `[data-act="grp-pick"][data-pid="${ids[0]}"]`); await shot(p, 'organiser', 'Tapped a player');
    await tap(p, '[data-act="grp-move"] >> nth=1'); await shot(p, 'organiser', 'Moving into a full group: pick who to swap with');
    await tap(p, '[data-act="grp-cancel"]'); await tap(p, '[data-act="grp-group"][data-gi="1"]'); await shot(p, 'organiser', 'Tapped a group');
    await tap(p, `[data-act="grp-pick"][data-pid="${ids[5]}"]`); await tap(p, '[data-act="grp-replace"]'); await shot(p, 'organiser', 'Replace with…');
    sit = 'withdraw';
    await p.close(); p = await session(b, 'today', 'phone');
    await orgIn(p); await tap(p, '[data-act="org-go"][data-v="round"][data-rid="demo-cabopino"]'); await shot(p, 'organiser', 'Live round, organiser');
    await tap(p, '[data-act="org-go"][data-v="groups"]'); await shot(p, 'organiser', 'Groups once play has started');
    const lid = (await p.$$eval('[data-act="grp-pick"]', e => e.map(x => x.dataset.pid)))[4];
    await tap(p, `[data-act="grp-pick"][data-pid="${lid}"]`); await shot(p, 'organiser', 'Tapped a player: Withdraw');
    await tap(p, '[data-act="grp-withdraw"]'); await tap(p, '[data-act="grp-withdraw"]'); await shot(p, 'organiser', 'After the withdrawal');
    const n0 = await p.evaluate(pid => { const x = window.__ncgs, g = x.progressOf ? null : null; return Number(x.D.setting(`wd:demo-cabopino:${pid}`, 1)); }, lid);
    await p.evaluate(([pid, h]) => { const x = window.__ncgs; x.UI.org = false; x.DB.prefs.me = pid; x.UI.hole = h; x.UI.edit = true; x.UI.stack = [{ v: 'home', p: {} }, { v: 'entry', p: { rid: 'demo-cabopino' } }]; x.render(); }, [lid, n0]);
    await shot(p, 'player', 'The group\'s hole screen with a withdrawn player');
    console.log('groups/withdraw errors:', p.errs.join(' | ') || 'none');
    await p.close();
  } catch (e) { console.error(e); } finally { await b.close(); }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
  console.log(index.length + ' screens');
})();
