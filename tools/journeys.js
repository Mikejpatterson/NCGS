// Whole journeys, recorded as a person would use them (joint plan with Codex, issue #1, 26 October).
// Fixed phone (390x844) and iPad (1024x1366) screens; real scrolling (each frame is what's on the screen at that
// moment); one numbered frame per step, captioned with the action just taken. Two devices share a real server
// (tools/devserver.js) where the handoff between organiser and members matters; signal drops, reloads and a scorer
// changing phones are included. Invented fixture golfers only.
//   node tools/journeys.js <preview url> <devserver url> <outdir> [journey numbers, e.g. 3,5]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [PREVIEW, DEV, OUT, ONLY] = process.argv.slice(2);
if (!PREVIEW || !DEV || !OUT) { console.log('usage: node tools/journeys.js <preview url> <devserver url> <outdir> [3,5]'); process.exit(2); }
const want = ONLY ? ONLY.split(',').map(Number) : null;
let browser, CUR = null;

/* ----- recording ----- */
function journey(n, slug, title, who) {
  const dir = path.join(OUT, `${n}-${slug}`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const j = { n, slug, title, who, dir, frames: [], k: 0, notes: [] };
  CUR = j;
  j.frame = async (dev, caption) => {
    j.k++; const file = `${String(j.k).padStart(2, '0')}-${dev.name}.png`;
    await dev.pg.waitForTimeout(350);
    await dev.pg.screenshot({ path: path.join(dir, file) });
    j.frames.push({ k: j.k, device: dev.label, file, caption });
  };
  // Scroll down the screen in screenfuls, as a thumb would, recording each.
  j.scroll = async (dev, caption, max = 4) => {
    for (let i = 0; i < max; i++) {
      const moved = await dev.pg.evaluate(() => { const a = document.getElementById('app'); const el = a && a.scrollHeight > a.clientHeight + 4 ? a : document.scrollingElement;
        const before = el.scrollTop; el.scrollTop = before + Math.round(innerHeight * 0.8); return el.scrollTop - before; });
      if (moved < 8) break;
      await j.frame(dev, `${caption} (scrolled)`);
    }
    await dev.pg.evaluate(() => { const a = document.getElementById('app'); if (a) a.scrollTop = 0; document.scrollingElement.scrollTop = 0; });
  };
  j.note = s => j.notes.push(s);
  return j;
}
function writeReadme(j) {
  const lines = [`# ${j.n}. ${j.title}`, '', `**Who:** ${j.who}`, '', 'Each frame is the screen as it looked straight after the action in its caption (fixed screen size, real scrolling).', ''];
  j.frames.forEach(f => lines.push(`${f.k}. **${f.device}**: ${f.caption}  `, `   ![](${f.file})`));
  if (j.notes.length) lines.push('', '## Notes from recording', '', ...j.notes.map(s => `- ${s}`));
  fs.writeFileSync(path.join(j.dir, 'README.md'), lines.join('\n') + '\n');
}

/* ----- devices ----- */
async function device(name, label, kind, base, opts = {}) {
  const [w, h] = kind === 'ipad' ? [1024, 1366] : [390, 844];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  const d = { name, label, ctx, pg, base, errs: [] };
  pg.on('pageerror', e => d.errs.push(e.message));
  d.open = async (hash = '') => {
    if (opts.preview) { await pg.goto(base); await pg.evaluate(() => localStorage.clear()); await pg.goto('about:blank'); await pg.goto(base + hash); }
    else await pg.goto(base + '/');
    await pg.waitForFunction(() => window.__ncgs); await pg.evaluate(() => window.__ncgs.sync()).catch(() => {}); await pg.waitForTimeout(300);
  };
  d.tap = async (sel, opt = {}) => { try { await pg.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 2000 }); await pg.locator(sel).first().click({ timeout: 3000 }); await pg.waitForTimeout(opt.wait || 350); return true; }
    catch (e) { console.log(`   [${name}] could not tap ${sel}`); return false; } };
  d.text = () => pg.locator('main').innerText().catch(() => '');
  d.has = sel => pg.locator(sel).count().then(n => n > 0);
  d.sync = () => pg.evaluate(() => window.__ncgs.flush().then(() => window.__ncgs.sync())).catch(() => {});
  d.org = async () => { if (!(await d.has('form[data-form="pin"]'))) await d.tap('[data-act="org"]'); if (await d.has('#pin')) { await pg.fill('#pin', '1234'); await d.tap('form[data-form="pin"] button'); } };
  d.home = () => pg.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); }).then(() => pg.waitForTimeout(250));
  return d;
}
const api = async req => (await fetch(DEV + '/api', { method: 'POST', body: JSON.stringify(req) })).json();
const devState = async () => (await fetch(DEV + '/__state')).json();
const today = () => new Date().toISOString().slice(0, 10);

