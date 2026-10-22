// Screenshot + measure the Hole screen header (evidence for docs/HOLE-HEADER.md). Fixture builds only.
// node tools/hole-header-shots.js <preview.html> <std|ed> <outdir> [1 = also mock the PAR | SI proposal, screenshot only]
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [F, TAG, OUT, TRIAL] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sizes = [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35], ['360-135', 360, 740, 1.35]];
const click = async (p, s) => { await p.click(s, { timeout: 3000 }); await p.waitForTimeout(200); };
(async () => {
  const b = await chromium.launch();
  for (const [sn, w, h, sc] of sizes) {
    for (const scen of ['entry', 'after']) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, timezoneId: 'Europe/Dublin' });
      await ctx.addInitScript(() => { const f = new Date('2026-10-18T09:30:00Z').getTime(); const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [f])); } static now() { return f; } }; });
      const p = await ctx.newPage();
      await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
      if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
      await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
      await click(p, '#tabs .tab:nth-child(2)'); await click(p, '[data-act="pick"]'); await click(p, '[data-act="intro-go"]').catch(() => {});
      if (await p.$('[data-act="enter"]')) await click(p, '[data-act="enter"]');
      if (scen === 'after') {
        const pids = await p.$$eval('[data-act="set"][data-dir="up"]', e => [...new Set(e.map(x => x.dataset.pid))]);
        for (const pid of pids) await p.click(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`);
        await click(p, '[data-act="save"]'); await p.waitForTimeout(300);
        if (await p.$('.askrow')) { await click(p, '.askrow:nth-child(2)'); await click(p, '[data-act="ask-confirm"]').catch(() => {}); }
      }
      // Screenshot-only mock of the proposed PAR | SI block (never shipped).
      if (TRIAL && scen === 'entry') await p.evaluate(() => {
        const r = document.querySelector('.entr'); const par = r.querySelector('b').textContent.replace('Par ', ''); const m = r.querySelector('span').textContent.match(/Index (\d+)(?: · (\d+) yds)?/);
        r.innerHTML = `<div class="hst"><div><small>PAR</small><b>${par}</b></div><div><small>SI</small><b>${m[1]}</b></div></div>${m[2] ? `<span class="yd">${m[2]} yds</span>` : ''}`;
        const st = document.createElement('style'); st.textContent = `.entr .hst{display:flex;align-items:stretch}.entr .hst>div{display:flex;flex-direction:column;align-items:flex-end;padding-left:14px}.entr .hst>div+div{margin-left:14px;border-left:1px solid rgba(255,255,255,.28)}.entr .hst small{font-size:.75rem;font-weight:800;letter-spacing:.1em;color:var(--on-pine-label)}.entr .hst b{font-size:2rem;font-weight:800;line-height:1;color:#fff;font-variant-numeric:tabular-nums;margin-top:2px}.entr .yd{font-size:.88rem;color:rgba(255,255,255,.82);margin-top:4px}`; document.head.appendChild(st);
      });
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(OUT, `${scen}-${sn}-${TAG}.png`) });
      const m = await p.evaluate(() => {
        const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), fs: cs.fontSize, fw: cs.fontWeight, text: e.textContent.trim().slice(0, 40) }; };
        return { card: r('.entcard'), row: r('.entrow'), left: r('.entl'), n: r('.entn'), right: r('.entr'), par: r('.entr b'), si: r('.entr span'), rightKids: [...(document.querySelector('.entr')?.children || [])].map(e => e.className + ':' + e.textContent.trim()) };
      });
      console.log(TAG, scen, sn, JSON.stringify(m));
      await ctx.close();
    }
  }
  await b.close();
})();
