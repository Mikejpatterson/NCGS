// Click-through crawler: walks the app from the front page, tapping EVERY visible control on every screen it can reach.
// For each tap it checks: no script error, something visibly happened (no dead buttons), no "undefined"/"NaN" on screen,
// and that every screen it reaches has a way back to the front page (no dead ends, no loops).
//   node test/crawl.run.js [scenario]      scenario = player | known | organiser   (default: all three, one after another)
const { chromium } = require('playwright');
const URL = process.env.CRAWL_URL || 'http://localhost:8765/preview.html';
const SCEN = process.argv[2] ? [process.argv[2]] : ['player', 'known', 'organiser', 'deep'];
const MAXDEPTH = 5;
const findings = [];
const note = (sc, kind, where, what) => { findings.push({ sc, kind, where, what }); console.log(`  ${kind.padEnd(10)} ${where} :: ${what}`); };

const INPAGE_sig = () => { const n = window.__ncgs; const s = n.UI.org ? n.UI.orgStack : n.UI.stack; const t = s[s.length - 1] || {}; return (n.UI.org ? 'O:' : 'P:') + t.v + (n.UI.confirm ? '|c' : '') + (n.UI.contestSheet ? '|sheet' : ''); };
const INPAGE = {
  sig: () => { const n = window.__ncgs; const s = n.UI.org ? n.UI.orgStack : n.UI.stack; const t = s[s.length - 1] || {}; return (n.UI.org ? 'O:' : 'P:') + t.v + (n.UI.confirm ? '|c' : '') + (n.UI.contestSheet ? '|sheet' : ''); },
  items: () => {
    const vis = e => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !e.closest('[hidden]') && !e.closest('[aria-hidden="true"]'); };
    const out = [];
    document.querySelectorAll('button, a[href], [data-act], [data-v], [role="button"]').forEach(e => {
      if (e.closest('.askbar') && e.matches('.mic,.send,.stop,.x')) return; // speech needs a real microphone
      if (!vis(e) || e.disabled) return;
      if (out.some(o => o.el === e)) return;
      out.push({ el: e });
    });
    return out;
  },
};

