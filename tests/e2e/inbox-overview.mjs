import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const BASE=process.env.BASE||'http://127.0.0.1:8765/';
const OUT=process.argv[2];if(!OUT)throw Error('Pass a screenshot output directory.');fs.mkdirSync(OUT,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--no-default-browser-check']});
const sha=t=>createHash('sha1').update(`blob ${Buffer.byteLength(t)}\0${t}`).digest('hex');
const json=(body,status=200)=>({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
const task=label=>`---\nid: N-1\nstatus: Testing\nreviewer: Ana Lee\nassignee: Ana Lee\n---\n# ${label}\n`;
const remoteNotes=branch=>({'Wiki/Inbox.md':'---\nowner: Ana Lee\n---\n# Inbox\n','Wiki/Tasks/Review.md':task('Remote '+branch),'Other/Inbox.md':'---\nowner: Ana Lee\n---\n# Inbox\n','Other/Tasks/Review.md':task('Remote folder'),'Inbox.md':'---\nowner: Ana Lee\n---\n# Inbox\n','Tasks/Review.md':task('Beta review')});
let betaMode='ok',gammaMode='denied',delayAlpha=false,releaseAlpha,alphaGate;const requests=[],writes=[],errors=[];
const page=await browser.newPage();await page.setBypassServiceWorker(true);
page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
page.on('request',async req=>{
 try {
  const u=new URL(req.url());
  if(u.pathname.endsWith('/src/local.js')&&u.origin===new URL(BASE).origin){const body=fs.readFileSync(new URL('../../src/local.js',import.meta.url),'utf8')+'\nfor (const method of ["readText","tree","writeText","create"]) { const original=LocalSource.prototype[method]; LocalSource.prototype[method]=function(r,...args){ (globalThis.__localReads ||= []).push([method,r.id,args[0]]); return original.call(this,r,...args); }; }';return req.respond({status:200,contentType:'text/javascript',body});}
  if(u.origin!=='https://api.github.com')return req.continue();
  if(req.method()==='OPTIONS')return req.respond({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type,Accept,X-GitHub-Api-Version,If-None-Match'}});
  const body=req.postData()?JSON.parse(req.postData()):{};const owner=u.pathname==='/graphql'?body.variables?.owner:u.pathname.split('/')[2];
  requests.push({path:u.pathname,owner,auth:req.headers().authorization,body});
  if(!['GET','OPTIONS'].includes(req.method())&&u.pathname!=='/graphql'){writes.push(u.pathname);return req.respond(json({message:'No writes allowed'},403));}
  if(u.pathname==='/user')return req.respond(json({login:'ana-example',avatar_url:''}));
  if(u.pathname==='/user/repos')return req.respond(json([]));
  if(owner==='gamma-example'&&gammaMode==='denied')return req.respond(json({message:'Rejected'},401));
  if(owner==='beta-example'&&betaMode==='revoked')return req.respond(json({message:'Revoked'},403));
  if(owner==='beta-example'&&betaMode==='offline')return req.abort('internetdisconnected');
  if(owner==='alpha-example'&&delayAlpha){alphaGate ||= new Promise(r=>{releaseAlpha=r;});await alphaGate;delayAlpha=false;alphaGate=null;}
  const notes=owner==='shared-example'?{'Inbox.md':'# Shared\n```inbox-overview\nsources: []\n```'}:Object.fromEntries(Object.entries(remoteNotes(u.pathname.includes('draft')?'draft':'main')).filter(([p])=>owner!=='beta-example'||!p.startsWith('Wiki/')&&!p.startsWith('Other/')));
  if(u.pathname==='/graphql'){
   if(body.query.includes('defaultBranchRef'))return req.respond(json({data:{repository:{defaultBranchRef:{name:'main'},object:{text:'{}',oid:sha('{}')}}}}));
   const repository={};for(const match of body.query.matchAll(/(b\d+): object\(oid: "([a-f0-9]+)"\)/g)){const t=Object.values(notes).find(t=>sha(t)===match[2]);repository[match[1]]=t==null?null:{text:t,isBinary:false};}
   return req.respond(json({data:{repository}}));
  }
  if(/\/commits\//.test(u.pathname))return req.respond({status:200,contentType:'text/plain',body:u.pathname.endsWith('draft')?'draft':'main'});
  if(/\/git\/trees\//.test(u.pathname))return req.respond(json({tree:Object.entries(notes).map(([path,text])=>({path,type:'blob',sha:sha(text),size:Buffer.byteLength(text)})),truncated:false}));
  if(/\/contents\//.test(u.pathname)){const path=decodeURIComponent(u.pathname.split('/contents/')[1]);const t=owner==='shared-example'?notes[path]:remoteNotes(u.searchParams.get('ref'))[path];return req.respond(t==null?json({message:'Missing'},404):json({content:Buffer.from(t).toString('base64'),sha:sha(t)}));}
  if(/^\/repos\/[^/]+\/[^/]+$/.test(u.pathname))return req.respond(json({permissions:{push:false}}));
  return req.respond(json({message:'Unexpected fixture request'},404));
 }catch(e){errors.push(e.message);if(!req.isInterceptResolutionHandled())await req.abort();}
});
const go=async path=>{await page.goto(BASE+'#/'+path,{waitUntil:'networkidle0'});};
const settled=async()=>{await page.waitForFunction(()=>document.querySelector('.inbox-overview')&&!document.querySelector('.overview-summary')?.textContent.includes('Reading selected sources'),{timeout:20000});};
const refresh=async()=>{await page.click('.inbox-overview button');await settled();};
const changePrefs=async change=>page.evaluate(change=>{const key='commonplace:inboxOverview',oldValue=localStorage.getItem(key);const next={...JSON.parse(oldValue),...change};localStorage.setItem(key,JSON.stringify(next));dispatchEvent(new StorageEvent('storage',{key,oldValue,newValue:JSON.stringify(next)}));},change);
try{
 await page.setViewport({width:1280,height:1000});await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);await page.goto(BASE,{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{
  const {LocalSource}=await import('./src/local.js');const {overviewBlock}=await import('./src/inbox-overview.js');
  localStorage.clear();const local=new LocalSource();
  const r=(id,label=id,kind='browser')=>({id,label,local:kind,home:'Inbox.md',inbox:'Inbox.md',inboxes:'',notes:'Tasks',vault:false});
  const one=r('local-one','Local notes'),two=r('local-two','Family notes'),disabled=r('disabled'),unselected=r('unselected'),locked=r('locked','Folder notes','folder');
  const dashboard={...r('dashboard','All inboxes'),home:'Dashboard.md',inbox:''};
  const remote=(id,owner,branch='main',folder='Wiki')=>({id,label:'Team notes',owner,repo:'journal',branch,folder,home:'Inbox.md',inbox:'Inbox.md',inboxes:'',notes:'Tasks'});
  const alpha=remote('alpha-main','alpha-example'),draft=remote('alpha-draft','alpha-example','draft'),folder=remote('alpha-folder','alpha-example','main','Other'),beta=remote('beta','beta-example','main',''),gamma=remote('gamma','gamma-example');
  const capture='---\nowner: Ana Lee\n---\n# Inbox\n\n```new-tasks\nowner: Ana Lee\nRepeated idea\nRepeated idea\n```\n';
  const task='---\nid: N-1\nstatus: Testing\nreviewer: Ana Lee\nassignee: Ana Lee\n---\n# Local review\n';
  for(const repo of [one,two,disabled,unselected])await local.create(repo,{seed:Object.entries({'Inbox.md':capture,'Tasks/Review.md':task,'.commonplace.json':JSON.stringify(repo===disabled?{modules:{inboxes:false}}:{})}).map(([path,text])=>({path,bytes:new TextEncoder().encode(text)}))});
  const source=repo=>repo.local?{kind:repo.local,vault:repo.id,inbox:'Inbox.md',person:'Ana Lee',login:''}:{kind:'github',owner:repo.owner,repo:repo.repo,branch:repo.branch,folder:repo.folder,inbox:'Inbox.md',person:'Ana Lee',login:repo===beta?'bob-example':'ana-example'};
  const options={context:'My selected inboxes',show:['reviews','questions','assignments','mentions','new-tasks'],limit:50,reviewStatuses:['Testing'],sources:[one,two,alpha,draft,folder,beta,gamma,disabled,locked].map(source).concat([{kind:'browser',vault:'missing-device-binding',inbox:'Inbox.md',person:'Ana Lee',login:''}])};
  await local.create(dashboard,{seed:[{path:'Dashboard.md',bytes:new TextEncoder().encode('# All inboxes\n\n'+overviewBlock(options))}]});
  await local.writeText(one,'Shared-example.md','# Shared example\n'+overviewBlock(options),null,'fixture');
  const shared=remote('shared','shared-example','main','');
  localStorage.setItem('commonplace:repos',JSON.stringify([dashboard,one,two,alpha,draft,folder,beta,gamma,disabled,locked,unselected,shared]));
  localStorage.setItem('commonplace:token',JSON.stringify('fixture-main-token'));localStorage.setItem('commonplace:tokens',JSON.stringify({'beta-example':{token:'fixture-beta-token',login:'bob-example'}}));localStorage.setItem('commonplace:user',JSON.stringify({login:'ana-example'}));localStorage.setItem('commonplace:discovery',JSON.stringify({at:Date.now(),seen:{}}));
  localStorage.setItem('commonplace:inboxOverview',JSON.stringify({version:1,enabled:false,repo:'dashboard',path:'Dashboard.md'}));
 });
 await page.reload({waitUntil:'networkidle0'});requests.length=0;await go('dashboard/Dashboard.md');
 assert.match(await page.$eval('.inbox-overview-block',e=>e.textContent),/off/);assert.equal(requests.filter(r=>r.owner&&r.owner!=='shared-example').length,0);
 assert(!await page.evaluate(()=>globalThis.__localReads?.some(r=>['local-one','local-two','unselected'].includes(r[1]))));
 console.log('PASS off switch: no selected-source reads');
 await changePrefs({enabled:true});await settled();
 const initial=await page.evaluate(()=>({rows:document.querySelectorAll('[data-overview-key]').length,reviews:document.querySelectorAll('.overview-kind[aria-label="For review"] li').length,keys:[...document.querySelectorAll('[data-overview-key]')].map(e=>e.dataset.overviewKey),text:document.querySelector('.inbox-overview').textContent,hrefs:[...document.querySelectorAll('.overview-kind a')].map(e=>e.getAttribute('href')),reads:globalThis.__localReads}));
 assert.equal(initial.reviews,6);assert.equal(initial.rows,10);assert.equal(new Set(initial.keys).size,10);assert(initial.text.includes('Access needed'));assert(initial.text.includes('Folder permission needed'));assert(initial.text.includes('Inboxes disabled'));assert(initial.text.includes('Setup needed'));assert(!initial.reads.some(r=>r[1]==='unselected'));assert(!initial.reads.some(r=>r[1]==='disabled'&&r[2]!=='\.commonplace.json'));assert(initial.hrefs.some(x=>x.includes('alpha-draft')));assert(initial.hrefs.some(x=>x.includes('alpha-folder')));
 assert(requests.filter(r=>r.owner==='beta-example').every(r=>r.auth==='Bearer fixture-beta-token'));assert(requests.filter(r=>r.owner==='alpha-example').every(r=>r.auth==='Bearer fixture-main-token'));assert.equal(writes.length,0);
 console.log('PASS multiple owners, per-owner credentials, read-only remote access, exact branch/folder identity, repeated IDs/captures, disabled/locked/missing/revoked isolation');
 await page.waitForNetworkIdle({idleTime:500});await settled();await page.screenshot({path:OUT+'/desktop-light.png',fullPage:true});await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await page.screenshot({path:OUT+'/desktop-dark.png',fullPage:true});
 await page.setViewport({width:390,height:844});await page.waitForNetworkIdle({idleTime:500});if(await page.evaluate(()=>document.body.classList.contains('side-open')))await page.click('#side-close');await page.waitForFunction(()=>document.querySelector('#side').getBoundingClientRect().right<=1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:OUT+'/phone-dark.png',fullPage:true});await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);await page.screenshot({path:OUT+'/phone-light.png',fullPage:true});await page.setViewport({width:1280,height:1000});await page.waitForNetworkIdle({idleTime:500});
 betaMode='offline';await refresh();assert((await page.$eval('.inbox-overview',e=>e.textContent)).includes('Stale'));assert.equal(await page.$$eval('.overview-kind[aria-label="For review"] li',x=>x.length),6);
 // Reuse an existing source copy even before that copy has been loaded in this session.
 await page.evaluate(async()=>{const {LocalSource,idb}=await import('./src/local.js');const {blobSha}=await import('./src/github.js');const repo=JSON.parse(localStorage.getItem('commonplace:repos')).find(r=>r.id==='beta');const notes={'Inbox.md':'---\nowner: Ana Lee\n---\n# Inbox\n','Tasks/Review.md':'---\nid: N-1\nstatus: Testing\nreviewer: Ana Lee\nassignee: Ana Lee\n---\n# Beta review\n'};await new LocalSource().create({...repo,id:'mirror:beta',local:'browser'},{seed:Object.entries(notes).map(([path,text])=>({path,bytes:new TextEncoder().encode(text)}))});const bases={};for(const [path,text]of Object.entries(notes))bases[path]=await blobSha(text);await idb('meta','readwrite',store=>store.put({bases,syncedAt:Date.now()-60000,pending:{}},'bases:mirror:beta'));});
 await page.reload({waitUntil:'networkidle0'});await settled();assert((await page.$eval('.inbox-overview',e=>e.textContent)).includes('Offline copy'));assert.equal(await page.$$eval('.overview-kind[aria-label="For review"] li',x=>x.length),6);console.log('PASS existing offline source copy and cached source settings after reload');
 betaMode='revoked';await refresh();assert.equal(await page.$$eval('.overview-kind[aria-label="For review"] li',x=>x.length),5);assert(!await page.$('.overview-kind a[href*="/beta/"]'));assert.equal(writes.length,0);
 console.log('PASS unavailable results labelled stale; rejected credentials purge prior rows');
 betaMode='ok';delayAlpha=true;await page.click('.inbox-overview button');await page.waitForFunction(()=>document.querySelector('.overview-summary')?.textContent.includes('Reading selected sources'));while(!releaseAlpha)await new Promise(r=>setTimeout(r,10));await changePrefs({enabled:false});releaseAlpha();await page.waitForNetworkIdle({idleTime:500});assert(!await page.$('.inbox-overview'));assert.match(await page.$eval('.inbox-overview-block',e=>e.textContent),/off/);assert.equal(await page.evaluate(()=>localStorage.getItem('commonplace:inboxOverviewSourceSettings')),null);
 console.log('PASS switching off during reads invalidates late results and clears the overview');
 requests.length=0;await changePrefs({enabled:true,repo:'local-one',path:'Shared-example.md'});await go('local-two/Inbox.md');requests.length=0;await go('local-one/Shared-example.md');await settled();
 // The selected host cannot aggregate itself; a second note with identical source options cannot run when not selected.
 assert((await page.$eval('.inbox-overview',e=>e.textContent)).includes('Keep the dashboard separate'));
 await changePrefs({repo:'dashboard',path:'Dashboard.md'});assert.match(await page.$eval('.inbox-overview-block',e=>e.textContent),/not the private dashboard/);
 console.log('PASS exact host binding and dashboard/source separation');
 await go('dashboard/Dashboard.md');await settled();await page.focus('.overview-kind a[href*="local-two"]');await page.keyboard.press('Enter');await page.waitForFunction(()=>location.hash.includes('/local-two/Tasks/Review.md'));await page.waitForSelector('#tf-status');assert.equal(await page.$eval('#tf-status',e=>e.value),'Testing');
 console.log('PASS keyboard source navigation');
 await go('settings');await page.waitForSelector('.overview-setting');await page.click('.overview-setting button');await page.waitForSelector('.overview-source-choice');assert(await page.$eval('.modal',e=>e.textContent.includes('row limit limits display')));await page.screenshot({path:OUT+'/setup-desktop.png',fullPage:true});
 const labels=await page.$$eval('.modal button',els=>els.map(e=>e.textContent));assert(labels.some(x=>x.includes('Save and open')));
 await page.evaluate(()=>{const m=document.querySelector('.modal');const fields=m.querySelectorAll(':scope .modal-body > div > label > input');fields[0].value='Home context';fields[1].value='Private context.md';[...m.querySelectorAll('.overview-source-choice')].forEach(row=>{row.querySelector('input[type=checkbox]').checked=row.textContent.includes('Local notes');});[...m.querySelectorAll('button')].find(b=>b.textContent==='Save and open overview').click();});
 await page.waitForFunction(()=>location.hash.includes('Private%20context.md'));await settled();assert.match(await page.$eval('.inbox-overview',e=>e.textContent),/Home context/);assert.equal(await page.$$eval('.overview-kind[aria-label="For review"] li',x=>x.length),1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('commonplace:inboxOverview')).path),'Private context.md');
 // Shared hosts are refused before they can read selected sources.
 await changePrefs({repo:'shared',path:'Inbox.md'});requests.length=0;await go('shared/Inbox.md');await page.waitForSelector('.inbox-overview-block');assert.match(await page.$eval('.inbox-overview-block',e=>e.textContent),/never in a shared note/);assert(!requests.some(r=>['alpha-example','beta-example'].includes(r.owner)));console.log('PASS setup save, new context and shared-host rejection');
 assert.deepEqual(errors,[]);assert.equal(writes.length,0);console.log('PASS setup, desktop/phone, light/dark and no horizontal overflow');
 // Separate no-token browser context: local-only aggregation must never call GitHub.
 await page.evaluate(async()=>{const {LocalSource}=await import('./src/local.js');const {overviewBlock}=await import('./src/inbox-overview.js');const repos=JSON.parse(localStorage.getItem('commonplace:repos')).filter(r=>['dashboard','local-one','local-two'].includes(r.id));const dash=repos[0],local=new LocalSource();const data=await local.readText(dash,'Dashboard.md');await local.writeText(dash,'Dashboard.md','# Local inboxes\n'+overviewBlock({context:'Local only',show:['reviews'],limit:50,reviewStatuses:['Testing'],sources:repos.slice(1).map(r=>({kind:'browser',vault:r.id,inbox:'Inbox.md',person:'Ana Lee',login:''}))}),data.sha,'fixture');localStorage.setItem('commonplace:repos',JSON.stringify(repos));for(const k of ['token','tokens','user'])localStorage.removeItem('commonplace:'+k);localStorage.setItem('commonplace:inboxOverview',JSON.stringify({version:1,enabled:true,repo:'dashboard',path:'Dashboard.md'}));});
 requests.length=0;await page.goto(BASE+'#/dashboard/Dashboard.md',{waitUntil:'networkidle0'});await page.reload({waitUntil:'networkidle0'});await settled();assert.equal(await page.$$eval('.overview-kind[aria-label="For review"] li',x=>x.length),2);assert.equal(requests.length,0);console.log('PASS no-token local-only overview with zero GitHub requests');
 await changePrefs({enabled:false,repo:'',path:''});await go('settings');await page.click('.overview-setting button');await page.waitForSelector('.overview-source-choice');await page.evaluate(()=>{globalThis.__localReads=[];[...document.querySelectorAll('.modal button')].find(b=>b.textContent==='Save and open overview').click();});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('commonplace:inboxOverview')).repo.startsWith('inbox-'));await settled();assert.match(await page.$eval('.inbox-overview',e=>e.textContent),/No sources selected/);assert(!await page.evaluate(()=>globalThis.__localReads.some(r=>['local-one','local-two'].includes(r[1]))));assert.equal(requests.length,0);await go('settings');await page.waitForSelector('.overview-setting');assert(await page.$eval('.overview-setting input',e=>e.checked));console.log('PASS fresh private dashboard creation, empty sources read none, and settings reopening');
 assert.deepEqual(errors,[]);assert.equal(writes.length,0);

}catch(e){console.log('Page errors:',errors);console.log(await page.evaluate(()=>document.body.innerText));await page.screenshot({path:OUT+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
