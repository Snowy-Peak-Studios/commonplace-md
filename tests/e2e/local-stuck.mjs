// A folder vault whose kept folder the browser never answers about (queryPermission never settles) doesn't hang on
// "Loading the files…": it asks to pick the folder again within a few seconds, and opens once it's picked.
// The folder is in the browser's own private file system; the folder picker is answered by the script. No token.
//   node local-stuck.mjs <screenshot directory>
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2] || 'local-stuck-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setBypassServiceWorker(true);
const errors = [], offsite = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { const url = r.url(); if (!url.startsWith(BASE) && !/^(data|blob):/.test(url)) offsite.push(url); });

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    localStorage.clear();
    const root = await navigator.storage.getDirectory();
    for await (const [name] of root.entries()) await root.removeEntry(name, { recursive: true });
    const vault = await root.getDirectoryHandle('vault', { create: true });
    const w = await (await vault.getFileHandle('Home.md', { create: true })).createWritable();
    await w.write('# Home\n\nThe stuck folder opened.\n');
    await w.close();
    const { keepFolder } = await import('./src/local.js');
    const repo = { id: 'stuck', label: 'Stuck check', local: 'folder', owner: '', repo: '', branch: '', folder: '', home: 'Home.md', inbox: '', inboxes: '', notes: '', template: '', vault: false };
    await keepFolder(repo.id, vault);
    localStorage.setItem('commonplace:repos', JSON.stringify([repo]));
  });

  // The browser never answers about kept folders, as seen in Chrome; the picker gives the same folder back.
  await page.evaluateOnNewDocument(() => {
    window.__stuck = true;
    const own = FileSystemHandle.prototype.queryPermission;
    FileSystemHandle.prototype.queryPermission = function (...args) { return window.__stuck ? new Promise(() => {}) : own.apply(this, args); };
    window.showDirectoryPicker = async () => { window.__stuck = false; return (await navigator.storage.getDirectory()).getDirectoryHandle('vault'); };
  });
  await page.evaluate(() => { history.replaceState(null, '', '#/stuck/Home.md'); });
  const started = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.empty h2')?.textContent === "Pick Stuck check's folder again", { timeout: 15000 });
  const took = Date.now() - started;
  const screen = await page.evaluate(() => ({
    text: document.querySelector('.empty p')?.textContent ?? '',
    button: [...document.querySelectorAll('.empty button')].map((b) => b.textContent),
    sidebar: document.querySelector('#tree')?.textContent ?? '',
  }));
  assert.match(screen.text, /doesn't answer whether this page may open the folder vault\. Pick the same folder again/);
  assert.deepEqual(screen.button, ['Pick the folder again']);
  assert(!/Loading the files/.test(screen.sidebar), 'the sidebar no longer says Loading the files');
  assert(took < 10000, `the screen came in ${took} ms`);
  console.log(`PASS no answer about the folder shows "Pick the folder again" in ${took} ms, not "Loading the files…" forever`);
  await page.screenshot({ path: `${OUT}/stuck.png` });

  await page.click('.empty button');
  await page.waitForFunction(() => document.querySelector('.note-body h1')?.textContent === 'Home', { timeout: 15000 });
  assert(await page.$eval('.note-body', (e) => e.textContent.includes('The stuck folder opened.')));
  console.log('PASS picking the folder again opens the vault');

  assert.deepEqual(offsite, []);
  assert.deepEqual(errors, []);
  console.log('PASS no network calls and no page errors');
} catch (e) {
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
