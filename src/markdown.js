// Markdown preview: wikilinks, embeds, callouts, task checkboxes.
// `env` (passed to render) supplies { resolve(target) -> path|null, href(path, heading), fromPath, depth }.
// Icons, embedded pages, base views and Mermaid diagrams are left as placeholders (`data-icon`, `.embed-page`, `.embed-base`,
// `.mermaid-diagram`) for the app to fill.

import { MarkdownIt } from "../vendor/vendor.js";
import { parseWikilink, isImagePath, prepareForPreview } from "./vault.js";

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
    const line = inline.map ? inline.map[0] : -1;
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
  const esc = md.utils.escapeHtml;
  md.inline.ruler.before("link", "wikilink", wikilinkRule);
  md.core.ruler.after("block", "callouts", calloutRule);
  md.core.ruler.after("inline", "tasks", taskRule);
  md.core.ruler.after("inline", "headings", headingRule);

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
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim().split(/\s+/)[0].toLowerCase() !== "mermaid") return fence(tokens, idx, options, env, self);
    return `<div class="mermaid-diagram"><pre><code>${esc(token.content)}</code></pre></div>\n`;
  };

  md.renderer.rules.callout_close = (tokens, idx) => (tokens[idx].meta.fold ? "</div></details>\n" : "</div></div>\n");

  return md;
}

/** Renders a whole note. Returns unsanitized HTML and the raw front matter. */
export function renderNote(md, text, env) {
  const { source, frontMatter } = prepareForPreview(text);
  return { html: md.render(source, env), frontMatter };
}
