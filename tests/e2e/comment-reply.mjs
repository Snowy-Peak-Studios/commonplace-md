// A mention answered with Post in a Comments box leaves its person's Needs attention, before and after a reload,
// while an unrelated mention stays and keeps the Inbox dot on. A local browser vault with fictional people; no token.
//   node comment-reply.mjs <screenshot directory>
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2] || 'comment-reply-shots';
fs.mkdirSync(OUT, { recursive: true });

const inbox = '---\nowner: Ann Example\n---\n\n# Inbox\n\n```needs-attention\nshow: mentions\nowner: Ann Example\nlogin: ann-example\n```\n';
const art = '# Art\n\n```comments\n- **bob-k** · 2026-11-18 19:22 UTC\n\n    @ann-example the first picture is up: does this style work?\n```\n';
const other = '# Other\n\n@ann-example an unrelated question, still open.\n';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setBypassServiceWorker(true);
const errors = [], remote = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (r.url().startsWith('https://')) remote.push(r.url()); });

const open = async (path) => {
  await page.evaluate((p) => { location.hash = `#/replies/${p.split('/').map(encodeURIComponent).join('/')}`; }, path);
  await page.waitForFunction((p) => decodeURIComponent(location.hash).endsWith(p) && document.querySelector('.note-body h1'), { timeout: 20000 }, path);
};
const mentions = async () => {
  await page.waitForFunction(() => /new mention/.test(document.querySelector('.note-body .attention .suggest-head small')?.textContent ?? ''), { timeout: 20000 });
  return page.evaluate(() => ({
    head: document.querySelector('.note-body .attention .suggest-head small').textContent,
    rows: [...document.querySelectorAll('.note-body .attention > .attention-list > li > a.suggest-name')].map((a) => a.textContent.split(' › ')[0]),
    dot: document.querySelector('#inbox-btn').classList.contains('has-dot'),
  }));
};

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(async (files) => {
    localStorage.clear();
    const { LocalSource } = await import('./src/local.js');
    const repo = { id: 'replies', label: 'Reply check', local: 'browser', owner: '', repo: '', branch: '', folder: '', home: 'Inbox.md', inbox: 'Inbox.md', inboxes: '', notes: 'Notes', template: '', vault: false };
    await new LocalSource().create(repo, { seed: Object.entries(files).map(([path, text]) => ({ path, bytes: new TextEncoder().encode(text) })) });
    localStorage.setItem('commonplace:repos', JSON.stringify([repo]));
  }, { 'Inbox.md': inbox, 'Tasks/Art.md': art, 'Notes/Other.md': other });
  await page.evaluate(() => { history.replaceState(null, '', '#/replies/Inbox.md'); });
  await page.reload({ waitUntil: 'networkidle0' });

  let seen = await mentions();
  assert.deepEqual(seen.rows.sort(), ['Art', 'Other'], 'both mentions wait: ' + JSON.stringify(seen));
  console.log('PASS before the reply, both mentions wait');

  // Reply in the Comments box: it suggests @bob-k, the last commenter.
  await open('Tasks/Art.md');
  await page.waitForSelector('.comment-add .cm-content');
  assert.equal(await page.$eval('.comment-add .cm-content', (e) => e.textContent.trim()), '@bob-k');
  await page.click('.comment-add .cm-content');
  await page.keyboard.press('End');
  await page.keyboard.type('yes, it works.');
  await page.$eval('.comment-add', (f) => f.requestSubmit());
  await page.waitForFunction(() => document.querySelector('#save-btn')?.disabled, { timeout: 20000 });
  const saved = await page.evaluate(async () => {
    const { LocalSource } = await import('./src/local.js');
    return (await new LocalSource().readText(JSON.parse(localStorage.getItem('commonplace:repos'))[0], 'Tasks/Art.md')).text;
  });
  assert.match(saved, /does this style work\?\n\n- \*\*Unknown user\*\* · \d{4}-\d\d-\d\d \d\d:\d\d UTC\n\n {4}@bob-k yes, it works\.\n```/, saved);
  console.log('PASS Post saves the reply as a dated comment under the mention');

  await open('Inbox.md');
  seen = await mentions();
  assert.deepEqual(seen.rows, ['Other'], 'the answered mention left: ' + JSON.stringify(seen));
  assert.match(seen.head, /^1 new mention of @ann-example in \d+ notes, 1 answered/);
  await page.waitForFunction(() => document.querySelector('#inbox-btn').classList.contains('has-dot'), { timeout: 10000 });
  await page.reload({ waitUntil: 'networkidle0' });
  seen = await mentions();
  assert.deepEqual(seen.rows, ['Other']);
  assert.match(seen.head, /, 1 answered/);
  await page.waitForFunction(() => document.querySelector('#inbox-btn').classList.contains('has-dot'), { timeout: 10000 });
  console.log('PASS after posting and after a reload, only the unrelated mention waits, and the Inbox dot agrees');

  await page.screenshot({ path: `${OUT}/inbox.png` });
  assert.deepEqual(errors, []);
  assert.deepEqual(remote, []);
  console.log('PASS no page errors or remote calls');
} catch (e) {
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
