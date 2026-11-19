// Local fixtures only. Native printing is intercepted; actual PDF output uses Chrome's print renderer.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import assert from "node:assert/strict";
const BASE=process.env.BASE||"http://127.0.0.1:8793/",OUT=process.argv[2];
if(!OUT)throw Error("Pass an output folder");fs.mkdirSync(OUT,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true,args:["--no-first-run","--no-default-browser-check"]});
const page=await browser.newPage(),errors=[],requests=[];
page.on("dialog",dialog=>dialog.accept());
page.on("pageerror",e=>errors.push(e.message));await page.setBypassServiceWorker(true);
await page.setRequestInterception(true);page.on("request",r=>{if(r.url().startsWith(BASE)||r.url().startsWith("blob:")||r.url().startsWith("data:"))return r.continue();requests.push(r.url());return r.abort();});
await page.evaluateOnNewDocument(()=>{window.__prints=0;window.print=()=>{window.__prints++;};});
const docs={
 "Print.md":"# Print sample\n\n> [!tip] Keep this callout\n> Its content stays visible on paper.\n\n<details><summary>Closed section</summary>\n\nFOLDED DETAIL CONTENT\n\n</details>\n\n- Parent item\n  - FOLDED LIST CONTENT\n\n```mermaid\nflowchart LR\n  A[Write] --> B[Share]\n```\n\n![[Embedded]]\n\n![[mark.svg]]\n\n| Item | Amount |\n| --- | --- |\n"+Array.from({length:65},(_,i)=>`| Row ${i+1} | ${i+1} |`).join("\n")+"\n\nEND OF PRINT SAMPLE\n",
 "Embedded.md":"# Embedded note\n\nEMBEDDED CONTENT\n",
 "mark.svg":'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="45"><rect width="120" height="45" fill="#ddd"/><text x="10" y="28" fill="#111">Example image</text></svg>',
 "Tasks/Example.md":"---\nstatus: In Progress\npriority: High\nassignee: Example Reader\narea: Setup\n---\n# Example task\n\n```description\nA task to print.\n```\n\n```acceptance-criteria\n- [x] Completed check\n- [ ] Remaining check\n```\n\n```comments\nA saved comment.\n```\n\n```work-history\nSAVED HISTORY CONTENT\n```\n",
 "Broken image.md":"# Broken image\n\n![A broken picture](data:image/png;base64,AAAA)\n\nAFTER THE BROKEN IMAGE\n",
 "Data.csv":"Name,Value\nOne,1\n",
};
const go=async path=>{await page.goto(BASE+'#/print-local/'+path.split('/').map(encodeURIComponent).join('/'),{waitUntil:'networkidle0'});await page.reload({waitUntil:'networkidle0'});};
const exportPage=async()=>{await page.click('#more > summary');await page.click('#export-pdf-btn');await page.waitForFunction(()=>window.__prints>0&&document.getElementById('print-note'));};
try{
 await page.setViewport({width:1280,height:900});await page.goto(BASE,{waitUntil:'networkidle0'});
 await page.evaluate(async docs=>{const {LocalSource}=await import('./src/local.js');localStorage.clear();const repo={id:'print-local',label:'Print example',local:'browser',home:'Print.md',notes:'Tasks',folder:'',owner:'',repo:'',branch:''};const source=new LocalSource();await source.create(repo,{seed:Object.entries(docs).map(([path,text])=>({path,bytes:new TextEncoder().encode(text)}))});localStorage.setItem('commonplace:repos',JSON.stringify([repo]));localStorage.setItem('commonplace:discovery',JSON.stringify({at:Date.now()}));},docs);
 for(const [width,scheme] of [[1280,'light'],[1280,'dark'],[390,'light'],[390,'dark']]){
  await page.setViewport({width,height:900});await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);await page.emulateMediaType('screen');
  await go('Print.md');await page.waitForSelector('.mermaid-diagram.drawn');
  if(width<700)await page.evaluate(()=>document.getElementById('side-close')?.click());
  await page.$eval('.note-body li.has-fold > .fold',e=>e.click());
  await exportPage();
  const snapshot=await page.$eval('#print-note',e=>({details:[...e.querySelectorAll('details')].every(d=>d.open),folded:e.querySelectorAll('.folded').length,buttons:e.querySelectorAll('button,form').length,text:e.textContent,diagram:!!e.querySelector('.mermaid-diagram svg'),image:e.querySelector('img')?.complete}));
  assert(snapshot.details&&snapshot.folded===0&&snapshot.buttons===0&&snapshot.diagram&&snapshot.image,JSON.stringify({...snapshot,text:undefined}));assert(snapshot.text.includes('EMBEDDED CONTENT'));assert(snapshot.text.includes('END OF PRINT SAMPLE'));
  assert.equal(await page.$eval('.doc .note-body details',e=>e.open),false);assert(await page.$('.doc .note-body li.folded'));
  await page.emulateMediaType('print');
  assert.equal(await page.$eval('body',e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');assert.equal(await page.$eval('.bar',e=>e.getClientRects().length),0);
  await page.screenshot({path:`${OUT}/print-${width}-${scheme}.png`});
  await page.pdf({path:`${OUT}/print-${width}-${scheme}.pdf`,format:'A4',printBackground:true});
  await page.evaluate(()=>dispatchEvent(new Event('afterprint')));assert.equal(await page.$('#print-note'),null);
  console.log('PASS print copy, folds, embeds, diagram, image, multipage table, light output, controls and cleanup: '+width+' '+scheme);
 }
 await page.emulateMediaType('screen');await go('Print.md');await page.waitForSelector('.mermaid-diagram.drawn');await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));assert(await page.$('#print-note'));assert(await page.$('#print-note svg[id^="print-"]'));await page.emulateMediaType('print');await page.pdf({path:OUT+'/native-print.pdf',format:'A4',printBackground:true});await page.evaluate(()=>dispatchEvent(new Event('afterprint')));console.log('PASS browser/share-sheet Print also prepares an expanded isolated copy');
 await page.emulateMediaType('screen');await page.setViewport({width:1280,height:1000});await go('Tasks/Example.md');await exportPage();
 const task=await page.$eval('#print-note',e=>({text:e.textContent,fields:e.querySelectorAll('select,input,textarea').length,forms:e.querySelectorAll('form').length}));assert(task.text.includes('Example Reader')&&task.text.includes('SAVED HISTORY CONTENT')&&task.text.includes('☑')&&task.text.includes('☐'));assert.equal(task.fields,0);assert.equal(task.forms,0);
 await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 console.log('PASS task values, checked/unchecked criteria, saved comments/history and composer removal');
 await page.click('#mode button:nth-child(2)');await page.click('.editor-pane .cm-content');await page.keyboard.down('Control');await page.keyboard.press('End');await page.keyboard.up('Control');await page.keyboard.type('\nUNSAVED PRINT TEXT');await exportPage();assert((await page.$eval('#print-note',e=>e.textContent)).includes('UNSAVED PRINT TEXT'));await page.evaluate(()=>dispatchEvent(new Event('afterprint')));assert((await page.$eval('#save-btn',e=>!e.disabled)));
 console.log('PASS printing unsaved editor content does not save or discard the draft');
 await page.reload({waitUntil:'networkidle0'});await go('Broken image.md');await page.waitForSelector('.note-body img');await exportPage();assert((await page.$eval('#print-note',e=>e.textContent)).includes('AFTER THE BROKEN IMAGE'));await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 console.log('PASS a broken image does not stop the export');
 await page.reload({waitUntil:'networkidle0'});await go('Data.csv');assert.equal(await page.$eval('#export-pdf-btn',e=>e.hidden),true);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS export action hidden outside notes, no remote requests and no page errors');
}catch(e){console.log(errors);console.log(await page.evaluate(()=>[...document.querySelectorAll(".doc .preview .sk, .doc .preview img:not([src])")].map(e=>e.outerHTML.slice(0,300))));console.log(await page.evaluate(()=>document.body.innerText));await page.screenshot({path:`${OUT}/failure.png`});throw e;}
finally{await browser.close();}
