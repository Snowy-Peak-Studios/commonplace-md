// The editor's Insert menu: the Markdown and the app blocks it offers, and where each one goes in the note.

import { splitFrontMatter } from "./vault.js";

/** The menu's groups, in the order they show. */
export const INSERT_GROUPS = ["Markdown", "Task sections", "Views"];

/**
 * What the Insert menu offers. `text` is what goes into the note; `select` is the part of it that's selected
 * afterwards, so typing replaces it (an inline item takes the selected text in its place). `inline` items go at
 * the cursor; the others are blocks, put on lines of their own. The preview shows `sample` in read mode when the
 * block needs the vault's notes to show anything (a view), and `text` itself otherwise.
 */
export const INSERTS = [
  // ---- Markdown ----
  { id: "heading", group: "Markdown", label: "Heading", about: "A section title. More # signs make a smaller heading.", text: "## Heading", select: "Heading" },
  { id: "bold", group: "Markdown", label: "Bold", about: "Strong text.", text: "**bold text**", select: "bold text", inline: true, sample: "Some **bold text** in a line." },
  { id: "italic", group: "Markdown", label: "Italic", about: "Emphasised text.", text: "*italic text*", select: "italic text", inline: true, sample: "Some *italic text* in a line." },
  { id: "wikilink", group: "Markdown", label: "Link to a page", about: "A link to another note in this vault, by its name.", text: "[[Page name]]", select: "Page name", inline: true, sample: "See [[Page name]]." },
  { id: "link", group: "Markdown", label: "Web link", about: "A link to a web page.", text: "[link text](https://example.com)", select: "link text", inline: true, sample: "Read the [link text](https://example.com)." },
  { id: "bullets", group: "Markdown", label: "Bulleted list", about: "A list. Indent a line to make a subpoint.", text: "- First item\n- Second item", select: "First item" },
  { id: "numbers", group: "Markdown", label: "Numbered list", about: "A list in order.", text: "1. First step\n2. Second step", select: "First step" },
  { id: "checklist", group: "Markdown", label: "Checklist", about: "Boxes you can tick in Read mode.", text: "- [ ] Something to do\n- [x] Something done", select: "Something to do" },
  { id: "quote", group: "Markdown", label: "Quote", about: "Words from someone else.", text: "> A quote", select: "A quote" },
  { id: "callout", group: "Markdown", label: "Callout", about: "A box that stands out. Other kinds: tip, info, warning, question, danger.", text: "> [!note] Title\n> What it says.", select: "Title" },
  { id: "table", group: "Markdown", label: "Table", about: "Rows and columns.", text: "| Column | Column |\n| --- | --- |\n| Cell | Cell |", select: "Column" },
  { id: "code", group: "Markdown", label: "Code block", about: "Text shown as it is, in a fixed-width font. Name a language after the backticks for colours.", text: "```\ncode\n```", select: "code" },
  { id: "divider", group: "Markdown", label: "Divider", about: "A line across the page.", text: "---", sample: "Above\n\n---\n\nBelow" },
  { id: "mermaid", group: "Markdown", label: "Diagram", about: "A Mermaid diagram written as text.", text: "```mermaid\nflowchart LR\n  Idea --> Note --> Task\n```", select: "Idea --> Note --> Task" },
  // ---- Task sections: named sections, shown as they are ----
  { id: "description", group: "Task sections", label: "Description", about: "A task's story: who wants what, and why.", text: "```description\n**As** someone, **I want** something **so that** it helps.\n```", select: "**As** someone, **I want** something **so that** it helps." },
  { id: "acceptance-criteria", group: "Task sections", label: "Acceptance criteria", about: "What must be true when the task is done.", text: "```acceptance-criteria\n- [ ] It works\n```", select: "It works" },
  { id: "review", group: "Task sections", label: "Review", about: "For the reviewer: what changed and what to test, shown in the inbox's For review.", text: "```review\nchanged:\n- What this work changed\ntest:\n- What to check\n```", select: "What this work changed" },
  { id: "comments", group: "Task sections", label: "Comments", about: "The talk about a task, with a box to add a comment.", text: "```comments\n```" },
  { id: "work-history", group: "Task sections", label: "Work history", about: "A log of the work on a task, folded.", text: "```work-history\n- Started.\n```", select: "Started." },
  { id: "subtasks", group: "Task sections", label: "Subtasks", about: "A task's child tasks and their progress, from their parent property.", text: "```subtasks\n```",
    sample: "**Subtasks** · 1 of 2 done\n\n- [x] Write the outline\n- [ ] Write the guide" },
  { id: "relations", group: "Task sections", label: "Relations", about: "Links between tasks: blocked by, relates to.", text: "```relations\n```",
    sample: "**Relations**\n\n- Blocked by [[Write the outline]]" },
  { id: "assets", group: "Task sections", label: "Occupied assets", about: "The files a task expects to change, one per line.", text: "```assets\nWiki/Page.md\n```", select: "Wiki/Page.md",
    sample: "**Occupied assets**\n\n- `Wiki/Page.md`" },
  { id: "commits", group: "Task sections", label: "Commits", about: "A task's commits, from its commits property.", text: "```commits\n```",
    sample: "**Commits**\n\n- `a1b2c3d` Add the guide" },
  // ---- Views: they show the vault's notes ----
  { id: "toc", group: "Views", label: "Table of contents", about: "This page's headings, as links.", text: "```toc\n```",
    sample: "**Contents**\n\n- Heading\n  - Smaller heading\n- Another heading" },
  { id: "subpages", group: "Views", label: "Subpages", about: "The pages under this one, from their parent property.", text: "```subpages\ndepth: 1\n```",
    sample: "**Subpages**\n\n- [[A page under this one]]\n- [[Another page]]" },
  { id: "base", group: "Views", label: "Base table", about: "A table of notes with filters, formulas and views.", text: "```base\nfilters: 'file.inFolder(\"Notes\")'\nviews:\n  - type: table\n    name: Notes\n```", select: "Notes",
    sample: "| Name | Modified |\n| --- | --- |\n| First note | 2026-01-02 |\n| Second note | 2026-01-01 |" },
  { id: "top-tasks", group: "Views", label: "Top tasks", about: "Tasks to work on next, with Claim.", text: "```top-tasks\nrange: 3\nowner: Your name\n```", select: "Your name",
    sample: "**Tasks for today**\n\n1. Write the guide · High · Docs\n2. Fix the save button · Medium · Bugs\n3. Add a reading list · Low · Features" },
  { id: "needs-attention", group: "Views", label: "Needs attention", about: "Reviews, questions and mentions for a person.", text: "```needs-attention\nshow: reviews, questions, mentions\nowner: Your name\n```", select: "Your name",
    sample: "**For review** · Write the guide\n\n**Questions** · Which colour for the logo?\n\n**Mentions** · @you on Fix the save button" },
  { id: "new-tasks", group: "Views", label: "New tasks", about: "A box for ideas, one per line, for a person's agent to turn into tasks.", text: "```new-tasks\nowner: Your name\n```", select: "Your name",
    sample: "**New tasks** · sorted by Your name's agent\n\n- Add a reading list\n\n*Add an idea…*" },
  { id: "inbox-overview", group: "Views", label: "Inbox overview", about: "A private overview of chosen inboxes, on this device.", text: "```inbox-overview\ncontext: My inbox\nrefresh: manual\n```", select: "My inbox",
    sample: "**My inbox** · 3 items\n\n- For review · Write the guide\n- Question · Which colour for the logo?" },
  { id: "sprint", group: "Views", label: "Sprint", about: "The current sprint's progress and tasks.", text: "```sprint\n```",
    sample: "**Sprint 3** · 4 of 9 tasks done · 6 of 14 days gone\n\n- [x] Write the outline\n- [ ] Write the guide" },
  { id: "board", group: "Views", label: "Board", about: "Task cards in status columns.", text: "```board\ncolumns: To Do, In Progress, Done\n```", select: "To Do, In Progress, Done",
    sample: "| To Do | In Progress | Done |\n| --- | --- | --- |\n| Write the guide | Fix the save button | Write the outline |" },
  { id: "occupied", group: "Views", label: "Occupied assets (all tasks)", about: "The files tasks in progress occupy now, and overlaps.", text: "```occupied\n```",
    sample: "**Occupied assets**\n\n- `Wiki/Page.md` · Write the guide\n- ⚠ `src/app.js` · two tasks" },
  { id: "ai-work-time", group: "Views", label: "AI work time", about: "Recorded AI work time, as a chart by area and type.", text: "```ai-work-time\n```",
    sample: "**AI work time**\n\n| Area | Minutes |\n| --- | --- |\n| Features | 120 |\n| Docs | 45 |" },
];

