// Restoring a downloaded copy into a new local vault: a copy made by Download a copy (LocalSource.zip, what the
// button saves) goes back through the Add a vault dialog, in this browser and in a folder (the browser's own private
// file system stands in for a folder picked on the disk), then opens, saves and reloads. Bad zips are refused with
// nothing registered, and a place that already has notes is never mixed with the copy. No network call besides the
// app's own files; no token needed.
//   node restore.mjs <screenshot directory>
// Settings: BASE (the app's address), CHROME.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2] || 'restore-shots';
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'commonplace-restore-'));

let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failed++; };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setBypassServiceWorker(true);
const errors = [], offsite = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { const url = r.url(); if (!url.startsWith(BASE) && !/^(data|blob):/.test(url)) offsite.push(url); });
const until = (fn, ms = 10000, arg) => page.waitForFunction(fn, { timeout: ms }, arg).then(() => true, () => false);
const repos = () => page.evaluate(() => JSON.parse(localStorage.getItem('commonplace:repos') || '[]'));

/** Opens Add a vault on this device from Settings, with A copy you downloaded picked, and gives it `file`. */
async function openRestore(file, keep = 'browser') {
  // With no vault yet, the first page shows instead of Settings: its own Restore link opens the same dialog.
  await page.goto(`${BASE}#/settings`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => (document.querySelector('.welcome [data-choice=restore]')
    || [...document.querySelectorAll('.btn')].find((b) => b.textContent.includes('Add a vault on this device'))).click());
  await page.waitForSelector('dialog.modal input[value=copy]');
  await page.click('dialog.modal input[value=copy]');
  if (await page.$('dialog.modal input[value=create]')) await page.click('dialog.modal input[value=create]');
  const keepBox = await page.$(`dialog.modal input[value=${keep}]`);
  if (keepBox) await keepBox.click();
  const input = await page.$('dialog.modal input[type=file][accept*=zip]');
  await input.uploadFile(file);
}
const addButton = () => page.evaluateHandle(() => [...document.querySelectorAll('dialog.modal .modal-foot .btn')].find((b) => b.textContent === 'Add vault'));
const dialogText = () => page.$eval('dialog.modal', (d) => d.innerText).catch(() => '');

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  // A vault with what a copy must keep: Markdown, an empty file, an attachment, Unicode names and its settings file.
  const zipB64 = await page.evaluate(async () => {
    localStorage.clear();
    for (const d of await indexedDB.databases()) indexedDB.deleteDatabase(d.name);
    const root = await navigator.storage.getDirectory();
    for await (const [name] of root.entries()) await root.removeEntry(name, { recursive: true });
    const { LocalSource } = await import('./src/local.js');
    const local = new LocalSource();
    const enc = (t) => new TextEncoder().encode(t);
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgQIAK+Y6GQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
    const source = { id: 'local-source', local: 'browser', label: 'Source', home: 'Home.md', vault: true };
    await local.create(source, { seed: [
      { path: 'Home.md', bytes: enc('# Kitchen\n\nSee [[Łódź – plan]] and ![[pixel.png]].\n') },
      { path: 'Notes/Łódź – plan.md', bytes: enc('# Łódź – plan\n\nZażółć gęślą jaźń ✓\n') },
      { path: 'Notes/empty.md', bytes: new Uint8Array() },
      { path: 'Attachments/pixel.png', bytes: png },
      { path: '.commonplace.json', bytes: enc(JSON.stringify({ label: 'Kitchen', home: 'Home.md', notes: 'Notes', attachments: 'Attachments', vault: true })) },
    ] });
    const bytes = await local.zip(source);
    await local.remove(source);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  });
  const copy = path.join(tmp, 'Kitchen 2026-11-22.zip');
  fs.writeFileSync(copy, Buffer.from(zipB64, 'base64'));

  // 1. Into this browser.
  await openRestore(copy, 'browser');
  check(await until(() => document.querySelector('dialog.modal')?.innerText.includes('5 files')), 'the dialog says what the copy holds before anything is written');
  check(await page.$eval('dialog.modal input[aria-label=Name]', (i) => i.value) === 'Kitchen', 'the name comes from the file name, without its date');
  check((await dialogText()).includes('It becomes a new vault, Kitchen, in this browser'), 'and where it goes');
  check((await repos()).length === 0, 'nothing is registered yet');
  await page.screenshot({ path: path.join(OUT, 'restore-dialog.png') });
  await (await addButton()).click();
  check(await until(() => location.hash.startsWith('#/local-kitchen/') && !!document.querySelector('.preview .note-body h1')), 'Add vault restores it and opens its start page');
  const browserRepo = (await repos()).find((r) => r.id === 'local-kitchen');
  check(browserRepo?.local === 'browser' && browserRepo.vault === true && browserRepo.notes === 'Notes' && browserRepo.attachments === 'Attachments',
    'its settings come from its .commonplace.json: ' + JSON.stringify(browserRepo));
  check(await until(() => [...document.querySelectorAll('.preview img')].some((i) => i.naturalWidth === 1)), 'its attachment shows');
  check(await page.$eval('.preview a.wikilink', (a) => !a.classList.contains('missing')), 'and a link to its Unicode-named note leads somewhere');
  // A round trip: edit, save, reload.
  await page.evaluate(() => document.querySelectorAll('#mode button')[1].click());
  await page.waitForSelector('.editor-pane .cm-content');
  await page.evaluate(async () => {
    const { EditorView } = await import('./vendor/vendor.js');
    const view = EditorView.findFromDOM(document.querySelector('.editor-pane .cm-editor'));
    view.dispatch({ changes: { from: view.state.doc.length, insert: '\nRestored and changed.\n' } });
  });
  await page.click('#save-btn');
  check(await until(() => document.querySelector('#save-btn').textContent.includes('Saved')), 'an edit saves');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelectorAll('#mode button')[0].click());
  check(await until(() => document.querySelector('.preview')?.textContent.includes('Restored and changed.')), 'and is there after a reload');
  const back = await page.evaluate(async () => {
    const { LocalSource, readZip } = await import('./src/local.js');
    const files = await readZip(await new LocalSource().zip({ id: 'local-kitchen', local: 'browser' }));
    return Object.fromEntries(files.map((f) => [f.path, f.bytes.length]));
  });
  check(back['Notes/empty.md'] === 0 && back['Attachments/pixel.png'] === 70 && back['Notes/Łódź – plan.md'] > 0 && back['.commonplace.json'] > 0,
    'every file came back, the empty one and the image too: ' + JSON.stringify(back));

  // 2. Into a folder (the browser's private file system stands in for one picked on the disk).
  await page.evaluate(() => { window.showDirectoryPicker = async () => navigator.storage.getDirectory(); });
  await openRestore(copy, 'folder');
  const nameBox = await page.$('dialog.modal input[aria-label=Name]');
  await nameBox.click({ clickCount: 3 });
  await nameBox.type('Kitchen folder');
  await page.evaluate(() => [...document.querySelectorAll('dialog.modal .btn')].find((b) => b.textContent.includes('Pick a location')).click());
  check(await until(() => document.querySelector('dialog.modal')?.innerText.includes('in a new folder, Kitchen folder, inside')), 'in a folder, it says which new folder it makes');
  await (await addButton()).click();
  check(await until(() => location.hash.startsWith('#/local-kitchen-folder/') && !!document.querySelector('.preview .note-body h1')), 'restored into a new folder, and opened');
  const onDisk = await page.evaluate(async () => {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('Kitchen folder');
    const notes = await dir.getDirectoryHandle('Notes');
    const plan = await (await notes.getFileHandle('Łódź – plan.md')).getFile();
    const empty = await (await notes.getFileHandle('empty.md')).getFile();
    const img = await (await (await dir.getDirectoryHandle('Attachments')).getFileHandle('pixel.png')).getFile();
    return { plan: await plan.text(), empty: empty.size, img: img.size };
  });
  check(onDisk.plan.includes('Zażółć gęślą jaźń ✓') && onDisk.empty === 0 && onDisk.img === 70, 'its files are real files in the folder: ' + JSON.stringify(onDisk));

  // 3. A folder that already has notes is never mixed with the copy.
  const before = (await repos()).length;
  await openRestore(copy, 'folder');
  const nameBox2 = await page.$('dialog.modal input[aria-label=Name]');
  await nameBox2.click({ clickCount: 3 });
  await nameBox2.type('Kitchen folder');
  await page.evaluate(() => [...document.querySelectorAll('dialog.modal .btn')].find((b) => b.textContent.includes('Pick a location')).click());
  await (await addButton()).click();
  check(await until(() => document.querySelector('dialog.modal .bad')?.textContent.includes('already has a folder')), 'a folder with notes in it is refused');
  check((await repos()).length === before, 'and nothing is registered');
  await page.keyboard.press('Escape');

  // 4. Bad zips: refused before writing, with a plain message, and nothing registered.
  const { zipFiles } = await import('../../src/local.js');
  const enc = (t) => new TextEncoder().encode(t);
  const evil = path.join(tmp, 'evil.zip');
  fs.writeFileSync(evil, zipFiles([{ path: 'Home.md', bytes: enc('x') }, { path: '../outside.md', bytes: enc('x') }]));
  await openRestore(evil, 'browser');
  check(await until(() => document.querySelector('dialog.modal .bad')?.textContent.includes("can't be restored")), 'a path outside the vault is refused when the zip is picked');
  await (await addButton()).click();
  check(await until(() => document.querySelector('dialog.modal p.fine.bad')?.textContent.includes('Choose the .zip')), 'and Add vault asks for a good copy');
  await page.keyboard.press('Escape');
  const broken = path.join(tmp, 'broken.zip');
  fs.writeFileSync(broken, Buffer.from('this is not a zip'));
  await openRestore(broken, 'browser');
  check(await until(() => document.querySelector('dialog.modal .bad')?.textContent.includes("isn't a zip")), 'a file that is not a zip says so');
  await page.keyboard.press('Escape');
  check((await repos()).length === before, 'no bad copy left a vault behind');

  // 5. On a phone: the first page offers it, and the dialog fits.
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluate(() => localStorage.removeItem('commonplace:repos'));
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  check(await until(() => !!document.querySelector('.welcome [data-choice=restore]')), 'the first page has Restore a copy you downloaded');
  await page.click('.welcome [data-choice=restore]');
  check(await until(() => document.querySelector('dialog.modal input[value=copy]')?.checked), 'which opens the dialog on A copy you downloaded');
  check(await page.$eval('dialog.modal', (d) => d.getBoundingClientRect().width <= 390), 'and it fits a phone');
  await page.screenshot({ path: path.join(OUT, 'restore-phone.png') });

  check(!offsite.length, 'no network requests besides the app: ' + offsite.slice(0, 3).join(', '));
  check(!errors.length, 'no page errors: ' + errors.slice(0, 3).join(' | '));
} catch (e) {
  check(false, e.stack || e.message);
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