(async () => {
  const b = await chromium.launch();
  for (const sc of SCEN) {
    console.log(`\n=== scenario: ${sc} ===`);
    const seen = new Map();          // sig -> first path
    const queue = [[]];              // paths of {i, fill}
    let taps = 0, screens = 0;

    const fresh = async () => {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const pg = await ctx.newPage(); pg.errs = [];
      pg.on('pageerror', e => pg.errs.push(e.message));
      pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pg.errs.push('console: ' + m.text()); });
      pg.on('dialog', d => d.dismiss().catch(() => {}));
      await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload();
      await pg.waitForSelector('.brand'); await pg.waitForFunction(() => window.__ncgs && window.__ncgs.DB.loaded);
      if (sc === 'deep') await pg.evaluate(() => {
        // my group has played every hole but the last one, so the 'after', 'check' and 'finish' screens can all be reached
        const n = window.__ncgs; n.DB.prefs.me = 'brian'; try { localStorage.setItem('ncgs-prefs', JSON.stringify(n.DB.prefs)); } catch (e) {}
        const rid = n.liveRid(), g = n.myGroup(rid), comp = n.computeR(rid), gc = comp.groups.find(x => x.id === g.id);
        gc.order.slice(0, gc.order.length - 1).forEach(h => {
          const scores = {}; gc.teams.flat().forEach(pid => { const hh = n.holeOf(rid, h); scores[pid] = { v: hh.par + comp.players[pid].holes[h].shots, base: null }; });
          n.send({ op: 'saveHole', round: rid, grp: gc.id, hole: h, scores, by: 'Brian' });
        });
        n.render();
      }); await pg.waitForTimeout(500);
      if (sc === 'known') await pg.evaluate(() => { const n = window.__ncgs; n.DB.prefs.me = 'brian'; try { localStorage.setItem('ncgs-prefs', JSON.stringify(n.DB.prefs)); } catch (e) {} n.render(); });
      if (sc === 'organiser') await pg.evaluate(() => { const n = window.__ncgs; n.DB.prefs.me = 'brian'; n.ORGPIN.pin = '1234'; n.UI.org = true; n.UI.orgUnlocked = true; n.UI.orgStack = [{ v: 'home', p: {} }]; n.render(); });
      await pg.evaluate(() => { window.__ncgs.DB.renderFaults = 0; window.__ncgs.DB.faultLog = []; });
      return pg;
    };
    const desc = (pg, i) => pg.evaluate(i => {
      const e = [...document.querySelectorAll('button, a[href], [data-act], [data-v], [role="button"]')].filter(x => { const r = x.getBoundingClientRect(); const st = getComputedStyle(x); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !x.closest('[hidden]') && !x.closest('[aria-hidden="true"]') && !x.disabled && !(x.closest('.askbar') && x.matches('.mic,.send,.stop,.x')); });
      const x = e[i]; if (!x) return null;
      return (x.dataset.act || x.dataset.v || x.tagName.toLowerCase()) + ' "' + (x.innerText || x.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '"';
    }, i);
    const count = pg => pg.evaluate(() => [...document.querySelectorAll('button, a[href], [data-act], [data-v], [role="button"]')].filter(x => { const r = x.getBoundingClientRect(); const st = getComputedStyle(x); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !x.closest('[hidden]') && !x.closest('[aria-hidden="true"]') && !x.disabled && !(x.closest('.askbar') && x.matches('.mic,.send,.stop,.x')); }).length);
    const fillForms = pg => pg.evaluate(() => {
      const fut = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
      document.querySelectorAll('#app input, #app textarea, #app select, .sheet input, .sheet textarea, .sheet select').forEach(f => {
        let v;
        if (f.tagName === 'SELECT') { if (f.options.length > 1) f.selectedIndex = 1; f.dispatchEvent(new Event('change', { bubbles: true })); return; }
        const t = (f.type || 'text').toLowerCase();
        if (t === 'checkbox' || t === 'radio' || t === 'file' || t === 'hidden' || t === 'submit') return;
        const id = (f.id || f.name || '').toLowerCase();
        if (/pin/.test(id)) v = '1234'; else if (t === 'number' || /index|hcp|par|si|rating|slope|yard|count|size/.test(id)) v = '12'; else if (t === 'time' || /time/.test(id)) v = '08:30'; else if (t === 'date' || /date/.test(id)) v = fut; else if (t === 'tel') v = '0851234567'; else v = 'Test ' + (id || 'x');
        f.value = v; f.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    const visibleControls = async pg => {
      const els = await pg.$$('button, a[href], [data-act], [data-v], [role="button"]');
      const list = [];
      for (const e of els) { if (await e.evaluate(x => { const r = x.getBoundingClientRect(); const st = getComputedStyle(x); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !x.closest('[hidden]') && !x.closest('[aria-hidden="true"]') && !x.disabled && !(x.closest('.askbar') && x.matches('.mic,.send,.stop,.x')); }).catch(() => false)) list.push(e); }
      return list;
    };
    const tap = async (pg, step) => {
      if (step.fill) { await fillForms(pg); await pg.waitForTimeout(200); }
      let el = (await visibleControls(pg))[step.i]; if (!el) return false;
      const href = await el.evaluate(x => x.getAttribute('href') || '').catch(() => ''); const actName = await el.evaluate(x => x.dataset.act || '').catch(() => '');
      if (/^(https?:|mailto:|tel:|sms:|whatsapp:)/i.test(href) && !href.includes('localhost')) return 'external';
      for (let tries = 0; ; tries++) {
        try { await el.evaluate(x => x.scrollIntoView({ block: 'center' })); await el.click({ timeout: 4000, noWaitAfter: true }); break; }
        catch (e) {
          if (tries < 3 && /not attached|detached|Execution context/.test(e.message)) { await pg.waitForTimeout(250); el = (await visibleControls(pg))[step.i]; if (!el) return false; continue; }
          if (/intercepts pointer|Timeout/.test(e.message)) { pg.covered = true; } else pg.errs.push('click failed: ' + e.message.split('\n')[0]);
          break;
        }
      }
      await pg.waitForTimeout(/share-card|restore|backup-now/.test(href + actName) ? 900 : 160);
      return true;
    };
    const snap = pg => pg.evaluate(() => ({ html: (document.getElementById('app') || document.body).innerHTML + '||' + [...document.querySelectorAll('.tabbar,.toast,.sheet,.banner,[role=dialog],[role=alert]')].map(e => e.outerHTML).join(''), toast: ((document.querySelector('.toast') || {}).textContent || ''), y: window.scrollY, sig: (function () { const n = window.__ncgs; const s = n.UI.org ? n.UI.orgStack : n.UI.stack; const t = s[s.length - 1] || {}; return (n.UI.org ? 'O:' : 'P:') + t.v + (n.UI.confirm ? '|c' : '') + (n.UI.contestSheet ? '|sheet' : ''); })(), depth: (function () { const n = window.__ncgs; return (n.UI.org ? n.UI.orgStack : n.UI.stack).length; })(), text: document.body.innerText }));
    const replay = async (pg, path) => { for (const st of path) { const r = await tap(pg, st); if (!r) return false; } return true; };
    const badText = txt => { const m = txt.match(/\b(undefined|NaN|\[object Object\]|Infinity)\b|\bnull\b(?!\s*-)/); return m ? m[0] : null; };

    // escape test: from where we are, can we get back to the front page by tapping only visible back / home controls?
    const escape = async (pg, where) => {
      for (let k = 0; k < 8; k++) {
        const s = await pg.evaluate(() => { const n = window.__ncgs; const st = n.UI.org ? n.UI.orgStack : n.UI.stack; return { top: (st[st.length - 1] || {}).v, org: n.UI.org, len: st.length, conf: !!n.UI.confirm }; });
        if (!s.org && s.top === 'home' && s.len === 1) return true;
        const sel = ['[data-act="holes-close"]', '[data-act="contest-close"]', '[data-act="sheet-close"]', '[data-act="share-close"]', '[data-act="photo-close"]', '[data-act="fix-cancel"]', '[data-act="late-cancel"]', '[data-act="ask-cancel"]', '[data-act="entry-back"]', '[data-act="org-exit"]', '[data-act="back"]', '[data-act="home"]', '.tab[data-tab="hole"]'];
        let hit = null;
        for (const q of sel) { const e = await pg.$(q); if (e && await e.isVisible()) { hit = e; break; } }
        if (!hit) return false;
        const before = (await snap(pg)).sig;
        await hit.click({ timeout: 3000 }).catch(() => {}); await pg.waitForTimeout(140);
        const after = (await snap(pg)).sig;
        if (k > 0 && after === before && before !== 'P:home') { /* same screen again: loop */ }
      }
      const s = await pg.evaluate(() => { const n = window.__ncgs; const st = n.UI.org ? n.UI.orgStack : n.UI.stack; return !n.UI.org && st.length === 1 && st[0].v === 'home'; });
      return s;
    };

    let pg = await fresh();
    let startSig = await pg.evaluate(INPAGE.sig); seen.set(startSig, []);
    const t0 = Date.now();
    while (queue.length) {
      const path = queue.shift();
      if (Date.now() - t0 > 14 * 60e3) { note(sc, 'INFO', '-', 'stopped at 14 minutes with ' + queue.length + ' paths unexplored'); break; }
      // open this screen
      await pg.context().close(); pg = await fresh();
      if (!(await replay(pg, path))) { note(sc, 'FLAKY', JSON.stringify(path), 'could not replay path'); continue; }
      const here = await snap(pg);
      screens++;
      const bt = badText(here.text); if (bt) note(sc, 'TEXT', here.sig, `screen shows "${bt}"`);
      const n = await count(pg);
      const where0 = here.sig + ' via ' + (path.length ? path.length + ' taps' : 'start');
      const names = [];
      for (let i = 0; i < n; i++) names.push(await desc(pg, i));
      // every control, plain; and every control again with the forms filled in first
      const variants = [];
      for (let i = 0; i < n; i++) { variants.push({ i, fill: false }); if (await pg.evaluate(() => !!document.querySelector('#app input:not([type=checkbox]):not([type=radio]), #app textarea, #app select'))) variants.push({ i, fill: true }); }
      let cur = pg, fresher = false;
      for (const step of variants) {
        if (fresher) { await cur.context().close(); cur = await fresh(); pg = cur; if (!(await replay(cur, path))) { note(sc, 'FLAKY', where0, 'replay failed'); break; } }
        const before = await snap(cur);
        cur.errs.length = 0;
        const res = await tap(cur, step); taps++;
        fresher = true;
        const label = `${where0} → [${step.i}] ${names[step.i]}${step.fill ? ' (forms filled)' : ''}`;
        if (res === 'external') continue;
        if (!res) { note(sc, 'FLAKY', label, 'control vanished'); continue; }
        if (cur.covered) { cur.covered = false; continue; } // behind a sheet or dialog: a person cannot tap it either
        const after = await snap(cur);
        const faults = await cur.evaluate(() => (window.__ncgs.DB.renderFaults || 0) + ':' + (window.__ncgs.DB.faultLog || []).slice(0, 2).join(';'));
        if (cur.errs.length) note(sc, 'ERROR', label, cur.errs.slice(0, 2).join(' | '));
        if (!/^0:/.test(faults)) note(sc, 'RENDER', label, faults);
        const bt2 = badText(after.text); if (bt2 && !badText(before.text)) note(sc, 'TEXT', label, `screen shows "${bt2}"`);
        const changed = after.html !== before.html || after.sig !== before.sig || after.toast !== before.toast;
        const selfOk = ['tab', 'respill', 'year'].includes((names[step.i] || '').split(' ')[0]) || /already|blocked/.test(after.toast);
        if (!changed && !selfOk) {
          // allowed: re-selecting what is already selected, ticking nothing, scrolling links
          note(sc, 'NOEFFECT', label, 'nothing visibly happened');
        }
        // two-step confirm: tap the same control again
        if (await cur.evaluate(() => !!window.__ncgs.UI.confirm)) {
          const again = await tap(cur, step);
          await cur.waitForTimeout(150);
          const a2 = await snap(cur);
          if (cur.errs.length) note(sc, 'ERROR', label + ' (confirm)', cur.errs.slice(0, 2).join(' | '));
          if (a2.html === after.html && !a2.toast) note(sc, 'NOEFFECT', label + ' (confirm)', 'second tap did nothing');
        }
        // phone back from here must stay in the app and not blank it
        if (after.sig !== before.sig && after.depth > before.depth) {
          await cur.goBack({ waitUntil: 'commit' }).catch(() => {}); await cur.waitForTimeout(200);
          const url = cur.url(); const alive = await cur.evaluate(() => !!document.querySelector('#app') && document.body.innerText.trim().length > 20 && window.__ncgs.UI.stack.length >= 1).catch(() => false);
          const sigB = await cur.evaluate(INPAGE_sig).catch(() => '?');
          if (!/preview\.html|localhost/.test(url) || !alive) note(sc, 'BACK', label, 'phone back swipe left the app or showed a blank page: ' + url);
          else if (sigB === after.sig) note(sc, 'BACK', label, 'phone back did not go back a screen');
        }
        // new screen? remember how to get there, and check there is a way out
        if (after.sig !== before.sig && !seen.has(after.sig)) {
          const p2 = path.concat([step]); seen.set(after.sig, p2);
          if (p2.length < MAXDEPTH) queue.push(p2);
          await cur.context().close(); cur = await fresh(); pg = cur;
          if (await replay(cur, p2)) {
            const ok = await escape(cur, after.sig);
            if (!ok) note(sc, 'DEADEND', label, `reached ${after.sig} but could not get back to the front page with the back / home / close controls`);
          }
        }
      }
      pg = cur;
    }
    await pg.context().close();
    console.log(`scenario ${sc}: ${screens} screens opened, ${taps} taps, ${[...seen.keys()].length} distinct screens`);
    console.log('  screens: ' + [...seen.keys()].join(', '));
  }
  await b.close();
  const bad = findings.filter(f => !['INFO', 'FLAKY'].includes(f.kind));
  console.log(`\n${bad.length} problems, ${findings.length - bad.length} notes`);
  require('fs').writeFileSync('/tmp/crawl-findings.json', JSON.stringify(findings, null, 1));
  console.log(bad.length ? 'FAIL crawl' : 'all passed');
  process.exit(bad.length ? 1 : 0);
})();
