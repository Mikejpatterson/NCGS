// Home screenshots and measurements for the release evidence (docs/RELEASE-HOME.md). Fixture builds only.
// node tools/release-home-shots.js <preview.html> <std|ed> <outdir>
// Each Home state is made from the invented fixture before the app starts (in memory only; the checked-in fixture
// is unchanged; the preview's built-in demo round is left out): next (as built), live (normal title, thru 9), live-long
// (the fixture's 47-letter title, thru 9), finished (nothing
// booked, last round final) and no-round (no rounds at all). "You" is set to the fixture golfer Cathal.
// Per screenshot it prints one line: tab bar (pill, tabs, smallest tab), flag-yellow elements, root text size,
// serif elements (allowed titles vs anything else), cut-off or off-screen text and controls under 44px.
// Linux Chromium has no New York or San Francisco: this shows layout and computed styles, not iPhone typography.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [F, TAG, OUT] = process.argv.slice(2);
if (!F || !TAG || !OUT) { console.log('usage: node tools/release-home-shots.js <preview.html> <std|ed> <outdir>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];
const STATES = ['next', 'live', 'live-long', 'finished', 'no-round'];
// Runs in the page before the app: reshapes the fixture for one Home state.
const shape = state => {
  let seed;
  Object.defineProperty(window, 'NCGS_SEED', { configurable: true, get: () => seed, set: s => {
    const d = new Date(), today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    // A live round part-way through: its scores for holes 1 to 9 only.
    const live = id => { const r = s.rounds.find(x => x.id === id); r.status = 'live'; r.date = today; s.scores = s.scores.filter(x => x.round !== id || x.hole <= 9); };
    if (state === 'live') live('fx-r1');
    if (state === 'live-long') live('fx-r2');
    if (state === 'finished') s.rounds = s.rounds.filter(r => r.status === 'final');
    if (state === 'no-round') { s.rounds = []; s.scores = []; }
    seed = s;
  } });
  // The preview's built-in "Demo round" is live and would take the Home card in every state: leave it out.
  Object.defineProperty(window, 'NCGS_DEMO', { configurable: true, get: () => undefined, set: () => {} });
};
const measure = () => {
  const vw = window.innerWidth, out = {};
  const tabs = document.querySelector('#tabs'); const tr = tabs && tabs.getBoundingClientRect(); const tcs = tabs && getComputedStyle(tabs);
  const tb = tabs ? [...tabs.querySelectorAll('button,a')].filter(e => e.getBoundingClientRect().width) : [];
  out.nav = tabs && !tabs.hidden ? `pill ${Math.round(tr.width)}x${Math.round(tr.height)} radius ${tcs.borderRadius} blur ${/blur/.test(tcs.backdropFilter || tcs.webkitBackdropFilter) ? 'yes' : 'no'}, ` +
    `${tb.length} tabs [${tb.map(e => e.textContent.trim()).join(', ')}], smallest ${Math.round(Math.min(...tb.map(e => e.getBoundingClientRect().height)))}px high, inside screen ${tr.left >= 0 && tr.right <= vw ? 'yes' : 'NO'}` : 'hidden (shown only while a round is in play)';
  const flag = [];
  for (const e of document.querySelectorAll('#app *')) {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect(); if (!r.width) continue;
    if (cs.backgroundColor === 'rgb(246, 197, 21)') flag.push('bg .' + String(e.getAttribute('class') || e.tagName).split(' ')[0]);
    else if (cs.color === 'rgb(246, 197, 21)' && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) flag.push('text .' + String(e.getAttribute('class') || e.tagName).split(' ')[0]);
  }
  out.flag = [...new Set(flag)].join(' ') || 'none';
  out.root = getComputedStyle(document.documentElement).fontSize;
  const SERIF = /(^|,)\s*("?)(ui-serif|serif|new york|iowan old style|georgia|times)/i, ALLOWED = '.hero.home .wordmark, .hero.home .now-name, .rp-name';
  const serif = [], clip = [], small = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (['STYLE', 'SCRIPT'].includes(e.tagName) || e.closest('.vh')) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e); const name = '.' + String(e.getAttribute('class') || e.tagName.toLowerCase()).split(' ')[0];
    const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (own && SERIF.test(cs.fontFamily)) serif.push((e.closest(ALLOWED) ? '' : 'NOT ALLOWED ') + name);
    if (own && cs.overflow !== 'visible' && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) clip.push('cut ' + name + ' "' + own.slice(0, 20) + '"');
    if (own && cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth) clip.push('ellipsis ' + name);
    if (own && (r.left < -1 || r.right > vw + 1)) clip.push('off screen ' + name + ' "' + own.slice(0, 20) + '"');
    if (e.matches('button, a, [data-act]') && !e.closest('.vh') && (r.height < 44 || r.width < 44)) small.push(name + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  out.serif = [...new Set(serif)].join(' ') || 'none';
  out.clip = clip.join('; ') || 'none';
  out.small = [...new Set(small)].join('; ') || 'none';
  const t = document.querySelector('.hero.home .now-name');
  if (t) { const rg = document.createRange(); rg.selectNodeContents(t); out.title = `"${t.textContent.trim()}" ${new Set([...rg.getClientRects()].filter(x => x.width).map(x => Math.round(x.top))).size} line(s), ${getComputedStyle(t).fontSize}, ${getComputedStyle(t).fontFamily.split(',')[0]}`; }
  return out;
};
(async () => {
  const b = await chromium.launch();
  for (const state of STATES) for (const [sn, w, h, sc] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    await ctx.addInitScript(shape, state);
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(F)); await p.waitForSelector('.brand');
    if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await p.evaluate(() => { const n = window.__ncgs; n.DB.prefs.me = 'colin'; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
    await p.waitForTimeout(400);
    const m = await p.evaluate(measure);
    console.log(`${state} ${TAG} ${sn}: root ${m.root}${m.title ? ' | title ' + m.title : ''}\n  nav ${m.nav}\n  flag-yellow ${m.flag}\n  serif ${m.serif}\n  cut/off-screen ${m.clip}\n  under 44px ${m.small}`);
    // Home scrolls inside #app (fixed), not the page: one shot as opened, one scrolled to the end (under the tab bar).
    await p.screenshot({ path: path.join(OUT, `${state}-${TAG}-${sn}.png`) });
    const more = await p.evaluate(() => { const a = document.getElementById('app'); const d = a.scrollHeight - a.clientHeight; a.scrollTop = d; return d; });
    if (more > 0) { await p.waitForTimeout(200); await p.screenshot({ path: path.join(OUT, `${state}-${TAG}-${sn}-end.png`) }); }
    console.log(`  scrolls ${more}px${more > 0 ? ' (second shot -end)' : ''}`);
    await ctx.close();
  }
  await b.close();
})();
