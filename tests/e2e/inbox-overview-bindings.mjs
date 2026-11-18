import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const BASE=process.env.BASE||'http://127.0.0.1:8765/',OUT=process.argv[2];if(!OUT)throw Error('Pass an output directory');fs.mkdirSync(OUT,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--no-default-browser-check']});
const page=await browser.newPage();await page.setBypassServiceWorker(true);const errors=[],requests=[],writes=[];let delay=false,gate,release,denyBeta=false;
const sha=t=>createHash('sha1').update(`blob ${Buffer.byteLength(t)}\0${t}`).digest('hex');
const task=owner=>`---\nid: N-1\nstatus: Testing\nreviewer: ${owner}\n---\n# Review\n`;
const docs=owner=>({'Wiki/Inbox.md':`---\nowner: ${owner}\n---\n# Inbox\n`,'Wiki/Tasks/Review.md':task(owner)});
const json=(body,status=200)=>({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
page.on('request',async r=>{try{
 const u=new URL(r.url());if(u.origin===new URL(BASE).origin&&u.pathname.endsWith('/src/local.js'))return r.respond({status:200,contentType:'text/javascript',body:fs.readFileSync(new URL('../../src/local.js',import.meta.url),'utf8')+'\nfor (const method of ["readText","writeText"]) { const original=LocalSource.prototype[method]; LocalSource.prototype[method]=function(r,...args){ (globalThis.__reads ||= []).push([method,r.id,args[0]]); return original.call(this,r,...args); }; }'});
 if(u.origin!=='https://api.github.com')return r.continue();
 if(r.method()==='OPTIONS')return r.respond({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type,Accept,X-GitHub-Api-Version'}});
 const b=r.postData()?JSON.parse(r.postData()):{},owner=u.pathname==='/graphql'?b.variables?.owner:u.pathname.split('/')[2];requests.push({path:u.pathname,owner,auth:r.headers().authorization});
 if(!['GET','OPTIONS'].includes(r.method())&&u.pathname!=='/graphql'){writes.push(u.pathname);return r.respond(json({message:'Writes blocked'},403));}
 if(u.pathname==='/user')return r.respond(json({login:'robin-example',avatar_url:''}));
 if(u.pathname==='/user/repos')return r.respond(json([]));
 if(denyBeta&&owner==='beta-example')return r.respond(json({message:'Access denied'},403));
 if(delay&&owner==='alpha-example'){gate ||= new Promise(resolve=>{release=resolve;});await gate;delay=false;gate=null;}
 const notes=docs(owner==='beta-example'?'Taylor Example':'Robin Example');
 if(u.pathname==='/graphql'){
  if(b.query.includes('defaultBranchRef'))return r.respond(json({data:{repository:{defaultBranchRef:{name:'main'},object:{text:'{}',oid:sha('{}')}}}}));
  const repository={};for(const m of b.query.matchAll(/(b\d+): object\(oid: "([a-f0-9]+)"\)/g)){const text=Object.values(notes).find(t=>sha(t)===m[2]);repository[m[1]]=text==null?null:{text};}return r.respond(json({data:{repository}}));
 }
 if(u.pathname.includes('/commits/'))return r.respond({status:200,contentType:'text/plain',body:'main'});
 if(u.pathname.includes('/git/trees/'))return r.respond(json({tree:Object.entries(notes).map(([path,text])=>({path,type:'blob',sha:sha(text),size:Buffer.byteLength(text)})),truncated:false}));
 if(u.pathname.includes('/contents/')){const text=notes[decodeURIComponent(u.pathname.split('/contents/')[1])];return r.respond(text==null?json({message:'Missing'},404):json({content:Buffer.from(text).toString('base64'),sha:sha(text)}));}
 if(/^\/repos\/[^/]+\/[^/]+$/.test(u.pathname))return r.respond(json({permissions:{push:false}}));
 return r.respond(json({message:'Unexpected fixture request'},404));
}catch(e){errors.push(e.message);if(!r.isInterceptResolutionHandled())await r.abort();}});
const settled=()=>page.waitForFunction(()=>document.querySelector('.inbox-overview')&&!document.querySelector('.overview-summary').textContent.includes('Reading selected sources'));
const row=label=>page.evaluateHandle(label=>[...document.querySelectorAll('.overview-source-choice')].find(e=>e.querySelector('label').textContent.startsWith(label)),label);
const action=async(label,text)=>{const e=await row(label);await e.evaluate((e,text)=>[...e.querySelectorAll('button')].find(b=>b.textContent===text).click(),text);await e.dispose();};
const field=async(label,n,value)=>{const e=await row(label);await e.evaluate((e,{n,value})=>{const input=e.querySelectorAll('.overview-source-fields input')[n];input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},{n,value});await e.dispose();};
const result=label=>page.evaluate(label=>[...document.querySelectorAll('.overview-source-choice')].find(e=>e.querySelector('label').textContent.startsWith(label)).querySelector('.overview-binding-result').textContent,label);
const waitResult=(label,text)=>page.waitForFunction(({label,text})=>[...document.querySelectorAll('.overview-source-choice')].find(e=>e.querySelector('label').textContent.startsWith(label))?.querySelector('.overview-binding-result').textContent.includes(text),{}, {label,text});
try{
 await page.setViewport({width:1280,height:900});await page.goto(BASE,{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{
  const {LocalSource}=await import('./src/local.js'),{overviewBlock}=await import('./src/inbox-overview.js');const local=new LocalSource();localStorage.clear();
  const repo=(id,label,kind='browser')=>({id,label,local:kind,owner:'',repo:'',branch:'',home:'Inbox.md',inbox:'Inbox.md',inboxes:'',notes:'Tasks'});
  const a=repo('a','Local variants'),b=repo('b','Project notes'),disabled=repo('disabled','Disabled'),locked=repo('locked','Locked','folder'),decoy=repo('decoy','Unselected'),dash={...repo('dash','Dashboard'),home:'Dashboard.md',inbox:''};
  for(const [r,owner]of [[a,'Zoë Łukasz'],[b,'Jordan Vale'],[disabled,'Disabled Owner'],[decoy,'Unselected Owner']]){
   const notes={'Inbox.md':`---\nowner: ${owner}\n---\n# Inbox\n`,'Tasks/Review.md':`---\nid: N-1\nstatus: Testing\nreviewer: ${owner}\n---\n# Review\n`,'No owner.md':'# Shared page\n','.commonplace.json':JSON.stringify(r===disabled?{modules:{inboxes:false}}:{})};
   await local.create(r,{seed:Object.entries(notes).map(([path,text])=>({path,bytes:new TextEncoder().encode(text)}))});
  }
  const remote=(id,label,owner)=>({id,label,owner,repo:'journal',branch:'main',folder:'Wiki',home:'Inbox.md',inbox:'Inbox.md',inboxes:'',notes:'Tasks'});
  const alpha=remote('alpha','Alpha team','alpha-example'),beta=remote('beta','Beta team','beta-example');
  const src=(r,person,login='')=>r.local?{kind:r.local,vault:r.id,inbox:'Inbox.md',person,login}:{kind:'github',owner:r.owner,repo:r.repo,branch:r.branch,folder:r.folder,inbox:'Inbox.md',person,login};
  const options={context:'Identity checks',show:['reviews'],limit:50,reviewStatuses:['Testing'],sources:[src(a,'Zoe Lukasz'),src(b,'Wrong Person'),src(alpha,'Wrong Name','robin-example'),src(beta,'Taylor Example','taylor-example'),src(disabled,'Disabled Owner'),src(locked,'Folder Owner')]};
  await local.create(dash,{seed:[{path:'Dashboard.md',bytes:new TextEncoder().encode('# Dashboard\n'+overviewBlock(options))}]});
  localStorage.setItem('commonplace:repos',JSON.stringify([dash,a,b,alpha,beta,disabled,locked,decoy]));localStorage.setItem('commonplace:token',JSON.stringify('fixture-alpha-token'));localStorage.setItem('commonplace:tokens',JSON.stringify({'beta-example':{token:'fixture-beta-token',login:'taylor-example'}}));localStorage.setItem('commonplace:user',JSON.stringify({login:'robin-example'}));localStorage.setItem('commonplace:discovery',JSON.stringify({at:Date.now()}));localStorage.setItem('commonplace:inboxOverview',JSON.stringify({version:1,enabled:true,repo:'dash',path:'Dashboard.md'}));
 });
 await page.goto(BASE+'#/dash/Dashboard.md',{waitUntil:'networkidle0'});await page.reload({waitUntil:'networkidle0'});await settled();
 const text=await page.$eval('.inbox-overview',e=>e.textContent);for(const value of ['Wrong Person','Jordan Vale','Wrong Name','Robin Example','Inbox.md','Check inbox'])assert(text.includes(value));assert.equal(await page.$$eval('.overview-kind[aria-label="For review"] li',x=>x.length),2);console.log('PASS accent variants work and true mismatches expose exact selected/declared names and path');
 await page.goto(BASE+'#/settings',{waitUntil:'networkidle0'});await page.click('.overview-setting button');await page.waitForSelector('.overview-source-choice');await page.evaluate(()=>{globalThis.__reads=[];});requests.length=0;
 assert.equal(requests.length,0);assert(!await page.evaluate(()=>globalThis.__reads.some(r=>r[1]!=='dash')));console.log('PASS opening setup does not read source inboxes');
 await field('Project notes',0,'Jordan');await action('Project notes','Check inbox');await waitResult('Project notes','Inbox owner: Jordan Vale');
 let e=await row('Project notes');assert.equal(await e.evaluate(e=>e.querySelector('.overview-source-fields input').value),'Jordan');await e.dispose();
 await action('Project notes','Use this inbox owner');e=await row('Project notes');assert.equal(await e.evaluate(e=>e.querySelector('.overview-source-fields input').value),'Jordan Vale');await e.dispose();console.log('PASS explicit local/no-token check reads only the chosen inbox and copies owner only on request');
 await field('Local variants',2,'No owner.md');await action('Local variants','Check inbox');await waitResult('Local variants','No single owner name');await field('Local variants',2,'Inbox.md');assert.equal(await result('Local variants'),'');console.log('PASS absent owner is actionable and changing a path invalidates checked identity');
 await action('Alpha team','Check inbox');await waitResult('Alpha team','Inbox owner: Robin Example');await action('Alpha team','Use this inbox owner');
 await action('Beta team','Check inbox');await waitResult('Beta team','Inbox owner: Taylor Example');assert(requests.filter(r=>r.owner==='alpha-example').every(r=>r.auth==='Bearer fixture-alpha-token'));assert(requests.filter(r=>r.owner==='beta-example').every(r=>r.auth==='Bearer fixture-beta-token'));console.log('PASS remote identity checks use each source owner credential and no write permission');
 denyBeta=true;await action('Beta team','Check inbox');await waitResult('Beta team','Access denied');denyBeta=false;
 await action('Disabled','Check inbox');await waitResult('Disabled','module turned off');await action('Locked','Check inbox');await waitResult('Locked','allow its folder');assert(!await page.evaluate(()=>globalThis.__reads.some(r=>r[1]==='disabled'&&r[2]==='Inbox.md')));assert(!await page.evaluate(()=>globalThis.__reads.some(r=>r[1]==='decoy')));console.log('PASS rejected access, disabled sources, locked folders and unselected sources remain isolated');
 delay=true;const before=requests.filter(r=>r.owner==='alpha-example'&&r.path.includes('/contents/')).length;await action('Alpha team','Check inbox');while(!release)await new Promise(r=>setTimeout(r,10));e=await row('Alpha team');await e.evaluate(e=>{const c=e.querySelector('input[type=checkbox]');c.checked=false;c.dispatchEvent(new Event('change'));});release();await page.waitForNetworkIdle({idleTime:500});assert.equal(requests.filter(r=>r.owner==='alpha-example'&&r.path.includes('/contents/')).length,before);assert.equal(await result('Alpha team'),'');await e.evaluate(e=>{const c=e.querySelector('input[type=checkbox]');c.checked=true;c.dispatchEvent(new Event('change'));});await e.dispose();console.log('PASS source exclusion during metadata read prevents further inbox reads and late identity results');
 await action('Project notes','Check inbox');await waitResult('Project notes','Inbox owner: Jordan Vale');
 for(const [name,width,scheme]of [['desktop-light',1280,'light'],['desktop-dark',1280,'dark'],['phone-dark',390,'dark'],['phone-light',390,'light']]){await page.setViewport({width,height:840});await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);e=await row('Project notes');await e.evaluate(e=>e.querySelector('.overview-binding-actions').scrollIntoView({block:'center'}));await e.dispose();await page.waitForNetworkIdle({idleTime:500});assert(await page.$eval('.modal-foot',e=>e.getBoundingClientRect().bottom<=innerHeight));await page.screenshot({path:OUT+'/'+name+'.png'});}
 await page.evaluate(()=>[...document.querySelectorAll('.modal-foot button')].find(b=>b.textContent==='Save and open overview').click());await page.waitForFunction(()=>!document.querySelector('dialog'));await settled();assert.equal(await page.$$eval('.overview-kind[aria-label="For review"] li',x=>x.length),4);assert.equal(writes.length,0);assert(!await page.evaluate(()=>globalThis.__reads.some(r=>r[0]==='writeText'&&r[1]!=='dash')));assert.deepEqual(errors,[]);console.log('PASS corrected bindings save privately, source rows recover, and desktop/phone/light/dark keep actions visible');
}catch(e){console.log('Errors',errors);console.log(await page.evaluate(()=>document.body.innerText));await page.screenshot({path:OUT+'/failure.png'});throw e;}finally{await browser.close();}
