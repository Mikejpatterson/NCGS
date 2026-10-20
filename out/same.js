// Pixel-compare normal-name screenshots before/after (home as built, and round page fx-r3 with its own name).
const path = require('path');
const { chromium } = require('playwright');
const [A, B] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const [w, sc] of [[360, 1], [360, 1.35], [390, 1], [390, 1.35]]) for (const v of ['home', 'round']) {
    const shot = async F => { const ctx = await b.newContext({ viewport: { width: w, height: 740 } }); const p = await ctx.newPage();
      await p.goto('file://' + path.resolve(F)); await p.waitForSelector('.brand');
      if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
      await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' });
      await p.evaluate(v => { const n = window.__ncgs; n.UI.stack = v === 'home' ? [{ v: 'home', p: {} }] : [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-r3' } }]; n.render(); }, v);
      await p.waitForTimeout(200);
      const name = await p.$eval(v === 'home' ? '.hero.home .now-name' : '.rp-name', e => e.textContent + ' ' + getComputedStyle(e).fontSize);
      const buf = await p.screenshot(); await ctx.close(); return [buf, name]; };
    const [x, nx] = await shot(A), [y, ny] = await shot(B);
    console.log(w, sc, v, x.equals(y) ? 'IDENTICAL' : 'DIFFERENT', '|', nx, '->', ny);
  }
  await b.close();
})();
