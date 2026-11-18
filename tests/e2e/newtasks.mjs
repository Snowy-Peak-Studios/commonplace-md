import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://127.0.0.1:8765/';
const OUT=process.argv[2];fs.mkdirSync(OUT,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();await page.setBypassServiceWorker(true);const errors=[],remote=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().startsWith('https://api.github.com'))remote.push(r.url());});
const field='.newtasks:first-of-type .newtasks-add textarea';
const fill=async(selector,text)=>page.$eval(selector,(el,text)=>{el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));},text);
const submit=()=>page.$eval('.newtasks .newtasks-add',e=>e.requestSubmit());
const items=()=>page.$$eval('.newtasks .newtasks-list',els=>els.map(e=>[...e.querySelectorAll('li[data-item]')].map(li=>li.dataset.item)));
try{
 await page.goto(BASE,{waitUntil:'networkidle0'});
 await page.evaluate(async()=>{
  localStorage.clear();const {LocalSource}=await import('./src/local.js');const source=new LocalSource();
  const repo={id:'captures',label:'Capture check',local:'browser',home:'Inbox.md',inbox:'Inbox.md',inboxes:'',notes:'Notes',vault:false};
  const text='# Inbox\n\n```new-tasks\nowner: Ann Example\n- Existing thought\n```\n\n## Other person\n\n```new-tasks\nowner: Ben Example\n- Other thought\n```\n';
  await source.create(repo,{seed:[{path:'Inbox.md',bytes:new TextEncoder().encode(text)}]});localStorage.setItem('commonplace:repos',JSON.stringify([repo]));
 });
 await page.goto(BASE+'#/captures/Inbox.md',{waitUntil:'networkidle0'});await page.reload({waitUntil:'networkidle0'});await page.waitForSelector(field);
 await fill(field,'- First new idea\n- Second new idea');await page.focus(field);await page.keyboard.press('Enter');
 assert((await page.$eval(field,e=>e.value)).endsWith('\n'),'Enter keeps a line break');await submit();
 assert.deepEqual(await items(),[['Existing thought','First new idea','Second new idea'],['Other thought']]);
 assert(await page.$eval('#save-btn',e=>!e.disabled));assert(await page.$eval(field,e=>e===document.activeElement));
 await page.$eval('.newtasks .newtasks-tools button[aria-label="Change this task"]',e=>e.click());
 await fill(field,'A longer edited idea that wraps on the phone\nAnother idea');await submit();
 assert.deepEqual((await items())[0],['A longer edited idea that wraps on the phone','Another idea','First new idea','Second new idea']);
 await page.$eval('.newtasks .newtasks-actions',e=>[...e.querySelectorAll('button')].find(b=>b.textContent==='Edit list').click());
 await fill(field,'- Kept and revised\n- New final idea');await submit();
 assert.deepEqual(await items(),[['Kept and revised','New final idea'],['Other thought']]);
 await page.click('#save-btn');await page.waitForFunction(()=>document.querySelector('#save-btn').disabled);
 const saved=await page.evaluate(async()=>{const {LocalSource}=await import('./src/local.js');return (await new LocalSource().readText(JSON.parse(localStorage.getItem('commonplace:repos'))[0],'Inbox.md')).text;});
 assert.match(saved,/owner: Ann Example\n- Kept and revised\n- New final idea\n```/);assert.match(saved,/owner: Ben Example\n- Other thought/);
 console.log('PASS multiline add, Enter, single-item replacement, bulk editing/deletion, owner and second-block preservation, Save');
 await fill(field,'Unapplied draft survives preview rebuild');
 await page.click('#mode button:nth-child(2)');await page.click('#mode button:first-child');
 assert.equal(await page.$eval(field,e=>e.value),'Unapplied draft survives preview rebuild');
 await fill(field,'A longer idea written on a phone can be read without moving sideways.\n- Another bullet');
 for(const [width,scheme]of [[1280,'light'],[1280,'dark'],[390,'light'],[390,'dark']]){
  await page.setViewport({width,height:900});await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);if(width<861){await page.$eval('#side-close',e=>e.click());await page.waitForFunction(()=>document.querySelector('#side').getBoundingClientRect().right<=1);}await page.$eval('.newtasks',e=>e.scrollIntoView({block:'center'}));
  assert(await page.$eval(field,e=>e.scrollWidth<=e.clientWidth+1));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${OUT}/${width}-${scheme}.png`});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log('PASS draft survives preview rebuild; desktop/phone light/dark wrap without overflow; no page errors or GitHub calls');
}catch(e){await page.screenshot({path:OUT+'/failure.png'});throw e;}finally{await browser.close();}
