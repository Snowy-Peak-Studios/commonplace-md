// Tags and star ratings on notes, and the Find page, in a local browser vault with fictional notes: stars set, cleared
// and 0 (each saving only the rating line), the keyboard, tag chips that open Find, Find's tag and star filters
// in the address (and Back), a tag no note has, and desktop/phone in light and dark. No token or remote calls.
//   node tags-stars.mjs <screenshot directory>
// Settings: BASE (the app's address), CHROME.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2] || 'tags-stars-shots';
fs.mkdirSync(OUT, { recursive: true });

let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failed++; };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setBypassServiceWorker(true);
const errors = [], offsite = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { const url = r.url(); if (!url.startsWith(BASE) && !/^(data|blob):/.test(url)) offsite.push(url); });
const until = (fn, ms = 10000, arg) => page.waitForFunction(fn, { timeout: ms }, arg).then(() => true, () => false);
const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const fileText = (p) => page.evaluate(async (p) => {
  const { LocalSource } = await import('./src/local.js');
  return (await new LocalSource().readText({ id: 'local-kitchen', local: 'browser' }, p)).text;
}, p);
const save = async () => {
  await page.click('#save-btn');
  return until(() => document.querySelector('#save-btn').textContent.includes('Saved'));
};

try {
  await page.setViewport({ width: 1280, height: 860 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    localStorage.clear();
    for (const d of await indexedDB.databases()) indexedDB.deleteDatabase(d.name);
    const { LocalSource } = await import('./src/local.js');
    const enc = (t) => new TextEncoder().encode(t);
    const note = (props, title) => enc(`---\n${props}\n---\n\n# ${title}\n\nSome text.\n`);
    const r = { id: 'local-kitchen', local: 'browser', label: 'Kitchen', home: 'Home.md', notes: 'Recipes', vault: false };
    await new LocalSource().create(r, { seed: [
      { path: 'Home.md', bytes: enc('# Kitchen\n\nRecipes and notes.\n') },
      { path: 'Recipes/Lentil soup.md', bytes: note('tags: [vegan, "#quick"]\nrating: 5', 'Lentil soup') },
      { path: 'Recipes/Pasta bake.md', bytes: note('tags: [Vegetarian, quick]\nrating: 3', 'Pasta bake') },
      { path: 'Recipes/Apple cake.md', bytes: note('tags:\n  - vegetarian\n  - sweet', 'Apple cake') },
      { path: 'Notes/Shopping.md', bytes: note('rating: 2', 'Shopping') },
    ] });
    localStorage.setItem('commonplace:repos', JSON.stringify([r]));
  });

  // Stars on a note.
  await page.goto(`${BASE}#/local-kitchen/Recipes/Apple%20cake.md`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' }); // the app reads its vaults when it starts
  check(await until(() => document.querySelector('.note-rating')?.getAttribute('aria-label') === 'Rating: Not rated'), 'a note with no rating says Not rated');
  check(await page.$$eval('.note-rating [role=radio]', (bs) => bs.length === 6 && bs.every((b) => !b.disabled)), 'it has 0 and five stars to press');
  await page.click('.note-rating [data-stars="4"]');
  check(await page.$eval('.note-rating', (r) => r.getAttribute('aria-label') === 'Rating: 4 of 5 stars' && r.querySelectorAll('.star.on').length === 4), 'a star sets that many');
  check(await page.$eval('#save-btn', (b) => b.textContent.includes('Save') && !b.disabled), 'and the note is waiting to be saved');
  check(await page.evaluate(() => document.activeElement?.dataset.stars === '4'), 'the pressed star keeps the focus');
  await page.keyboard.press('ArrowLeft');
  check(await page.evaluate(() => document.activeElement?.dataset.stars === '3'), 'the arrow keys move between the stars');
  check(await save(), 'Save keeps it');
  const after = await fileText('Recipes/Apple cake.md');
  check(after === '---\ntags:\n  - vegetarian\n  - sweet\nrating: 4\n---\n\n# Apple cake\n\nSome text.\n', 'only a rating line is added: ' + JSON.stringify(after));
  await page.click('.note-rating [data-stars="4"]');
  check(await page.$eval('.note-rating', (r) => r.getAttribute('aria-label') === 'Rating: Not rated'), 'the same star again takes it out');
  await page.click('.note-rating [data-stars="0"]');
  check(await page.$eval('.note-rating', (r) => r.getAttribute('aria-label') === 'Rating: 0 of 5 stars'), '0 is a rating too');
  await save();
  check((await fileText('Recipes/Apple cake.md')).includes('\nrating: 0\n'), 'and it is saved as 0');
  await page.reload({ waitUntil: 'networkidle0' });
  check(await until(() => document.querySelector('.note-rating')?.getAttribute('aria-label') === 'Rating: 0 of 5 stars'), 'it is still there after a reload');
  await shot('note-stars-desktop');

  // Tag chips open Find.
  check(await page.$$eval('.prop-vals .tag-chip', (cs) => cs.map((c) => c.textContent).join(',') === 'vegetarian,sweet'), 'tags show as chips in Properties');
  await page.click('.prop-vals .tag-chip');
  check(await until(() => location.hash === '#/find?vault=local-kitchen&tag=vegetarian' && !!document.querySelector('.find-results')), 'a tag chip opens Find with that tag');
  const names = () => page.$$eval('.find-name', (as) => as.map((a) => a.textContent));
  check(JSON.stringify(await names()) === JSON.stringify(['Pasta bake', 'Apple cake']), 'the notes with it, the best rated first, whatever the tag\'s case');
  const chips = await page.$$eval('.find-tags .tag-chip', (cs) => cs.map((c) => c.textContent.toLowerCase()).join(','));
  check(chips === 'quick2,vegetarian2,sweet1,vegan1', 'every tag with its count, once whatever its case, # left out: ' + chips);
  await page.evaluate(() => [...document.querySelectorAll('.find-tags .tag-chip')].find((c) => c.textContent.startsWith('quick')).click());
  check(await until(() => location.hash.includes('tag=vegetarian&tag=quick')) && JSON.stringify(await names()) === '["Pasta bake"]', 'two tags: only notes with both');
  await page.evaluate(() => [...document.querySelectorAll('.find-tags .tag-chip')].find((c) => c.textContent.toLowerCase().startsWith('vegetarian')).click());
  await until(() => !location.hash.includes('vegetarian'));
  await page.evaluate(() => [...document.querySelectorAll('.find-stars button')].find((b) => b.textContent === '4+').click());
  check(await until(() => location.hash.endsWith('tag=quick&stars=4')) && JSON.stringify(await names()) === '["Lentil soup"]', 'at least 4 stars');
  await page.goBack();
  check(await until(() => location.hash.endsWith('tag=quick')) && (await names()).length === 2, 'Back undoes a filter click');
  await page.goto(`${BASE}#/find?vault=local-kitchen&stars=unrated`, { waitUntil: 'networkidle0' });
  check(await until(() => document.querySelectorAll('.find-results li').length === 1) && JSON.stringify(await names()) === '["Home"]', 'Not rated: only the notes with no rating');
  await page.goto(`${BASE}#/find?vault=local-kitchen&tag=nothing`, { waitUntil: 'networkidle0' });
  check(await until(() => !!document.querySelector('.find-tags .tag-chip.on')) && await page.$eval('.page.find', (p) => p.textContent.includes('No note matches')), 'a tag no note has still shows, picked, and says nothing matches');
  await page.goto(BASE + '#/local-kitchen/Home.md', { waitUntil: 'networkidle0' });
  await page.click('#side-find');
  check(await until(() => location.hash === '#/find?vault=local-kitchen' && document.querySelectorAll('.find-results li').length === 5), 'the file list\'s Find button opens it for the vault');
  await shot('find-desktop');

  for (const scheme of ['light', 'dark']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${BASE}#/find?vault=local-kitchen&tag=quick`, { waitUntil: 'networkidle0' });
    await until(() => !!document.querySelector('.find-results'));
    check(await page.evaluate(() => document.documentElement.scrollWidth <= 390), `Find fits a phone (${scheme})`);
    await shot(`find-phone-${scheme}`);
    await page.goto(`${BASE}#/local-kitchen/Recipes/Lentil%20soup.md`, { waitUntil: 'networkidle0' });
    await until(() => !!document.querySelector('.note-rating'));
    await page.tap('.note-rating [data-stars="2"]');
    check(await page.$eval('.note-rating', (r) => r.getAttribute('aria-label') === 'Rating: 2 of 5 stars'), `a tap sets the stars on a phone (${scheme})`);
    await shot(`note-stars-phone-${scheme}`);
    // Back to its saved rating (5), so the note has nothing unsaved when the next round leaves it.
    await page.click('.note-rating [data-stars="5"]');
    check(await page.$eval('#save-btn', (b) => b.disabled), `back to the saved stars, nothing to save (${scheme})`);
  }

  check(!offsite.length, 'no network requests besides the app: ' + offsite.slice(0, 3).join(', '));
  check(!errors.length, 'no page errors: ' + errors.slice(0, 3).join(' | '));
} catch (e) {
  check(false, e.stack || e.message);
} finally {
  await browser.close();
}
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
