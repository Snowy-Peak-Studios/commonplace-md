// Vault rules: wikilinks, link resolution, front matter, the generated navigation box and note templates.
// No DOM and no network here, so tests can run it in Node.

const FRONT_MATTER = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/;
const NAV_START = /^%% nav:.*%%[ \t]*$/m;
const NAV_END = /^%% \/nav %%[ \t]*$/m;
const IMAGE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

export const toLf = (text) => text.replace(/\r\n?/g, "\n");
export const isImagePath = (path) => IMAGE.test(path);
const blankOut = (s) => s.replace(/[^\n]/g, "");

/** Splits `[[target#heading|alias]]` (the part inside the brackets). */
export function parseWikilink(inner) {
  const bar = inner.indexOf("|");
  let left = bar >= 0 ? inner.slice(0, bar) : inner;
  const alias = bar >= 0 ? inner.slice(bar + 1).trim() : "";
  left = left.replace(/\\$/, ""); // `[[Page\|alias]]` inside a table
  const hash = left.indexOf("#");
  const target = (hash >= 0 ? left.slice(0, hash) : left).trim();
  const heading = hash >= 0 ? left.slice(hash + 1).trim() : "";
  return { target, heading: heading || null, alias: alias || null };
}

/** Finds the generated navigation box: from the `%% nav: ... %%` line to the end of the `%% /nav %%` line. */
export function findNavBlock(text) {
  const from = text.search(NAV_START);
  if (from < 0) return null;
  const rest = text.slice(from);
  const endLine = rest.search(NAV_END);
  if (endLine < 0) return null;
  const lineEnd = text.indexOf("\n", from + endLine);
  return { from, to: lineEnd < 0 ? text.length : lineEnd };
}

/** The YAML front matter, if the note starts with one. */
export function splitFrontMatter(text) {
  const m = FRONT_MATTER.exec(toLf(text));
  return m ? { raw: m[1], length: m[0].length } : null;
}

/**
 * Turns a note into what the Markdown renderer shows. Every line keeps its line number, so a
 * rendered checkbox can point back at its source line: the front matter and comments become
 * empty lines, and the navigation box becomes a collapsed `[!nav]` callout.
 */
export function prepareForPreview(text) {
  let src = toLf(text);
  const fm = FRONT_MATTER.exec(src);
  if (fm) src = blankOut(fm[0]) + src.slice(fm[0].length);
  const nav = findNavBlock(src);
  if (nav) {
    const lines = src.slice(nav.from, nav.to).split("\n");
    lines[0] = "";
    lines[lines.length - 1] = "";
    const first = lines.findIndex((l) => /^> \[!/.test(l));
    if (first >= 0) lines[first] = lines[first].replace(/^> \[![\w-]+\][+-]?/, "> [!nav]-");
    src = src.slice(0, nav.from) + lines.join("\n") + src.slice(nav.to);
  }
  src = src.replace(/%%[\s\S]*?%%/g, blankOut);
  return { source: src, frontMatter: fm ? fm[1] : null };
}

/** Every `[[link]]` and `![[embed]]` outside code, as written. */
export function findWikilinks(text) {
  const src = prepareForPreview(text).source
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, "")
    .replace(/`[^`\n]*`/g, "");
  const out = [];
  for (const m of src.matchAll(/(!?)\[\[([^\]\n]+)\]\]/g)) out.push({ embed: m[1] === "!", raw: m[0], ...parseWikilink(m[2]) });
  return out;
}

/** Finds pages: a bare name matches a file name anywhere in the vault. */
export class LinkIndex {
  constructor(paths) {
    this.paths = paths;
    this.exact = new Map();
    this.byName = new Map();
    this.byStem = new Map();
    const add = (map, key, p) => (map.get(key) || map.set(key, []).get(key)).push(p);
    for (const p of paths) {
      const lower = p.toLowerCase();
      this.exact.set(lower, p);
      const name = lower.slice(lower.lastIndexOf("/") + 1);
      add(this.byName, name, p);
      if (name.endsWith(".md")) add(this.byStem, name.slice(0, -3), p);
    }
  }

  has(path) {
    return this.exact.has(path.toLowerCase());
  }

  /** The path a link target leads to, or null. An empty target is the page itself. */
  resolve(target, fromPath = "") {
    const t = target.trim().replace(/^\/+/, "").toLowerCase();
    if (!t) return fromPath || null;
    const direct = this.exact.get(t) || this.exact.get(t + ".md");
    if (direct) return direct;
    if (t.includes("/")) {
      return pick(this.paths.filter((p) => {
        const l = p.toLowerCase();
        return l.endsWith("/" + t) || l.endsWith("/" + t + ".md");
      }), fromPath);
    }
    return pick(this.byStem.get(t) || this.byName.get(t) || [], fromPath);
  }
}

const dirOf = (p) => p.slice(0, p.lastIndexOf("/") + 1);

function pick(candidates, fromPath) {
  if (candidates.length <= 1) return candidates[0] || null;
  const here = dirOf(fromPath);
  const local = candidates.find((p) => dirOf(p) === here);
  if (local) return local;
  return [...candidates].sort((a, b) => a.split("/").length - b.split("/").length || a.length - b.length)[0];
}

const FORBIDDEN_TITLE = /[*"\\/<>:|?#^[\]]/;

/** Why a title can't be a note's file name, or null when it can. */
export function titleProblem(title) {
  if (!title.trim()) return "The title is empty.";
  if (FORBIDDEN_TITLE.test(title)) return 'A title can\'t contain * " \\ / < > : | ? # ^ [ ]';
  if (title.startsWith(".")) return "A title can't start with a dot.";
  return null;
}

/** How a new Markdown note starts when its repo has no note template. */
export const defaultNote = (title) => `# ${title.trim()}\n\n`;

/**
 * Where a plain Markdown link in a note leads when it's a relative link to another file, as GitHub reads it:
 * `[Add a vault](Add%20a%20vault.md#the-steps)` from `How To/Start.md` is `{ path: "How To/Add a vault.md",
 * heading: "the steps" }`. A leading `/` starts at the top of the vault. Null for a web or mail address, an
 * address in the app (`#/...`), a heading on the same page, or a path that climbs above the top.
 */
export function relativeLink(href, fromPath = "") {
  const raw = String(href ?? "").trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  const at = raw.indexOf("#");
  const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
  const target = decode((at < 0 ? raw : raw.slice(0, at)).split("?")[0]);
  const parts = target.startsWith("/") ? [] : String(fromPath).split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg !== "..") parts.push(seg);
    else if (!parts.length) return null;
    else parts.pop();
  }
  if (!parts.length) return null;
  const heading = at < 0 ? "" : decode(raw.slice(at + 1)).replace(/-/g, " ").trim();
  return { path: parts.join("/"), heading: heading || null };
}

/** The blocks a task's page shows its boxes in, and a sprint's: the app adds no box a note doesn't ask for. */
export const TASK_BLOCKS = ["subtasks", "relations", "commits"];
export const SPRINT_BLOCKS = ["sprint"];

/** Whether the note has a fenced block of this name: ```name (or ~~~name) on a line of its own. */
export function hasBlock(text, name) {
  return new RegExp(`^ {0,3}(?:\`{3,}|~{3,})[ \\t]*${name}[ \\t]*$`, "mi").test(toLf(text));
}

