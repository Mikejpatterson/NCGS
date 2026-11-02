// Selected drive counts include the draft hole once, without altering official scores/counts.
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const URL = process.env.NCGS_TEST_URL || 'http://localhost:8765/preview.html';
let ok=true; const check=(s,v)=>{console.log((v?'PASS  ':'FAIL  ')+s);if(!v)ok=false;};
(async()=>{const b=await chromium.launch();try{
 const p=await(await b.newContext({viewport:{width:393,height:780},hasTouch:true})).newPage(), errors=[];p.on('pageerror',e=>errors.push(e.message));
 const fresh=async({width=393,size=19,long=false,edit=false,final=false,clash=false,count=1,pickup=false,stale=false}={})=>{
  await p.setViewportSize({width,height:780});await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.goto('about:blank');await p.goto(URL+'#scenario=westport');
  await p.waitForFunction(()=>window.__ncgs?.D.round('fx-wp2'));await p.addStyleTag({content:`html{font-size:${size}px !important}`});
  return p.evaluate(({long,edit,final,clash,count,pickup,stale,shots})=>{
   const n=window.__ncgs,t=n.DB.server.tables,r=t.rounds.find(r=>r.id==='fx-wp2'),g=r.groups[0],ids=g.teams.flat(),hole=count+2;
   r.contests=[];if(final)r.status='final';
   t.settings=t.settings.filter(s=>s.key!=='teamshots:fx-wp2');t.scores=t.scores.filter(s=>s.round!==r.id);
   const add=(pid,h,strokes=4)=>t.scores.push({round:r.id,player:pid,hole:h,strokes,by:'Fixture',at:'2026-11-02T10:00:00Z'});
   for(let h=1;h<=count;h++)add(ids[0],h,pickup&&h===1?'P':4);add(ids[1],count+1);
   if(edit||final||clash)add(ids[0],hole);if(clash)add(ids[1],hole);
   if(long){const m=t.members.find(m=>m.id===ids[0]);m.name='Fionnuala Ní Mhaonaigh';m.full=m.name;}
   if(shots&&!long)ids.forEach((pid,i)=>{const m=t.members.find(m=>m.id===pid);m.name=['Colin','Derek','Kieran','Peadar'][i];m.full=m.name;});
   n.DB.prefs.me=ids[0];n.DB.prefs.drafts={};if(stale)n.DB.prefs.drafts[r.id]={[g.id]:{[hole]:{driver:ids[1],score:4}}};
   n.DB._view=null;n.DB._memo={};n.UI.org=false;n.UI.hole=hole;n.UI.teeHole=hole;n.UI.edit=edit||final||clash;
   n.UI.stack=[{v:'home',p:{}},{v:edit||final||clash?'entry':'tee',p:{rid:r.id}}];n.UI.scrollTop=true;n.render();window.scrollTo(0,0);
   return {ids,hole,snapshot:JSON.stringify([t.rounds,t.scores,t.claims,t.winners]),counts:ids.map(id=>n.resultsOf(r.id).teams.find(x=>x.id===g.id).drives[id])};
  },{long,edit,final,clash,count,pickup,stale,shots:!!process.env.NCGS_DRIVE_SHOTS});
 };
 const shot=async label=>{if(process.env.NCGS_DRIVE_SHOTS){fs.mkdirSync(process.env.NCGS_DRIVE_SHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.NCGS_DRIVE_SHOTS,label+'.png')});}};
 const tile=i=>p.locator('[data-act="scr-driver"]').nth(i), dots=async i=>tile(i).locator('.scr-dots i.on').count(),note=async i=>tile(i).locator('.scr-drive-order').allTextContents();
 const unchanged=async snapshot=>p.evaluate(s=>{const t=window.__ncgs.DB.server.tables;return s===JSON.stringify([t.rounds,t.scores,t.claims,t.winners]);},snapshot);
 for(const [label,width,size,long]of [['360',360,19,false],['390',390,19,false],['393',393,19,false],['large-long',393,25.65,true]]){
  const f=await fresh({width,size,long,pickup:true});const oldHeight=await tile(0).evaluate(e=>e.getBoundingClientRect().height);
  check(label+': unselected tiles show the saved counts',await dots(0)===1&&await dots(1)===1&&await p.locator('.scr-drive-order').count()===0);
  await shot(label+'-unselected');
  await tile(0).click();
  check(label+': selecting an existing one-drive player previews the second drive',await dots(0)===2&&(await note(0)).join()==='2nd drive');
  check(label+': accessible count describes the preview',/2 drives after this selection/.test(await tile(0).getAttribute('aria-label')));
  await shot(label+'-selected');
  check(label+': the label fits with the dots and preserves ordinary tile height',await tile(0).evaluate((e,old)=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth&&(old.large||r.height<=old.height+1);},{height:oldHeight,large:size>19}));
  await tile(1).click();check(label+': switching moves the extra dot and label',await dots(0)===1&&await dots(1)===2&&(await note(1)).join()==='2nd drive'&&await tile(0).locator('.scr-drive-order').count()===0);
  await shot(label+'-switched');
  await tile(1).click();check(label+': deselecting restores the saved totals',await dots(0)===1&&await dots(1)===1&&await p.locator('.scr-drive-order').count()===0);
  await tile(2).click();check(label+': a new driver gets a first-drive preview',await dots(2)===1&&(await note(2)).join()==='1st drive');
  check(label+': selections never change stored round/score/claim/winner data',await unchanged(f.snapshot));
  await p.evaluate(()=>{const n=window.__ncgs;n.UI.board='fx-wp2';n.UI.res='lb';n.UI.stack=[{v:'home',p:{}},{v:'board',p:{}}];n.render();});
  check(label+': Results still shows actual saved counts',await p.locator('.scr-row').first().locator('.scr-pd').evaluateAll(es=>es.map(e=>e.querySelectorAll('i.on').length).join()==='1,1,0,0'));
 }
 let f=await fresh({edit:true});check('opening a saved hole does not add another drive',await dots(0)===2&&(await note(0)).join()==='2 drives');
 await tile(1).click();check('replacing a saved driver removes the old contribution before adding the new one',await dots(0)===1&&await dots(1)===2&&(await note(1)).join()==='2 drives'&&await unchanged(f.snapshot));
 f=await fresh({clash:true});await tile(0).click();check('conflicting saved drives contribute nothing until resolved: the preview adds only one',await dots(0)===2&&await dots(1)===1&&/Two drives saved/.test(await p.locator('main').innerText())&&await unchanged(f.snapshot));
 for(const [count,word]of [[3,'4th'],[10,'11th'],[11,'12th'],[12,'13th']]){f=await fresh({count});await tile(0).click();check(word+' drive: ordinal stays explicit after the three-dot minimum is full',await dots(0)===3&&(await note(0)).join()===word+' drive'&&await unchanged(f.snapshot));}
 f=await fresh({final:true,stale:true});check('a final round never adds a draft drive to the display',await dots(0)===2&&await dots(1)===1&&(await note(1)).join()==='1 drive'&&await p.locator('[data-act="scr-driver"]:not([disabled])').count()===0&&await unchanged(f.snapshot));
 // Reload with the scenario's original scores: a persisted choice must not accumulate another drive per render.
 await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.goto('about:blank');await p.goto(URL+'#scenario=westport');await p.waitForFunction(()=>window.__ncgs?.D.round('fx-wp2'));
 const enter=()=>p.evaluate(()=>{const n=window.__ncgs,r=n.DB.server.tables.rounds.find(r=>r.id==='fx-wp2');r.contests=[];n.DB._view=null;n.DB._memo={};n.UI.org=false;n.UI.stack=[{v:'home',p:{}},{v:'tee',p:{rid:r.id}}];n.render();});
 await enter();await tile(0).click();const label=await tile(0).getAttribute('aria-label');await p.reload();await p.waitForFunction(()=>window.__ncgs?.D.round('fx-wp2'));await enter();
 check('reopening the app retains the selected preview without adding it twice',await tile(0).getAttribute('aria-checked')==='true'&&await tile(0).getAttribute('aria-label')===label);
 check('no script errors',errors.length===0);
}catch(e){console.error(e);ok=false;}finally{await b.close();}console.log(ok?'all passed':'SOME FAILED');process.exit(ok?0:1);})();
