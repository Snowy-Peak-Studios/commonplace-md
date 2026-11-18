import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://127.0.0.1:8765/';const OUT=process.argv[2];fs.mkdirSync(OUT,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();await page.setBypassServiceWorker(true);const errors=[],remote=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().startsWith('https://api.github.com'))remote.push(r.url());});
await page.setRequestInterception(true);
page.on('request',async request=>{
 if(request.url()===BASE+'src/local.js'){
  const original=fs.readFileSync(new URL('../../src/local.js',import.meta.url),'utf8');
  const fixture='\nconst originalCaptureWrite=LocalSource.prototype.writeBytes; LocalSource.prototype.writeBytes=async function(...args){if(globalThis.__captureFail)throw new Error("Fixture upload failed");if(globalThis.__captureDelay)await new Promise(resolve=>{globalThis.__captureRelease=resolve});return originalCaptureWrite.apply(this,args)};';
  return request.respond({status:200,contentType:'text/javascript',body:original+fixture});
 }
 return request.continue();
});
const field='.newtasks .newtasks-add textarea';
const fill=async text=>page.$eval(field,(el,text)=>{el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));},text);
const submit=()=>page.$eval('.newtasks .newtasks-add',e=>e.requestSubmit());
const paste=async(image=true)=>page.$eval(field,async(el,image)=>{
 let file;
 if(image){const canvas=document.createElement('canvas');canvas.width=240;canvas.height=110;const c=canvas.getContext('2d');c.fillStyle='#edf2ff';c.fillRect(0,0,240,110);c.fillStyle='#243668';c.font='18px sans-serif';c.fillText('An example bug report',16,50);const blob=await new Promise(r=>canvas.toBlob(r));file=new File([blob],'paste.png',{type:'image/png'});}
 else file=new File(['A captured log\n'],'repro-log.txt',{type:'text/plain'});
 const transfer=new DataTransfer();transfer.items.add(file);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,bubbles:true,cancelable:true}));
},image);
const uploaded=()=>page.waitForFunction(()=>{const f=document.querySelector('.newtasks-add textarea');return f&&!f.disabled&&f.value.includes('[[')});
const save=async()=>{await page.click('#save-btn');await page.waitForFunction(()=>document.querySelector('#save-btn').disabled);};
try{
 await page.setViewport({width:1280,height:950});await page.goto(BASE,{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{
  localStorage.clear();const {LocalSource}=await import('./src/local.js');const source=new LocalSource();
  const repo={id:'attachments',label:'Capture attachments',local:'browser',home:'Inbox.md',inbox:'Inbox.md',inboxes:'',notes:'Notes',attachments:'Attachments',vault:false};
  const text='# Inbox\n\n```new-tasks\nowner: Ann Example\n- Existing thought\n```\n\n```new-tasks\nowner: Ben Example\n- Other thought\n```\n';
  await source.create(repo,{seed:[{path:'Inbox.md',bytes:new TextEncoder().encode(text)},{path:'Other.md',bytes:new TextEncoder().encode('# Other\n')}]});localStorage.setItem('commonplace:repos',JSON.stringify([repo]));
 });
 await page.goto(BASE+'#/attachments/Inbox.md',{waitUntil:'networkidle0'});await page.reload({waitUntil:'networkidle0'});await page.waitForSelector(field);
 await fill('- Reproduce the issue\n- Another idea');await page.$eval(field,e=>e.setSelectionRange(3,3));await paste();await uploaded();
 const draft=await page.$eval(field,e=>e.value);assert.match(draft.split('\n')[0],/!\[\[/);assert.equal(draft.split('\n')[1],'- Another idea');
 await page.waitForFunction(()=>document.querySelector('.newtasks-attachments img')?.naturalWidth>0);await submit();await save();
 await page.waitForFunction(()=>document.querySelector('.newtasks-text img')?.naturalWidth>0);
 assert.equal(await page.$$eval('.newtasks',els=>els[1].querySelector('[data-item]').dataset.item),'Other thought');
 console.log('PASS pasted image: current line only, live preview, saved Markdown and neighbouring block preserved');
 // A real file chooser exercises the same picker used on desktop and phone.
 await page.$eval('.newtasks',e=>e.querySelectorAll('.newtasks-tools button[aria-label="Change this task"]')[1].click());
 await page.$eval(field,e=>e.setSelectionRange(e.value.length,e.value.length));
 fs.writeFileSync(OUT+'/details.txt','Steps and diagnostic details\n');
 const [chooser]=await Promise.all([page.waitForFileChooser(),page.$eval('.newtasks-actions',e=>[...e.querySelectorAll('button')].find(b=>b.textContent==='Attach file').click())]);
 await chooser.accept([OUT+'/details.txt']);await page.waitForFunction(()=>document.querySelector('.newtasks-add textarea').value.includes('details.txt'));
 assert.equal(await page.$eval('.newtasks-attachments a',e=>e.textContent),'details.txt');await submit();await save();
 console.log('PASS file picker: non-image file has a readable link on the edited item');
 await fill('Keep this draft on failure');await page.evaluate(()=>globalThis.__captureFail=true);await paste(false);
 await page.waitForSelector('.newtasks-add [role=alert]');assert.equal(await page.$eval(field,e=>e.value),'Keep this draft on failure');
 await page.evaluate(()=>{globalThis.__captureFail=false;globalThis.__captureDelay=true;});
 await page.$eval('.newtasks-actions',e=>[...e.querySelectorAll('button')].find(b=>b.textContent==='Retry attachment').click());
 await page.waitForFunction(()=>!!globalThis.__captureRelease);assert(await page.$eval(field,e=>e.disabled));assert(await page.$eval('#save-btn',e=>e.disabled));
 await page.evaluate(()=>{location.hash='#/attachments/Other.md';});await page.waitForFunction(()=>location.hash.endsWith('/Inbox.md'));
 await page.evaluate(()=>{globalThis.__captureDelay=false;globalThis.__captureRelease();});await uploaded();assert.match(await page.$eval(field,e=>e.value),/^Keep this draft on failure \[\[/);
 assert.equal(await page.$eval('.newtasks-add [role=status]',e=>e.textContent),'');await submit();await save();
 console.log('PASS failure preserves text; retry retains the file; pending upload blocks Save/navigation and keeps the intended item');
 for(const [width,scheme]of [[1280,'light'],[1280,'dark'],[390,'light'],[390,'dark']]){
  await page.setViewport({width,height:950});await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);if(width<861){await page.$eval('#side-close',e=>e.click());await page.waitForFunction(()=>document.querySelector('#side').getBoundingClientRect().right<=1);}
  await page.$eval('.newtasks',e=>e.scrollIntoView({block:'center'}));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${OUT}/${width}-${scheme}.png`});
 }
 // Simulate the agent carrying the capture into a task and clearing only its original line.
 const moved=await page.evaluate(async()=>{
  const {LocalSource}=await import('./src/local.js');const source=new LocalSource();const repo=JSON.parse(localStorage.getItem('commonplace:repos'))[0];
  const inbox=await source.readText(repo,'Inbox.md');const line=inbox.text.split('\n').find(s=>s.startsWith('- Reproduce the issue'));
  await source.writeText(repo,'Tasks/Issue.md','# Issue\n\n'+line+'\n',null,'fixture move');await source.writeText(repo,'Inbox.md',inbox.text.replace(line+'\n',''),inbox.sha,'fixture clear');return line;
 });
 assert.match(moved,/paste-.*png/);assert.match(moved,/details-.*txt/);
 await page.goto(BASE+'#/attachments/Tasks/Issue.md');await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>document.querySelector('.note-body img')?.naturalWidth>0);
 assert.equal(await page.$eval('.note-body a.wikilink',e=>e.textContent),'details.txt');assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 console.log('PASS moving the capture into a task and clearing its inbox line keeps the image and file links working; four layouts and no GitHub calls');
}catch(e){await page.screenshot({path:OUT+'/failure.png'});throw e;}finally{await browser.close();}
