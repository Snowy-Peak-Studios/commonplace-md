// A folder vault opens from its files quickly, without reading every byte of big files and without any network call.
// The folder is in the browser's own private file system (a real folder handle, like one picked from the disk), with
// notes and some big files beside them (videos, like a game project's assets). No GitHub calls; no token needed.
//   node local-load.mjs <screenshot directory>
// Settings: BASE (the app's address), CHROME, NOTES (how many notes), BIG (how many big files), BIG_MB (their size).
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const NOTES = Number(process.env.NOTES || 400), BIG = Number(process.env.BIG || 12), BIG_MB = Number(process.env.BIG_MB || 8);
const OUT = process.argv[2] || 'local-load-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setBypassServiceWorker(true);
const errors = [], offsite = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { const url = r.url(); if (!url.startsWith(BASE) && !/^(data|blob):/.test(url)) offsite.push(url); });

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(async ({ NOTES, BIG, BIG_MB }) => {
    localStorage.clear();
    const root = await navigator.storage.getDirectory();
    for await (const [name] of root.entries()) await root.removeEntry(name, { recursive: true });
    const vault = await root.getDirectoryHandle('vault', { create: true });
    const write = async (dir, name, data) => {
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(data);
      await w.close();
    };
    await write(vault, 'Home.md', '# Home\n\nStart at [[Note 1]].\n');
    const notes = await vault.getDirectoryHandle('Notes', { create: true });
    for (let i = 1; i <= NOTES; i++) await write(notes, `Note ${i}.md`, `---\nparent: "[[Home]]"\n---\n\n# Note ${i}\n\nSome text.\n`);
    const assets = await vault.getDirectoryHandle('Assets', { create: true });
    const bytes = new Uint8Array(BIG_MB * 1024 * 1024);
    for (let i = 1; i <= BIG; i++) await write(assets, `clip ${i}.mp4`, bytes);
    const { keepFolder } = await import('./src/local.js');
    const repo = { id: 'local-load', label: 'Load check', local: 'folder', home: 'Home.md', inbox: '', inboxes: '', notes: 'Notes', vault: false };
    await keepFolder(repo.id, vault);
    localStorage.setItem('commonplace:repos', JSON.stringify([repo]));
  }, { NOTES, BIG, BIG_MB });

  // Count the bytes read out of files while the vault opens.
  await page.evaluateOnNewDocument(() => {
    window.__bytesRead = 0;
    for (const name of ['arrayBuffer', 'text', 'bytes', 'stream']) {
      const own = Blob.prototype[name];
      if (own) Blob.prototype[name] = function (...args) { window.__bytesRead += this.size; return own.apply(this, args); };
    }
  });
  await page.evaluate(() => { history.replaceState(null, '', '#/local-load/Home.md'); });
  offsite.length = 0;
  const started = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.note-body h1')?.textContent === 'Home' && document.querySelector('#tree a.row.file'), { timeout: 120000 });
  const took = Date.now() - started;
  await new Promise((done) => setTimeout(done, 1500)); // work the app does after the note shows (mentions, the inbox dot)
  const read = await page.evaluate(() => window.__bytesRead);
  const total = BIG * BIG_MB * 1024 * 1024;
  console.log(`INFO opened ${NOTES + 1} notes and ${BIG} files of ${BIG_MB} MB in ${took} ms; read ${(read / 1048576).toFixed(2)} MB of ${(total / 1048576).toFixed(0)} MB`);
  assert(read < BIG_MB * 1024 * 1024, `opening read ${read} bytes: the big files were read`);
  console.log('PASS opening a folder vault reads no big file');

  const files = await page.$$eval('#tree a.row.file', (rows) => rows.map((r) => r.dataset.path));
  assert(files.includes('Home.md'), 'the file list shows the notes');
  // The big files still open by their place in the list (the tree's sha leads to the file).
  await page.evaluate(() => { location.hash = '#/local-load/Assets/clip%201.mp4'; });
  await page.waitForFunction(() => !document.querySelector('.note-body h1'), { timeout: 20000 });
  await page.evaluate(() => { location.hash = '#/local-load/Notes/Note%202.md'; });
  await page.waitForFunction(() => document.querySelector('.note-body h1')?.textContent === 'Note 2', { timeout: 20000 });
  console.log('PASS the file list shows the notes, and a note and a big file open from it');

  await page.screenshot({ path: `${OUT}/local-load.png` });
  assert.deepEqual(offsite, [], 'a local vault makes no network calls');
  assert.deepEqual(errors, []);
  console.log('PASS no network calls and no page errors while a local vault opens');
} catch (e) {
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
