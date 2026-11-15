import { test } from "node:test";
import assert from "node:assert/strict";
import { createMarkdown, renderNote, topTasksOptions, attentionOptions, appBlockOptions } from "../src/markdown.js";
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
  const src = "range: 5\nareas: Features, Docs\norder: oldest\nsprint: current-only\nowner: Ana Lee\nfields: parent, state\n";
  assert.equal(render("```top-tasks\n" + src + "```\n"),
    '<div class="top-tasks-block" data-areas="Features, Docs" data-count="5" data-order="oldest" data-sprint="current-only" data-owner="Ana Lee"'
    + ' data-fields="parent,state">'
    + `<pre><code>${src}</code></pre></div>\n`);
  assert.equal(render("```top-tasks\n```\n"),
    '<div class="top-tasks-block" data-areas="" data-count="3" data-count-default="1" data-order="priority-newest" data-order-default="1"'
    + ' data-sprint="off" data-owner="" data-fields="state,priority,area" data-fields-default="1"><pre><code></code></pre></div>\n');
  assert.match(render('```Top-Tasks\nareas: ["A&B"]\nowner: "<b>"\n```\n'), /data-areas="A&amp;B".*data-owner="&lt;b&gt;"/);
});

test("a top-tasks block's options: range (or count) from 1 to 20, areas, order, sprint and owner; other lines ignored", () => {
  const none = { areas: [], count: 3, countSet: false, order: "priority-newest", orderSet: false, sprint: "off", owner: "",
    fields: ["state", "priority", "area"], fieldsSet: false };
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

test("a top-tasks block's fields: in the order written, lower case, each once; name and claim are always there", () => {
  assert.deepEqual(topTasksOptions("fields: Parent, state, PRIORITY, area").fields, ["parent", "state", "priority", "area"]);
  assert.deepEqual(topTasksOptions("fields: [parent, 'sprint', parent]"), { ...topTasksOptions(""), fields: ["parent", "sprint"], fieldsSet: true });
  assert.deepEqual(topTasksOptions("fields: name, claim, assignee").fields, ["assignee"]);
  assert.deepEqual(topTasksOptions("fields:"), { ...topTasksOptions(""), fields: [], fieldsSet: true }, "an empty line shows the names only");
  assert.equal(topTasksOptions("range: 2").fieldsSet, false);
});

test("a base block becomes a placeholder holding its view's source as code", () => {
  const src = 'filters:\n  and:\n    - file.inFolder("Tasks")\n    - status != "Done" && x > 1\nviews:\n  - type: table\n';
  assert.equal(render("```base\n" + src + "```\n"),
    '<div class="base-block"><pre><code>filters:\n  and:\n    - file.inFolder(&quot;Tasks&quot;)\n    - status != &quot;Done&quot; &amp;&amp; x &gt; 1\nviews:\n  - type: table\n</code></pre></div>\n');
  assert.equal(render("```Base\n```\n"), '<div class="base-block"><pre><code></code></pre></div>\n');
});

test("a task's and a sprint's blocks become placeholders that keep their code", () => {
  for (const name of ["subtasks", "relations", "commits", "sprint"]) {
    assert.equal(render("```" + name + "\n```\n"), `<div class="app-block" data-block="${name}"><pre><code>${name}</code></pre></div>\n`);
  }
  assert.equal(render("```subtasks\nsome: thing\n```\n"), '<div class="app-block" data-block="subtasks"><pre><code>some: thing\n</code></pre></div>\n');
  assert.equal(render("```commits\ntask: \"[[A & B]]\"\n```\n"),
    '<div class="app-block" data-block="commits" data-task="[[A &amp; B]]"><pre><code>task: &quot;[[A &amp; B]]&quot;\n</code></pre></div>\n');
});

test("a task's block options: task names another task by its ID, name or link; other lines are ignored", () => {
  assert.deepEqual(appBlockOptions(""), { task: "" });
  assert.deepEqual(appBlockOptions("Task: T-12\nnote: hi"), { task: "T-12" });
  assert.deepEqual(appBlockOptions("task: '[[Get set up]]'"), { task: "[[Get set up]]" });
  assert.deepEqual(appBlockOptions("task:"), { task: "" });
});

test("a needs-attention block becomes a placeholder with what it shows, its owner and login, holding its source", () => {
  assert.equal(render("```needs-attention\nshow: questions\nowner: Ana Lee\nlogin: ana\n```\n"),
    '<div class="attention-block" data-owner="Ana Lee" data-login="ana" data-show="questions"><pre><code>show: questions\nowner: Ana Lee\nlogin: ana\n</code></pre></div>\n');
  assert.equal(render("```Needs-Attention\n```\n"),
    '<div class="attention-block" data-owner="" data-login="" data-show="questions,mentions" data-show-default="1"><pre><code>needs-attention</code></pre></div>\n');
  assert.match(render('```needs-attention\nowner: "<b>"\n```\n'), /data-owner="&lt;b&gt;"/);
});

test("a needs-attention block's options: show (both, or one), owner and login; other lines ignored", () => {
  const both = ["questions", "mentions"];
  assert.deepEqual(attentionOptions(""), { owner: "", login: "", show: both, showSet: false });
  assert.deepEqual(attentionOptions("range: 3\n  Owner :  'Bo Park' \nlogin: @bo-p\n"), { owner: "Bo Park", login: "bo-p", show: both, showSet: false });
  assert.deepEqual(attentionOptions("show: mentions").show, ["mentions"]);
  assert.deepEqual(attentionOptions("show: [Mention]").show, ["mentions"]);
  assert.deepEqual(attentionOptions("show: mentions, questions"), { owner: "", login: "", show: both, showSet: true }, "always questions first");
  assert.deepEqual(attentionOptions("show: both").show, both);
  assert.deepEqual(attentionOptions("show: nothing known"), { owner: "", login: "", show: both, showSet: false });
});

test("@login becomes a mention, but not in code, a link or an email", () => {
  assert.equal(render("Ask @Ann-Lee, not ann@example.com or `@code`.\n"),
    '<p>Ask <span class="mention" data-login="Ann-Lee">@Ann-Lee</span>, not <a href="mailto:ann@example.com">ann@example.com</a> or <code>@code</code>.</p>\n');
  assert.equal(render("[see @bob](https://example.com) and **@bob**\n"),
    '<p><a href="https://example.com">see @bob</a> and <strong><span class="mention" data-login="bob">@bob</span></strong></p>\n');
  assert.match(render("## Ask @bob\n"), /data-heading="Ask @bob"/);
});

test("a new-tasks block is a box with its items rendered, its owner, and its closing fence's line", () => {
  const html = render("Intro\n\n```new-tasks\nowner: Ana Lee\n- Read [[Home]]\n- [ ] **Bold** one\n```\n");
  assert.match(html, /^<p>Intro<\/p>\n<section class="newtasks" aria-label="New tasks" data-owner="Ana Lee" data-close="6">/);
  assert.match(html, /<small class="muted">For Ana Lee · 2 items · Your agent turns them into tasks<\/small>/);
  assert.match(html, /<ul class="newtasks-list"><li>Read <a [^>]*class="wikilink[^"]*"[^>]*>Home<\/a><\/li><li><strong>Bold<\/strong> one<\/li><\/ul><\/section>/);
  const none = render("```new-tasks\n```\n");
  assert.match(none, /No owner: line, so no agent sorts these/);
  assert.match(none, /<li class="muted">Nothing yet\.<\/li>/);
});
