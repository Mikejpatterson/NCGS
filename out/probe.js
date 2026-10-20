const path = require('path');
const { chromium } = require('playwright');
const LONG = process.env.LONG || 'Cabopino, the long-named second day of the trip';
(async () => {
  const b = await chromium.launch();
  for (const F of process.argv.slice(2)) for (const [w, sc] of [[360, 1], [360, 1.35], [390, 1], [390, 1.35]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 740 } }); const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(F)); await p.waitForSelector('.brand');
    if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
    const row = [];
    for (const v of ['home', 'round']) {
      await p.evaluate(({ v, long }) => { const n = window.__ncgs; n.D.rounds().filter(x => x.status !== 'final').forEach(x => { x.name = long; });
        n.UI.stack = v === 'home' ? [{ v: 'home', p: {} }] : [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-r3' } }]; n.render(); }, { v, long: LONG });
      await p.waitForTimeout(100);
      const sel = v === 'home' ? '.hero.home .now-name' : '.rp-name';
      const res = await p.$eval(sel, e => { const out = []; for (const rem of [1.8, 1.6, 1.5, 1.4, 1.35, 1.3, 1.25, 1.2]) { e.style.fontSize = rem + 'rem';
        const rg = document.createRange(); rg.selectNodeContents(e); out.push(rem + ':' + new Set([...rg.getClientRects()].filter(r => r.width).map(r => Math.round(r.top))).size); }
        e.style.fontSize = ''; return e.clientWidth + 'px ' + out.join(' '); });
      row.push(v + ' ' + res);
    }
    console.log(path.basename(F), w, sc, '|', row.join(' | '));
    await ctx.close();
  }
  await b.close();
})();
