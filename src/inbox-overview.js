// Private, selected-source inbox overview: parsing and row selection, without DOM or network.
import { yamlLoad } from "../vendor/vendor.js";
import { reviewTasks, assignmentTasks, sortAssignments, findMentions, sortMentions, assigneeMatches,
  fieldProp, isSetupTask, isDoneStatus, taskAnswer, foldName, newTasksBlock, splitFrontMatter, toLf,
  NOTE_SECTIONS, fenceLanguage } from "./vault.js";

export const OVERVIEW_KINDS = ["reviews", "questions", "assignments", "mentions", "new-tasks"];
const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" ? v.trim() : "";
const allowed = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
export function overviewPath(value, { folder = false } = {}) {
  const p = text(value).replace(/\\/g, "/");
  if (!p && folder) return "";
  if (!p || p.startsWith("/") || p.includes(":") || p.split("/").some((s) => !s || s === "." || s === ".." || s.startsWith("."))) {
    throw new Error("Use a relative path inside the vault, without dot folders or parent steps.");
  }
  return p;
}
const list = (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map(text).filter(Boolean);

export function overviewOptions(source) {
  let raw;
  try { raw = yamlLoad(source); } catch { throw new Error("The inbox-overview options are not valid YAML."); }
  raw ??= {};
  if (!plain(raw) || !allowed(raw, ["context", "show", "refresh", "limit", "review-statuses", "sources"])) throw new Error("Use the documented inbox-overview options.");
  const show = raw.show == null ? [...OVERVIEW_KINDS] : list(raw.show);
  if (!show.length || show.some((s) => !OVERVIEW_KINDS.includes(s))) throw new Error("Choose reviews, questions, assignments, mentions or new-tasks.");
  if (raw.refresh != null && raw.refresh !== "manual") throw new Error("This overview supports manual refresh only.");
  const limit = raw.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new Error("The row limit must be between 1 and 200.");
  const sources = raw.sources ?? [];
  if (!Array.isArray(sources) || sources.length > 50) throw new Error("Choose up to 50 explicit sources.");
  const normalized = sources.map((s, i) => {
    if (!plain(s) || !allowed(s, ["kind", "owner", "repo", "branch", "folder", "vault", "inbox", "person", "login"])) throw new Error(`Source ${i + 1} has unsupported options. Do not put credentials in a block.`);
    if (!["github", "browser", "folder"].includes(s.kind)) throw new Error(`Source ${i + 1} needs a storage kind.`);
    const out = { kind: s.kind, inbox: overviewPath(s.inbox), person: text(s.person), login: text(s.login).replace(/^@/, "") };
    if (!out.person) throw new Error(`Source ${i + 1} needs the person's name in that vault.`);
    if (out.login && !/^[a-z0-9](?:[a-z0-9-]{0,38})$/i.test(out.login)) throw new Error(`Source ${i + 1} has an invalid mention login.`);
    if (!out.inbox.toLowerCase().endsWith(".md")) throw new Error(`Source ${i + 1} needs an inbox Markdown page.`);
    if (s.kind === "github") {
      out.owner = text(s.owner); out.repo = text(s.repo); out.branch = text(s.branch); out.folder = overviewPath(s.folder ?? "", { folder: true });
      if (!out.owner || !out.repo || /[\\/:\s]/.test(out.owner + out.repo) || !out.branch || /[\x00-\x1f]/.test(out.branch)) throw new Error(`Source ${i + 1} needs exact owner, repo and branch values.`);
    } else {
      out.vault = text(s.vault);
      if (!out.vault || out.vault.length > 200) throw new Error(`Source ${i + 1} needs the existing local vault ID.`);
    }
    return out;
  });
  const keys = normalized.map(sourceKey);
  if (new Set(keys).size !== keys.length) throw new Error("List each source only once.");
  const reviewStatuses = raw["review-statuses"] == null ? ["Testing"] : list(raw["review-statuses"]);
  if (!reviewStatuses.length) throw new Error("Name at least one review status.");
  return { context: text(raw.context) || "My inbox", show: OVERVIEW_KINDS.filter((s) => show.includes(s)), refresh: "manual", limit, reviewStatuses, sources: normalized,
    defaults: ["context", "show", "refresh", "limit", "review-statuses", "sources"].filter((key) => raw[key] == null) };
}

export function sourceKey(s) {
  return JSON.stringify(s.kind === "github" ? [s.kind, text(s.owner).toLowerCase(), text(s.repo).toLowerCase(), s.branch, s.folder || ""] : [s.kind, s.vault]);
}

export function resolveOverviewSource(source, repos) {
  const matches = repos.filter((r) => source.kind === "github"
    ? !["browser", "folder"].includes(r.local) && text(r.owner).toLowerCase() === source.owner.toLowerCase()
      && text(r.repo).toLowerCase() === source.repo.toLowerCase() && r.branch === source.branch && (r.folder || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "") === source.folder
    : r.local === source.kind && r.id === source.vault);
  if (matches.length !== 1) throw new Error(matches.length ? "This source binding is ambiguous. Fix it in Settings." : "This exact vault is not configured on this device. Add or rebind it in Settings.");
  return matches[0];
}

export function overviewSource(repo, { person = "", login = "", inbox = repo.inbox || "" } = {}) {
  return repo.local ? { kind: repo.local, vault: repo.id, inbox, person, login }
    : { kind: "github", owner: repo.owner, repo: repo.repo, branch: repo.branch, folder: repo.folder || "", inbox, person, login };
}

export function overviewBlock(options) {
  const scalar = (v) => JSON.stringify(v);
  const lines = ["```inbox-overview", `context: ${scalar(options.context)}`, `show: [${options.show.join(", ")}]`, "refresh: manual", `limit: ${options.limit}`,
    `review-statuses: [${options.reviewStatuses.map(scalar).join(", ")}]`, options.sources.length ? "sources:" : "sources: []"];
  for (const s of options.sources) {
    lines.push(`  - kind: ${s.kind}`);
    for (const key of s.kind === "github" ? ["owner", "repo", "branch", "folder", "inbox", "person", "login"] : ["vault", "inbox", "person", "login"]) lines.push(`    ${key}: ${scalar(s[key] || "")}`);
  }
  return lines.join("\n") + "\n```\n";
}

function overviewRanges(lines) {
  const blocks = []; let fence = "", start = -1, isOverview = false;
  for (let i = 0; i < lines.length; i++) {
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if (!m) continue;
    if (!fence) { fence = m[1]; start = i; isOverview = fenceLanguage(m[2]) === "inbox-overview"; }
    else if (m[1][0] === fence[0] && m[1].length >= fence.length && !m[2].trim()) {
      if (isOverview) blocks.push([start, i]); fence = "";
    }
  }
  if (fence && isOverview) throw new Error("Close the overview fence before using setup.");
  if (blocks.length > 1) throw new Error("Keep one overview block per dashboard note; use separate notes for separate contexts.");
  return blocks;
}

export function overviewContents(original) {
  const lines = toLf(original || "").split("\n");
  return overviewRanges(lines).map(([start, end]) => lines.slice(start + 1, end).join("\n"));
}

/** Replace one actual overview block without changing the surrounding note. */
export function writeOverviewNote(original, options) {
  const lines = toLf(original || "# Inbox overview\n").split("\n");
  const blocks = overviewRanges(lines);
  const block = overviewBlock(options).trimEnd().split("\n");
  if (blocks.length) lines.splice(blocks[0][0], blocks[0][1] - blocks[0][0] + 1, ...block);
  else lines.push("", ...block);
  return lines.join("\n").trimEnd() + "\n";
}

/** Owned capture fences outside code examples, including fences inside named prose sections. */
export function overviewCaptures(textValue, owner) {
  const src = toLf(textValue); const fm = splitFrontMatter(src); const lines = src.split("\n");
  let section = "", code = "", capture = "", body = [], start = 0, ordinal = 0;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (fm && i < src.slice(0, fm.length).split("\n").length - 1) continue;
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    const closes = (f) => m && f && m[1][0] === f[0] && m[1].length >= f.length && !m[2].trim();
    if (capture) {
      if (closes(capture)) {
        const parsed = newTasksBlock(body.join("\n"));
        if (foldName(parsed.owner) === foldName(owner)) parsed.items.forEach((text, n) => out.push({ text, line: start + parsed.lines[n] + 1, block: ordinal, occurrence: n }));
        capture = ""; body = [];
      } else body.push(lines[i]);
    } else if (code) { if (closes(code)) code = ""; }
    else if (closes(section)) section = "";
    else if (m) {
      const lang = fenceLanguage(m[2]);
      if (!section && Object.hasOwn(NOTE_SECTIONS, lang)) section = m[1];
      else if (lang === "new-tasks") { capture = m[1]; body = []; start = i + 1; ordinal++; }
      else code = m[1];
    }
  }
  if (capture) {
    const parsed = newTasksBlock(body.join("\n"));
    if (foldName(parsed.owner) === foldName(owner)) parsed.items.forEach((text, n) => out.push({ text, line: start + parsed.lines[n] + 1, block: ordinal, occurrence: n }));
  }
  return out;
}

