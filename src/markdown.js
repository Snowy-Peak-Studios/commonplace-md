// Markdown preview: wikilinks, embeds, callouts, task checkboxes.
// `env` (passed to render) supplies { resolve(target) -> path|null, href(path, heading), fromPath, depth }.
// Icons, embedded pages, base views and Mermaid diagrams are left as placeholders (`data-icon`, `.embed-page`, `.embed-base`,
// `.mermaid-diagram`, `.top-tasks-block`, `.app-block`) for the app to fill.

import { MarkdownIt } from "../vendor/vendor.js";
import { parseWikilink, isImagePath, prepareForPreview, TASK_BLOCKS, SPRINT_BLOCKS, taskOrder, MENTION, newTasksBlock, NOTE_SECTIONS, fenceLanguage, commentHeader, PAGE_LIST_BLOCKS } from "./vault.js";

/** The blocks the app draws a box in, besides ```top-tasks and ```mermaid: each box shows only where its block is. */
export const APP_BLOCKS = [...TASK_BLOCKS, ...SPRINT_BLOCKS];

/** Callout kinds and the icon each shows. */
const CALLOUT_ICONS = {
  abstract: "abstract", summary: "abstract", tldr: "abstract", info: "info", note: "note", todo: "todo",
  tip: "tip", hint: "tip", important: "danger", success: "success", check: "success", done: "success",
  question: "question", help: "question", faq: "question", warning: "warning", caution: "warning",
  attention: "warning", failure: "failure", fail: "failure", missing: "failure", danger: "danger",
  error: "danger", bug: "bug", example: "todo", quote: "quote", cite: "quote", nav: "",
};

function wikilinkRule(state, silent) {
  const { src, pos } = state;
  const embed = src.charCodeAt(pos) === 0x21 /* ! */;
  const start = embed ? pos + 1 : pos;
  if (!src.startsWith("[[", start)) return false;
  const end = src.indexOf("]]", start + 2);
  if (end < 0) return false;
  const inner = src.slice(start + 2, end);
  if (!inner.trim() || inner.includes("\n") || inner.includes("[[")) return false;
  if (!silent) {
    const token = state.push(embed ? "wikiembed" : "wikilink", "", 0);
    token.meta = parseWikilink(inner);
  }
  state.pos = end + 2;
  return true;
}

/**
 * `@login` in text becomes a `mention` token (the app makes it a link to that person's inbox). Not inside a
 * link or code (code spans and fences aren't text tokens), and not in an email address (see `MENTION`).
 */
function mentionRule(state) {
  for (const block of state.tokens) {
    if (block.type !== "inline" || !block.children) continue;
    const out = [];
    let inLink = 0;
    for (const t of block.children) {
      if (t.type === "link_open") inLink++;
      else if (t.type === "link_close") inLink--;
      if (t.type !== "text" || inLink > 0 || !t.content.includes("@")) { out.push(t); continue; }
      let last = 0;
      for (const m of t.content.matchAll(MENTION)) {
        const at = m.index + m[1].length;
        if (at > last) out.push(Object.assign(new state.Token("text", "", 0), { content: t.content.slice(last, at) }));
        out.push(Object.assign(new state.Token("mention", "", 0), { content: `@${m[2]}`, meta: { login: m[2] } }));
        last = at + 1 + m[2].length;
      }
      if (!last) { out.push(t); continue; }
      if (last < t.content.length) out.push(Object.assign(new state.Token("text", "", 0), { content: t.content.slice(last) }));
    }
    block.children = out;
  }
}

