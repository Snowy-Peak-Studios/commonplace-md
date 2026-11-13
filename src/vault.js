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
// Suggested tasks: the top free tasks an inbox shows
// ================================================================

/** A task note: a `.md` file in a folder named `Tasks` (any case, at any depth). */
export const isTaskPath = (path) => /(^|\/)tasks\/[^/]+\.md$/i.test(path);

const blank = (v) => v == null || (Array.isArray(v) ? v.every(blank) : String(v).trim() === "");
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
/** Statuses that aren't free to start. */
const NOT_FREE = /^(done|in progress|waiting|cancell?ed|won'?t do)$/i;

/** A list property as lower-case strings: `[A, B]` or `"A, B"`. */
export function listProp(v) {
  if (blank(v)) return [];
  return (Array.isArray(v) ? v : String(v).split(",")).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
}

/**
 * The top free tasks, from [{ path, props }]: no assignee, not started or done, in one of `areas`
 * (any area when empty). Highest priority first; within a priority, the newest (highest ID number) first.
 */
const rank = (n) => PRIORITY_RANK[String(n.props.priority ?? "").trim().toLowerCase()] ?? 3;
const idNum = (n) => Number(/(\d+)\s*$/.exec(String(n.props.id ?? ""))?.[1] ?? -1);
/** Statuses of work that's over. */
const FINISHED = /^(done|cancell?ed|won'?t do)$/i;
/** The status of a task put off with "Not now": on the waiting list, out of the suggestions. */
export const WAITING = "Waiting";
const isWaiting = (n) => String(n.props.status ?? "").trim().toLowerCase() === WAITING.toLowerCase();

export function suggestTasks(notes, { areas = [], count = 3 } = {}) {
  const want = listProp(areas);
  return notes
    .filter((n) => isTaskPath(n.path) && blank(n.props.assignee) && !NOT_FREE.test(String(n.props.status ?? "").trim())
      && (!want.length || want.includes(String(n.props.area ?? "").trim().toLowerCase())))
    .sort((a, b) => rank(a) - rank(b) || idNum(b) - idNum(a) || a.path.localeCompare(b.path))
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
export function waitingTasks(notes, { areas = [], owner = "" } = {}) {
  const want = listProp(areas);
  const me = foldName(owner);
  return notes
    .filter((n) => isTaskPath(n.path) && isWaiting(n) && (!want.length
      || want.includes(String(n.props.area ?? "").trim().toLowerCase())
      || (me && foldName(splitAssignee(n.props.assignee).name) === me)))
    .sort((a, b) => rank(a) - rank(b) || idNum(b) - idNum(a) || a.path.localeCompare(b.path));
}

/** A YAML scalar: plain when that's safe, else double-quoted. */
const yamlValue = (s) => (/^[\p{L}\p{N}][\p{L}\p{N} ._()-]*$/u.test(s) && !/\s$/.test(s) ? s : JSON.stringify(s));

/**
 * A task note claimed by `who`: its front matter's `status` becomes "In Progress" and its `assignee` `who`,
 * each line changed in place (or added at the end of the front matter). Null when the note has no front matter.
 */
export const claimTask = (text, who) => setProps(text, [["status", "In Progress"], ["assignee", who]]);

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
    const re = new RegExp(`^${key}:.*$`, "m");
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