/* ----- the journeys ----- */
const J = {};

J[1] = async () => {
  const j = journey(1, 'returning-member', 'A member opens the app in a new, empty season, looks back at last season, and comes back', 'a member');
  const m = await device('phone', 'Member phone', 'phone', PREVIEW, { preview: true });
  await m.open('#scenario=preseason');
  await j.frame(m, 'Opens the app: new season, nothing booked yet'); await j.scroll(m, 'Home');
  await m.tap('[data-act="goy"]'); await j.frame(m, 'Taps Golfer of the Year');
  if (await m.has('[data-act="year"]')) { await m.tap('[data-act="year"] >> nth=-1'); await j.frame(m, 'Switches to last season'); }
  await j.scroll(m, 'Last season\'s table');
  await m.tap('[data-act="player"]'); await j.frame(m, 'Opens a player from last season');
  await m.tap('[data-act="back"]'); await j.frame(m, 'Back: does it keep last season?');
  await m.tap('[data-act="back"]'); await j.frame(m, 'Back again: Home');
  await m.tap('[data-act="rounds"]'); await j.frame(m, 'Past rounds'); await j.scroll(m, 'Past rounds');
  await m.tap('[data-act="round"][data-rid]'); await j.frame(m, 'Opens a past round'); await j.scroll(m, 'Past round');
  await m.home(); await j.frame(m, 'Home');
  j.errs = m.errs; return j;
};

J[2] = async () => {
  const j = journey(2, 'organiser-sets-up-an-outing', 'The organiser sets up an outing, picks who\'s playing, makes groups and KBs, changes things before play; a member sees it', 'Michael (phone) and a member (phone)');
  await fetch(DEV + '/__reset', { method: 'POST' });
  const o = await device('org', 'Organiser phone', 'phone', DEV), m = await device('member', 'Member phone', 'phone', DEV);
  await o.open(); await m.open();
  await m.pg.evaluate(() => { window.__ncgs.DB.prefs.me = 'john-w'; window.__ncgs.render(); });
  await j.frame(m, 'Member: Home before anything is announced');
  await o.org(); await j.frame(o, 'Organiser: opens Organiser with the PIN'); await j.scroll(o, 'Organiser home');
  await o.tap('[data-act="org-new-round"]'); await j.frame(o, 'Taps New round');
  if (await o.has('#f-name')) await o.pg.fill('#f-name', 'Autumn outing');
  if (await o.has('#f-date')) await o.pg.fill('#f-date', new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10));
  if (await o.has('#f-tee')) await o.pg.fill('#f-tee', '10:00').catch(() => {});
  if (await o.has('#f-first')) await o.pg.fill('#f-first', '10:00').catch(() => {});
  await j.frame(o, 'Fills in name and date'); await j.scroll(o, 'The new-round form');
  await o.tap('form[data-form="details"] button[type="submit"]'); await j.frame(o, 'Saves the round');
  await m.sync(); await m.home(); await j.frame(m, 'Member: Home after the round is announced');
  await o.tap('[data-act="org-go"][data-v="groups"]'); await j.frame(o, 'Taps Groups: who\'s playing');
  const ids = await o.pg.$$eval('[data-act="org-toggle-player"]', e => e.map(x => x.dataset.pid));
  for (const pid of ids.slice(0, 10)) await o.tap(`[data-act="org-toggle-player"][data-pid="${pid}"]`, { wait: 80 });
  await j.frame(o, 'Ticks 10 players'); await j.scroll(o, 'Players list');
  await o.tap('[data-act="org-go"][data-v="guest"]'); await j.frame(o, 'Adds a guest');
  await o.pg.fill('#g-name', 'Visitor Vince').catch(() => {}); await o.pg.fill('#g-index', '22.5').catch(() => {});
  await o.tap('form[data-form="guest"] button'); await j.frame(o, 'Guest saved, back to the list');
  await o.tap('[data-act="org-draw"][data-kind="random"]'); await j.frame(o, 'Draws groups'); await j.scroll(o, 'Drawn groups');
  await o.tap('[data-act="org-save-groups"]'); await j.frame(o, 'Saves groups (KB pairs made too)');
  await o.tap('[data-act="org-go"][data-v="kb"]'); await j.frame(o, 'Looks at the KB pairs'); await o.tap('[data-act="back"]');
  await o.tap('[data-act="org-go"][data-v="groups"]'); await j.frame(o, 'Opens Groups to change something before play');
  const p0 = await o.pg.$$eval('[data-act="grp-pick"]', e => e.map(x => x.dataset.pid));
  await o.tap(`[data-act="grp-pick"][data-pid="${p0[0]}"]`); await j.frame(o, 'Taps a player who will be late');
  await o.tap('[data-act="grp-move"] >> nth=-2'); await j.frame(o, 'Moves them to the last group');
  if (await o.has('[data-act="grp-cancel"]')) { const last = await o.pg.$$eval('.grp:last-of-type [data-act="grp-pick"]', e => e.map(x => x.dataset.pid)); await o.tap(`[data-act="grp-pick"][data-pid="${last[last.length - 1]}"]`); await j.frame(o, 'Last group was full: picks who to swap with'); }
  await m.sync(); await m.home(); await j.frame(m, 'Member: Home after the groups are out'); await j.scroll(m, 'Member Home');
  await m.tap('.now [data-act="round"]'); await j.frame(m, 'Member: opens the round'); await m.tap('[data-act="rtab"][data-t="groups"]'); await j.frame(m, 'Member: Groups tab');
  j.errs = o.errs.concat(m.errs); return j;
};

