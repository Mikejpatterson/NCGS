// Whole-app screen audit regressions: real navigation after finalisation, retained saves,
// readable result cards, long names, touch targets and identifiable trip days. Invented data only.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
const SHOTS = process.env.NCGS_AUDIT_SHOTS;
let ok = true;
const check = (name, value, detail = '') => { console.log((value ? 'PASS  ' : 'FAIL  ') + name + (!value && detail ? ' [' + detail + ']' : '')); if (!value) ok = false; };
const textContrast = locator => locator.evaluate(e => {
  const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = rgb => rgb.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
  let surface = e;
  while (surface.parentElement && /rgba|transparent/.test(getComputedStyle(surface).backgroundColor)) surface = surface.parentElement;
  const a = lum(rgb(getComputedStyle(e).color)), b = lum(rgb(getComputedStyle(surface).backgroundColor));
  return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), text: e.innerText };
});
(async () => {
  const browser = await chromium.launch();
  try {
    const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const fresh = async (scene = 'today') => {
      await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank');
      await p.goto(URL + '#scenario=' + scene); await p.waitForSelector('.brand');
      await p.evaluate(() => { const n = window.__ncgs; n.UI.org = false; n.UI.stack = [{ v: 'home', p: {} }]; n.render(); });
    };
    const shot = async name => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); } };
    const finaliseDisplay = () => p.evaluate(() => { const n = window.__ncgs; n.DB.server.tables.rounds.forEach(r => { r.status = 'final'; }); n.DB._view = null; n.DB._memo = {}; n.render(); });
    for (const tab of ['rules', 'board', 'hole']) {
      await fresh(); await p.locator(`#tabs [data-act="tab"][data-tab="${tab}"]`).click();
      if (await p.locator('[data-act="intro-go"]').count()) await p.locator('[data-act="intro-go"]').click();
      check(tab + ': no extra return bar during live play', await p.locator('.context-return').count() === 0);
      if (tab === 'hole') check('active score-entry par reference has readable contrast', (await textContrast(p.locator('.stv.none').first())).ratio >= 4.5);
      await finaliseDisplay();
      check(tab + ': return appears when the playing bar disappears', await p.locator('#tabs').isHidden() && await p.locator('.context-return [data-act="back"]').isVisible());
      if (tab === 'hole') check('final individual entry is read-only and leads to results', await p.locator('[data-act="set"]:not([disabled]),[data-act="clear"]:not([disabled]),[data-act="save"]').count() === 0 && await p.locator('[data-act="leaderboard"]').isVisible());
      await shot(tab + '-final-return'); await p.locator('.context-return [data-act="back"]').click();
      check(tab + ': return reaches Home', await p.evaluate(() => window.__ncgs.UI.stack.at(-1).v === 'home'));
      check(tab + ': Home gets no redundant Back', await p.locator('.context-return').count() === 0);
    }

    // Actual Save creates a persisted request; only saveHole responses are faulted with a retryable
    // server error. Sync and the independent simulated organiser write still use the real local server.
    await fresh(); await p.locator('#tabs [data-tab="hole"]').click();
    if (await p.locator('[data-act="intro-go"]').count()) await p.locator('[data-act="intro-go"]').click();
    await p.evaluate(() => { window.__auditCreate = window.NCGS.createServer; window.NCGS.createServer = (...args) => {
      const server = window.__auditCreate(...args), api = server.api;
      server.api = req => req.op === 'saveHole' ? { error: 'server' } : api(req); return server;
    }; });
    for (const pid of await p.locator('[data-act="set"][data-dir="up"]').evaluateAll(es => es.map(e => e.dataset.pid))) await p.locator(`[data-act="set"][data-dir="up"][data-pid="${pid}"]`).click();
    await p.locator('[data-act="save"]').click(); await p.waitForTimeout(150);
    const snapshot = () => p.evaluate(() => {
      const n = window.__ncgs, requests = n.DB.outbox.filter(x => x.req.op === 'saveHole').map(x => x.req);
      const stored = JSON.parse(localStorage.getItem('ncgs-preview-outbox-v1') || '[]').filter(x => x.req.op === 'saveHole').map(x => x.req);
      return { requests: JSON.stringify(requests), stored: JSON.stringify(stored), drafts: JSON.stringify(n.DB.prefs.drafts) };
    });
    // Give the next hole a real, partially entered draft while the preceding save is pending.
    for (let i = 0; i < 3 && await p.locator('[data-act="ask-pick"]').count(); i++) {
      await p.locator('[data-act="ask-pick"]').last().click(); await p.locator('[data-act="ask-confirm"]').click();
    }
    if (await p.locator('[data-act="next"]').count()) await p.locator('[data-act="next"]').click();
    if (await p.locator('[data-act="intro-go"]').count()) await p.locator('[data-act="intro-go"]').click();
    if (await p.locator('[data-act="set"][data-dir="up"]').count()) await p.locator('[data-act="set"][data-dir="up"]').first().click();
    const before = await snapshot();
    check('a real Save is queued and persisted while the server refuses temporarily', before.requests !== '[]' && before.requests === before.stored);
    await p.evaluate(async () => {
      const n = window.__ncgs, key = 'ncgs-preview-server-v1';
      const store = window.NCGS.memoryStore(JSON.parse(localStorage.getItem(key)), data => localStorage.setItem(key, JSON.stringify(data)));
      const server = window.__auditCreate(store);
      const reply = server.api({ op: 'put', table: 'rounds', rows: n.D.rounds().map(r => ({ ...r, status: 'final' })), pin: '1234' });
      if (reply.error) throw new Error('Fixture finalisation failed: ' + reply.error);
      await n.sync(); n.render();
    });
    check('a pending-save screen still has a route out after finalisation', await p.locator('.context-return [data-act="back"]').isVisible());
    await p.locator('.context-return [data-act="back"]').click();
    const after = await snapshot();
    check('return keeps the exact pending score request', before.requests === after.requests);
    check('return keeps the durable pending save and working draft', before.stored === after.stored && before.drafts === after.drafts);
    await p.evaluate(async () => { window.NCGS.createServer = window.__auditCreate; await window.__ncgs.flush(); });
    check('when finalisation refuses upload, the original score remains in the rejected list', await p.evaluate(requests => {
      const n = window.__ncgs; return JSON.parse(requests).every(req => n.DB.prefs.rejected.some(x => JSON.stringify(x.req) === JSON.stringify(req)));
    }, before.requests));

    await fresh('between'); await p.locator('[data-act="trip"]').first().click(); await p.locator('[data-act="leaderboard"]').first().click();
    check('nested history keeps its existing Back rather than duplicating it', await p.locator('[data-act="back"]').count() === 1 && await p.locator('.context-return').count() === 0);
    await p.locator('[data-act="results"]').click();
    const contrast = await textContrast(p.locator('#rcard .title'));
    check('shared-results headline is present and readable on its actual surface', /wins|tie|leads/.test(contrast.text) && contrast.ratio >= 4.5, String(contrast.ratio)); await shot('share-results');

    for (const [label, width, scale] of [['360', 360, 1], ['390', 390, 1], ['135', 390, 1.35]]) {
      await p.setViewportSize({ width, height: 844 }); await fresh('between');
      if (scale !== 1) await p.addStyleTag({ content: 'html{font-size:135% !important}' });
      const ctx = await p.evaluate(() => {
        const n = window.__ncgs, names = ['Bartholomew Featherstonehaugh', 'Fionnuala Ní Mhaonaigh', 'Christopher Fitzwilliam-Harrington', 'Maximilian Montgomery-Smythe'];
        n.DB.server.tables.members.slice(0, 4).forEach((m, i) => { m.name = names[i]; m.full = names[i]; });
        n.DB._view = null; n.DB._memo = {}; const r = n.D.rounds().find(r => r.groups?.length), g = r.groups[0];
        return { rid: r.id, gid: g.id, pid: g.teams.flat()[0], n: 1, cid: n.D.courses()[0].id };
      });
      const show = (v, org = false, extra = {}) => p.evaluate(([v, org, params]) => {
        const n = window.__ncgs; n.UI.org = org; n.UI.orgUnlocked = true; n.ORGPIN.pin = '1234';
        if (org) n.UI.orgStack = [{ v: 'home', p: {} }, { v, p: params }]; else n.UI.stack = [{ v: 'home', p: {} }, { v, p: params }]; n.render();
      }, [v, org, { ...ctx, ...extra }]);
      for (const [v, org] of [['player', false], ['card', false], ['hcp', false], ['member', true]]) {
        await show(v, org);
        check(label + ': long name fits in ' + (org ? 'org-' : '') + v, await p.evaluate(() => {
          const e = document.querySelector('h1.is-name'); return !!e && e.scrollWidth <= e.clientWidth + 1 && document.querySelector('main').scrollWidth <= innerWidth + 1;
        }));
        await shot(label + '-' + (org ? 'org-' : '') + v);
        if (v === 'card' && label === '390') check('scorecard par values have readable contrast', (await textContrast(p.locator('.sc .par').first())).ratio >= 4.5);
        if (v === 'card') check(label + ': scorecard round link has a full-size target', await p.locator('.cardlink').evaluate(e => { const r = e.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }));
      }
      await show('course', true);
      check(label + ': course hole fields are at least 44px high', await p.locator('.hole-row .field').evaluateAll(es => es.length > 0 && es.every(e => e.getBoundingClientRect().height >= 44)));
    }
    await p.setViewportSize({ width: 390, height: 844 }); await fresh('eventday');
    await p.evaluate(() => { const n = window.__ncgs, r = n.D.rounds().find(r => r.status === 'upcoming' && r.groups?.length);
      n.UI.org = true; n.UI.orgUnlocked = true; n.ORGPIN.pin = '1234'; n.UI.orgStack = [{ v: 'home', p: {} }, { v: 'kb', p: { rid: r.id } }]; n.render(); });
    check('KB partner choices have full-size targets', await p.locator('[data-act="org-kb-swap"]').evaluateAll(es => es.length > 0 && es.every(e => { const r = e.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })));
    await p.evaluate(() => { const n = window.__ncgs; n.DB.server.tables.members[0].name = 'Bartholomew Featherstonehaugh'; n.DB._view = null; n.DB._memo = {}; n.render(); });
    await p.addStyleTag({ content: 'html{font-size:135% !important}' });
    check('a long KB name leaves its partner an equal column at large text', await p.locator('.kb-pair').evaluateAll(rows => rows.every(row => {
      const [a, b] = row.querySelectorAll('button'); return Math.abs(a.getBoundingClientRect().width - b.getBoundingClientRect().width) <= 1;
    })));
    await shot('large-kb-pairs');
    await fresh('today'); await p.locator('#tabs [data-tab="board"]').click(); await p.locator('[data-act="respill"][data-p="bw"]').click();
    check('editable Buggy Wars holes have full-size targets', await p.locator('[data-act="edit-hole"]').evaluateAll(es => es.length > 0 && es.every(e => { const r = e.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })));
    await shot('editable-buggy-holes');
    await fresh('westport'); await p.locator('[data-act="trip"]').first().click();
    const days = await p.locator('[data-act="leaderboard"]').allTextContents();
    check('Westport day links name the course, day and state', days.some(x => /Ballinrobe/.test(x) && /Day 1/.test(x) && /Final/.test(x)) && days.some(x => /Westport/.test(x) && /Day 2/.test(x) && /Live/.test(x) && /Team scramble/.test(x)));
    check('Westport keeps separate daily results', /No combined leaderboard/.test(await p.locator('main').innerText())); await shot('westport-days');
    await fresh('westport'); await p.locator('#tabs [data-tab="hole"]').click();
    for (let i = 0; i < 3 && await p.locator('[data-act="ask-pick"]').count(); i++) { await p.locator('[data-act="ask-pick"]').last().click(); await p.locator('[data-act="ask-confirm"]').click(); }
    if (await p.locator('[data-act="intro-go"]').count()) await p.locator('[data-act="intro-go"]').click();
    await finaliseDisplay();
    check('final scramble entry is read-only and leads to results', await p.locator('[data-act="scr-score"]:not([disabled]),[data-act="scr-driver"]:not([disabled]),[data-act="scr-save"]').count() === 0 && await p.locator('[data-act="leaderboard"]').isVisible());
    await shot('scramble-final-return');
    check('no script errors', errors.length === 0, errors.join(' | '));
  } catch (e) { console.error(e); ok = false; } finally { await browser.close(); }
  console.log(ok ? 'all passed' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
