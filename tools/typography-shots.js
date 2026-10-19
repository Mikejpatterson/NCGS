// Screenshots for the typography check (issue #1). Fixture builds only.
// node tools/typography-shots.js <preview.html> <tag> <outdir>
// Home and the round page with the fixture's longest round name, at 360 and 360 with 135% text, plus the Ruling card.
// Linux Chromium has no New York: the serif here is a fallback, so judge the look itself on a real iPhone.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const [F, TAG, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [sn, sc] of [['360', 1], ['360-135', 1.35]]) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(F)); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.brand');
    if (sc !== 1) await p.addStyleTag({ content: `html{font-size:${sc * 100}% !important}` });
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    const rid = await p.evaluate(() => { const rs = window.__ncgs.D.rounds();
      const long = rs.map(r => r.name || '').sort((a, c) => c.length - a.length)[0];
      rs.filter(r => r.status !== 'final').forEach(r => { r.name = long; });
      return rs.find(r => r.status !== 'final').id; });
    const show = async (stack, file) => { await p.evaluate(s => { const n = window.__ncgs; n.UI.stack = s; n.render(); scrollTo(0, 0); }, stack); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, `${file}-${TAG}-${sn}.png`) }); };
    await show([{ v: 'home', p: {} }], 'home-long');
    await show([{ v: 'home', p: {} }, { v: 'round', p: { rid } }], 'round-long');
    await p.evaluate(() => { const n = window.__ncgs;
      n.UI.chat = [{ role: 'user', text: 'Ball in the bushes' }, { role: 'ai', text: 'Rule 19', sources: [], card: { type: 'ruling', topic: 'Unplayable ball', rule: 'Rule 19', verdict: '1 penalty shot', intro: 'Pick one of these:', steps: ['Drop within **2 club-lengths**', 'Go **back on a line**'], note: 'Count the penalty.', quote: 'The player may take unplayable ball relief.' } }]; });
    await show([{ v: 'rules', p: {} }], 'ruling');
    console.log(`${TAG} ${sn}: saved`);
    await ctx.close();
  }
  await b.close();
})();