/** What is written inside each fenced block of this name (```name ... ```), in order: one string per block. */
export function blockContents(text, name) {
  const out = [];
  let open = null, body = [];
  for (const line of toLf(text).split("\n")) {
    if (open) {
      const f = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
      if (f && f[1][0] === open[0] && f[1].length >= open.length) { out.push(body.join("\n")); open = null; }
      else body.push(line);
      continue;
    }
    const f = new RegExp(`^ {0,3}(\`{3,}|~{3,})[ \t]*${name}[ \t]*$`, "i").exec(line);
    if (f) { open = f[1]; body = []; }
  }
  return out;
}

/**
 * The note with these blocks written in, each an empty fence, under its first `# ` heading (else at the
 * top of its body). A note that already has any of them keeps what it has: it chose its own.
 */
export function withBlocks(text, names) {
  const src = toLf(text);
  if (!names.length || names.some((n) => hasBlock(src, n))) return src;
  const blocks = names.map((n) => `\`\`\`${n}\n\`\`\``).join("\n\n");
  const start = splitFrontMatter(src)?.length ?? 0;
  const head = /^# .*$/m.exec(src.slice(start));
  const at = head ? start + head.index + head[0].length : start;
  const rest = src.slice(at).replace(/^\n+/, "");
  return `${src.slice(0, at)}${head ? "\n\n" : ""}${blocks}\n${rest ? `\n${rest}` : ""}`;
}

/** A note template with `{{title}}` and `{{date}}` (YYYY-MM-DD) filled in; any other `{{...}}` stays as written. */
export function fillTemplate(text, { title = "", date = "" } = {}) {
  const values = { title: title.trim(), date };
  return toLf(text).replace(/\{\{\s*(title|date)\s*\}\}/gi, (_, k) => values[k.toLowerCase()]);
}

/** A date as YYYY-MM-DD, in local time. */
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * The notes that can be someone's inbox: the repo's Inbox page and the `.md` files directly in its
 * inboxes folder (not deeper: `Local/` there holds inboxes kept off GitHub).
 */
export function inboxCandidates(paths, inbox = "", inboxes = "") {
  const folder = inboxes.replace(/^\/+|\/+$/g, "");
  const prefix = folder ? folder + "/" : null;
  return paths.filter((p) => p === inbox || (prefix && p.startsWith(prefix) && p.toLowerCase().endsWith(".md")
    && !p.slice(prefix.length).includes("/")));
}

/**
 * The signed-in person's own inbox: the note whose `github` property is their GitHub login (any case),
 * from [{ path, props }]; the repo's Inbox page when none is.
 */
export function ownInboxPath(notes, login, fallback = "") {
  const who = String(login ?? "").trim().toLowerCase();
  if (!who) return fallback;
  const mine = notes.find((n) => String(n.props?.github ?? "").trim().toLowerCase() === who);
  return mine ? mine.path : fallback;
}

// ================================================================
// New tasks: a ```new-tasks block's items, sorted into tasks by agents
// ================================================================

/**
 * A ```new-tasks block's content: its `owner:` line (whose items they are) and its items, one per other
 * non-empty line, without a leading list mark or checkbox (`- `, `* `, `1. `, `- [ ] `). `lines` has each item's
 * line in the content (from 0), so the box can change it.
 */
