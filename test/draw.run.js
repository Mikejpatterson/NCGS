// Breakfast draw in the preview's "draw" scenario (owner brief §7): members see the pots first (names, never handicaps);
// the stage shows only the team being drawn; a short pot waits for the committee before the groups; and every draw
// screen fits at 360px, 390px, 390px with 135% text and on an iPad, with long names, 44px touch targets and nothing cut off.
const { chromium } = require('playwright');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true;
const check = (n, c, extra) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (!c && extra ? '   [' + extra + ']' : '')); if (!c) ok = false; };
const LONG = ['Bartholomew Featherstonehaugh', 'Maximilian Montgomery-Smythe', 'Christopher Fitzwilliam-Harrington', 'Fionnuala Ní Mhaonaigh',
  'Alexander Cholmondeley', 'Seraphina Wolstenholme', 'Konstantinos Papadopoulos', 'Gwendolyn Postlethwaite'];

async function fresh(b, w, h) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true })).newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank'); await p.goto(URL + '#scenario=draw');
  await p.waitForFunction(() => window.__ncgs && window.__ncgs.D.round('fx-wp2'));
  await p.evaluate(() => window.__ncgs.sync());
  return p;
}
const org = (p, v) => p.evaluate(v => { const n = window.__ncgs; n.UI.org = true; n.UI.orgUnlocked = true; n.ORGPIN.pin = '1234'; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }, { v, p: { rid: 'fx-wp2' } }]; n.render(); }, v).then(() => p.waitForTimeout(200));
const member = p => p.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.rtabPicked = false; n.UI.rtab = 'players'; n.UI.stack = [{ v: 'home', p: {} }, { v: 'round', p: { rid: 'fx-wp2' } }]; n.render(); }).then(() => p.waitForTimeout(200));
const act = (p, a, data) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]).then(() => p.waitForTimeout(150));
async function drawAll(p) {
  for (let i = 0; i < 60; i++) {
    const what = await p.evaluate(() => { const n = document.querySelector('[data-act="draw-next"]'); return n ? 'next:' + n.innerText : document.querySelector('[data-act="draw-go"]') ? 'go' : document.querySelector('[data-act="draw-make"]') || /Line-up/.test(document.querySelector('main').innerText) ? 'done' : 'wait'; });
    if (what === 'done') return;
    if (what.startsWith('next')) await p.click('[data-act="draw-next"]', { timeout: 2000 }).catch(() => {});
    else if (what === 'go') { await p.click('[data-act="draw-go"]', { timeout: 2000 }).catch(() => {}); await p.click('[data-act="draw-skip"]', { timeout: 800 }).catch(() => {}); }
    await p.waitForTimeout(250);
  }
}
const claim = async p => { await org(p, 'draw'); await p.click('[data-act="draw-claim"]'); await p.waitForTimeout(1500); await p.evaluate(() => window.__ncgs.render()); };

