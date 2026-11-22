// The download to try it out, opened from the disk (file://) as someone would after unzipping it, in Chrome and in
// Edge. It opens the example notes with no token and
// no network call, says it's only for trying out, keeps an edit after a reload, and Settings asks for no token.
//   node tools/download/build.mjs && cd tests/e2e && node download.mjs [unzipped folder] [screenshot folder]
// Settings: CHROME, EDGE (paths to the browsers; a missing one is skipped).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = path.resolve(process.argv[2] || '../../dist/commonplace-md');
const OUT = process.argv[3] || 'download-shots';
const BROWSERS = [
  ['Chrome', process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'],
  ['Edge', process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],
].filter(([name, exe]) => fs.existsSync(exe) || (console.log(`SKIP  ${name}: not at ${exe}`), false));
const START = pathToFileURL(path.join(DIR, 'index.html')).href;
fs.mkdirSync(OUT, { recursive: true });

let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failed++; };

for (const [name, exe] of BROWSERS) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'commonplace-download-'));
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, userDataDir: profile });
  const page = await browser.newPage();
  const errors = [], network = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) network.push(r.url()); });
  const until = (fn, ms = 10000) => page.waitForFunction(fn, { timeout: ms }).then(() => true, () => false);
  const shot = (file) => page.screenshot({ path: path.join(OUT, `${name.toLowerCase()}-${file}.png`) });
  try {
    await page.setViewport({ width: 1280, height: 860 });
    await page.goto(START, { waitUntil: 'load' });
    check(await until(() => document.querySelector('.preview .note-body h1')), `${name}: opens from the disk and shows the example notes' start page`);
    check(await page.$eval('#local-note', (el) => !el.hidden && el.textContent.includes('Trying it out')), `${name}: says it's only for trying out`);
    check(await page.$eval('#repo-select', (s) => s.selectedOptions[0]?.textContent.includes('Example notes')), `${name}: the vault is called Example notes`);
    check(await page.$eval('body', (b) => !b.classList.contains('no-token')), `${name}: no token asked`);
    await shot('start');

    // A diagram (Mermaid is a plain script) and an image (from the packed notes) on the Guide.
    await page.goto(`${START}#/local-example-notes/Guide.md`, { waitUntil: 'load' });
    check(await until(() => document.querySelector('.mermaid-diagram.drawn svg'), 15000), `${name}: diagrams are drawn`);
    check(await until(() => [...document.querySelectorAll('.preview img')].some((i) => i.src.startsWith('blob:') && i.naturalWidth > 0)), `${name}: images from the packed notes show`);

    // An edit is kept in this browser.
    await page.goto(`${START}#/local-example-notes/Home.md`, { waitUntil: 'load' });
    await until(() => document.querySelector('#mode:not([hidden])'));
    await page.evaluate(() => document.querySelectorAll('#mode button')[1].click());
    await until(() => document.querySelector('.editor-pane .cm-content'));
    await page.click('.editor-pane .cm-content');
    await page.keyboard.down('Control'); await page.keyboard.press('End'); await page.keyboard.up('Control');
    await page.keyboard.type('\n\nWritten in the download.\n');
    await page.keyboard.down('Control'); await page.keyboard.press('s'); await page.keyboard.up('Control');
    check(await until(() => document.querySelector('#save-btn')?.textContent.includes('Saved')), `${name}: Save works`);
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => document.querySelectorAll('#mode button')[0].click());
    check(await until(() => document.querySelector('.preview')?.textContent.includes('Written in the download.')), `${name}: the edit is still there after a reload`);

    // Settings: nothing about tokens or GitHub repos.
    await page.goto(`${START}#/settings`, { waitUntil: 'load' });
    await until(() => document.querySelector('.page h1'));
    check(await page.evaluate(() => !document.querySelector('input[type=password]') && !document.querySelector('#owner-tokens')
      && document.body.textContent.includes('the download to try it out')
      && ![...document.querySelectorAll('.btn')].some((b) => ['Add a repo', 'Look for vaults'].includes(b.textContent))
      && !document.querySelector('.version-pick')), `${name}: Settings asks for no token and offers no GitHub repo or app version`);
    check(await page.$eval('#version-btn', (b) => b.hidden), `${name}: no Try the dev version`);
    await shot('settings');

    // Phone width, light and dark.
    await page.goto(`${START}#/local-example-notes/Home.md`, { waitUntil: 'load' });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await until(() => document.querySelector('.preview .note-body h1'));
    check(await page.$eval('#local-note', (el) => el.getBoundingClientRect().width <= 390 && !el.hidden), `${name}: the banner fits a phone`);
    await shot('phone-light');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await shot('phone-dark');

    check(!network.length, `${name}: no network requests` + (network.length ? `: ${network.slice(0, 3).join(', ')}` : ''));
    check(!errors.length, `${name}: no page errors` + (errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''));
  } catch (e) {
    check(false, `${name}: ${e.message}`);
  } finally {
    await browser.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