/** `> [!kind]+ Title` blockquotes become callouts. Runs before inline parsing, on raw text. */
function calloutRule(state) {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "blockquote_open") continue;
    const inline = tokens[i + 2];
    if (tokens[i + 1]?.type !== "paragraph_open" || inline?.type !== "inline") continue;
    const lines = inline.content.split("\n");
    const m = /^\[!([\w-]+)\]([+-]?)[ \t]*(.*)$/.exec(lines[0]);
    if (!m) continue;
    let depth = 0, j = i;
    for (; j < tokens.length; j++) {
      if (tokens[j].type === "blockquote_open") depth++;
      else if (tokens[j].type === "blockquote_close" && --depth === 0) break;
    }
    const meta = { kind: m[1].toLowerCase(), fold: m[2], title: m[3] };
    tokens[i].type = "callout_open";
    tokens[i].meta = meta;
    if (tokens[j]) { tokens[j].type = "callout_close"; tokens[j].meta = meta; }
    const rest = lines.slice(1).join("\n");
    if (rest.trim()) inline.content = rest;
    else tokens.splice(i + 1, 3);
  }
}

/** `- [ ] task` list items get a checkbox that knows its source line. */
function taskRule(state) {
  const tokens = state.tokens;
  for (let i = 2; i < tokens.length; i++) {
    const inline = tokens[i];
    if (inline.type !== "inline" || tokens[i - 1].type !== "paragraph_open" || tokens[i - 2].type !== "list_item_open") continue;
    const first = inline.children?.[0];
    const m = first?.type === "text" && /^\[([ xX])\](?=\s|$)\s?/.exec(first.content);
    if (!m) continue;
    first.content = first.content.slice(m[0].length);
    const box = new state.Token("html_inline", "", 0);
    const line = inline.map ? inline.map[0] + (state.env.lineOffset ?? 0) : -1;
    box.content = `<input type="checkbox" class="task" data-line="${line}"${m[1] === " " ? "" : " checked"}> `;
    inline.children.unshift(box);
    tokens[i - 2].attrJoin("class", "task-item");
  }
}

/** Headings carry their plain text, so `[[Page#Heading]]` can find them. */
function headingRule(state) {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type !== "heading_open") continue;
    const text = (tokens[i + 1].children || []).map((c) => c.content).join("").trim();
    tokens[i].attrSet("data-heading", text);
  }
}

