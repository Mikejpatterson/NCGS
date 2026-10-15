// Layout check: every golfer screen at small, normal and large-text phone sizes.
// Fails on text that overflows or is cut off, anything off the edge of the screen, and touch targets under 40px.
// Run: python3 -m http.server 8765 -d dist & NODE_PATH=/opt/npm-tools/node_modules node test/layout.run.js
const { chromium } = require('playwright');
const sizes = [['small 360', 360, 740, 1], ['normal 390', 390, 844, 1], ['large text 390', 390, 844, 1.35]];
const URL = 'http://localhost:8765/preview.html';
const home = async p => { await p.evaluate(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); }); await p.waitForTimeout(150); };
const clickAny = async (p, sel) => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(200); };
const scenarios = [
  ['home', async p => {}],
  ['who', async p => { await clickAny(p, '[data-act="who"]'); }],
  ['rounds', async p => { await clickAny(p, '[data-act="rounds"]'); }],
  ['round-rio', async p => { await clickAny(p, '[data-act="rounds"]'); await clickAny(p, '[data-act="round"][data-rid="2026-rio-real"]'); }],
  ['round-groups', async p => { await clickAny(p, '.now [data-act="round"]'); }],
  ['round-group-open', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '.rg'); }],
  ['round-kb', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '[data-act="rtab"][data-t="kb"]'); }],
  ['round-weather', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '[data-act="rtab"][data-t="weather"]'); }],
  ['round-course', async p => { await clickAny(p, '.now [data-act="round"]'); await clickAny(p, '[data-act="rtab"][data-t="course"]'); }],
  ['goy', async p => { await clickAny(p, '[data-act="goy"]'); }],
  ['player', async p => { await clickAny(p, '[data-act="goy"]'); await clickAny(p, '[data-act="player"]'); }],
  ['players', async p => { await clickAny(p, '[data-act="players"]'); }],
  ['stats', async p => { await clickAny(p, '[data-act="stats"]'); }],
  ['trip', async p => { await clickAny(p, '[data-act="trip"]'); }],
  ['board-scores', async p => { await clickAny(p, '[data-act="tab"][data-tab="board"]').catch(async () => clickAny(p, '#tabs .tab:nth-child(3)')); }],
  ['board-bw', async p => { await clickAny(p, '#tabs .tab:nth-child(3)'); await clickAny(p, '[data-act="respill"][data-p="bw"]'); }],
  ['board-ct', async p => { await clickAny(p, '#tabs .tab:nth-child(3)'); await clickAny(p, '[data-act="respill"][data-p="ct"]'); }],
  ['board-st', async p => { await clickAny(p, '#tabs .tab:nth-child(3)'); await clickAny(p, '[data-act="respill"][data-p="st"]'); }],
  ['rules', async p => { await clickAny(p, '#tabs .tab:nth-child(4)'); }],
  ['hole-pick', async p => { await clickAny(p, '[data-act="play"]'); }],
  ['hole-intro', async p => { await clickAny(p, '[data-act="play"]'); await clickAny(p, '[data-act="pick"]'); await p.waitForTimeout(200); }],
  ['hole-tee', async p => { await clickAny(p, '[data-act="play"]'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); }],
  ['entry', async p => { await clickAny(p, '[data-act="play"]'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); }],
  ['entry-100', async p => { await clickAny(p, '[data-act="play"]'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); 
     for (const pid of await p.$$eval('[data-act="set"][data-dir="up"]', e => e.map(x => x.dataset.pid))) { for (let i = 0; i < 6; i++) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`, { timeout: 2000 }).catch(() => {}); } await p.waitForTimeout(150); }],
  ['ask', async p => { await clickAny(p, '[data-act="play"]'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); 
     for (const pid of await p.$$eval('[data-act="set"][data-dir="up"]', e => e.map(x => x.dataset.pid))) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`); await clickAny(p, '[data-act="save"]'); await p.waitForTimeout(300); await clickAny(p, '.askrow:nth-child(2)'); await p.waitForTimeout(150); }],
  ['after', async p => { await clickAny(p, '[data-act="play"]'); await clickAny(p, '[data-act="pick"]'); await clickAny(p, '[data-act="intro-go"]').catch(() => {}); 
     for (const pid of await p.$$eval('[data-act="set"][data-dir="up"]', e => e.map(x => x.dataset.pid))) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`); await clickAny(p, '[data-act="save"]'); await p.waitForTimeout(300); await clickAny(p, '.askrow:nth-child(2)'); await clickAny(p, '[data-act="ask-confirm"]'); await p.waitForTimeout(300); }],
];
const metrics = () => {
  const app = document.getElementById('app'); const out = { hover: [], clip: [], wide: [], small: [], fonts: {} };
  const vw = window.innerWidth;
  if (app.scrollWidth > app.clientWidth + 1) out.hover.push(app.scrollWidth + '>' + app.clientWidth);
  const all = [...app.querySelectorAll('*')];
  for (const e of all) {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e);
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const t = (e.textContent || '').trim().slice(0, 30);
    if (own) { const k = Math.round(parseFloat(cs.fontSize) * 10) / 10 + '/' + cs.fontWeight; out.fonts[k] = (out.fonts[k] || 0) + 1;
      if (e.scrollWidth > e.clientWidth + 1 && cs.display !== 'inline') out.clip.push(t + ' [' + e.className + '] ' + e.scrollWidth + '>' + e.clientWidth);
      if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth) out.clip.push('ELLIPSIS ' + t); }
    if ((r.right > vw + 1 || r.left < -1) && !e.closest('.sc-wrap')) out.wide.push(t + ' [' + e.className + '] ' + Math.round(r.left) + '..' + Math.round(r.right));
    if ((e.tagName === 'BUTTON' || e.dataset.act) && r.width > 4 && r.height < 40 && r.width > 0 && cs.display !== 'inline') out.small.push(t + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  return out;
};
(async () => {
  const b = await chromium.launch(); let fails = 0;
  for (const [sn, w, h, scale] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
    const p = await ctx.newPage();
    for (const [name, fn] of scenarios) {
      await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
      if (scale !== 1) await p.addStyleTag({ content: `html{font-size:${scale * 100}% !important}` });
      try { await fn(p); } catch (e) { fails++; console.log('FAIL  ' + sn + ' / ' + name + ' could not be opened: ' + e.message.split('\n')[0]); continue; }
      await p.waitForTimeout(150);
      const m = await p.evaluate(metrics);
      const bad = [...m.hover.map(x => 'page wider than screen ' + x), ...m.clip.filter(x => !/Pick up|\[vh\]/.test(x)).map(x => 'cut off: ' + x), ...m.wide.map(x => 'off screen: ' + x), ...m.small.filter(x => !/^\s*\d+x\d+$/.test(x)).map(x => 'small target: ' + x)];
      if (bad.length) { fails++; console.log('FAIL  ' + sn + ' / ' + name); bad.slice(0, 6).forEach(x => console.log('      ' + x)); }
      else console.log('PASS  ' + sn + ' / ' + name);
    }
    await ctx.close();
  }
  await b.close(); if (fails) { console.log('SOME FAILED'); process.exit(1); }
})();
