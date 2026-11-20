// The More menu switches between the released version and the one in development (served under dev/), at the
// same note, and the device remembers the choice. The script serves this clone at both / and /dev/, as GitHub
// Pages does with main and dev, on a port of its own. A local browser vault; no token or network calls.
//   node version-switch.mjs <screenshot directory>
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.PORT || 8799);
const OUT = process.argv[2] || 'version-switch-shots';
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/dev\//, '/');
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${PORT}/`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setBypassServiceWorker(true);
const errors = [], offsite = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { const url = r.url(); if (!url.startsWith(BASE) && !/^(data|blob):/.test(url)) offsite.push(url); });

const menu = async () => {
  await page.waitForSelector('#more summary');
  await page.$eval('#more', (d) => { d.open = true; });
  return page.$eval('#version-btn', (b) => ({ text: b.textContent.trim(), icon: !!b.querySelector('svg.icon'), visible: b.offsetParent !== null }));
};
const note = () => page.waitForFunction(() => document.querySelector('.note-body h1')?.textContent === 'Second', { timeout: 20000 });

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    localStorage.clear();
    const { LocalSource } = await import('./src/local.js');
    const repo = { id: 'versions', label: 'Version check', local: 'browser', owner: '', repo: '', branch: '', folder: '', home: 'Home.md', inbox: '', inboxes: '', notes: '', template: '', vault: false };
    const enc = (t) => new TextEncoder().encode(t);
    await new LocalSource().create(repo, { seed: [{ path: 'Home.md', bytes: enc('# Home\n') }, { path: 'Notes/Second.md', bytes: enc('# Second\n') }] });
    localStorage.setItem('commonplace:repos', JSON.stringify([repo]));
  });
  await page.goto(`${BASE}#/versions/Notes/Second.md`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await note();

  let item = await menu();
  assert.deepEqual(item, { text: 'Try the dev version', icon: true, visible: true });
  assert(!/\(dev\)/.test(await page.title()));
  for (const [width, scheme] of [[1280, 'light'], [1280, 'dark'], [390, 'light'], [390, 'dark']]) {
    await page.setViewport({ width, height: 700 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    if (width < 861 && await page.$eval('#side', (e) => e.getBoundingClientRect().right > 1)) {
      await page.$eval('#side-close', (e) => e.click());
      await page.waitForFunction(() => document.querySelector('#side').getBoundingClientRect().right <= 1);
    }
    await page.$eval('#more', (d) => { d.open = true; });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
    assert(await page.$eval('#version-btn', (b) => b.getBoundingClientRect().height <= 40), 'the item stays on one line');
    await page.screenshot({ path: `${OUT}/released-menu-${width}-${scheme}.png` });
  }
  await page.setViewport({ width: 1280, height: 700 });
  console.log('PASS the released version\'s More menu offers "Try the dev version"');

  await page.click('#version-btn');
  await page.waitForFunction(() => location.pathname.endsWith('/dev/'), { timeout: 15000 });
  assert.equal(new URL(page.url()).hash, '#/versions/Notes/Second.md');
  await note();
  assert.match(await page.title(), /\(dev\)/);
  assert.equal(await page.evaluate(() => localStorage.getItem('commonplace:version')), '"dev"');
  item = await menu();
  assert.equal(item.text, 'Use the released version');
  await page.screenshot({ path: `${OUT}/dev-menu.png` });
  console.log('PASS it opens dev/ at the same note, remembers the choice, and offers "Use the released version" there');

  await page.click('#version-btn');
  await page.waitForFunction(() => !location.pathname.includes('/dev/'), { timeout: 15000 });
  assert.equal(new URL(page.url()).hash, '#/versions/Notes/Second.md');
  await note();
  assert.equal(await page.evaluate(() => localStorage.getItem('commonplace:version')), '"main"');
  assert.equal((await menu()).text, 'Try the dev version');
  console.log('PASS back on the released version at the same note, and the choice is remembered');

  assert.deepEqual(offsite, []);
  assert.deepEqual(errors, []);
  console.log('PASS no page errors or network calls');
} catch (e) {
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
  server.close();
}