/** The entries whose name or description has every word of `query` (any case). */
export function filterInserts(query, list = INSERTS) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter((e) => {
    const hay = `${e.label} ${e.about} ${e.id} ${e.group}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** The Markdown the preview shows for an entry. */
export const insertSample = (entry) => entry.sample ?? entry.text;

/**
 * Where an entry goes into `text`, with `from`–`to` selected in the editor. Returns the change
 * (`from`, `to`, `insert`) and what to select afterwards (`anchor`, `head`, in the new text).
 *
 * An inline entry replaces the selection; a short one-line selection takes the place of its `select` part
 * (`**selected**`). A block goes on lines of its own, with an empty line around it: after the line the cursor
 * is on (before it, when the cursor is at the line's start), and never inside the front matter.
 */
export function insertion(text, from, to, entry) {
  if (entry.inline) {
    const picked = text.slice(from, to);
    let insert = entry.text;
    let start = entry.select ? insert.indexOf(entry.select) : -1;
    let length = entry.select?.length ?? 0;
    if (picked && !picked.includes("\n") && start >= 0) {
      insert = insert.slice(0, start) + picked + insert.slice(start + length);
      length = picked.length;
    }
    if (start < 0) { start = insert.length; length = 0; }
    return { from, to, insert, anchor: from + start, head: from + start + length };
  }
  const front = splitFrontMatter(text);
  const bodyStart = front ? front.length : 0;
  let at = Math.max(to, bodyStart);
  if (at > bodyStart && text[at - 1] !== "\n") {
    const end = text.indexOf("\n", at);
    at = end < 0 ? text.length : end;
  }
  // The text before needs to end in an empty line (or be the start of the note's body).
  const before = text.slice(bodyStart, at);
  const lead = !before ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  // A divider on the note's first line would start front matter.
  const guard = at === 0 && entry.text.startsWith("---") ? "\n" : "";
  const after = text.slice(at);
  // …and the text after starts after an empty line; at the note's end, one line end is enough.
  const trail = /^\n*$/.test(after) ? (after ? "" : "\n") : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const insert = lead + guard + entry.text + trail;
  const base = at + lead.length + guard.length;
  const start = entry.select ? entry.text.indexOf(entry.select) : -1;
  return start < 0
    ? { from: at, to: at, insert, anchor: base + entry.text.length, head: base + entry.text.length }
    : { from: at, to: at, insert, anchor: base + start, head: base + start + entry.select.length };
}
