// An answered question leaves the inbox's open attention: it folds under "Answered, waiting for the agent" and isn't
// counted as waiting on its person, before and after a reload. A local browser vault with fictional people; no token.
//   node answered-questions.mjs <screenshot directory>
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2] || 'answered-questions-shots';
fs.mkdirSync(OUT, { recursive: true });

const task = (id, title, question, answer) => `---
id: ${id}
status: To Do
requested_by: Ann Example
question: "${question}"
---

# ${id} ${title}

\`\`\`description
**As** someone, **I want** something, **so that** it helps.
\`\`\`

## ❓ Question

*(Agent, 2026-11-20)* ${question}

- **(a) One way** (my pick)
- **(b) Another way**

**Answer:**${answer ? ` ${answer}` : ''}

\`\`\`acceptance-criteria
- [ ] Decided with Ann
\`\`\`

\`\`\`comments
\`\`\`
`;
const inbox = '---\nowner: Ann Example\ngithub: ann-example\nagent_mention: anns-agent\n---\n\n# Inbox\n\n```needs-attention\nshow: questions, mentions\nowner: Ann Example\nlogin: ann-example\n```\n';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setBypassServiceWorker(true);
const errors = [], remote = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (r.url().startsWith('https://')) remote.push(r.url()); });

const box = () => page.evaluate(() => {
  const el = document.querySelector('.note-body .attention');
  const names = (sel) => [...(el?.querySelectorAll(sel) ?? [])].map((a) => a.textContent);
  return {
    head: el?.querySelector('.suggest-head small')?.textContent ?? '',
    open: names(':scope > .attention-list > li > a.suggest-name'),
    answered: names('.attention-answered li a.suggest-name'),
    summary: el?.querySelector('.attention-answered summary')?.textContent ?? '',
    state: el?.querySelector('.attention-answered .chip.state')?.textContent ?? '',
    dot: document.querySelector('#inbox-btn')?.classList.contains('has-dot') ?? null,
  };
});
const ready = () => page.waitForFunction(() => document.querySelector('.note-body .attention .suggest-head small')?.textContent.includes('question'), { timeout: 20000 });

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(async ({ inbox, open, done }) => {
    localStorage.clear();
    const { LocalSource } = await import('./src/local.js');
    const repo = { id: 'answers', label: 'Answer check', local: 'browser', owner: '', repo: '', branch: '', folder: '', home: 'Inbox.md', inbox: 'Inbox.md', inboxes: '', notes: 'Notes', template: '', vault: false };
    const enc = (t) => new TextEncoder().encode(t);
    await new LocalSource().create(repo, { seed: [{ path: 'Inbox.md', bytes: enc(inbox) }, { path: 'Tasks/Open one.md', bytes: enc(open) }, { path: 'Tasks/Answered one.md', bytes: enc(done) }] });
    localStorage.setItem('commonplace:repos', JSON.stringify([repo]));
  }, { inbox, open: task('X-001', 'Open one', 'Which way first?'), done: task('X-002', 'Answered one', 'Which colour?', 'Blue, please.') });
  await page.evaluate(() => { history.replaceState(null, '', '#/answers/Inbox.md'); });
  await page.reload({ waitUntil: 'networkidle0' });
  await ready();

  let seen = await box();
  assert.deepEqual(seen.open, ['X-001 Open one'], 'only the open question waits: ' + JSON.stringify(seen));
  assert.deepEqual(seen.answered, ['X-002 Answered one'], 'the answered one is folded: ' + JSON.stringify(seen));
  assert.match(seen.head, /^1 question for Ann Example · Answer on the task, 1 answered/);
  assert.equal(seen.summary, 'Answered, waiting for the agent (1)');
  assert.equal(seen.state, 'Answered, waiting for the agent');
  console.log('PASS an answered question folds under "Answered, waiting for the agent" and is not counted as waiting');

  // The same attributed insertion that Post uses binds Ann's reply to the open question.
  await page.evaluate(async () => {
    const { LocalSource } = await import('./src/local.js');
    const { addComment } = await import('./src/vault.js');
    const src = new LocalSource(), repo = JSON.parse(localStorage.getItem('commonplace:repos'))[0];
    const { text, sha } = await src.readText(repo, 'Tasks/Open one.md');
    const lines = text.split('\n'), start = lines.indexOf('```comments');
    await src.writeText(repo, 'Tasks/Open one.md', addComment(text, start, start + 1, '@anns-agent The first way.', 'ann-example'), sha);
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await ready();
  await page.waitForFunction(() => document.querySelector('.note-body .attention .attention-answered summary')?.textContent.includes('(2)'), { timeout: 20000 });
  seen = await box();
  assert.deepEqual(seen.open, [], 'no open rows: ' + JSON.stringify(seen));
  assert.equal(await page.$eval('.note-body .attention > .attention-list > li.muted', (li) => li.textContent), 'Nothing waits on you.');
  assert.deepEqual(seen.answered.sort(), ['X-001 Open one', 'X-002 Answered one']);
  assert.match(seen.head, /^0 questions for Ann Example · Answer on the task, 2 answered/);
  await page.waitForFunction(() => !document.querySelector('#inbox-btn')?.classList.contains('has-dot'), { timeout: 10000 });
  console.log('PASS after both are answered and the vault reopens, nothing waits, both are folded, and the Inbox dot is off');

  // The agent acts on an answer and clears the question: it leaves the list.
  await page.evaluate(async () => {
    const { LocalSource } = await import('./src/local.js');
    const src = new LocalSource(), repo = JSON.parse(localStorage.getItem('commonplace:repos'))[0];
    const { text, sha } = await src.readText(repo, 'Tasks/Answered one.md');
    await src.writeText(repo, 'Tasks/Answered one.md', text.replace(/^question: .*$/m, 'question: ""'), sha);
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await ready();
  await page.waitForFunction(() => document.querySelector('.note-body .attention .attention-answered summary')?.textContent.includes('(1)'), { timeout: 20000 });
  seen = await box();
  assert.deepEqual(seen.answered, ['X-001 Open one']);
  console.log('PASS a question the agent cleared leaves the list');

  await page.evaluate(async () => {
    const { LocalSource } = await import('./src/local.js');
    const src = new LocalSource(), repo = JSON.parse(localStorage.getItem('commonplace:repos'))[0];
    const { text, sha } = await src.readText(repo, 'Tasks/Open one.md');
    await src.writeText(repo, 'Tasks/Open one.md', text.replace(/^<!-- question-id: .* -->\n/m, ''), sha);
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await ready();
  seen = await box();
  assert.deepEqual(seen.open, ['X-001 Open one']);
  assert.deepEqual(seen.answered, []);
  console.log('PASS a later question with identical wording does not inherit the older comment answer');

  await page.evaluate(async () => {
    const { LocalSource } = await import('./src/local.js');
    const { addComment } = await import('./src/vault.js');
    const src = new LocalSource(), repo = JSON.parse(localStorage.getItem('commonplace:repos'))[0];
    const { text, sha } = await src.readText(repo, 'Tasks/Open one.md');
    const lines = text.split('\n'), start = lines.indexOf('```comments'), close = lines.indexOf('```', start + 1);
    await src.writeText(repo, 'Tasks/Open one.md', addComment(text, start, close, '@anns-agent The second way this time.', 'ann-example'), sha);
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await ready();
  assert.deepEqual((await box()).answered, ['X-001 Open one']);
  console.log('PASS a fresh comment answers the later question');

  await page.evaluate(() => { location.hash = '#/answers/Tasks/Open%20one.md'; });
  await page.waitForFunction(() => document.querySelector('.note-body h1')?.textContent.includes('Open one'));
  const visible = await page.$eval('.note-body', (e) => e.innerText);
  assert.match(visible, /ann-example/);
  assert.match(visible, /The second way this time/);
  assert.doesNotMatch(visible, /answer-to:|question-id:/);
  await page.screenshot({ path: `${OUT}/task-replies.png` });
  await page.evaluate(() => { location.hash = '#/answers/Inbox.md'; });
  await ready();
  console.log('PASS the task preserves the attributed replies without showing association metadata');

  for (const [width, scheme] of [[1280, 'light'], [1280, 'dark'], [390, 'light'], [390, 'dark']]) {
    await page.setViewport({ width, height: 800 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    if (width < 861 && await page.$eval('#side', (e) => e.getBoundingClientRect().right > 1)) {
      await page.$eval('#side-close', (e) => e.click());
      await page.waitForFunction(() => document.querySelector('#side').getBoundingClientRect().right <= 1);
    }
    await page.$eval('.note-body .attention-answered details', (d) => { d.open = true; });
    await page.$eval('.note-body .attention', (e) => e.scrollIntoView({ block: 'center' }));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
    await page.screenshot({ path: `${OUT}/${width}-${scheme}.png` });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(remote, []);
  console.log('PASS desktop/phone light/dark without sideways scroll; no page errors or remote calls');
} catch (e) {
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
