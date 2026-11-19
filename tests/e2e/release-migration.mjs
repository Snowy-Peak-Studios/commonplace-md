import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://127.0.0.1:8765/';
const OUT=process.argv[2];fs.mkdirSync(OUT,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto(BASE,{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{
    localStorage.clear();
    const {LocalSource}=await import('./src/local.js');
    const repo={id:'migration',label:'Migration check',local:'browser',home:'Home.md',inbox:'',inboxes:'',notes:'Notes',vault:false};
    await new LocalSource().create(repo,{seed:[{path:'Home.md',bytes:new TextEncoder().encode('# Migration notes\n\nOriginal content.\n')}]});
    localStorage.setItem('commonplace:repos',JSON.stringify([repo]));
    localStorage.setItem('commonplace:version',JSON.stringify('dev'));
    localStorage.setItem('commonplace:draft:migration:Other.md',JSON.stringify({text:'Keep this draft'}));
    sessionStorage.setItem('commonplace:to-dev','1');
    await caches.open('current-release /');await caches.open('old-preview /dev/');
  });
  await page.goto(BASE+'#/migration/Home.md',{waitUntil:'networkidle0'});
  await page.reload({waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.querySelector('.note-body h1')?.textContent==='Migration notes');
  assert.equal(new URL(page.url()).pathname,new URL(BASE).pathname);
  assert(await page.evaluate(()=>localStorage.getItem('commonplace:version')===null&&sessionStorage.getItem('commonplace:to-dev')===null));
  await page.goto(BASE+'#/settings',{waitUntil:'networkidle0'});
  assert.equal(await page.$('[aria-label="App version"]'),null);
  console.log('PASS old saved dev preference opens the release without redirecting; Settings no longer offers public development');
  await page.goto(BASE+'dev/#/migration/Home.md',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>location.pathname==='/'&&location.hash==='#/migration/Home.md');
  await page.waitForFunction(async()=>!(await caches.keys()).includes('old-preview /dev/'));
  assert(await page.evaluate(async()=>{
    const keys=await caches.keys();
    return keys.includes('current-release /')&&JSON.parse(localStorage.getItem('commonplace:draft:migration:Other.md')).text==='Keep this draft'&&JSON.parse(localStorage.getItem('commonplace:repos'))[0].id==='migration';
  }));
  await page.waitForFunction(()=>document.querySelector('.note-body h1')?.textContent==='Migration notes');
  assert.match(await page.$eval('.note-body',el=>el.textContent),/Original content/);
  const registrations=await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).map(r=>new URL(r.scope).pathname));
  assert(!registrations.includes('/dev/'));
  await page.screenshot({path:OUT+'/returned-to-release.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS legacy dev link keeps the note hash; only preview cache/worker retire, while release cache, vault data, repos and drafts survive');
} finally {await browser.close();}