J[3] = async () => {
  const j = journey(3, 'golfer-scores-a-round', 'A golfer gets to their group, scores, checks the board and contests, loses signal, reloads, and carries on from another phone', 'a golfer scoring for their group (two phones)');
  await fetch(DEV + '/__reset', { method: 'POST' });
  const st = await devState();
  const r = st.tables.rounds.find(x => x.id === 'fx-r3') || st.tables.rounds.find(x => x.status === 'upcoming');
  await api({ op: 'put', table: 'rounds', rows: [Object.assign({}, r, { date: today() })], pin: '1234' });
  const a = await device('phoneA', 'Scorer\'s phone', 'phone', DEV), b = await device('phoneB', 'Second phone', 'phone', DEV);
  await a.open();
  await j.frame(a, 'Opens the app on the morning (not yet said who they are)');
  await a.tap('[data-act="who"]'); await j.frame(a, 'Taps "Who are you?"');
  await a.tap('[data-act="pick"][data-id="john-w"], [data-act="pick"] >> nth=0'); await j.frame(a, 'Picks their name');
  await a.home(); await j.frame(a, 'Home: their day'); await j.scroll(a, 'Home');
  await a.tap('.now [data-act="round"]'); await j.frame(a, 'Opens the round');
  await a.tap('[data-act="play"]'); await j.frame(a, 'Play now');
  if (await a.has('[data-act="intro-go"]')) { await a.tap('[data-act="intro-go"]'); await j.frame(a, 'Past the contest pop-up'); }
  const play = async (n, cap) => { if (await a.has('[data-act="next"]')) await a.tap('[data-act="next"]'); const pids = await a.pg.$$eval('[data-act="set"][data-dir="up"]', e => [...new Set(e.map(x => x.dataset.pid))]); for (const pid of pids) await a.tap(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`, { wait: 60 }); await j.frame(a, cap); await a.tap('[data-act="save"]'); };
  await play(1, 'Hole 1: taps + once for each player (par)'); await j.frame(a, 'Saved hole 1');
  if (await a.has('.askrow')) { await a.tap('.askrow >> nth=-1'); await a.tap('[data-act="ask-confirm"]'); await j.frame(a, 'Answers the contest question'); }
  await play(2, 'Hole 2 entered'); await j.frame(a, 'Saved hole 2');
  await a.tap('#tabs .tab:nth-child(3)'); await j.frame(a, 'Checks Results'); await j.scroll(a, 'Results');
  if (await a.has('[data-act="respill"][data-p="ct"]')) { await a.tap('[data-act="respill"][data-p="ct"]'); await j.frame(a, 'Contests'); } else j.note('Results had no Contests pill in this round.');
  await a.tap('#tabs .tab:nth-child(2)'); await j.frame(a, 'Back to the Hole tab');
  await a.ctx.setOffline(true);
  await play(3, 'No signal: enters hole 3'); await j.frame(a, 'Saved hole 3 with no signal');
  await a.pg.reload().catch(() => {}); await a.pg.waitForTimeout(800);
  await j.frame(a, 'Phone restarts the app with no signal');
  j.note('Frame "restarts the app with no signal" is blank because these recordings switch the offline app cache (service worker) off; on a real phone the installed app opens from its cache. Not evidence either way.');
  await a.ctx.setOffline(false); await a.pg.goto(DEV + '/'); await a.pg.waitForFunction(() => window.__ncgs, null, { timeout: 15000 }); await a.sync(); await a.pg.waitForTimeout(500);
  await j.frame(a, 'Signal back, app reopened');
  const saved = await devState().then(s => s.tables.scores.filter(x => x.round === r.id && x.hole === 3).length); j.note(`After signal came back, the server had ${saved} scores for hole 3.`);
  // The battery dies: another member of the group carries on.
  await b.open(); await j.frame(b, 'Second phone opens the app');
  await b.tap('[data-act="who"]'); await b.tap('[data-act="pick"] >> nth=1'); await b.home(); await j.frame(b, 'Says who they are: Home');
  await b.tap('.now [data-act="tab"][data-tab="hole"], [data-act="tab"][data-tab="hole"], [data-act="play"]'); await j.frame(b, 'Taps Continue / the Hole tab');
  j.errs = a.errs.concat(b.errs); return j;
};

J[4] = async () => {
  const j = journey(4, 'trip-and-season', 'A member follows a two-day trip and the season table', 'a member');
  const m = await device('phone', 'Member phone', 'phone', PREVIEW, { preview: true });
  await m.open('#scenario=between'); await j.frame(m, 'Home between rounds'); await j.scroll(m, 'Home');
  await m.tap('[data-act="trip"]'); await j.frame(m, 'Trip standings'); await j.scroll(m, 'Trip standings');
  await m.tap('[data-act="leaderboard"] >> nth=0'); await j.frame(m, 'Day 1 results'); await j.scroll(m, 'Day 1');
  await m.tap('[data-act="back"]'); await j.frame(m, 'Back to the trip');
  await m.home(); await m.tap('[data-act="goy"]'); await j.frame(m, 'Golfer of the Year'); await j.scroll(m, 'GOY');
  await m.tap('[data-act="player"]'); await j.frame(m, 'A player\'s season'); await j.scroll(m, 'Player');
  j.errs = m.errs; return j;
};

J[5] = async () => {
  const j = journey(5, 'westport-draw-to-results', 'Westport: pots published, the breakfast draw on the iPad, teams play with drives, daily results', 'Michael (iPad), a member (phone)');
  const o = await device('ipad', 'Organiser iPad', 'ipad', PREVIEW, { preview: true });
  await o.open('#scenario=draw');
  await j.frame(o, 'iPad: Home the morning of the draw');
  await o.org(); await o.tap('[data-act="org-go"][data-v="round"][data-rid="fx-wp2"]'); await j.frame(o, 'Organiser: the Westport round');
  await o.tap('[data-act="org-go"][data-v="drawhome"]'); await j.frame(o, 'Breakfast draw page');
  await o.tap('[data-act="org-go"][data-v="draw"]'); await j.frame(o, 'Opens the draw');
  await o.tap('[data-act="draw-claim"]', { wait: 1500 }); await j.frame(o, 'Start the draw');
  await o.tap('[data-act="draw-go"]', { wait: 1200 }); await j.frame(o, 'Pot A spinning'); await o.pg.waitForTimeout(2600); await j.frame(o, 'Pot A name');
  for (let i = 0; i < 3; i++) { await o.tap('[data-act="draw-go"]', { wait: 2800 }); }
  await j.frame(o, 'Team 1 drawn');
  for (let i = 0; i < 30; i++) {
    const what = await o.pg.evaluate(() => { const x = document.querySelector('[data-act="draw-next"]'); return x ? 'next:' + x.innerText : document.querySelector('[data-act="draw-go"]:not([disabled])') ? 'go' : 'wait'; });
    if (what.startsWith('next:See')) { await j.frame(o, 'Team 3 drawn'); await o.tap('[data-act="draw-next"]', { wait: 2200 }); break; }
    if (what.startsWith('next')) await o.tap('[data-act="draw-next"]'); else if (what === 'go') { await o.tap('[data-act="draw-go"]', { wait: 300 }); await o.tap('[data-act="draw-skip"]'); } else await o.pg.waitForTimeout(400);
  }
  await j.frame(o, 'The groups, held up to the room');
  await o.home(); await j.frame(o, 'iPad back on Home');
  // Team play, on a phone, in the scramble scenario
  const m = await device('phone', 'Team phone', 'phone', PREVIEW, { preview: true });
  await m.open('#scenario=westport'); await j.frame(m, 'Scramble day: Home'); await j.scroll(m, 'Home');
  await m.tap('.now [data-act="tab"][data-tab="hole"], [data-act="tab"][data-tab="hole"]'); await j.frame(m, 'Continue');
  if (await m.has('[data-act="ask-pick"]')) { await m.tap('[data-act="ask-pick"] >> nth=-1'); await m.tap('[data-act="ask-confirm"]'); await j.frame(m, 'Answers a contest question'); }
  await m.tap('[data-act="scr-driver"] >> nth=1'); await j.frame(m, 'Off the tee: picks whose drive');
  await m.tap('[data-act="scr-score"][data-dir="up"]'); await j.frame(m, 'On the green: the score');
  await m.tap('[data-act="scr-save"]'); await j.frame(m, 'Saves the hole');
  await m.tap('#tabs .tab:nth-child(3)'); await j.frame(m, 'Results'); await j.scroll(m, 'Results');
  await m.home(); await m.tap('[data-act="trip"], .home-trip [data-act]'); await j.frame(m, 'Trip page');
  j.errs = o.errs.concat(m.errs); return j;
};

J[6] = async () => {
  const j = journey(6, 'organiser-finishes-a-round', 'The organiser confirms contests, checks cards, finalises, then corrects a mistake', 'Michael (phone)');
  const o = await device('phone', 'Organiser phone', 'phone', PREVIEW, { preview: true });
  await o.open('#scenario=today'); await o.org();
  await o.tap('[data-act="org-go"][data-v="round"][data-rid="demo-cabopino"]'); await j.frame(o, 'The live round'); await j.scroll(o, 'Live round');
  await o.tap('[data-act="finalise"]'); await j.frame(o, 'Taps Finalise early');
  await o.pg.evaluate(() => { const n = window.__ncgs, r = n.D.round('demo-cabopino'), sc = n.DB.server.tables.scores;
    r.groups.forEach(g => g.teams.flat().forEach(pid => { for (let h = 1; h <= 18; h++) if (!sc.some(s => s.round === r.id && s.player === pid && s.hole === h)) sc.push({ round: r.id, player: pid, hole: h, strokes: 5, by: 'Phone', at: '2026-10-26T15:00:00Z' }); }));
    n.DB._view = null; n.DB._memo = {}; n.render(); });
  await j.frame(o, 'Every group finishes their 18 (simulated)');
  await o.tap('[data-act="org-go"][data-v="contest"] >> nth=0'); await j.frame(o, 'Opens a contest to confirm'); await j.scroll(o, 'Contest');
  await o.tap('[data-act="org-win"] >> nth=-1'); await j.frame(o, 'Confirms the winner');
  await o.tap('[data-act="back"]'); await j.frame(o, 'Back to the round');
  await o.tap('[data-act="org-go"][data-v="group"] >> nth=0'); await j.frame(o, 'Opens a group\'s card'); await j.scroll(o, 'Card');
  await o.tap('[data-act="org-go"][data-v="correct"] >> nth=2'); await j.frame(o, 'Taps a hole to correct it');
  await o.tap('[data-act="set"][data-dir="up"] >> nth=0'); await o.tap('[data-act="save"]'); await j.frame(o, 'Corrects and saves');
  await o.tap('[data-act="back"]'); await j.frame(o, 'Back');
  await o.pg.evaluate(() => { const n = window.__ncgs; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'demo-cabopino' } }]; n.render(); });
  await o.tap('[data-act="org-go"][data-v="contest"] >> nth=1'); await o.tap('[data-act="org-win"] >> nth=-1'); await j.frame(o, 'Confirms the second contest'); await o.tap('[data-act="back"]');
  await j.frame(o, 'Back to the round'); await j.scroll(o, 'Round');
  await o.tap('[data-act="finalise"]'); await j.frame(o, 'Finalise'); await o.tap('[data-act="finalise"]'); await j.frame(o, 'Finalise again (if it asked)');
  await o.home(); await j.frame(o, 'Home after finalising'); await j.scroll(o, 'Home');
  j.errs = o.errs; return j;
};

J[7] = async () => {
  const j = journey(7, 'scramble-finish', 'Westport finishes: last team saves, KBs, the organiser confirms and finalises', 'a team scorer and Michael (phones)');
  const m = await device('phone', 'Team phone', 'phone', PREVIEW, { preview: true });
  await m.open('#scenario=westport');
  await m.pg.evaluate(() => { const n = window.__ncgs, r = n.D.round('fx-wp2'), sc = n.DB.server.tables.scores;
    r.groups.forEach((g, gi) => { const team = g.teams.flat(); for (let h = 1; h <= (gi === 0 ? 17 : 18); h++) if (!sc.some(s => s.round === 'fx-wp2' && s.hole === h && team.includes(s.player))) sc.push({ round: 'fx-wp2', player: team[h % 4], hole: h, strokes: 4, by: 'Phone', at: '2026-10-26T15:00:00Z' }); });
    n.DB._view = null; n.DB._memo = {}; n.UI.hole = 18; n.render(); });
  await j.frame(m, 'Team 1 on the 18th; the others have finished');
  await m.tap('.now [data-act="tab"][data-tab="hole"], [data-act="tab"][data-tab="hole"]'); await j.frame(m, 'Continue · Hole 18');
  if (await m.has('[data-act="ask-pick"]')) { await m.tap('[data-act="ask-pick"] >> nth=-1'); await m.tap('[data-act="ask-confirm"]'); await j.frame(m, 'First answers the longest-drive question it skipped'); }
  await m.tap('[data-act="scr-driver"] >> nth=3'); await m.tap('[data-act="scr-score"][data-dir="up"]'); await j.frame(m, 'Drive and score for 18');
  await m.tap('[data-act="scr-save"]'); await j.frame(m, 'Saves the last hole'); await j.scroll(m, 'Finish');
  await m.home(); await j.frame(m, 'Home: all in'); await j.scroll(m, 'Home');
  await m.tap('.now [data-act="leaderboard"]'); await j.frame(m, 'See the results'); await j.scroll(m, 'Results');
  await m.home(); await m.org(); await m.tap('[data-act="org-go"][data-v="round"][data-rid="fx-wp2"]'); await j.frame(m, 'Organiser: the round'); await j.scroll(m, 'Round');
  await m.tap('[data-act="finalise"]'); await j.frame(m, 'Finalise');
  j.errs = m.errs; return j;
};

(async () => {
  browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  const done = [];
  for (const n of Object.keys(J).map(Number)) {
    if (want && !want.includes(n)) continue;
    CUR = null;
    try { const j = await J[n](); if (j.errs && j.errs.length) j.note('Script errors on screen: ' + j.errs.slice(0, 3).join(' | ')); writeReadme(j); done.push(j); console.log(`journey ${n}: ${j.frames.length} frames${j.errs && j.errs.length ? ' (errors)' : ''}`); }
    catch (e) { console.log(`journey ${n} stopped: ${e.message.split('\n')[0]}`); if (CUR) { CUR.note('Recording stopped here: ' + e.message.split('\n')[0]); writeReadme(CUR); } }
  }
  await browser.close();
  const idx = ['# Journeys, recorded end to end', '', 'Fixed phone (390×844) and iPad (1024×1366) screens with real scrolling; one frame per action. Invented golfers only. Re-record with `node tools/journeys.js <preview url> <devserver url> docs/journeys`.', '',
    ...fs.readdirSync(OUT).filter(d => /^\d-/.test(d)).sort().map(d => { const t = (fs.readFileSync(path.join(OUT, d, 'README.md'), 'utf8').split('\n')[0] || '').replace(/^# /, ''); return `- [${t}](${d}/README.md)`; })];
  fs.writeFileSync(path.join(OUT, 'README.md'), idx.join('\n') + '\n');
})();