export function newTasksBlock(src) {
  const out = { owner: "", items: [], lines: [] };
  String(src ?? "").split("\n").forEach((line, n) => {
    const m = line.match(/^\s*owner\s*:\s*(.*?)\s*$/i);
    if (m) { out.owner = m[1].replace(/^["']|["']$/g, "").trim(); return; }
    const item = line.replace(ITEM_MARK, "").trim();
    if (item) { out.items.push(item); out.lines.push(n); }
  });
  return out;
}

/** A new-tasks item's leading list mark and checkbox, if it has them. */
const ITEM_MARK = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/;

/**
 * The note with the ```new-tasks item on line `line` (from 0) changed to `now`, keeping its list mark and
 * checkbox, or taken out when `now` is empty. Nothing changes unless that line still holds the item `was`
 * (the note may have changed since the box was drawn).
 */
export function editNewTask(text, line, was, now) {
  const lines = toLf(text).split("\n");
  if (!(line >= 0 && line < lines.length)) return text;
  const mark = lines[line].match(ITEM_MARK)?.[0] ?? "";
  if (lines[line].slice(mark.length).trim() !== String(was ?? "").trim()) return text;
  const said = String(now ?? "").replace(/\s*\n\s*/g, " ").trim();
  if (said) lines[line] = mark + said;
  else lines.splice(line, 1);
  return lines.join("\n");
}

/**
 * The note with `- item` added to a ```new-tasks block, whose closing fence is line `close` (from 0): just
 * above that line. A block left open (no closing fence) runs to the end of the note, so the item goes last.
 */
export function addNewTask(text, close, item) {
  const lines = toLf(text).split("\n");
  const said = String(item ?? "").replace(/\s*\n\s*/g, " ").trim();
  if (!said || !(close >= 0 && close < lines.length)) return text;
  const at = /^\s*(`{3,}|~{3,})\s*$/.test(lines[close]) ? close : lines.length;
  lines.splice(at, 0, `- ${said}`);
  return lines.join("\n");
}

// ================================================================
// Mentions: `@login` in a note, found for that person's inbox
// ================================================================

/**
 * A mention: `@` and a GitHub login (letters, digits and single hyphens, up to 39), not right after a letter,
 * a digit or one of `.+-_/@` (so not an email or a path), and not followed by more of a login. Group 1 is
 * what comes before the `@`, group 2 the login.
 */
export const MENTION = /(^|[^\p{L}\p{N}.+\-_/@`])@([A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38})(?![\p{L}\p{N}_-])/gu;

/** A reply line: it starts with `@login`, after spaces, `>`, a list mark or a checkbox. Group 1 is the login. */
const REPLY = /^\s*(?:>\s*)*(?:(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)?@([A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38})(?![\p{L}\p{N}_-])/u;

/** The property of an inbox that keeps the mentions its person marked as seen: one key per mention. */
export const SEEN_MENTIONS = "seen_mentions";

/** The seen list as written (a list, or one key), as is: a note's path can have commas and capitals. */
const seenList = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]).map((x) => String(x).trim()).filter(Boolean);

/**
 * A mention's key for the seen list: the note's path, `#`, and a short hash of the login and the line's words,
 * so a mention stays seen while its line stays the same, and shows again when the line is changed.
 */
export function mentionKey(path, m) {
  let h = 0x811c9dc5;
  for (const ch of `${String(m.login).toLowerCase()}\n${m.text}`) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${path}#${h.toString(16).padStart(8, "0")}`;
}

/**
 * A person's mentions (each with its `path`) sorted for their inbox: `open` (not answered, not seen), `seen`
 * (its key is in `seen`, the inbox's seen list) and `answered` (a reply is right under it), each in the order given.
 */
export function sortMentions(found, seen = []) {
  const known = new Set(seenList(seen));
  const out = { open: [], seen: [], answered: [] };
  for (const m of found) (m.answered ? out.answered : known.has(mentionKey(m.path, m)) ? out.seen : out.open).push(m);
  return out;
}

/**
 * The inbox's new seen list: what it had plus the mentions in `add`, keeping only the keys of mentions in
 * `found` that aren't answered (the others are gone, or cleared by a reply), so the list doesn't grow forever.
 */
export function withSeenMentions(seen, add, found) {
  const live = new Set(found.filter((m) => !m.answered).map((m) => mentionKey(m.path, m)));
  const keys = [...seenList(seen), ...add.map((m) => mentionKey(m.path, m))];
  return [...new Set(keys)].filter((k) => live.has(k));
}

/**
 * Every mention in a note: [{ login, line, heading, text, answered }], `line` counting from 1 in the whole file,
 * `heading` the one above it ("" at the top), and `text` the line itself, cut short. The front matter,
 * fenced code and inline code don't count. One per login and line. `answered` when the very next line is a
 * reply: it starts (after a list mark, checkbox or `>`) with `@` and someone else's login.
 */
export function findMentions(text) {
  const src = toLf(text);
  const fm = splitFrontMatter(src);
  const skipped = fm ? src.slice(0, fm.length).split("\n").length - 1 : 0;
  const lines = (fm ? src.slice(fm.length) : src).split("\n");
  const out = [];
  let fence = null, heading = "";
  lines.forEach((line, i) => {
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      return;
    }
    if (f) { fence = f[1]; return; }
    const h = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) heading = h[1];
    const plain = line.replace(/`[^`\n]*`/g, (s) => " ".repeat(s.length));
    const seen = new Set();
    for (const m of plain.matchAll(MENTION)) {
      if (seen.has(m[2].toLowerCase())) continue;
      seen.add(m[2].toLowerCase());
      const said = line.trim();
      const reply = REPLY.exec(lines[i + 1] ?? "");
      out.push({ login: m[2], line: skipped + i + 1, heading, text: said.length > 160 ? said.slice(0, 157).trimEnd() + "..." : said,
        answered: !!reply && reply[1].toLowerCase() !== m[2].toLowerCase() });
    }
  });
  return out;
}

/**
 * The people of a vault, from its inboxes ([{ path, props }]): each inbox with a `github` login gives
 * { login, name, path }, the name from its `owner` (else the login); each login once, sorted by name.
 */
export function vaultPeople(notes) {
  const seen = new Map();
  for (const n of notes) {
    const login = String(n.props?.github ?? "").trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login) || seen.has(login.toLowerCase())) continue;
    seen.set(login.toLowerCase(), { login, name: String(n.props.owner ?? "").trim() || login, path: n.path });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.login.localeCompare(b.login));
}

// ================================================================
// Suggested tasks: the top free tasks an inbox shows
// ================================================================

/** A task note: a `.md` file in a folder named `Tasks` (any case, at any depth). */
export const isTaskPath = (path) => /(^|\/)tasks\/[^/]+\.md$/i.test(path);

const blank = (v) => v == null || (Array.isArray(v) ? v.every(blank) : String(v).trim() === "");
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
/** Statuses that aren't free to start: started, put off, blocked or over. */
const NOT_FREE = /^(done|in progress|waiting|blocked|cancell?ed|won'?t do)$/i;

/** A list property as lower-case strings: `[A, B]` or `"A, B"`. */
export function listProp(v) {
  if (blank(v)) return [];
  return (Array.isArray(v) ? v : String(v).split(",")).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
}

/**
 * The top free tasks, from [{ path, props }]: no assignee, not started or done, in one of `areas`
 * (any area when empty), sorted in `order` (`TASK_ORDERS`; by default the highest priority first, and within a
 * priority the newest, the highest ID number, first) and cut to `count`.
 */
const rank = (n) => PRIORITY_RANK[String(n.props.priority ?? "").trim().toLowerCase()] ?? 3;
const idNum = (n) => Number(/(\d+)\s*$/.exec(String(n.props.id ?? ""))?.[1] ?? -1);

/**
 * The orders a top tasks box can sort by: priority (High, Medium, Low, then none) and the newest or oldest
 * first within it, or only the newest or oldest (by the number at the end of `id`). `priority-newest` is
 * what the box used before it could be chosen.
 */
export const TASK_ORDERS = ["priority-newest", "priority-oldest", "newest", "oldest"];
const ORDER_WORDS = { priority: "priority-newest", "priority-only": "priority-newest", "newest-first": "newest", "oldest-first": "oldest" };
/** An `order:` value as one of `TASK_ORDERS`, or "" when it isn't one. */
export function taskOrder(v) {
  const w = String(v ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  return TASK_ORDERS.includes(w) ? w : ORDER_WORDS[w] ?? "";
}
/** A sort for tasks in that order; the file path settles ties, so the order is always the same. */
function byOrder(order = "priority-newest") {
  const age = order.endsWith("oldest") ? (a, b) => idNum(a) - idNum(b) : (a, b) => idNum(b) - idNum(a);
  const prio = order.startsWith("priority") ? (a, b) => rank(a) - rank(b) : () => 0;
  return (a, b) => prio(a, b) || age(a, b) || a.path.localeCompare(b.path);
}
/** Statuses of work that's over. */
const FINISHED = /^(done|cancell?ed|won'?t do)$/i;
/** The status of a task put off with "Not now": on the waiting list, out of the suggestions. */
export const WAITING = "Waiting";
const isWaiting = (n) => String(n.props.status ?? "").trim().toLowerCase() === WAITING.toLowerCase();

export function suggestTasks(notes, { areas = [], count = 3, blocked = null, order = "priority-newest" } = {}) {
  const want = listProp(areas);
  return notes
    .filter((n) => isTaskPath(n.path) && blank(n.props.assignee) && !NOT_FREE.test(String(n.props.status ?? "").trim()) && !isEpic(n)
      && !blocked?.has(n.path)
      && (!want.length || want.includes(String(n.props.area ?? "").trim().toLowerCase())))
    .sort(byOrder(order))
    .slice(0, count);
}

/** A person's name for comparing: any case, accents and spacing (`Zoë` matches `Zoe`, `Łukasz` matches `Lukasz`). */
export const foldName = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "")
  .replace(/[łŁ]/g, "l").replace(/[øØ]/g, "o").replace(/[đĐ]/g, "d").replace(/ß/g, "ss")
  .toLowerCase().replace(/\s+/g, " ").trim();

/** An assignee split into the person and their agent: `Ann Example (Claude)` -> { name: "Ann Example", agent: "Claude" }. */
export function splitAssignee(value) {
  const s = String(value ?? "").trim();
  const m = /^(.*?)\s*\(([^()]+)\)$/.exec(s);
  return m && m[1] ? { name: m[1], agent: m[2].trim() } : { name: s, agent: null };
}

/**
 * The tasks claimed by `owner` and not finished, from [{ path, props }], each with `agent` (null when the
 * person claimed it for themself, which means it waits for their agent). Those waiting come first, then by
 * priority and newest, like the free ones.
 */
export function claimedTasks(notes, owner) {
  const me = foldName(owner);
  if (!me) return [];
  return notes
    .filter((n) => isTaskPath(n.path) && !FINISHED.test(String(n.props.status ?? "").trim()) && !isWaiting(n)
      && foldName(splitAssignee(n.props.assignee).name) === me)
    .map((n) => ({ ...n, agent: splitAssignee(n.props.assignee).agent }))
    .sort((a, b) => (a.agent ? 1 : 0) - (b.agent ? 1 : 0) || rank(a) - rank(b) || idNum(b) - idNum(a) || a.path.localeCompare(b.path));
}

/** A task's open question: its `question` property, trimmed; "" when it has none. */
export const questionOf = (props) => (Array.isArray(props?.question) ? props.question.join(" ") : String(props?.question ?? "")).trim();

/**
 * The tasks with an open question (a `question` property), from [{ path, props }], each with its `question`.
 * Only `owner`'s: the tasks they asked for (`requested_by`), review (`reviewer`) or whose agent has them
 * (`assignee`, with or without the agent), names matched like `claimedTasks`; everyone's when `owner` is
 * empty. Finished tasks don't count. Newest first.
 */
export function questionTasks(notes, owner = "") {
  const me = foldName(owner);
  const people = (v) => (Array.isArray(v) ? v : [v]).map((x) => foldName(splitAssignee(x).name));
  const theirs = (n) => !me || [n.props.requested_by, n.props.reviewer, n.props.assignee].some((v) => people(v).includes(me));
  return notes
    .filter((n) => isTaskPath(n.path) && questionOf(n.props) && !FINISHED.test(String(n.props.status ?? "").trim()) && theirs(n))
    .map((n) => ({ ...n, question: questionOf(n.props) }))
    .sort((a, b) => idNum(b) - idNum(a) || a.path.localeCompare(b.path));
}

/**
 * The answer written on a task: what follows its `**Answer:**` line (or an *Answer* heading), up to the next
 * heading, a `---` line or the acceptance criteria (a checkbox line, for a task with no heading over them),
 * trimmed; "" when nothing is written there yet, or there's no such line.
 */
export function taskAnswer(text) {
  const src = toLf(text);
  const fm = splitFrontMatter(src);
  const lines = (fm ? src.slice(fm.length) : src).split("\n");
  const at = lines.findIndex((l) => /^\s*(?:\*\*Answer:?\*\*:?|#{2,6}\s+(?:\S+\s+)?Answer:?\s*$)/i.test(l));
  if (at < 0) return "";
  const first = lines[at].replace(/^\s*(?:\*\*Answer:?\*\*:?|#{2,6}\s+.*)/i, "");
  const rest = [];
  for (const l of lines.slice(at + 1)) {
    if (/^#{1,6}\s|^\s*(?:-{3,}|\*{3,})\s*$|^\s*[-*+]\s+\[[ xX]\]/.test(l)) break;
    rest.push(l);
  }
  return [first, ...rest].join("\n").trim();
}

/** The areas the task notes use, from [{ path, props }]: each once (any case), sorted. */
export function taskAreas(notes) {
  const seen = new Map();
  for (const n of notes) {
    const area = String(n.props.area ?? "").trim();
    if (isTaskPath(n.path) && area && !seen.has(area.toLowerCase())) seen.set(area.toLowerCase(), area);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** The priorities a task can have, highest first. */
export const PRIORITIES = ["High", "Medium", "Low"];

/**
 * The waiting list: tasks put off with "Not now" (`status: Waiting`), from [{ path, props }]. Those in
 * `areas` (any when empty) or claimed by `owner`; highest priority, then newest, first.
 */
/** An epic isn't worked on itself (its parts are), so it's never suggested or put on the waiting list. */
const isEpic = (n) => String(n.props.type ?? "").trim().toLowerCase() === "epic";

export function waitingTasks(notes, { areas = [], owner = "", order = "priority-newest" } = {}) {
  const want = listProp(areas);
  const me = foldName(owner);
  return notes
    .filter((n) => isTaskPath(n.path) && isWaiting(n) && !isEpic(n) && (!want.length
      || want.includes(String(n.props.area ?? "").trim().toLowerCase())
      || (me && foldName(splitAssignee(n.props.assignee).name) === me)))
    .sort(byOrder(order));
}

/**
 * Whether a task can be started now, from its note's text: { state, reason }, `state` being "ready",
 * "decision" (it needs a decision first) or "placeholder" (not written out yet). A `ready` property
 * (`yes`, `decision` or `placeholder`) wins; else the text tells:
 * - placeholder: a title starting with "Placeholder" or ending in "- placeholder", the tag, or a line starting with it; the template's "..." still in its
 *   story or criteria; or no criteria;
 * - decision: an open criterion (`- [ ]`) about deciding ("Decided with ...", "decide which ..."), or "TBD".
 * Words in quotes or code don't count: they're talk about the word, not a marker.
 */
export function taskState(text) {
  const src = toLf(text);
  const fm = splitFrontMatter(src);
  const ready = String((fm && /^ready:[ \t]*["']?([\w ]+?)["']?[ \t]*$/m.exec(fm.raw)?.[1]) ?? "").trim().toLowerCase();
  if (ready === "yes" || ready === "ready") return { state: "ready", reason: "Marked ready (ready: yes)" };
  if (ready === "decision") return { state: "decision", reason: "Marked as needing a decision (ready: decision)" };
  if (ready === "placeholder") return { state: "placeholder", reason: "Marked as a placeholder (ready: placeholder)" };
  const body = fm ? src.slice(fm.length) : src;
  const clip = (s) => (s.length > 110 ? s.slice(0, 107).trimEnd() + "..." : s);
  // An open question (a `question` property) waits for its answer first.
  const question = String((fm && /^question:[ \t]*(.*?)[ \t]*$/m.exec(fm.raw)?.[1]) ?? "").replace(/^(["'])(.*)\1$/, "$2").trim();
  if (question) return { state: "decision", reason: `Waiting for an answer: ${clip(question)}` };
  const plain = body.replace(/`[^`\n]*`/g, "").replace(/"[^"\n]*"|“[^”\n]*”/g, "");
  const title = /^#\s+(.*)$/m.exec(body)?.[1] ?? "";
  const tagged = !!fm && /^tags:.*\bplaceholder\b/im.test(fm.raw);
  const titled = /^(?:[A-Z]+-\d+\s+)?placeholder\b|(?:-\s*|\()placeholder\)?\s*$/i.test(title.trim());
  if (tagged || titled || /^\s*(?:[-*+]\s+)?(?:\*\*|_)?placeholder\b/im.test(plain)) {
    return { state: "placeholder", reason: "A placeholder: its title, tags or a line starting with Placeholder say so" };
  }
  const criteria = body.split("\n").filter((l) => /^\s*[-*+]\s+\[[ xX]\]/.test(l));
  if (/\*\*As\*\* someone who \.\.\./.test(body) || criteria.some((l) => /\]\s*\.\.\.\s*$/.test(l))) {
    return { state: "placeholder", reason: "A placeholder: its story or criteria are still the template's \"...\"" };
  }
  if (!criteria.length) return { state: "placeholder", reason: "A placeholder: no acceptance criteria yet" };
  const open = criteria.filter((l) => /\[ \]/.test(l)).map((l) => l.replace(/^\s*[-*+]\s+\[ \]\s*/, ""));
  const ask = open.find((l) => /\b(decid\w*|TBD)\b/i.test(l));
  if (ask) return { state: "decision", reason: `Needs a decision first: ${clip(ask.replace(/\*\*/g, ""))}` };
  if (/\bTBD\b/.test(plain)) return { state: "decision", reason: "Needs a decision first: it says TBD" };
  return { state: "ready", reason: "Ready to start: no open decisions" };
}

/** A YAML value: a scalar plain when that's safe, else double-quoted; a list on one line, `["[[A]]", "[[B]]"]`. */
const yamlValue = (s) => Array.isArray(s) ? `[${s.map((x) => JSON.stringify(String(x))).join(", ")}]`
  : (/^[\p{L}\p{N}][\p{L}\p{N} ._()-]*$/u.test(s) && !/\s$/.test(s) ? s : JSON.stringify(s));

/**
 * A task note claimed by `who`: its front matter's `status` becomes "In Progress" and its `assignee` `who`,
 * each line changed in place (or added at the end of the front matter); `more` sets other properties in the
 * same change (e.g. its sprint). Null when the note has no front matter.
 */
export const claimTask = (text, who, more = []) => setProps(text, [["status", "In Progress"], ["assignee", who], ...more]);

/**
 * A note with some front matter properties set, each `key: value` line changed in place (or added at the
 * end of the front matter); nothing else changes. Null when the note has no front matter.
 */
export function setProps(text, entries) {
  const src = toLf(text);
  const fm = splitFrontMatter(src);
  if (!fm) return null;
  let raw = fm.raw;
  for (const [key, value] of entries) {
    const line = `${key}: ${yamlValue(value)}`;
    // The old value's own lines go too: a list written one item per line (`- "[[A]]"`), or anything indented.
    const re = new RegExp(`^${key}:.*(?:\\n(?:[ \\t]+.*|-(?:[ \\t].*)?))*$`, "m");
    raw = re.test(raw) ? raw.replace(re, () => line) : raw.trim() ? `${raw}\n${line}` : line;
  }
  // The front matter starts right after the opening `---` line.
  return `---\n${raw}${src.slice(4 + fm.raw.length)}`;
}

/**
 * The page a note's `parent` property links to, as a link target (`[[Task Board]]` -> "Task Board"),
 * or null when it has none. Read from the front matter's text, so it's cheap enough for every keystroke.
 */
export function parentTarget(text) {
  const fm = splitFrontMatter(text);
  const m = fm && /^parent:[ \t]*["']?\[\[([^\]\n]+)\]\]/m.exec(fm.raw);
  return m ? parseWikilink(m[1]).target || null : null;
}

// ---- Vaults found on GitHub: a `.commonplace.json` at a repo's root shares its settings ----

/** The file that marks a repo as holding a vault, with the settings an invite link would carry. */
export const MARKER = ".commonplace.json";

const MARKER_PATHS = ["folder", "home", "inbox", "inboxes", "notes", "template"];
const markerDir = (s) => (typeof s === "string" ? s.trim().replace(/^\/+|\/+$/g, "") : "");
/** `owner/repo`, the same however it's spelled. */
export const repoKey = (r) => `${r.owner}/${r.repo}`.toLowerCase();

/**
 * A repo's settings from its marker file, or null when the text isn't a marker. Paths are cleaned and
 * anything else is left out, so a marker can only set what an invite link can.
 */
export function parseMarker(text, owner, repo) {
  let data;
  try { data = JSON.parse(text); } catch { return null; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const r = { owner, repo, label: (typeof data.label === "string" && data.label.trim()) || repo };
  r.branch = (typeof data.branch === "string" && data.branch.trim()) || "";
  for (const k of MARKER_PATHS) r[k] = markerDir(data[k]);
  r.home ||= "README.md";
  r.vault = data.vault === true;
  return r;
}

/** The marker file's text for a repo's settings (what the owner saves to share them). */
export function markerText(r) {
  const out = { label: r.label || r.repo, branch: r.branch || "main" };
  for (const k of MARKER_PATHS) if (r[k] && !(k === "home" && r[k] === "README.md")) out[k] = r[k];
  if (r.vault) out.vault = true;
  return JSON.stringify(out, null, 2) + "\n";
}

/**
 * Which repos of a GitHub listing (`GET /user/repos`) are worth looking at for a marker: ones this
 * person can save to, not on the device yet, not removed from it by hand, and new or changed since
 * they were last looked at (`seen`: repo key -> its `pushed_at` then).
 */
export function reposToCheck(listing, { seen = {}, known = [], removed = [] } = {}) {
  const skip = new Set([...known, ...removed].map((k) => k.toLowerCase()));
  return listing
    .filter((x) => x && x.owner?.login && x.name && x.permissions?.push && !x.archived)
    .map((x) => ({ owner: x.owner.login, repo: x.name, branch: x.default_branch || "main", pushed: x.pushed_at || "" }))
    .filter((x) => !skip.has(repoKey(x)) && seen[repoKey(x)] !== x.pushed);
}

// ---- A project's task setup: `tasks` in the repo's .commonplace.json ----

/**
 * The task fields the app knows. `kind` says what control a field gets: a choice from `values`, a person,
 * a link to a task or a sprint note, a date, a number or text. `legacy` fields are the ones a repo
 * with no setup has had all along; `optional` ones start off in a new setup, until a project turns them on.
 */
export const TASK_FIELDS = [
  { key: "status", label: "Status", kind: "choice", values: ["To Do", "In Progress", "Blocked", "Waiting", "Done"], legacy: true },
  { key: "priority", label: "Priority", kind: "choice", values: ["High", "Medium", "Low"], legacy: true },
  { key: "assignee", label: "Assignee", kind: "person", legacy: true },
  { key: "area", label: "Area", kind: "text", legacy: true },
  { key: "requested_by", label: "Requested by", kind: "person", legacy: true },
  { key: "reviewer", label: "Reviewer", kind: "person", optional: true },
  { key: "type", label: "Type", kind: "choice", values: ["Epic", "Story", "Task", "Bug"] },
  { key: "part_of", label: "Parent task", kind: "task" },
  // Relations: lists of links to other tasks. Each shows on the other task too, the other way round.
  { key: "blocked_by", label: "Blocked by", kind: "tasks", reverse: "Blocks" },
  { key: "related", label: "Related", kind: "tasks", reverse: "Related" },
  { key: "after", label: "Comes after", kind: "tasks", reverse: "Comes before" },
  { key: "before", label: "Comes before", kind: "tasks", reverse: "Comes after" },
  { key: "sprint", label: "Sprint", kind: "sprint", folder: "Sprints", length_days: 14 },
  { key: "estimate", label: "Estimate", kind: "number", unit: "points" },
  { key: "due", label: "Due date", kind: "date" },
];
/** The kinds a project's own field can have. */
export const CUSTOM_KINDS = ["text", "number", "date", "choice", "person", "link"];
export const ESTIMATE_UNITS = ["points", "hours", "days"];

const PROP_NAME = /^[A-Za-z_][\w-]*$/;
/** A property name a field may use: a plain YAML key, and never `parent`, which places a page in the tree. */
export const isFieldProp = (name) => PROP_NAME.test(name) && name.toLowerCase() !== "parent";
const cleanValues = (list) => [...new Set((Array.isArray(list) ? list : []).filter((v) => typeof v === "string").map((v) => v.trim()).filter(Boolean))];
const whole = (n, min, max, fallback) => (Number.isInteger(n) && n >= min && n <= max ? n : fallback);
const cleanFolder = (s) => (typeof s === "string" ? s.trim().replace(/^\/+|\/+$/g, "") : "");

/**
 * A repo's task setup from the `tasks` part of its marker, with every field filled in. No setup at all
 * (`null`) keeps the fields repos have always had; a setup starts from a new project's fields (every
 * one on but the optional ones) and changes what it names. Anything it can't use is left at the default.
 */
export function taskSetup(raw) {
  const given = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  const set = given?.fields && typeof given.fields === "object" ? given.fields : {};
  const fields = TASK_FIELDS.map((f) => {
    const s = set[f.key] && typeof set[f.key] === "object" ? set[f.key] : {};
    const on = given ? (f.optional ? s.on === true : s.on !== false) : !!f.legacy;
    const field = { key: f.key, label: f.label, kind: f.kind, on, prop: f.key };
    if (typeof s.prop === "string" && isFieldProp(s.prop.trim())) field.prop = s.prop.trim();
    if (f.values) field.values = cleanValues(s.values).length ? cleanValues(s.values) : [...f.values];
    if (f.kind === "sprint") {
      field.folder = cleanFolder(s.folder) || f.folder;
      field.length_days = whole(s.length_days, 1, 90, f.length_days);
    }
    if (f.kind === "number") field.unit = ESTIMATE_UNITS.includes(s.unit) ? s.unit : f.unit;
    return field;
  });
  const used = new Set(fields.map((f) => f.prop.toLowerCase()));
  const custom = [];
  for (const c of Array.isArray(given?.custom) ? given.custom : []) {
    if (!c || typeof c !== "object" || typeof c.name !== "string" || !c.name.trim()) continue;
    const prop = typeof c.prop === "string" && c.prop.trim() ? c.prop.trim() : c.name.trim().toLowerCase().replace(/[^\w-]+/g, "_");
    if (!isFieldProp(prop) || used.has(prop.toLowerCase())) continue;
    used.add(prop.toLowerCase());
    const kind = CUSTOM_KINDS.includes(c.kind) ? c.kind : "text";
    const field = { key: prop, label: c.name.trim(), kind, on: c.on !== false, prop, custom: true };
    if (kind === "choice") field.values = cleanValues(c.values);
    custom.push(field);
  }
  return { configured: !!given, folder: cleanFolder(given?.folder) || "Tasks", fields: [...fields, ...custom] };
}

/** What a setup saves as the `tasks` part of the marker: every field, so the file reads on its own. */
export function taskSetupJson(setup) {
  const fields = {};
  const custom = [];
  for (const f of setup.fields) {
    if (f.custom) {
      const c = { name: f.label, prop: f.prop, kind: f.kind };
      if (!f.on) c.on = false;
      if (f.kind === "choice") c.values = [...(f.values || [])];
      custom.push(c);
      continue;
    }
    const s = { on: !!f.on };
    if (f.prop !== f.key) s.prop = f.prop;
    if (f.values) s.values = [...f.values];
    if (f.kind === "sprint") { s.folder = f.folder; s.length_days = f.length_days; }
    if (f.kind === "number") s.unit = f.unit;
    fields[f.key] = s;
  }
  const out = { folder: setup.folder || "Tasks", fields };
  if (custom.length) out.custom = custom;
  return out;
}

/** What's wrong with a setup, in words, or "" when nothing is: e.g. two fields writing the same property. */
export function taskSetupProblem(setup) {
  const seen = new Map();
  for (const f of setup.fields) {
    if (!isFieldProp(f.prop)) {
      return `${f.label}: "${f.prop}" can't be a property name. Use letters, digits, _ and -, not starting with a digit${
        f.prop.toLowerCase() === "parent" ? ", and not parent, which places a page in the tree" : ""}.`;
    }
    const k = f.prop.toLowerCase();
    if (seen.has(k)) return `${seen.get(k)} and ${f.label} both use the property ${f.prop}.`;
    seen.set(k, f.label);
    if (f.on && f.kind === "choice" && !(f.values || []).length) return `${f.label} needs at least one value to choose from.`;
  }
  return "";
}

/**
 * The marker file's new text, keeping what's already in it: `repo` (when given) replaces the shared repo
 * settings, `tasks` (when given) the task setup, and anything else in the file stays.
 */
export function mergeMarker(existing, { repo = null, tasks } = {}) {
  let out = {};
  try {
    const data = JSON.parse(existing || "");
    if (data && typeof data === "object" && !Array.isArray(data)) out = data;
  } catch { /* not there yet, or not JSON: start again */ }
  if (repo) {
    for (const k of ["label", "branch", "vault", ...MARKER_PATHS]) delete out[k];
    const rest = out;
    out = { ...JSON.parse(markerText(repo)), ...rest };
  }
  if (tasks !== undefined) out.tasks = tasks;
  return JSON.stringify(out, null, 2) + "\n";
}

/**
 * Whether a note is a task under a setup: a Markdown note in its tasks folder (or deeper). A repo with
 * no setup keeps the old rule: a note in any `Tasks` folder.
 */
export function isSetupTask(setup, path) {
  if (!/\.md$/i.test(path)) return false;
  if (!setup?.configured) return isTaskPath(path);
  return path.toLowerCase().startsWith(`${setup.folder.toLowerCase()}/`);
}

/** The note's text with these properties set, adding front matter when it has none. `keep` leaves set ones alone. */
export function withProps(text, entries, { keep = false } = {}) {
  const src = toLf(text);
  const fm = splitFrontMatter(src);
  if (!fm) return entries.length ? `---\n${entries.map(([k, v]) => `${k}: ${yamlValue(v)}`).join("\n")}\n---\n${src}` : src;
  const todo = keep ? entries.filter(([k]) => !new RegExp(`^${k}:`, "m").test(fm.raw)) : entries;
  return todo.length ? setProps(src, todo) : src;
}

/** A link field's value as a page name: `[[Name|alias]]` -> "Name". */
export const linkName = (v) => {
  const s = String(v ?? "").trim();
  const m = /^\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]$/.exec(s);
  return (m ? m[1] : s).trim();
};

/** What a field's control saves: link kinds become `[[Name]]` (a list of them for relations), numbers stay digits, empty stays empty. */
export function fieldValue(field, input) {
  if (field.kind === "tasks") return [...new Set((Array.isArray(input) ? input : [input]).map(linkName).filter(Boolean))].map((x) => `[[${x}]]`);
  const s = String(input ?? "").trim();
  if (!s) return "";
  if (["task", "sprint", "link"].includes(field.kind)) return `[[${linkName(s)}]]`;
  if (field.kind === "number") return Number.isFinite(Number(s)) ? String(Number(s)) : null;
  if (field.kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  return s;
}

/**
 * The properties a new task starts with: every field that's on, empty, except the choices, which start
 * at their first value; Priority at its middle one and Type at "Task" when it has one, so a new task
 * isn't the highest priority or an epic. Relations are left out until a task has some.
 */
export function newTaskProps(setup) {
  return setup.fields.filter((f) => f.on && f.kind !== "tasks").map((f) => {
    if (f.kind !== "choice" || !f.values?.length) return [f.prop, ""];
    if (f.key === "priority") return [f.prop, f.values[Math.floor((f.values.length - 1) / 2)]];
    if (f.key === "type") return [f.prop, f.values.find((v) => v.toLowerCase() === "task") || f.values[0]];
    return [f.prop, f.values[0]];
  });
}

/**
 * A new task's reviewer, when the setup has Reviewer on and the note doesn't name one yet: the person who
 * asked for it (its Requested by), else `who`, the person making it. The note's text, changed or not.
 */
export function withReviewer(setup, text, who = "") {
  const field = setup?.fields.find((f) => f.key === "reviewer" && f.on);
  if (!field) return text;
  // One plain line each (`reviewer: ""`, `requested_by: Ann`), read without a YAML parser.
  const raw = splitFrontMatter(toLf(text))?.raw ?? "";
  const line = (prop) => (new RegExp(`^${prop}:[ \t]*(.*)$`, "m").exec(raw)?.[1] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  if (line(field.prop)) return text;
  const reviewer = line(fieldProp(setup, "requested_by")) || String(who ?? "").trim();
  return reviewer ? withProps(text, [[field.prop, reviewer]]) : text;
}

// ---- parent tasks and subtasks ----

/** The property a field of the setup is kept in (its key when there's no setup): `fieldProp(setup, "part_of")`. */
export const fieldProp = (setup, key) => setup?.fields.find((f) => f.key === key)?.prop || key;

/** The page a link property leads to, as a link target: `[[Epic]]` -> "Epic"; a list uses its first link. */
export function linkTarget(v) {
  const first = Array.isArray(v) ? v.find((x) => !blank(x)) : v;
  return blank(first) ? "" : linkName(first);
}

/** Whether a status means the work is over: Done, Cancelled, Won't do, or the last of the setup's statuses. */
export function isDoneStatus(status, setup = null) {
  const s = String(status ?? "").trim();
  if (!s) return false;
  const statuses = setup?.fields.find((f) => f.key === "status")?.values;
  return FINISHED.test(s) || (!!statuses?.length && s.toLowerCase() === statuses.at(-1).toLowerCase());
}

/**
 * The tasks under one task, from [{ path, props }]: the notes whose parent property (`prop`) links to
 * `path`, through `resolve(target, fromPath)`. The open ones first, then by ID and name; with how many are done.
 */
export function subtasksOf(notes, path, { prop = "part_of", resolve, setup = null } = {}) {
  const status = fieldProp(setup, "status");
  const tasks = notes
    .filter((n) => n.path !== path && linkTarget(n.props[prop]) && resolve(linkTarget(n.props[prop]), n.path) === path)
    .map((n) => ({ path: n.path, id: String(n.props.id ?? "").trim(), status: String(n.props[status] ?? "").trim(), done: isDoneStatus(n.props[status], setup) }))
    .sort((a, b) => a.done - b.done || a.id.localeCompare(b.id, undefined, { numeric: true }) || a.path.localeCompare(b.path));
  return { tasks, done: tasks.filter((t) => t.done).length, total: tasks.length };
}

// ---- relations between tasks: blocked by, related, comes after, comes before ----

/**
 * The pages a list property links to, as link targets: `["[[A]]", "[[B]]"]` -> ["A", "B"]. One link, links
 * in a line of text, or a plain name count too; so does `[[A]]` left unquoted, which YAML reads as a list in a list.
 */
export function linkList(v) {
  if (blank(v)) return [];
  const items = Array.isArray(v) ? v.map(String) : [...String(v).matchAll(/\[\[[^\]]+\]\]/g)].map((m) => m[0]);
  if (!Array.isArray(v) && !items.length) items.push(String(v));
  return [...new Set(items.filter((x) => !blank(x)).map(linkName).filter(Boolean))];
}

/**
 * The relation fields that are on, in their order, each with its property and how it reads from the
 * other task (`reverse`): Blocked by / Blocks, Related, Comes after / Comes before. All four with no setup.
 */
export function relationFields(setup = null) {
  return TASK_FIELDS.filter((f) => f.kind === "tasks").map((f) => {
    const s = setup?.fields.find((x) => x.key === f.key);
    return { key: f.key, label: f.label, reverse: f.reverse, prop: s?.prop || f.key, on: s ? !!s.on : true };
  }).filter((f) => f.on);
}

/**
 * A task's relations both ways, from [{ path, props }]: its own links (from `props`, its properties now) and
 * the other tasks' links to it, which read the other way round (B blocked by A shows on A as "Blocks").
 * Groups [{ label, tasks }] in a fixed order, each task once ({ path, name, id, status, done, own, key });
 * `own` ones are in this task's own property `key` (`name` as written there), so they can be taken out here.
 * A link to no page keeps its name, with no path, and comes last.
 */
export function taskRelations(notes, path, props, { setup = null, resolve }) {
  const statusProp = fieldProp(setup, "status");
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const groups = new Map();
  const add = (label, item) => {
    if (!groups.has(label)) groups.set(label, []);
    const list = groups.get(label);
    const same = list.find((x) => (item.path ? x.path === item.path : !x.path && x.name.toLowerCase() === item.name.toLowerCase()));
    if (!same) list.push(item);
    else if (item.own && !same.own) Object.assign(same, { own: true, key: item.key, name: item.name });
  };
  const about = (p) => {
    const n = byPath.get(p);
    return { id: String(n?.props.id ?? "").trim(), status: String(n?.props[statusProp] ?? "").trim(), done: isDoneStatus(n?.props[statusProp], setup) };
  };
  const fields = relationFields(setup);
  for (const f of fields) {
    for (const name of linkList(props?.[f.prop])) {
      const p = resolve(name, path);
      if (p === path) continue;
      add(f.label, p ? { path: p, name, ...about(p), own: true, key: f.key } : { path: null, name, id: "", status: "", done: false, own: true, key: f.key });
    }
    for (const n of notes) {
      if (n.path === path || !linkList(n.props[f.prop]).some((t) => resolve(t, n.path) === path)) continue;
      add(f.reverse, { path: n.path, name: "", ...about(n.path), own: false, key: f.key });
    }
  }
  const order = ["Blocked by", "Blocks", "Comes after", "Comes before", "Related"];
  return order.filter((l) => groups.get(l)?.length).map((label) => ({
    label,
    tasks: groups.get(label).sort((a, b) => !a.path - !b.path || a.done - b.done || a.id.localeCompare(b.id, undefined, { numeric: true }) || (a.path || a.name).localeCompare(b.path || b.name)),
  }));
}

/**
 * The tasks that wait on an open task, from [{ path, props }]: their Blocked by links a task that isn't done.
 * A link to no task doesn't block. Empty when the setup has Blocked by off.
 */
export function blockedTasks(notes, { setup = null, resolve }) {
  const field = relationFields(setup).find((f) => f.key === "blocked_by");
  if (!field) return new Set();
  const statusProp = fieldProp(setup, "status");
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const out = new Set();
  for (const n of notes) {
    const open = linkList(n.props[field.prop]).some((t) => {
      const other = byPath.get(resolve(t, n.path));
      return other && other.path !== n.path && !isDoneStatus(other.props[statusProp], setup);
    });
    if (open) out.add(n.path);
  }
  return out;
}

/**
 * Why `parentPath` can't be `path`'s parent, or "" when it can: a task can't be its own parent, nor sit
 * under one of its own subtasks (at any depth), which would make a loop.
 */
export function parentProblem(notes, path, parentPath, { prop = "part_of", resolve } = {}) {
  if (!parentPath) return "";
  const name = (p) => p.slice(p.lastIndexOf("/") + 1).replace(/\.md$/i, "");
  if (parentPath === path) return "A task can't be its own parent.";
  const parentOf = new Map(notes.map((n) => [n.path, linkTarget(n.props[prop]) ? resolve(linkTarget(n.props[prop]), n.path) : null]));
  const seen = new Set();
  for (let p = parentOf.get(parentPath); p && !seen.has(p); p = parentOf.get(p)) {
    if (p === path) return `${name(parentPath)} is already under ${name(path)}, so it can't be its parent.`;
    seen.add(p);
  }
  return "";
}

/** The task a parent picker's text means: an ID (`C-12`, any case) or a task's name; null when none. */
export function findTask(notes, input) {
  const s = linkName(input).toLowerCase();
  if (!s) return null;
  const name = (p) => p.slice(p.lastIndexOf("/") + 1).replace(/\.md$/i, "").toLowerCase();
  return notes.find((n) => String(n.props.id ?? "").trim().toLowerCase() === s)
    || notes.find((n) => name(n.path) === s)
    || notes.find((n) => { const id = String(n.props.id ?? "").trim().toLowerCase(); return id && s.startsWith(id + " ") && name(n.path) === s.slice(id.length + 1); })
    || null;
}

// ---- sprints ----

/** A date property as `YYYY-MM-DD`: YAML gives a Date, JSON a string; "" when it isn't one. */
export function isoDay(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  return /^\d{4}-\d\d-\d\d/.exec(String(v ?? "").trim())?.[0] ?? "";
}

/** `YYYY-MM-DD` plus some days. */
export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const noteName = (p) => p.slice(p.lastIndexOf("/") + 1).replace(/\.md$/i, "");

/**
 * The sprint notes, from [{ path, props }] with `start`, `end` and `goal`, the latest start first,
 * each with where it stands on `today`: "now", "next" (the first one after today), "later" or "past".
 */
export function sprints(notes, today) {
  const list = notes.map((n) => ({ path: n.path, name: noteName(n.path), start: isoDay(n.props.start), end: isoDay(n.props.end),
    goal: String(n.props.goal ?? "").trim() }))
    .sort((a, b) => (b.start || "").localeCompare(a.start || "") || b.name.localeCompare(a.name, undefined, { numeric: true }));
  const now = (s) => s.start && s.start <= today && (!s.end || s.end >= today);
  const next = list.filter((s) => s.start > today).at(-1);
  return list.map((s) => ({ ...s, when: now(s) ? "now" : s === next ? "next" : s.start > today ? "later" : "past" }));
}

/**
 * The sprint a ```sprint block's `sprint:` line names, from `sprints()`: `current` (or `now`) is the one going on
 * today, `next` the next one to start, else a sprint's name or `[[link]]` (any case; `resolve` turns a link into
 * a path, when given). Null when there's none.
 */
export function pickSprint(list, said, resolve = null) {
  const s = linkName(said).toLowerCase();
  if (!s) return null;
  if (s === "current" || s === "now") return list.find((x) => x.when === "now") ?? null;
  if (s === "next") return list.find((x) => x.when === "next") ?? null;
  const path = resolve?.(linkName(said));
  return list.find((x) => x.path === path) ?? list.find((x) => x.name.toLowerCase() === s) ?? null;
}

/** The sprint picker's order: the current sprint, the next one, then the rest, the latest first. */
export function sprintChoices(list) {
  const rank = { now: 0, next: 1 };
  return [...list].sort((a, b) => (rank[a.when] ?? 2) - (rank[b.when] ?? 2));
}

/**
 * The sprint after `last` (the latest one): its name counts on ("Sprint 12" -> "Sprint 13"), it starts the
 * day after `last` ends (or today, if that's later) and lasts `days`.
 */
export function nextSprint(last, days, today) {
  const m = /^(.*?)(\d+)$/.exec(last?.name ?? "");
  const name = m ? `${m[1]}${Number(m[2]) + 1}` : last ? `${last.name} 2` : "Sprint 1";
  const after = last?.end ? addDays(last.end, 1) : "";
  const start = after > today ? after : today;
  return { name, start, end: addDays(start, Math.max(1, days) - 1) };
}

/**
 * The top tasks to start when sprints are in use, from [{ path, props }]: the free tasks (as `suggestTasks`
 * picks them) whose sprint property (`prop`) links to the current sprint's note (`now`, a path); when it has
 * none left, a few from the next sprint's (`next`), each with `nextSprint: true`. Null when there's neither
 * a current nor a next sprint, so the top tasks are picked from all tasks, as without sprints.
 */
export function sprintSuggestions(notes, { areas = [], count = 3, prop = "sprint", now = null, next = null, resolve, blocked = null, order }) {
  if (!now && !next) return null;
  const inSprint = (path) => (n) => !!linkTarget(n.props[prop]) && resolve(linkTarget(n.props[prop]), n.path) === path;
  const current = now ? suggestTasks(notes.filter(inSprint(now)), { areas, count, blocked, order }) : [];
  if (current.length || !next) return current;
  return suggestTasks(notes.filter(inSprint(next)), { areas, count, blocked, order }).map((n) => ({ ...n, nextSprint: true }));
}

/**
 * A sprint's tasks: those whose sprint property links to it, grouped by status in the setup's order (others
 * after), with how many are done and, when estimates are on, how much of the estimate.
 */
export function sprintTasks(notes, path, { setup = null, resolve }) {
  const prop = fieldProp(setup, "sprint");
  const statusProp = fieldProp(setup, "status");
  const estimate = setup?.fields.find((f) => f.key === "estimate");
  const order = (setup?.fields.find((f) => f.key === "status")?.values ?? []).map((v) => v.toLowerCase());
  const tasks = notes
    .filter((n) => linkTarget(n.props[prop]) && resolve(linkTarget(n.props[prop]), n.path) === path)
    .map((n) => {
      const points = Number(n.props[estimate?.prop ?? "estimate"]);
      return { path: n.path, id: String(n.props.id ?? "").trim(), status: String(n.props[statusProp] ?? "").trim(),
        done: isDoneStatus(n.props[statusProp], setup), points: Number.isFinite(points) && !blank(n.props[estimate?.prop ?? "estimate"]) ? points : null };
    })
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }) || a.path.localeCompare(b.path));
  const groups = [];
  for (const t of tasks) {
    let g = groups.find((x) => x.status.toLowerCase() === t.status.toLowerCase());
    if (!g) groups.push(g = { status: t.status, tasks: [] });
    g.tasks.push(t);
  }
  const at = (s) => { const i = order.indexOf(s.toLowerCase()); return i < 0 ? order.length + (s ? 0 : 1) : i; };
  groups.sort((a, b) => at(a.status) - at(b.status));
  const sum = (list) => list.reduce((n, t) => n + (t.points ?? 0), 0);
  const hasPoints = tasks.some((t) => t.points != null);
  return {
    groups, total: tasks.length, done: tasks.filter((t) => t.done).length,
    points: hasPoints ? { done: sum(tasks.filter((t) => t.done)), total: sum(tasks), unit: estimate?.unit ?? "points" } : null,
    open: tasks.filter((t) => !t.done),
  };
}

