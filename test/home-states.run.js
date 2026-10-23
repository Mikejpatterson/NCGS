// Home uses real round/results state; a claim must never become a confirmed award early.
// Run against the invented fixture preview, alongside the existing layout and scoring suites.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
const OUT = process.env.NCGS_HOME_SHOTS;
(async () => {
  const browser = await chromium.launch();
  try {
    const errors = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const fresh = async () => {
      await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
      await page.waitForSelector('.brand');
    };
    const setState = async state => page.evaluate(state => {
      const n = window.__ncgs;
      if (state === 'live') {
        const r = n.D.rounds().find(r => r.status === 'live');
        n.DB.prefs.me = r.groups[0].teams.flat()[0];
      } else {
        n.DB.server.tables.rounds = n.DB.server.tables.rounds.filter(r => r.status === 'final');
        if (state === 'empty') n.DB.server.tables.rounds = [];
        if (state === 'upcoming') {
          const prior = n.DB.server.tables.rounds[0];
          n.DB.server.tables.rounds.push({ ...prior, id: 'home-upcoming-fixture', date: '2026-11-14', name: 'Example upcoming round', trip: null, trip_day: null, status: 'upcoming', results: null, groups: [] });
        }
      }
      n.DB._view = null; n.DB._memo = {}; n.render();
    }, state);
    await fresh(); await setState('live');
    assert(await page.locator('.home-live-ticket [data-tab="hole"]').count(), 'Identified player retains Continue');
    assert(await page.locator('.home-live-board .mr.me').count(), 'Personal standing remains visible');
    await page.click('.home-live-board [data-act="leaderboard"]');
    assert.equal(await page.evaluate(() => window.__ncgs.UI.stack.at(-1).v), 'board');
    await fresh(); await setState('live');
    await page.evaluate(() => {
      const n = window.__ncgs, r = n.D.rounds().find(r => r.status === 'live'), c = r.contests[0], g = r.groups[0];
      n.DB.server.tables.claims = [{round:r.id,hole:c.hole,grp:g.id,player:g.teams.flat()[0],at:'2026-10-23T10:00:00Z'}];
      n.DB.server.tables.winners = []; n.DB._view=null; n.DB._memo={}; n.render();
    });
    assert.match(await page.locator('.home-contest').first().innerText(), /To be confirmed/);
    await page.evaluate(() => {
      const n=window.__ncgs; n.DB.server.tables.claims[0].player='_nobody';
      n.DB._view=null;n.DB._memo={};n.render();
    });
    const pendingNobody = await page.locator('.home-contest').first().innerText();
    assert.match(pendingNobody, /Nobody yet/); assert.match(pendingNobody, /To be confirmed/);
    await page.evaluate(() => {
      const n=window.__ncgs,r=n.D.rounds().find(r=>r.status==='live'),c=r.contests[0];
      n.DB.server.tables.claims=r.groups.map(g=>({round:r.id,hole:c.hole,grp:g.id,player:'_nobody',at:'2026-10-23T11:00:00Z'}));
      n.DB._view=null;n.DB._memo={};n.render();
    });
    const result = await page.locator('.home-contest').first().innerText();
    assert.match(result, /Nobody/); assert.match(result, /Confirmed/);
    await fresh(); await setState('empty');
    assert.equal(await page.locator('.home-year').count(), 1);
    assert.equal(await page.locator('.home-live-ticket').count(), 0);
    assert.match(await page.locator('.home-season-intro').innerText(), /A fresh scorecard/);
    await fresh(); await setState('upcoming');
    assert.equal(await page.locator('.home-announcement [data-tab="hole"]').count(), 0);
    assert.equal(await page.locator('.home-date b').innerText(), '14');
    await page.click('.home-announcement .go');
    assert.equal(await page.evaluate(() => window.__ncgs.UI.stack.at(-1).v), 'round');
    if (OUT) fs.mkdirSync(OUT, {recursive:true});
    for (const [width, scale] of [[360,1],[390,1],[390,1.35]]) {
      await page.setViewportSize({width,height:844});
      for (const state of ['empty','upcoming','live']) {
        await fresh(); await setState(state);
        if (scale!==1) await page.addStyleTag({content:`html{font-size:${scale*100}%!important}`});
        assert(await page.evaluate(() => document.getElementById('app').scrollWidth <= innerWidth+1), `${state} stays within ${width}/${scale}`);
        if(OUT) await page.screenshot({path:path.join(OUT,`${state}-${width}-${scale}.png`),fullPage:true});
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS Home: quiet/upcoming/live, personal standing, navigation, provisional/confirmed/Nobody, nine phone/text states');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
