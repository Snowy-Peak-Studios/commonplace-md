import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://127.0.0.1:8765/';
const OUT=process.argv[2];if(!OUT)throw Error('Pass a screenshot directory.');fs.mkdirSync(OUT,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--no-default-browser-check']});
const page=await browser.newPage();await page.setBypassServiceWorker(true);const errors=[],remote=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().startsWith('https://api.github.com'))remote.push(r.url());});
const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const visible=el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;};
try{
 await page.setViewport({width:1280,height:800});await page.goto(BASE,{waitUntil:'networkidle0'});
 await page.evaluate(()=>{localStorage.clear();localStorage.setItem('commonplace:repos',JSON.stringify(Array.from({length:7},(_,i)=>({id:'scroll-'+i,label:'Vault '+(i+1),local:'browser',owner:'',repo:'',branch:'',home:'',inbox:'Inbox.md',inboxes:'',notes:'Notes',template:''}))));});
 await page.goto(BASE+'#/settings',{waitUntil:'networkidle0'});await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.repo-card');
 // Normal Settings remains scrollable with all seven vault cards expanded.
 await page.evaluate(()=>document.querySelectorAll('.repo-card').forEach(d=>d.open=true));
 await page.mouse.move(850,450);await page.mouse.wheel({deltaY:1800});await page.waitForFunction(()=>document.querySelector('#main').scrollTop>1000);
 console.log('PASS main Settings scrolls with seven expanded vault cards');
 await page.evaluate(()=>document.querySelector('.overview-setting button').click());await page.waitForSelector('.overview-source-choice');
 await page.evaluate(()=>document.querySelectorAll('.overview-source-choice').forEach((row,i)=>{const c=row.querySelector('input[type=checkbox]');c.checked=true;c.dispatchEvent(new Event('change'));row.querySelector('.overview-source-fields input').value='Person '+(i+1);}));
 await page.waitForFunction(()=>document.querySelector('dialog').getAnimations().every(a=>a.playState==='finished'));
 for(const [name,width,height,scheme]of [['desktop-light',1280,800,'light'],['desktop-dark',1280,800,'dark'],['phone-dark',390,700,'dark'],['phone-light',390,700,'light'],['short-window',900,440,'light']]){
  await page.setViewport({width,height});await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);await frame();
  await page.evaluate(()=>{document.querySelector('.modal-body').scrollTop=0;});
  assert(await page.$eval('.modal-foot',visible),name+': action buttons remain in the viewport');
  assert(await page.$eval('.modal-body',e=>e.scrollHeight>e.clientHeight),name+': fields have their own bounded scroll area');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+': no horizontal page overflow');
  const before=await page.$eval('#main',e=>e.scrollTop);
  const box=await page.$eval('.modal-body',e=>{const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
  await page.mouse.move(box.x,box.y);await page.mouse.wheel({deltaY:16000});
  await page.waitForFunction(()=>{const e=document.querySelector('.modal-body');return e.scrollTop>0&&e.scrollTop+e.clientHeight>=e.scrollHeight-2;});
  assert(await page.$eval('.overview-source-choice:last-of-type .overview-source-fields label:nth-of-type(3) input',visible),name+': last source field is reachable');
  assert(await page.$eval('.modal-foot',visible),name+': footer stays visible after scrolling');
  assert.equal(await page.$eval('#main',e=>e.scrollTop),before,name+': dialog scrolling leaves the background unchanged');
  assert.equal(await page.$eval('.overview-source-choice .overview-source-fields input',e=>e.value),'Person 1',name+': entered values survive scrolling and resize');
  await page.screenshot({path:OUT+'/'+name+'.png'});
  // Keyboard focus brings the first field and final field into view without moving the footer.
  await page.focus('.modal input');await frame();assert(await page.$eval('.modal input',visible),name+': first field can be focused');
  await page.focus('.modal-foot button');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.up('Shift');await frame();
  assert(await page.evaluate(()=>document.activeElement===document.querySelectorAll('.overview-source-choice:last-of-type input')[3]),name+': Shift+Tab reaches the last source field');
  assert(await page.evaluate(()=>{const r=document.activeElement.getBoundingClientRect(),b=document.querySelector('.modal-body').getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom;}),name+': keyboard focus stays in the scroll area');
  assert(await page.$eval('.modal-foot',visible),name+': keyboard navigation keeps the footer visible');
  console.log('PASS '+name+': scrolling, bottom fields, pinned actions, keyboard, preserved values and no overflow');
 }
 await page.evaluate(()=>[...document.querySelectorAll('.modal-foot button')].find(b=>b.textContent==='Cancel').click());await page.waitForFunction(()=>!document.querySelector('dialog'));
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log('PASS cancel closes the dialog; local checks make no GitHub calls');
}catch(e){console.log('Page errors:',errors);await page.screenshot({path:OUT+'/failure.png'});throw e;}finally{await browser.close();}