/** Exact source diagnostics: preserve the owner boundary, and expose the values needed to correct it. */
export function overviewOwnerProblem(props, source) {
  if (props.owner == null || props.owner === "") return ""; // existing explicit-person configurations may use a shared inbox
  if (typeof props.owner !== "string" || !props.owner.trim()) return `The owner in ${source.inbox} must be one text name. Open that inbox to check its properties.`;
  return foldName(props.owner) === foldName(source.person) ? ""
    : `Selected person ${JSON.stringify(source.person)} does not match inbox owner ${JSON.stringify(props.owner.trim())} in ${source.inbox}. In Settings, use Check inbox to read and deliberately use this owner.`;
}

export function overviewRows({ notes, setup, source, options, inboxProps = {} }) {
  const identity = { name: source.person, login: source.login }, rows = [];
  const add = (kind, path, label, detail = "", extra = {}) => rows.push({ kind, path, label, detail, ...extra,
    key: JSON.stringify([sourceKey(source), path, kind, extra.identity || ""]) });
  const tasks = notes.filter((n) => isSetupTask(setup, n.path));
  const reviews = options.show.includes("reviews") ? reviewTasks(tasks, setup, identity, options.reviewStatuses) : [];
  const reviewPaths = new Set(reviews.map((r) => r.path));
  const title = (n) => (n.props.id ? n.props.id + " " : "") + n.path.split("/").at(-1).replace(/\.md$/i, "");
  for (const t of reviews) add("reviews", t.path, (t.id ? t.id + " " : "") + t.path.split("/").at(-1).replace(/\.md$/i, ""), "Open the task for your close/rework decision.", { status: t.status });
  if (options.show.includes("questions")) for (const n of tasks) {
    const matches = ["requested_by", "reviewer", "assignee"].some((key) => {
      const v = n.props[fieldProp(setup, key)];
      return (Array.isArray(v) ? v : [v]).some((x) => assigneeMatches(x, identity));
    });
    const q = text(n.props.question);
    if (q && matches && !isDoneStatus(n.props[fieldProp(setup, "status")], setup) && !reviewPaths.has(n.path)) add("questions", n.path, title(n), q, { status: taskAnswer(n.text) ? "Answered, waiting for the agent" : "Waiting for your answer" });
  }
  if (options.show.includes("assignments")) for (const t of sortAssignments(assignmentTasks(tasks, setup, identity), inboxProps.seen_assignments).open) {
    if (!reviewPaths.has(t.path)) add("assignments", t.path, (t.id ? t.id + " " : "") + t.path.split("/").at(-1).replace(/\.md$/i, ""), "Assigned to you", { identity: t.key });
  }
  if (options.show.includes("mentions") && source.login) {
    const mentions = notes.flatMap((n) => findMentions(n.text).filter((m) => m.login.toLowerCase() === source.login.toLowerCase()).map((m) => ({ ...m, path: n.path })));
    for (const m of sortMentions(mentions, inboxProps.seen_mentions).open) add("mentions", m.path, m.path.split("/").at(-1).replace(/\.md$/i, ""), m.text, { heading: m.heading, identity: `${m.line}:${m.text}` });
  }
  if (options.show.includes("new-tasks")) for (const n of notes) for (const item of overviewCaptures(n.text, source.person)) {
    add("new-tasks", n.path, n.path.split("/").at(-1).replace(/\.md$/i, ""), item.text, { identity: `${n.sha || ""}:${item.block}:${item.occurrence}:${item.line}` });
  }
  return rows;
}

export async function overviewEach(items, concurrency, fn, current = () => true) {
  let next = 0;
  const worker = async () => { while (current() && next < items.length) { const i = next++; await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}
