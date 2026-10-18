// Design comparison: the same screens in two builds of the preview, side by side.
// For every screen and phone size it checks that both builds have exactly the same controls (data-act, player,
// value, direction, disabled, accessible name) and the same words and numbers (textContent), and measures how
// many pixels differ. Screenshots go to the output folder for people to look at.
// Run:  node test/design.run.js <a.html> <b.html> [outdir] [--same-pixels]
//   --same-pixels  also fail when more than 0.01% of pixels differ (for refactors that must not change the look)
// Fails (exit 1) when controls or words differ, a screen cannot be opened, or the page throws an error.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const samePixels = process.argv.includes('--same-pixels');
const [A, B, OUT = 'test/shots/design'] = args;
if (!A || !B) { console.log('Usage: node test/design.run.js <a.html> <b.html> [outdir] [--same-pixels]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const url = f => 'file://' + path.resolve(f);

const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35]];
const click = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
const toEntry = async p => { await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]'); await click(p, '[data-act="intro-go"]').catch(() => {}); if (await p.$('[data-act="enter"]')) await click(p, '[data-act="enter"]'); };
const ups = async (p, times, only) => {
  const pids = await p.$$eval('[data-act="set"][data-dir="up"]', e => [...new Set(e.map(x => x.dataset.pid))]);
  for (const pid of pids.slice(0, only || pids.length)) for (let i = 0; i < times; i++) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`, { timeout: 2000 }).catch(() => {});
  await p.waitForTimeout(150);
};
const scenarios = [
  ['home', async () => {}],
  ['rounds', async p => { await click(p, '[data-act="rounds"]'); }],
  ['round-past', async p => { await click(p, '[data-act="rounds"]'); await click(p, '[data-act="round"][data-rid]'); }],
  ['round-now', async p => { await click(p, '.now [data-act="round"]'); }],
  ['tee', async p => { await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]'); await click(p, '[data-act="intro-go"]').catch(() => {}); }],
  ['entry-empty', toEntry],
  ['entry-partial', async p => { await toEntry(p); await ups(p, 1, 2); }],
  ['entry-complete', async p => { await toEntry(p); await ups(p, 1); }],
  ['entry-high', async p => { await toEntry(p); await ups(p, 7); }],
  ['after', async p => { await toEntry(p); await ups(p, 1); await click(p, '[data-act="save"]'); await p.waitForTimeout(300); if (await p.$('.askrow')) { await click(p, '.askrow:nth-child(2)'); await click(p, '[data-act="ask-confirm"]').catch(() => {}); } await p.waitForTimeout(300); }],
  ['board', async p => { await click(p, '#tabs .tab:nth-child(3)'); }],
  ['buggy-wars', async p => { await click(p, '#tabs .tab:nth-child(3)'); await click(p, '[data-act="respill"][data-p="bw"]'); }],
  ['buggy-wars-g2', async p => { await click(p, '#tabs .tab:nth-child(3)'); await click(p, '[data-act="respill"][data-p="bw"]'); const g = await p.$$('[data-act="mgroup"]'); if (g[1]) { await g[1].click(); await p.waitForTimeout(200); } }],
];

// What a person can press, and what the screen says. Both must match between builds.
const capture = () => {
  const roots = [document.getElementById('app'), document.getElementById('tabs')].filter(Boolean);
  const controls = [];
  roots.forEach(r => r.querySelectorAll('[data-act], button, a, input, select, textarea').forEach(e => {
    const d = e.dataset;
    controls.push([e.tagName, d.act || '', d.pid || '', d.v || '', d.dir || '', d.rid || '', d.n || '', e.disabled ? 'disabled' : '', e.getAttribute('aria-label') || '', e.getAttribute('aria-pressed') || '', e.getAttribute('aria-expanded') || ''].join('|'));
  }));
  const text = roots.map(r => r.textContent).join(' ').replace(/\s+/g, ' ').trim();
  return { controls, text };
};

// Count pixels that differ, inside the browser (no image library needed).
async function pixelDiff(page, fa, fb) {
  const [da, db] = [fa, fb].map(f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
  return page.evaluate(async ([a, b]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { changed: -1, total: ia.width * ia.height };
    const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const pa = px(ia), pb = px(ib); let changed = 0;
    for (let i = 0; i < pa.length; i += 4) if (Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]) > 6) changed++;
    return { changed, total: pa.length / 4 };
  }, [da, db]);
}

(async () => {
  const browser = await chromium.launch();
  const scratch = await (await browser.newContext()).newPage();
  let fails = 0;
  const report = [];
  for (const [sn, w, h, scale] of sizes) {
    for (const [name, open] of scenarios) {
      const got = {};
      for (const [tag, file] of [['a', A], ['b', B]]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, timezoneId: 'Europe/Dublin' });
        await ctx.addInitScript(() => { const fixed = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }; });
        const p = await ctx.newPage();
        const errs = []; p.on('pageerror', e => errs.push(e.message));
        await p.goto(url(file)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand', { timeout: 8000 });
        if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
        await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html,body,#app{scroll-behavior:auto!important}' });
        try { await open(p); } catch (e) { got[tag] = { error: e.message.split('\n')[0] }; await ctx.close(); continue; }
        await p.waitForTimeout(600);
        const shot = path.join(OUT, `${name}-${sn}-${tag}.png`);
        await p.screenshot({ path: shot });
        got[tag] = Object.assign(await p.evaluate(capture), { shot, errs });
        await ctx.close();
      }
      const id = `${sn} / ${name}`;
      if (got.a.error || got.b.error) { fails++; console.log(`FAIL  ${id} could not be opened: ${got.a.error || got.b.error}`); continue; }
      const problems = [];
      if (got.a.errs.length || got.b.errs.length) problems.push('script error: ' + [...got.a.errs, ...got.b.errs][0]);
      const ca = got.a.controls.join('\n'), cb = got.b.controls.join('\n');
      if (ca !== cb) {
        const onlyA = got.a.controls.filter(x => !got.b.controls.includes(x)), onlyB = got.b.controls.filter(x => !got.a.controls.includes(x));
        problems.push(`controls differ (${got.a.controls.length} v ${got.b.controls.length})` + (onlyA[0] ? ` only in A: ${onlyA[0]}` : '') + (onlyB[0] ? ` only in B: ${onlyB[0]}` : ''));
      }
      if (got.a.text !== got.b.text) {
        let i = 0; while (got.a.text[i] === got.b.text[i]) i++;
        problems.push(`words differ at "${got.a.text.slice(Math.max(0, i - 20), i + 30)}" v "${got.b.text.slice(Math.max(0, i - 20), i + 30)}"`);
      }
      const d = await pixelDiff(scratch, got.a.shot, got.b.shot);
      const pct = d.changed < 0 ? 'size differs' : `${(100 * d.changed / d.total).toFixed(2)}% (${d.changed} px)`;
      // The blurred glass tab bar renders a few pixels differently from run to run, so under 0.01% counts as the same.
      if (samePixels && (d.changed < 0 || d.changed > d.total / 10000)) problems.push('pixels changed: ' + pct);
      report.push({ screen: name, size: sn, controls: got.a.controls.length, same: !problems.length, pixels: pct });
      if (problems.length) { fails++; console.log(`FAIL  ${id}  pixels ${pct}`); problems.forEach(x => console.log('      ' + x)); }
      else console.log(`PASS  ${id}  ${got.a.controls.length} controls same, words same, pixels changed ${pct}`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await browser.close();
  if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
  console.log('ALL SAME');
})();
