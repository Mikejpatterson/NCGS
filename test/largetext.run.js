// Big text on a small phone: nothing may run off the side of the screen.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  let ok = true; const errs = [];
  const check = (n, c) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) ok = false; };
  for (const [w, scale] of [[320, 1.5], [390, 1.35]]) {
    const pg = await (await b.newContext({ viewport: { width: w, height: 700 }, hasTouch: true })).newPage();
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('http://localhost:8765/preview.html'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForSelector('.brand');
    await pg.addStyleTag({ content: `html { font-size: ${scale * 100}% !important; }` });
    const screens = [
      ['home', { v: 'home' }], ['past rounds', { v: 'rounds' }], ['players', { v: 'players' }], ['golfer of the year', { v: 'goy' }], ['stats', { v: 'stats' }],
      ['results', { v: 'board' }], ['ruling', { v: 'rules' }]
    ];
    for (const [name, e] of screens) {
      await pg.evaluate(e => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: e.v, p: {} }]; n.render(); }, e);
      await pg.waitForTimeout(150);
      const over = await pg.evaluate(() => { const d = document.documentElement; const bad = [...document.querySelectorAll('#app *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1) && getComputedStyle(el).position !== 'fixed' && !el.closest('.scrollx,svg,textarea'); }).slice(0, 3).map(el => el.tagName + '.' + el.className); return { sw: d.scrollWidth, iw: innerWidth, bad }; });
      check(`${name} fits at ${w}px with ${Math.round(scale * 100)}% text`, over.sw <= over.iw + 1 && over.bad.length === 0);
      if (!(over.sw <= over.iw + 1 && over.bad.length === 0)) console.log('   ', JSON.stringify(over));
    }
    await pg.evaluate(() => { const n = window.__ncgs; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
    await pg.waitForTimeout(150);
    for (const [name, v, p] of [['organiser', 'home', {}], ['members', 'members', {}], ['settings', 'settings', {}], ['backup', 'export', {}], ['round', 'round', { rid: 'demo-cabopino' }]]) {
      await pg.evaluate(([v, p]) => { const n = window.__ncgs; n.UI.org = true; n.UI.orgStack = [{ v: 'home', p: {} }, ...(v === 'home' ? [] : [{ v, p }])]; n.render(); }, [v, p]);
      await pg.waitForTimeout(150);
      const over = await pg.evaluate(() => { const bad = [...document.querySelectorAll('#app *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !el.closest('svg,textarea'); }).slice(0, 3).map(el => el.tagName + '.' + el.className); return { sw: document.documentElement.scrollWidth, iw: innerWidth, bad }; });
      check(`organiser ${name} fits at ${w}px with ${Math.round(scale * 100)}% text`, over.sw <= over.iw + 1 && over.bad.length === 0);
      if (!(over.sw <= over.iw + 1 && over.bad.length === 0)) console.log('   ', JSON.stringify(over));
    }
  }
  check('no script errors', errs.length === 0);
  await b.close(); console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
