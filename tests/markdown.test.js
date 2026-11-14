import { test } from "node:test";
import assert from "node:assert/strict";
import { createMarkdown, renderNote, topTasksOptions } from "../src/markdown.js";
import { LinkIndex } from "../src/vault.js";

const md = createMarkdown();
const idx = new LinkIndex(["Home.md", "Notes/Inbox.md", "Attachments/pic.png", "Task Board.md", "Bases/Task Board.base"]);
const env = {
  fromPath: "Notes/Inbox.md",
  resolve: (t) => idx.resolve(t, "Notes/Inbox.md"),
  href: (p, h) => `#/vault/${p}${h ? "?h=" + h : ""}`,
};
const render = (text) => renderNote(md, text, env).html;

test("wikilinks become links, and missing ones are marked", () => {
  const html = render("See [[Home]], [[Task Board#Goals|the goals]] and [[Nowhere]].");
  assert.match(html, /<a class="wikilink" href="#\/vault\/Home.md"[^>]*>Home<\/a>/);
  assert.match(html, /data-heading="Goals"[^>]*>the goals<\/a>/);
  assert.match(html, /class="wikilink missing"[^>]*>Nowhere<\/a>/);
});

test("image embeds, .base views and page embeds", () => {
  const html = render("![[pic.png|300]]\n\n![[Task Board.base]]\n\n![[Task Board#Goals]]");
  assert.match(html, /class="embed-img" data-path="Attachments\/pic.png" data-width="300"/);
  assert.match(html, /<span class="embed-base" data-path="Bases\/Task Board.base" data-target="Task Board.base"><\/span>/);
  assert.match(render("![[Nowhere.base]]"), /<span class="embed-note missing">Missing view: Nowhere.base<\/span>/);
  // Inside an embedded page a base stays a link.
  assert.match(renderNote(md, "![[Task Board.base]]", { ...env, depth: 1 }).html, /<span class="embed-note"><a class="wikilink" href="#\/vault\/Bases\/Task Board.base"/);
  assert.match(html, /<span class="embed-page" data-path="Task Board.md" data-heading="Goals"><span class="embed-head"><a class="wikilink"/);
  // Inside an embedded page, embeds stay links, so pages can't embed each other forever.
  assert.match(renderNote(md, "![[Task Board]]", { ...env, depth: 1 }).html, /<span class="embed-note"><a class="wikilink"/);
});

test("callouts render as boxes, foldable ones as details", () => {
  const html = render("> [!info] Heads up\n> body text\n\n> [!abstract]- Closed\n> hidden\n\n> [!tip]+\n> open");
  assert.match(html, /<div class="callout" data-callout="info"><div class="callout-title"><span class="callout-icon" data-icon="info"><\/span><span class="callout-text">Heads up<\/span>/);
  assert.match(html, /<p>body text<\/p>/);
  assert.match(html, /<details class="callout" data-callout="abstract"><summary/);
  assert.match(html, /<details class="callout" data-callout="tip" open><summary[^]*<span class="callout-text">Tip<\/span>/);
  assert.doesNotMatch(html, /blockquote/);
});

test("the nav box shows folded and its links work", () => {
  const html = render('---\nparent: "[[Home]]"\n---\n\n%% nav: x %%\n> [!abstract]+ 🧭 [[Home]] › Inbox\n%% /nav %%\n\n# Inbox\n');
  assert.match(html, /<details class="callout" data-callout="nav"><summary/);
  assert.match(html, /🧭 <a class="wikilink" href="#\/vault\/Home.md"/);
  assert.doesNotMatch(html, /%%|parent:/);
});

test("task checkboxes point at their source line", () => {
  const html = render("---\na: 1\n---\n# T\n\n- [ ] first\n- [x] second\n");
  assert.match(html, /<input type="checkbox" class="task" data-line="5"> first/);
  assert.match(html, /<input type="checkbox" class="task" data-line="6" checked> second/);
});

test("headings carry their text for [[Page#Heading]] links", () => {
  assert.match(render("## 🆕 New tasks"), /<h2 data-heading="🆕 New tasks">/);
});

test("a mermaid block becomes a diagram placeholder holding its source; other fences are unchanged", () => {
  const src = 'graph TB\n  A["Run <br> start"] --> B & C\n';
  const html = render("```mermaid\n" + src + "```\n");
  const escaped = 'graph TB\n  A[&quot;Run &lt;br&gt; start&quot;] --&gt; B &amp; C\n';
  assert.equal(html, `<div class="mermaid-diagram"><pre><code>${escaped}</code></pre></div>\n`);
  assert.equal(render("```js\nconst a = 1 < 2;\n```\n"), '<pre><code class="language-js">const a = 1 &lt; 2;\n</code></pre>\n');
});

test("a top-tasks block becomes a placeholder with its areas and count, holding its source", () => {
  assert.equal(render("```top-tasks\nareas: Features, Docs\ncount: 5\n```\n"),
    '<div class="top-tasks-block" data-areas="Features, Docs" data-count="5"><pre><code>areas: Features, Docs\ncount: 5\n</code></pre></div>\n');
  assert.equal(render("```top-tasks\n```\n"), '<div class="top-tasks-block" data-areas="" data-count="3"><pre><code></code></pre></div>\n');
  assert.match(render('```Top-Tasks\nareas: ["A&B"]\n```\n'), /data-areas="A&amp;B"/);
});

test("a top-tasks block's options: areas as a list or in brackets, a count from 1 to 20, other lines ignored", () => {
  assert.deepEqual(topTasksOptions(""), { areas: [], count: 3 });
  assert.deepEqual(topTasksOptions("Areas: [Features, 'Docs']\nCOUNT: 7"), { areas: ["Features", "Docs"], count: 7 });
  assert.deepEqual(topTasksOptions("count: 0\nnote: hi"), { areas: [], count: 1 });
  assert.deepEqual(topTasksOptions("count: 99"), { areas: [], count: 20 });
  assert.deepEqual(topTasksOptions("count: five\nareas:"), { areas: [], count: 3 });
});