// ---- a task's commits ----

const COMMIT_LINK = /^\[([^\]]*)\]\((https:\/\/github\.com\/([^/\s]+\/[^/\s]+)\/commit\/([0-9a-f]{7,40}))\)\s*(.*)$/i;
const COMMIT_URL = /^(https:\/\/github\.com\/([^/\s]+\/[^/\s]+)\/commit\/([0-9a-f]{7,40}))\s*(.*)$/i;

/**
 * A task's `commits` property as a list, the newest first: each line is
 * `[abc1234](https://github.com/owner/repo/commit/<sha>) the first line of the message` (as the Task
 * commits Action writes them, oldest first), or a bare commit address. Anything else is left out.
 * Resolves to [{ short, url, repo, title }], with `repo` in lower case.
 */
export function taskCommitLinks(value) {
  const list = Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
  const out = [];
  for (const v of list) {
    const s = String(v ?? "").trim();
    let m = COMMIT_LINK.exec(s);
    if (m) { out.push({ short: m[4].slice(0, 7), url: m[2], repo: m[3].toLowerCase(), title: m[5].trim() }); continue; }
    m = COMMIT_URL.exec(s);
    if (m) out.push({ short: m[3].slice(0, 7), url: m[1], repo: m[2].toLowerCase(), title: m[4].trim() });
  }
  return out.reverse();
}