// Text cut off or overflowing, anything off the side of the screen, and touch targets under 44px.
const audit = p => p.evaluate(() => {
  const out = [], vw = window.innerWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push('page wider than the screen');
  const shown = e => { for (let a = e; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
  for (const e of document.querySelectorAll('#app *')) {
    if (!shown(e) || e.closest('svg')) continue;
    const r = e.getBoundingClientRect(); if (!r.width) continue;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') out.push('cut off: ' + e.textContent.trim().slice(0, 30));
    if (own && (r.left < -1 || r.right > vw + 1)) out.push('off screen: ' + e.textContent.trim().slice(0, 30));
    if ((e.matches('button, a[href], [data-act]')) && !e.closest('svg') && (r.width < 44 || r.height < 44) && !e.matches('.link.inline')) out.push(`small target ${Math.round(r.width)}x${Math.round(r.height)}: ` + (e.textContent.trim() || e.dataset.act).slice(0, 24));
  }
  return [...new Set(out)];
});

(async () => {
  const b = await chromium.launch();
  try {
    // Members see the pots first, names only.
    let p = await fresh(b, 390, 844);
    await member(p);
    const t = await p.locator('main').innerText();
    check('members: the round opens on the pots, A to D', /Pot A/.test(t) && /Pot D/.test(t) && await p.$eval('.rtabs button.on', e => e.textContent) === 'Pots');
    check('members: no handicaps beside the names', !/\d+\.\d/.test(await p.$eval('.drw-potlist', e => e.innerText)));
    check('members: a scramble has no KBs tab', !(await p.$('.rtabs [data-t="kb"]')));
    await p.evaluate(() => { const n = window.__ncgs; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); }); await p.waitForTimeout(150);
    check('members: Home says See the pots', /See the pots/.test(await p.locator('main').innerText()));
    await org(p, 'draw');
    check('starting the draw is one tap (no device chosen yet)', /Start the draw/.test(await p.locator('main').innerText()));
    // The stage shows only the team being drawn.
    await claim(p);
    await p.click('[data-act="draw-go"]'); await p.click('[data-act="draw-skip"]').catch(() => {}); await p.waitForTimeout(200);
    check('stage: one team at a time (four pots, no other teams)', (await p.$$('.drw-cell')).length === 4 && !/Team 2/.test(await p.locator('main').innerText()));
    await drawAll(p);
    await org(p, 'drawlineup');
    check('line-up: names first, every team listed', (await p.$$('.drw-lt')).length === 4 && (await p.$$('.drw-lt li')).length === 16);
    await p.waitForTimeout(1500);
    const made = await p.evaluate(() => { const n = window.__ncgs, r = n.D.round('fx-wp2'), rows = n.view().settings.filter(s => s.key.indexOf('draw:fx-wp2:1:') === 0);
      return { groups: (r.groups || []).length, marked: (r.groups || []).every(g => g.draw), picks: rows.length }; });
    check('the last team is not drawn (12 picks for 16 players), and the teams become the groups by themselves', made.picks === 12 && made.groups === 4 && made.marked, JSON.stringify(made));
    await member(p);
    check('members: once the groups are made there is no Draw tab, just Groups', !(await p.$('.rtabs [data-t="pots"]')) && !!(await p.$('.rtabs [data-t="groups"]')));
    // Someone running late: swap their team's tee time with the last team's (owner, 26 October).
    const before = await p.evaluate(() => window.__ncgs.D.round('fx-wp2').groups.map(g => g.teams.flat().join(',')));
    await org(p, 'playing');
    check('organiser Groups: a scramble shows teams of four with tee times, no buggies', /Tap two teams to swap tee times/.test(await p.locator('main').innerText()) && !/Buggy/.test(await p.locator('main').innerText()) && (await p.$$('[data-act="org-team-move"]')).length === 4);
    await p.click('[data-act="org-team-move"][data-gi="0"]'); await p.click('[data-act="org-team-move"][data-gi="3"]'); await p.click('[data-act="org-save-groups"]'); await p.waitForTimeout(400);
    const after = await p.evaluate(() => { const r = window.__ncgs.D.round('fx-wp2'); return { teams: r.groups.map(g => g.teams.flat().join(',')), times: r.groups.map(g => g.teeTime), marked: r.groups.every(g => g.draw) }; });
    check('team 1 now tees off last and team 4 first; the teams themselves are unchanged', after.teams[0] === before[3] && after.teams[3] === before[0] && after.times[0] === '10:00' && after.times[3] === '10:30', JSON.stringify(after));
    check('saving the groups keeps the draw done (no Draw tab, no restart)', after.marked);
    await org(p, 'drawlineup');
    const first = await p.$eval('.drw-lt', e => e.innerText);
    const want = await p.evaluate(ids => ids.split(',').map(id => window.__ncgs.D.nameOf(id)), before[3]);
    check('the line-up shows the swapped tee times', /10:00 · Team 1/i.test(first) && want.every(n => first.includes(n)), first.replace(/\s+/g, ' '));
    await p.close();

    // Short pot: fifteen players; the last team has nobody from pot D, and the groups wait for the committee.
    p = await fresh(b, 390, 844);
    await p.evaluate(() => { const n = window.__ncgs, v = JSON.parse(n.D.setting('pots:fx-wp2')); v.pots[3].pop(); n.ORGPIN.pin = '1234'; n.put('settings', [{ key: 'pots:fx-wp2', value: JSON.stringify(v) }]); });
    await p.waitForTimeout(300);
    await claim(p); await drawAll(p); await org(p, 'drawlineup');
    const lt = await p.locator('main').innerText();
    check('short pot: team 4 has nobody from pot D and says so', /No one from pot D/.test(lt) && /Team 4 plays short/.test(lt));
    check('short pot: no Make the groups until the committee agrees', !(await p.$('[data-act="draw-make"]')) && /committee decides/.test(lt));
    await act(p, 'draw-make', { rid: 'fx-wp2' }); await act(p, 'draw-make', { rid: 'fx-wp2' }); await p.waitForTimeout(300);
    check('short pot: the make-groups action itself refuses', !(await p.evaluate(() => (window.__ncgs.D.round('fx-wp2').groups || []).length)));
    await p.click('[data-act="draw-short"]'); await p.waitForTimeout(1500); await p.evaluate(() => window.__ncgs.render());
    check('short pot: the committee\'s agreement is logged', await p.evaluate(() => window.__ncgs.view().log.some(l => /Team 4 plays short: agreed/.test(l.detail || ''))));
    const g = await p.evaluate(() => window.__ncgs.D.round('fx-wp2').groups.map(x => x.teams.flat().length));
    check('short pot: once agreed, the groups are made: four, the last of three', JSON.stringify(g) === '[4,4,4,3]', JSON.stringify(g));
    check('no script errors', !p.errs.length, p.errs.join(' | '));
    await p.close();

    // Every draw screen fits, with long names, at each size.
    for (const [tag, w, h, z] of [['360', 360, 740, 1], ['390', 390, 844, 1], ['390-135', 390, 844, 1.35], ['ipad', 1024, 1366, 1]]) {
      p = await fresh(b, w, h);
      if (z !== 1) await p.addStyleTag({ content: `html{font-size:${z * 100}%}` });
      await p.evaluate(L => { const n = window.__ncgs; n.DB.server.tables.members.forEach((m, i) => { m.name = i % 3 === 0 ? 'Featherstonehaugh' : L[i % L.length].split(' ')[0]; m.full = L[i % L.length]; }); n.DB._view = null; n.DB._memo = {}; }, LONG);
      const screens = [['member pots', () => member(p)], ['draw page', () => org(p, 'drawhome')], ['pots', () => org(p, 'pots')], ['stage before', () => org(p, 'draw')],
        ['stage drawn', async () => { await claim(p); for (let i = 0; i < 4; i++) { await p.click('[data-act="draw-go"]').catch(() => {}); await p.click('[data-act="draw-skip"]').catch(() => {}); await p.waitForTimeout(150); } }],
        ['line-up', async () => { await drawAll(p); await org(p, 'drawlineup'); }], ['members during draw', () => member(p)]];
      for (const [name, go] of screens) {
        await go();
        const bad = await audit(p);
        check(`layout ${tag} / ${name}`, !bad.length, bad.slice(0, 4).join(' | '));
      }
      await p.close();
    }
  } catch (e) { console.error(e); ok = false; } finally { await b.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
