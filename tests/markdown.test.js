import { test } from "node:test";
import assert from "node:assert/strict";
import { createMarkdown, renderNote, topTasksOptions, questionsOptions } from "../src/markdown.js";
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

test("a top-tasks block becomes a placeholder with all its options, holding its source", () => {
  const src = "range: 5\nareas: Features, Docs\norder: oldest\nsprint: current-only\nowner: Ana Lee\n";
  assert.equal(render("```top-tasks\n" + src + "```\n"),
    '<div class="top-tasks-block" data-areas="Features, Docs" data-count="5" data-order="oldest" data-sprint="current-only" data-owner="Ana Lee">'
    + `<pre><code>${src}</code></pre></div>\n`);
  assert.equal(render("```top-tasks\n```\n"),
    '<div class="top-tasks-block" data-areas="" data-count="3" data-count-default="1" data-order="priority-newest" data-order-default="1"'
    + ' data-sprint="off" data-owner=""><pre><code></code></pre></div>\n');
  assert.match(render('```Top-Tasks\nareas: ["A&B"]\nowner: "<b>"\n```\n'), /data-areas="A&amp;B".*data-owner="&lt;b&gt;"/);
});

test("a top-tasks block's options: range (or count) from 1 to 20, areas, order, sprint and owner; other lines ignored", () => {
  const none = { areas: [], count: 3, countSet: false, order: "priority-newest", orderSet: false, sprint: "off", owner: "" };
  assert.deepEqual(topTasksOptions(""), none);
  assert.deepEqual(topTasksOptions("Areas: [Features, 'Docs']\nRANGE: 7"), { ...none, areas: ["Features", "Docs"], count: 7, countSet: true });
  assert.deepEqual(topTasksOptions("count: 7"), { ...none, count: 7, countSet: true }, "older blocks say count");
  assert.deepEqual(topTasksOptions("range: 0\nnote: hi"), { ...none, count: 1, countSet: true });
  assert.deepEqual(topTasksOptions("range: 99"), { ...none, count: 20, countSet: true });
  assert.deepEqual(topTasksOptions("range: five\nareas:"), none);
  for (const [said, mode] of [["current-only", "current-only"], ["Current only", "current-only"], ["current", "current-only"],
    ["current-then-next", "current-then-next"], ["current and next", "current-then-next"], ["off", "off"], ["none", "off"], ["soon", "off"]]) {
    assert.equal(topTasksOptions(`sprint: ${said}`).sprint, mode, said);
  }
  assert.equal(topTasksOptions("owner: 'Zoë Ng'").owner, "Zoë Ng");
  assert.equal(topTasksOptions("owner:").owner, "");
  assert.deepEqual(topTasksOptions("order: Newest first"), { ...none, order: "newest", orderSet: true });
  assert.deepEqual(topTasksOptions("order: by due date"), none, "an order it doesn't know is the default, and not set");
});

test("a task's and a sprint's blocks become placeholders that keep their code", () => {
  for (const name of ["subtasks", "relations", "commits", "sprint"]) {
    assert.equal(render("```" + name + "\n```\n"), `<div class="app-block" data-block="${name}"><pre><code>${name}</code></pre></div>\n`);
  }
  assert.equal(render("```subtasks\nsome: thing\n```\n"), '<div class="app-block" data-block="subtasks"><pre><code>some: thing\n</code></pre></div>\n');
});

test("a questions block becomes a placeholder with its owner, holding its source", () => {
  assert.equal(render("```questions\nowner: Ana Lee\n```\n"),
    '<div class="questions-block" data-owner="Ana Lee"><pre><code>owner: Ana Lee\n</code></pre></div>\n');
  assert.equal(render("```Questions\n```\n"), '<div class="questions-block" data-owner=""><pre><code>questions</code></pre></div>\n');
  assert.match(render('```questions\nowner: "<b>"\n```\n'), /data-owner="&lt;b&gt;"/);
  assert.deepEqual(questionsOptions("range: 3\n  Owner :  'Bo Park' \n"), { owner: "Bo Park" });
  assert.deepEqual(questionsOptions(""), { owner: "" });
});
