// Header/row geometry regression for the phone Players list. Fictional data only.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok = true;
const check = (name, value) => { console.log((value ? 'PASS  ' : 'FAIL  ') + name); if (!value) ok = false; };
(async () => {
  const browser = await chromium.launch();
  try {
    const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    for (const [label, width, scale, long] of [['360',360,1,false],['390',390,1,false],['393',393,1,false],['430',430,1,false],['360-large',360,1.35,false],['390-large',390,1.35,false],['360-long',360,1,true],['390-long-large',390,1.35,true]]) {
      await p.setViewportSize({ width, height: 844 });
      await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto('about:blank');
      await p.goto(URL + '#scenario=ready'); await p.waitForSelector('.brand');
      if (scale !== 1) await p.addStyleTag({ content:'html{font-size:135% !important}' });
      if (long) await p.evaluate(() => {
        const n = window.__ncgs, names=['Bartholomew Featherstonehaugh','Fionnuala Ní Mhaonaigh','Christopher Fitzwilliam-Harrington','Maximilian Montgomery-Smythe'];
        n.DB.server.tables.members.slice(0,4).forEach((m,i)=>{m.name=names[i];m.full=names[i];}); n.DB._view=null;n.DB._memo={};n.render();
      });
      await p.locator('.home-announcement [data-act="round"]').first().click();
      await p.locator('[data-act="rtab"][data-t="players"]').click();
      const metrics=await p.locator('.rp-players').evaluate(list=>{
        const rect=e=>e.getBoundingClientRect(),mid=e=>{const r=rect(e);return(r.top+r.bottom)/2;};
        const head=list.querySelector('.cols'),heads=[...head.children],rows=[...list.querySelectorAll('.pl-row:not(.cols)')];
        return {count:rows.length,aligned:rows.every(row=>{
          const c=[...row.children],name=c[1],index=c[2],playing=c[3];
          return Math.abs(rect(index).right-rect(heads[2]).right)<1&&Math.abs(rect(playing).right-rect(heads[3]).right)<1&&Math.abs(mid(index)-mid(name))<2&&Math.abs(mid(playing)-mid(name))<2&&rect(name).right<=rect(index).left-4;
        }),fits:rows.every(row=>[...row.querySelectorAll('.pl-n,.num')].every(e=>e.scrollWidth<=e.clientWidth+1))&&document.querySelector('main').scrollWidth<=innerWidth,
        targets:rows.every(row=>rect(row).height>=44),compact:rows.every(row=>rect(row).height<=64)};
      });
      check(label+': every index/playing value aligns with its heading and player',metrics.count>0&&metrics.aligned);
      check(label+': names and numbers fit without sideways overflow',metrics.fits);
      check(label+': whole player rows remain full-size targets',metrics.targets);
      if (!long&&scale===1) check(label+': ordinary names keep compact rows',metrics.compact);
      if(process.env.NCGS_COLUMN_SHOTS){fs.mkdirSync(process.env.NCGS_COLUMN_SHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.NCGS_COLUMN_SHOTS,label+'.png')});}
      if(label==='390'){
        await p.locator('.rp-players [data-act="hcp"]').first().click();
        check('a player still opens their playing-handicap calculation',await p.locator('h1').count()>0&&/Course handicap/.test(await p.locator('main').innerText()));
      }
    }
    check('no script errors',errors.length===0);
  }catch(e){console.error(e);ok=false;}finally{await browser.close();}
  console.log(ok?'all passed':'SOME FAILED');process.exit(ok?0:1);
})();
