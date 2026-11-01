// Contest heading geometry and cross-page typography; fictional data, no score writes.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok=true;
const check=(name,good)=>{console.log((good?'PASS  ':'FAIL  ')+name);if(!good)ok=false;};
const measure=selector=>{
  const find=(root,pattern)=>{const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode,m=n.textContent.match(pattern);if(m){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);return {range:r,node:n};}}return null;};
  return [...document.querySelectorAll(selector)].map(row=>{
    const hole=find(row,/Hole[\s\u00a0]+\d+/),title=find(row,/Nearest the pin|Longest drive/);
    const b=row.getBoundingClientRect(),hr=hole?.range.getBoundingClientRect(),tr=title?.range.getBoundingClientRect(),cs=title&&getComputedStyle(title.node.parentElement);
    const inside=r=>r&&r.left>=b.left-1&&r.right<=b.right+1;
    return {label:hole?.range.toString().replace(/\s+/g,' '),whole:!!hole&&hole.range.getClientRects().length===1,fit:inside(hr)&&inside(tr),apart:!!hr&&!!tr&&(hr.left>=tr.right+4||hr.top>=tr.bottom-1),type:cs?[cs.fontFamily,cs.fontSize,cs.fontWeight,cs.color]:null};
  });
};
(async()=>{const browser=await chromium.launch();try{
  const p=await(await browser.newContext({viewport:{width:390,height:844},hasTouch:true})).newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const [label,width,scale,long,confirmed] of [['360',360,1,false,false],['390',390,1,false,false],['393',393,1,false,false],['430',430,1,false,false],['360-large',360,1.35,false,false],['390-large',390,1.35,false,false],['393-large-long',393,1.35,true,false],['390-confirmed',390,1,false,true]]){
    await p.setViewportSize({width,height:844});await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.goto('about:blank');await p.goto(URL+'#scenario=today');await p.waitForSelector('.brand');
    if(scale!==1)await p.addStyleTag({content:'html{font-size:135% !important}'});
    const snapshot=await p.evaluate(({long,confirmed})=>{const n=window.__ncgs,t=n.DB.server.tables,r=t.rounds.find(r=>r.status==='live'),g=r.groups[0],claimant=g.teams.flat()[1];
      r.contests=[{type:'ntp',hole:2},{type:'ld',hole:9}];t.scores=t.scores.filter(s=>s.round!==r.id||s.hole<=2);t.claims=t.claims.filter(c=>c.round!==r.id).concat([{round:r.id,hole:2,grp:g.id,player:claimant,at:'2026-10-31T10:00:00Z'}]);t.winners=t.winners.filter(w=>w.round!==r.id);if(confirmed)t.winners.push({round:r.id,hole:2,player:claimant});
      if(long){const m=t.members.find(m=>m.id===claimant);m.name='Fionnuala Ní Mhaonaigh';m.full=m.name;}
      n.DB.prefs.me=g.teams.flat()[0];n.DB._view=null;n.DB._memo={};n.UI.org=false;n.UI.stack=[{v:'home',p:{}}];n.UI.scrollTop=true;n.render();
      return JSON.stringify([t.rounds,t.scores,t.claims,t.winners]);
    },{long,confirmed});
    const home=await p.evaluate(measure,'.home-contest');
    check(label+': Home keeps each Hole-number label together',home.length===2&&home.every(x=>x.whole));
    check(label+': Home heading and hole fit without overlapping',home.every(x=>x.fit&&x.apart)&&await p.locator('main').evaluate(e=>e.scrollWidth<=innerWidth));
    const homeState=await p.locator('.home-contest-state').allTextContents();check(label+': Home retains pending/confirmed and unplayed states',homeState[0]===(confirmed?'Confirmed':'To be confirmed')&&homeState[1]==='Not yet played');
    if(process.env.NCGS_CONTEST_SHOTS){fs.mkdirSync(process.env.NCGS_CONTEST_SHOTS,{recursive:true});await p.locator('.home-contests').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(process.env.NCGS_CONTEST_SHOTS,label+'-home.png')});}
    await p.locator('#tabs [data-tab="board"]').click();await p.locator('[data-act="respill"][data-p="ct"]').click();
    const results=await p.evaluate(measure,'.contest-results .crow');
    check(label+': Results keeps both hole labels intact and inside their row',results.length===2&&results.every(x=>x.whole&&x.fit&&x.apart));
    check(label+': contest titles have matching type on Home and Results',home.length===results.length&&home.every((x,i)=>JSON.stringify(x.type)===JSON.stringify(results[i].type)));
    const badges=await p.locator('.contest-results .crow').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('.pill')].map(e=>e.innerText)));
    const reported=confirmed ? badges[0]?.length===0&&await p.locator('.contest-results .crow').first().locator('.ct-won').isVisible() : badges[0]?.join()==='To be confirmed';
    check(label+': only a reported result carries a confirmation badge',reported&&badges[1]?.length===0);
    check(label+': viewing both pages changes no scores, claims, winners or rounds',await p.evaluate(before=>{const t=window.__ncgs.DB.server.tables;return before===JSON.stringify([t.rounds,t.scores,t.claims,t.winners]);},snapshot));
    if(process.env.NCGS_CONTEST_SHOTS)await p.screenshot({path:path.join(process.env.NCGS_CONTEST_SHOTS,label+'-results.png')});
  }
  check('no script errors',errors.length===0);
}catch(e){console.error(e);ok=false;}finally{await browser.close();}console.log(ok?'all passed':'SOME FAILED');process.exit(ok?0:1);})();
