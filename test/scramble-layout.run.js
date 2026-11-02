// The whole scramble input stays usable together: drive choices, team score, Save and nav.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true;
const check = (name, good) => { console.log((good ? 'PASS  ' : 'FAIL  ') + name); if (!good) ok = false; };
(async () => { const browser = await chromium.launch(); try {
  const p = await (await browser.newContext({ viewport: { width: 393, height: 780 }, hasTouch: true })).newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  for (const [label, width, height, size, long] of [['360',360,740,19,false], ['390',390,780,19,false], ['393',393,780,19,false], ['430',430,844,19,false], ['large-long',393,780,25.65,true]]) {
    await p.setViewportSize({ width, height }); await p.goto(URL); await p.evaluate(() => localStorage.clear());
    await p.goto('about:blank'); await p.goto(URL + '#scenario=westport');
    await p.waitForFunction(() => window.__ncgs?.D.round('fx-wp2'));
    await p.addStyleTag({ content: `html { font-size: ${size}px !important; }` });
    const before = await p.evaluate(long => {
      const n = window.__ncgs, t = n.DB.server.tables, r = t.rounds.find(r => r.id === 'fx-wp2'), g = r.groups[0], players = g.teams.flat();
      t.scores = t.scores.filter(s => s.round !== r.id).concat([{ round:r.id, player:players[0], hole:1, strokes:4, by:'Fixture', at:'2026-11-01T10:00:00Z' }]);
      t.settings = t.settings.filter(s => s.key !== 'teamshots:fx-wp2');
      if (long) { const m = t.members.find(m => m.id === players[3]); m.name = 'Fionnuala Ní Mhaonaigh'; m.full = m.name; }
      n.DB.prefs.me = players[0]; n.DB.prefs.drafts[r.id] = { [g.id]: { 2: { score:4, driver:players[2] } } };
      n.DB._view = null; n.DB._memo = {}; n.UI.org = false; n.UI.hole = 2; n.UI.teeHole = 2; n.UI.edit = false;
      n.UI.stack = [{v:'home',p:{}},{v:'tee',p:{rid:r.id}}]; n.UI.scrollTop = true; n.render(); window.scrollTo(0,0);
      return JSON.stringify([t.rounds,t.scores,t.claims,t.winners]);
    }, long);
    const layout = await p.evaluate(() => {
      const bounds = s => document.querySelector(s).getBoundingClientRect();
      const ds = [...document.querySelectorAll('.scr-drv')].map(e => e.getBoundingClientRect()), score = bounds('.scr-score'), save = bounds('[data-act="scr-save"]'), nav = bounds('#tabs');
      const targets = [...document.querySelectorAll('.scr-drv, [data-act="scr-score"], [data-act="scr-pickup"], [data-act="scr-clear"], [data-act="scr-save"]')];
      return { grid:ds.length===4 && Math.abs(ds[0].top-ds[1].top)<1 && ds[2].top>ds[0].bottom && Math.abs(ds[2].top-ds[3].top)<1,
        fit:score.top>=0 && score.bottom<=save.top && save.bottom<=nav.top,
        targets:targets.every(e=>{const r=e.getBoundingClientRect();return r.width>=44 && r.height>=44;}),
        text:document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.scr-drv')].every(e=>e.scrollWidth<=e.clientWidth) };
    });
    check(label + ': four drive choices form two rows of two', layout.grid);
    check(label + ': score and Save fit together above nav without scrolling', layout.fit);
    check(label + ': every input has a 44px target and names fit', layout.targets && layout.text);
    // Stroke play (owner, 2 November): strokes only, no points and no Pick up.
    check(label + ': team strokes use the shared score row, with no points', await p.locator('.scr-score .scr-val').innerText() === '4' && await p.locator('.scr-score .stv sup').count() === 0);
    check(label + ': no Pick up in a scramble', await p.locator('[data-act="scr-pickup"]').count() === 0);
    check(label + ': the team\'s score against par sits by its name and fits', await p.locator('.scr-score .scr-topar').evaluate(e => /^(E|[+\u2212]\d+)( thru \d+)?$/.test(e.textContent.trim()) && e.scrollWidth <= e.clientWidth && e.getBoundingClientRect().right <= innerWidth));
    await p.locator('[data-act="scr-score"][data-dir="up"]').click();
    check(label + ': changing strokes keeps the chosen drive', await p.locator('.scr-score .scr-val').innerText() === '5' && await p.locator('[data-act="scr-driver"][aria-checked="true"]').count() === 1);
    await p.locator('[data-act="scr-clear"]').click();
    check(label + ': clearing the team score makes Save wait again', await p.locator('[data-act="scr-save"]').evaluate(e=>e.classList.contains('quiet')));
    await p.evaluate(() => { const n=window.__ncgs; n.UI.board='fx-wp2'; n.UI.res='lb'; n.UI.stack=[{v:'home',p:{}},{v:'board',p:{}}]; n.render(); });
    check(label + ': team results keep paired names with their drive counts', await p.locator('.scr-row').evaluateAll(rows=>rows.length===4 && rows.every(row=>{
      const cells=[...row.querySelectorAll('.scr-pd')], rs=cells.map(e=>e.getBoundingClientRect());
      return cells.length===4 && rs[1].left>rs[0].left && Math.abs(rs[0].top-rs[1].top)<1 && rs[2].top>=Math.max(rs[0].bottom,rs[1].bottom) && cells.every(e=>e.querySelectorAll('.scr-dots i').length===3 && e.scrollWidth<=e.clientWidth);
    })));
    check(label + ': editing drafts and viewing results leave stored scores unchanged', await p.evaluate(before=>{const t=window.__ncgs.DB.server.tables;return before===JSON.stringify([t.rounds,t.scores,t.claims,t.winners]);},before));
  }
  check('no script errors', errors.length === 0);
} catch(e) { console.error(e); ok=false; } finally { await browser.close(); }
console.log(ok?'all passed':'SOME FAILED'); process.exit(ok?0:1);
})();