export function createMarkdown() {
  const md = new MarkdownIt({ html: true, linkify: true, breaks: true });
  // `.md` is a web domain (Moldova's), so a note's file name like `art.md#heading` would become a link to
  // http://art.md/. A bare address (no `http://`, no `www.`) whose host ends in `.md` stays text.
  const match = md.linkify.match.bind(md.linkify);
  md.linkify.match = (text) => (match(text) || [])
    .filter((m) => m.schema || /^www\./i.test(m.raw) || !/\.md$/i.test(m.raw.split(/[/?#:]/)[0]));
  const esc = md.utils.escapeHtml;
  md.inline.ruler.before("link", "wikilink", wikilinkRule);
  md.core.ruler.after("block", "callouts", calloutRule);
  md.core.ruler.after("inline", "tasks", taskRule);
  md.core.ruler.after("inline", "headings", headingRule);
  md.core.ruler.push("mentions", mentionRule);
  md.renderer.rules.mention = (tokens, idx) => `<span class="mention" data-login="${esc(tokens[idx].meta.login)}">@${esc(tokens[idx].meta.login)}</span>`;

  md.renderer.rules.list_item_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const inline = tokens[idx + 2];
    if (env.inComments && token.level === 1 && inline?.type === "inline" && commentHeader(inline.content)) {
      token.attrJoin("class", "posted-comment");
    }
    return self.renderToken(tokens, idx, options);
  };

  const linkHtml = ({ target, heading, alias }, env) => {
    const path = target ? env.resolve(target) : env.fromPath;
    const text = alias || (target ? (heading ? `${target} › ${heading}` : target) : heading || "");
    return `<a class="wikilink${path ? "" : " missing"}" href="${esc(path ? env.href(path, heading) : "#")}"`
      + ` data-path="${esc(path || "")}" data-heading="${esc(heading || "")}" data-target="${esc(target)}"`
      + `${path ? "" : ' title="No page has this name"'}>${esc(text)}</a>`;
  };

  md.renderer.rules.wikilink = (tokens, idx, _o, env) => linkHtml(tokens[idx].meta, env);

  md.renderer.rules.wikiembed = (tokens, idx, _o, env) => {
    const link = tokens[idx].meta;
    if (isImagePath(link.target)) {
      const path = env.resolve(link.target);
      if (!path) return `<span class="embed-note missing">Missing image: ${esc(link.target)}</span>`;
      const width = /^(\d+)(?:x\d+)?$/.exec(link.alias || "")?.[1] || "";
      return `<span class="embed-img" data-path="${esc(path)}" data-width="${width}" data-alt="${esc(link.target)}"></span>`;
    }
    if (/\.base$/i.test(link.target)) {
      // A base: the app fills the placeholder with its table. Inside an embedded page it stays a link.
      const path = env.resolve(link.target);
      if (!path) return `<span class="embed-note missing">Missing view: ${esc(link.target)}</span>`;
      if (env.depth) return `<span class="embed-note">${linkHtml(link, env)}</span>`;
      return `<span class="embed-base" data-path="${esc(path)}" data-target="${esc(link.target)}"></span>`;
    }
    const path = env.resolve(link.target);
    if (!path || env.depth) return `<span class="embed-note">${linkHtml(link, env)}</span>`;
    return `<span class="embed-page" data-path="${esc(path)}" data-heading="${esc(link.heading || "")}">`
      + `<span class="embed-head">${linkHtml(link, env)}</span><span class="embed-body"></span></span>`;
  };

  md.renderer.rules.callout_open = (tokens, idx, _o, env) => {
    const { kind, fold, title } = tokens[idx].meta;
    const icon = CALLOUT_ICONS[kind] ?? "note";
    const titleHtml = md.renderInline(title || kind[0].toUpperCase() + kind.slice(1), env);
    const head = `${icon ? `<span class="callout-icon" data-icon="${icon}"></span>` : ""}<span class="callout-text">${titleHtml}</span>`;
    if (fold) return `<details class="callout" data-callout="${esc(kind)}"${fold === "+" ? " open" : ""}><summary class="callout-title">${head}</summary><div class="callout-body">\n`;
    return `<div class="callout" data-callout="${esc(kind)}"><div class="callout-title">${head}</div><div class="callout-body">\n`;
  };
  // A ```mermaid block: its code shows until the app draws the diagram from it. Other fences render as before.
  // The source isn't put in an attribute: DOMPurify drops attribute values with `-->` in them, which is Mermaid's arrow.
  // A ```top-tasks block: the app puts the top tasks box there; until then (or inside an embed) its code shows.
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lang = fenceLanguage(token.info);
    if (token.level === 0 && !env.inNoteSection && Object.hasOwn(NOTE_SECTIONS, lang)) {
      const title = NOTE_SECTIONS[lang];
      const lineOffset = (env.lineOffset ?? 0) + (token.map?.[0] ?? -1) + 1;
      const inComments = lang === "comments";
      const body = md.render(token.content, { ...env, lineOffset, inNoteSection: true, inComments });
      const attrs = `class="note-section" data-section="${lang}" data-heading="${title}"`;
      if (lang === "work-history") return `<details ${attrs}><summary>${title}</summary>\n${body}</details>\n`;
      const lines = inComments && token.map ? ` data-start="${token.map[0]}" data-close="${token.map[1] - 1}"` : "";
      return `<section ${attrs}${lines}><h2>${title}</h2>\n${body}</section>\n`;
    }
    if (lang === "board" && !env.depth) {
      return '<div class="board-block"><pre><code>' + esc(token.content) + '</code></pre></div>\n';
    }
    if (lang === "top-tasks") {
      const { areas, count, countSet, order, orderSet, sprint, owner, fields, fieldsSet } = topTasksOptions(token.content);
      return `<div class="top-tasks-block" data-areas="${esc(areas.join(", "))}" data-count="${count}"`
        + `${countSet ? "" : ' data-count-default="1"'} data-order="${order}"${orderSet ? "" : ' data-order-default="1"'}`
        + ` data-sprint="${sprint}" data-owner="${esc(owner)}" data-fields="${esc(fields.join(","))}"${fieldsSet ? "" : ' data-fields-default="1"'}>`
        + `<pre><code>${esc(token.content)}</code></pre></div>\n`;
    }
    // A ```new-tasks block: a box with its items, rendered like any line; the app adds the Add field, and Edit
    // and Remove on each item. `data-close` is its closing fence's line, where Add puts a new item; each item
    // has its own line and text (`data-line`, `data-item`).
    if (lang === "new-tasks") {
      const { owner, items, lines } = newTasksBlock(token.content);
      const offset = env.lineOffset ?? 0;
      const close = token.map ? offset + token.map[1] - 1 : -1;
      const said = owner ? `For ${owner} · ${items.length} item${items.length === 1 ? "" : "s"} · Your agent turns them into tasks`
        : "No owner: line, so no agent sorts these";
      const at = (i) => (token.map ? ` data-line="${offset + token.map[0] + 1 + lines[i]}" data-item="${esc(items[i])}"` : "");
      const list = items.length ? items.map((item, i) => `<li${at(i)}><span class="newtasks-text">${md.renderInline(item, env)}</span></li>`).join("")
        : '<li class="muted">Nothing yet.</li>';
      return `<section class="newtasks" aria-label="New tasks" data-owner="${esc(owner)}" data-start="${token.map ? offset + token.map[0] : -1}" data-close="${close}">`
        + `<div class="suggest-head"><span data-icon="todo"></span><strong>New tasks</strong><small class="muted">${esc(said)}</small></div>`
        + `<ul class="newtasks-list">${list}</ul></section>\n`;
    }
    // A ```needs-attention block: the app puts the questions and mentions box (or one of them) there.
    if (lang === "needs-attention") {
      const { owner, login, show, showSet, reviewStatuses } = attentionOptions(token.content);
      return `<div class="attention-block" data-owner="${esc(owner)}" data-login="${esc(login)}" data-show="${show.join(",")}"`
        + `${show.includes("reviews") ? ` data-review-statuses="${esc(JSON.stringify(reviewStatuses))}"` : ""}`
        + `${showSet ? "" : ' data-show-default="1"'}><pre><code>${esc(token.content || lang)}</code></pre></div>\n`;
    }
    // A ```base block: a base view written in the page (what a .base file holds); the app draws its table there.
    // Its source stays the code's text, not an attribute, like a Mermaid diagram's.
    if (lang === "inbox-overview") return `<div class="inbox-overview-block"><pre><code>${esc(token.content)}</code></pre></div>\n`;
    if (lang === "ai-work-time") return `<div class="ai-time-block"><pre><code>${esc(token.content)}</code></pre></div>\n`;
    // A ```toc or ```subpages block: the app lists the page's headings, or the pages with it as their parent.
    if (PAGE_LIST_BLOCKS.includes(lang)) return `<div class="page-list-block" data-kind="${lang}"><pre><code>${esc(token.content || lang)}</code></pre></div>\n`;
    if (lang === "base") return `<div class="base-block"><pre><code>${esc(token.content)}</code></pre></div>\n`;
    // A task's ```subtasks, ```relations and ```commits, and a sprint's ```sprint: the app puts the box there.
    // A `task:` line shows another task's box, on any page; a ```sprint block's `show`, `owner` and `login` say
    // how much of the sprint's box it shows and whose tasks it also counts.
    if (APP_BLOCKS.includes(lang)) {
      const o = appBlockOptions(token.content);
      const keys = lang === "sprint" ? ["task", "sprint", "show", "owner", "login"] : ["task", "sprint"];
      const attrs = keys.map((k) => (o[k] ? ` data-${k}="${esc(o[k])}"` : "")).join("");
      return `<div class="app-block" data-block="${lang}"${attrs}><pre><code>${esc(token.content || lang)}</code></pre></div>\n`;
    }
    if (lang !== "mermaid") return fence(tokens, idx, options, env, self);
    return `<div class="mermaid-diagram"><pre><code>${esc(token.content)}</code></pre></div>\n`;
  };

  md.renderer.rules.callout_close = (tokens, idx) => (tokens[idx].meta.fold ? "</div></details>\n" : "</div></div>\n");

  return md;
}

/** How many tasks a ```top-tasks block shows when it doesn't say (and the box says so), and the most it can ask for. */
export const TOP_TASKS_COUNT = 3;
const TOP_TASKS_MAX = 20;

/**
 * Which sprint a ```top-tasks block takes its tasks from: only the current one, the current one and then the
 * next when it has none left, or every task (`off`, also when the line is left out or not known).
 */
export const TOP_TASKS_SPRINTS = ["current-only", "current-then-next", "off"];
const SPRINT_WORDS = { current: "current-only", "current-and-next": "current-then-next", next: "current-then-next", none: "off", no: "off", all: "off" };

/**
 * What each task in a top tasks box shows besides its name and Claim, when the block has no `fields:` line:
 * whether it can be started now, its priority and its area. `state` and `parent` are the box's own; any other
 * name is a task property (or a Task field, kept in the property the project's setup names).
 */
export const TOP_TASKS_FIELDS = ["state", "priority", "area"];

/**
 * The options of a ```top-tasks block, one per line, all written in the block, nothing taken from elsewhere:
 * `range: 3` (how many tasks; `count` in older blocks), `areas: Features, Docs` (or `[Features, Docs]`),
 * `order: priority-newest` (see `TASK_ORDERS`), `sprint: current-only` (see `TOP_TASKS_SPRINTS`),
 * `owner: Your Name` (whom Claim claims for) and `fields: parent, state, priority, area` (what each task shows
 * besides its name and Claim, in that order; lower case, each once; an empty line shows nothing more). Other lines
 * are ignored. A missing or odd range is three, a missing or odd order `priority-newest`, and missing fields
 * `TOP_TASKS_FIELDS`, with `countSet`, `orderSet` or `fieldsSet` false so the box can say so.
 */
export function topTasksOptions(src) {
  const out = { areas: [], count: TOP_TASKS_COUNT, countSet: false, order: "priority-newest", orderSet: false, sprint: "off", owner: "",
    fields: [...TOP_TASKS_FIELDS], fieldsSet: false };
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, "").trim();
  for (const line of String(src ?? "").split("\n")) {
    const m = line.match(/^\s*(areas|count|range|order|sprint|owner|fields)\s*:\s*(.*?)\s*$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "fields") {
      const names = m[2].replace(/^\[|\]$/g, "").split(",").map((f) => unquote(f).toLowerCase()).filter((f) => f && f !== "name" && f !== "claim");
      Object.assign(out, { fields: [...new Set(names)], fieldsSet: true });
    } else if (key === "areas") {
      out.areas = m[2].replace(/^\[|\]$/g, "").split(",").map(unquote).filter(Boolean);
    } else if (key === "sprint") {
      const v = unquote(m[2]).toLowerCase().replace(/[\s_]+/g, "-");
      out.sprint = TOP_TASKS_SPRINTS.includes(v) ? v : SPRINT_WORDS[v] ?? "off";
    } else if (key === "order") {
      const order = taskOrder(unquote(m[2]));
      if (order) Object.assign(out, { order, orderSet: true });
    } else if (key === "owner") {
      out.owner = unquote(m[2]);
    } else if (/^\d+$/.test(m[2])) {
      out.count = Math.min(TOP_TASKS_MAX, Math.max(1, Number(m[2])));
      out.countSet = true;
    }
  }
  return out;
}

/**
 * The options of a task's or a sprint's block (```subtasks, ```relations, ```commits, ```sprint), one per line:
 * `task: C-12` (a task's ID, name or `[[link]]`: show that task's box, on any page) and, for ```sprint,
 * `sprint: current` (or `next`, or a sprint's name or link; left out, the page's own), `show: progress` (only the
 * head, goal and progress bar, without the task list; anything else or left out: all of it) and `owner: Your Name`
 * with an optional `login: your-login` (also count that person's tasks in the sprint). Other lines are ignored.
 */
export function appBlockOptions(src) {
  const out = { task: "", sprint: "", show: "", owner: "", login: "" };
  for (const line of String(src ?? "").split("\n")) {
    const m = line.match(/^\s*(task|sprint|show|owner|login)\s*:\s*(.*?)\s*$/i);
    if (m) out[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, "").trim();
  }
  out.show = /^progress$/i.test(out.show) ? "progress" : "";
  out.login = out.login.replace(/^@/, "");
  return out;
}

/** What a ```needs-attention block can show, in the order the box lists them. */
const DEFAULT_ATTENTION = ["questions", "mentions"];
export const ATTENTION_SHOWS = ["reviews", ...DEFAULT_ATTENTION, "assignments"];

/**
 * The options of a ```needs-attention block, one per line, all written in the block: `show: questions, mentions`
 * (plus "reviews" and "assignments"; "both" means questions and mentions, "all" shows every kind; omitted, both, with `showSet` false so the box can
 * say so), `owner: Your Name` (whose questions: the tasks they asked for, review or whose agent has them) and
 * `login: your-login` (whose mentions: `@` and that GitHub login; the `@` may be written too). Other lines are
 * ignored. `review-statuses` is a comma-separated list, defaulting to Testing.
 */
export function attentionOptions(src) {
  const out = { owner: "", login: "", show: [...DEFAULT_ATTENTION], showSet: false, reviewStatuses: ["Testing"] };
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, "").trim();
  for (const line of String(src ?? "").split("\n")) {
    const m = line.match(/^\s*(owner|login|show|review-statuses)\s*:\s*(.*?)\s*$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "owner") out.owner = unquote(m[2]);
    else if (key === "login") out.login = unquote(m[2]).replace(/^@/, "");
    else if (key === "review-statuses") {
      const values = m[2].trim().replace(/^\[|\]$/g, "").split(",").map(unquote).filter(Boolean);
      if (values.length) out.reviewStatuses = [...new Set(values)];
    } else {
      const words = m[2].toLowerCase().replace(/^\[|\]$/g, "").split(/[\s,]+/).map(unquote).filter(Boolean);
      const picked = words.includes("all") ? [...ATTENTION_SHOWS]
        : ATTENTION_SHOWS.filter((kind) => words.some((word) => word === kind || word + "s" === kind
          || (word === "both" && DEFAULT_ATTENTION.includes(kind))));
      if (picked.length) Object.assign(out, { show: picked, showSet: true });
    }
  }
  return out;
}

/** Renders a whole note. Returns unsanitized HTML and the raw front matter. */
export function renderNote(md, text, env) {
  const { source, frontMatter } = prepareForPreview(text);
  const history = [];
  const body = md.parse(source, env).filter((token) => {
    if (token.level !== 0 || token.type !== "fence" || fenceLanguage(token.info) !== "work-history") return true;
    history.push(token);
    return false;
  });
  return { html: md.renderer.render([...body, ...history], md.options, env), frontMatter };
}


/** A board's columns and optional filters, written one per line. */
export function boardOptions(src) {
  const fields = {};
  for (const line of src.split(/\r?\n/)) {
    const match = /^\s*(columns|areas|assignee|sprint|type)\s*:\s*(.*?)\s*$/i.exec(line);
    if (match) fields[match[1].toLowerCase()] = match[2];
  }
  const list = (key) => {
    const seen = new Set();
    return (fields[key] ?? "").split(",").map((value) => value.trim()).filter((value) => {
      const lower = value.toLowerCase();
      if (!lower || seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  };
  return { columns: list("columns"), areas: list("areas"), assignee: fields.assignee ?? "",
    sprint: fields.sprint ?? "", types: list("type") };
}
