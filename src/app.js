// The app: routing, the sidebar, one view per kind of file, saving, drafts, dialogs and settings.

import { DOMPurify, yamlLoad } from "../vendor/vendor.js";
import { GitHub, newTokenUrl } from "./github.js";
import { LocalSource, withLocal, isLocal, canPickFolder, isBrave, fetchExample, emptyVault, EXAMPLE_VAULTS } from "./local.js";
import { Mirror } from "./mirror.js";
import {
  LinkIndex, findWikilinks, findNavBlock, isImagePath, imageAttachment, captureAttachment, captureAttachmentText, imageInsertion, IMAGE_ACCEPT, defaultNote, fillTemplate, isoDate, splitFrontMatter, titleProblem, toLf,
  inboxCandidates, ownInboxPath, isTaskPath, MARKER, parseMarker, mergeMarker, reposToCheck, repoKey,
  CUSTOM_KINDS, ESTIMATE_UNITS, taskSetup, taskSetupJson, taskSetupProblem, isSetupTask, withProps, linkName, fieldValue, newTaskProps, withReviewer, suggestTasks, claimedTasks, waitingTasks, WAITING, waitingDays, waitingReady, taskState, claimTask, setProps, taskAreas, PRIORITIES, listProp, parentTarget,
  fieldProp, linkTarget, subtasksOf, parentProblem, findTask, sprints, sprintChoices, nextSprint, sprintTasks,
  sprintSuggestions, taskCommitLinks, linkList, relationFields, taskRelations, blockedTasks,
  hasBlock, withBlocks, SPRINT_BLOCKS, relativeLink, questionTasks, taskAnswer, findMentions, vaultPeople, newTasksBlock, newTaskItems, replaceNewTasks, editNewTask, addComment, commentReply,
  blockContents, SEEN_MENTIONS, sortMentions, withSeenMentions, pickSprint, NOTE_SECTIONS, fenceLanguage, withTaskLayout, boardColumns, assigneeOptions, foldName, assignmentTasks, reviewTasks, sortAssignments, withSeenAssignments, SEEN_ASSIGNMENTS, ASSIGNMENT_ID,
} from "./vault.js";
import { createMarkdown, renderNote, TOP_TASKS_COUNT, TOP_TASKS_FIELDS, attentionOptions, boardOptions } from "./markdown.js";
import { createEditor, createCommentEditor, setEditorText, createMergeView, languageFor, hasLanguage } from "./editor.js";
import { parseCsv, serializeCsv } from "./csv.js";
import { parseBase, candidatePaths, runView, usesFileMtime, noteProps, reviveDates } from "./bases.js";
import { store, upgradeRepo, upgradeInboxOverview } from "./store.js";
import { icon, fillIcons } from "./icons.js";
import { createPrintView, clearPrintView, printNote } from "./print.js";
import { aiTimeSamples, aiTimeGroups, aiTimeEstimate, aiTimeLabel } from "./ai-time.js";

// ================================================================
// Helpers
// ================================================================

const APP_NAME = "Commonplace.md";

const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false && c !== ""));
  return el;
}

/** replaceChildren, skipping null, false and "" (which replaceChildren would print as text). */
const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter((c) => c != null && c !== false && c !== ""));

const debounce = (fn, ms) => {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
};

let toastTimer;
/** A short message at the bottom; `type` is "info", "ok" or "error". */
function toast(message, type = "info", ms = 3200) {
  const el = $("#toast");
  fill(el, icon(type === "ok" ? "success" : type === "error" ? "warning" : "info"), h("span", {}, message));
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), type === "error" ? Math.max(ms, 6000) : ms);
}

const sanitize = (html) => DOMPurify.sanitize(html, { ADD_ATTR: ["open"] });
const baseName = (path) => path.slice(path.lastIndexOf("/") + 1);
const dirName = (path) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
const shownName = (path) => baseName(path).replace(/\.md$/i, "");
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const isPhone = () => !matchMedia("(min-width: 861px)").matches;
const isWide = () => matchMedia("(min-width: 1180px)").matches;

const TEXT_KINDS = { md: "md", markdown: "md", csv: "csv", tsv: "csv", base: "base", pdf: "pdf" };
// Files that aren't text: offered as a download. Anything else opens as text (and turns out binary if it holds a NUL).
const BINARY = new RegExp("\\.(zip|7z|rar|gz|tgz|bz2|xz|tar|jar|apk|dmg|iso|msi|exe|dll|so|dylib|bin|wasm|class|pyc"
  + "|mp3|m4a|aac|flac|wav|ogg|opus|mid|mp4|m4v|mov|webm|mkv|avi|wmv|ttf|otf|woff2?|eot"
  + "|doc|docx|xls|xlsx|xlsm|ppt|pptx|odt|ods|odp|epub|psd|ai|sketch|fig|xcf|kra|blend|fbx|glb|ico|sqlite|db|pck)$", "i");
function kindOf(path) {
  if (isImagePath(path)) return "image";
  if (BINARY.test(path)) return "binary";
  return TEXT_KINDS[(/\.(\w+)$/.exec(path)?.[1] || "").toLowerCase()] || "text";
}
function iconFor(path) {
  const kind = kindOf(path);
  if (kind === "text") return hasLanguage(path) ? "code" : "file";
  return { md: "file", csv: "table", base: "table", image: "image", pdf: "file" }[kind] || "blank";
}
/** Files the app shows but never edits. */
const viewOnly = (kind) => kind === "image" || kind === "binary" || kind === "pdf" || kind === "base";

function emptyState(iconName, title, text, ...actions) {
  return h("div", { class: "empty" }, icon(iconName, "big"), h("h2", {}, title), text ? h("p", {}, text) : null, ...actions);
}

const skeleton = () => h("div", { class: "skeleton" }, h("div", { class: "sk h" }), h("div", { class: "sk" }),
  h("div", { class: "sk" }), h("div", { class: "sk" }), h("div", { class: "sk" }), h("div", { class: "sk" }));

// ================================================================
// Dialogs (instead of the browser's prompt and confirm)
// ================================================================

/**
 * Opens a modal. Each button is { label, kind, icon, value, onclick }; an `onclick` returning false keeps
 * the dialog open. Resolves with the chosen button's value (null when dismissed).
 */
function modal({ title, text, body = [], wide = false, buttons, onOpen }) {
  return new Promise((resolve) => {
    const dlg = h("dialog", { class: `modal${wide ? " wide" : ""}` });
    let result = null;
    const foot = h("div", { class: "modal-foot" });
    const els = buttons.map((b) => {
      if (b.spacer) return foot.appendChild(h("span", { class: "spacer" }));
      const el = h("button", {
        type: "button",
        class: `btn ${b.kind || ""}`,
        onclick: async () => {
          if (b.onclick) {
            const r = await b.onclick();
            if (r === false) return;
            result = r === undefined ? b.value ?? true : r;
          } else result = b.value ?? null;
          dlg.close();
        },
      }, b.icon ? icon(b.icon) : null, b.label);
      foot.append(el);
      return el;
    });
    dlg.append(h("div", { class: "modal-body" }, h("h2", {}, title), text ? h("p", {}, text) : null, ...body), foot);
    dlg.addEventListener("close", () => { dlg.remove(); resolve(result); });
    document.body.append(dlg);
    dlg.showModal();
    onOpen?.({ dlg, buttons: els });
  });
}

const confirmDialog = (title, text, okLabel, danger = false) => modal({
  title, text,
  buttons: [{ label: "Cancel", value: false }, { label: okLabel, kind: danger ? "danger" : "primary", value: true }],
}).then(Boolean);

// ================================================================
// State
// ================================================================

const md = createMarkdown();

const app = {
  token: store.get("token", ""),
  repos: store.get("repos") || [],
  trees: new Map(), // repo id -> { files: Map(path -> sha), index, truncated, version }
  repo: null,
  file: null, // { repo, path, kind, sha, saved, text, dirty, editor, csv, dom }
  mode: store.get("mode", "read"),
  openFolders: new Set(store.get("openFolders", [])),
  nav: 0,
  saving: false,
  pageTitle: "",
  access: new Map(), // repo id -> whether this token's user can save there
};

/** False only when GitHub said this person can read the repo but not change it. */
const canWrite = (repo = app.repo) => app.access.get(repo?.id) !== false;

async function loadAccess(repo) {
  if (app.access.has(repo.id)) return;
  try {
    const info = await gh.repo(repo);
    app.access.set(repo.id, info.permissions ? !!info.permissions.push : true);
  } catch { /* unknown: let saving say what's wrong */ }
}
/**
 * This device's tokens for other owners, beside the main token: { owner in lower case: { token, login } }.
 * A fine-grained token opens one owner's repos, so a personal account's vault and an organization's each
 * need their own; the GitHub client picks the one for each repo's owner.
 */
const ownerTokens = () => store.get("tokens", {}) || {};
const tokenMap = () => Object.fromEntries(Object.entries(ownerTokens()).map(([o, t]) => [o, t.token]));
/** The account actually used by a source; local vaults have no GitHub identity. */
const loginFor = (repo) => isLocal(repo) ? "" : ownerTokens()[String(repo?.owner || "").toLowerCase()]?.login ?? store.get("user")?.login ?? "";
/** The local vaults' files (`src/local.js`): `gh` sends every call about a local vault there, never to GitHub. */
const local = new LocalSource();
/** Each GitHub vault's copy on this device (`src/mirror.js`): its reads and saves go through it. */
const mirror = new Mirror();
const client = (token, tokens = {}) => withLocal(new GitHub(token, tokens), local, mirror);
mirror.onChange = (r) => {
  const tree = app.trees.get(r.id);
  if (tree) {
    const prefix = r.folder ? r.folder.replace(/\/+$/, "") + "/" : "";
    tree.changed = new Set([...mirror.changedPaths(r)].filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length)));
    if (!mirror.info(r).offline) tree.offline = false;
  }
  if (app.repo?.id === r.id) { renderHeader(); renderTree(); }
};
/** Where a GitHub vault's file stands in its copy: "waiting", "conflict", "gone", "changed" or "". */
const copyStatus = (repo, path) => (repo && !isLocal(repo) ? mirror.status(repo, fullPath(repo, path)) : "");
const COPY_BADGE = {
  waiting: ["Waiting to upload", "Saved on this device; it goes to GitHub when the connection is back."],
  conflict: ["Changed on GitHub too", "Saved on this device while the note changed on GitHub too. The line above the note compares them."],
  gone: ["Deleted on GitHub", "Saved on this device while the note was deleted or moved on GitHub. The line above the note can save it as a new note."],
  changed: ["Not on GitHub", "Changed on this device (by another tool or agent), not on GitHub. Upload sends it; the app never overwrites it."],
};
/** A note changed here and not saved to GitHub can be uploaded with Save (as Upload), even with no unsaved changes. */
const uploadable = (f) => !!f && !viewOnly(f.kind) && ["changed", "waiting", "gone"].includes(copyStatus(f.repo, f.path));
let gh = client(app.token, tokenMap());
/** Whether the app can open a repo: one on GitHub needs a token, a local vault doesn't. */
const usable = (repo = app.repo) => !!app.token || isLocal(repo);
/** Where a repo's notes are saved, for the messages: GitHub, or this device. */
const savedOn = (repo = app.repo) => (isLocal(repo) ? "this device" : "GitHub");

// Older settings: vault mode also put new notes in Notes/. Those are the repo's own fields now.
if (app.repos.some((r) => upgradeRepo(r) !== r)) {
  app.repos = app.repos.map(upgradeRepo);
  store.set("repos", app.repos);
}

const fullPath = (repo, path) => (repo.folder ? `${repo.folder.replace(/\/+$/, "")}/${path}` : path);

function hrefFor(repo, path = "", heading = null) {
  const segs = [repo.id, ...path.split("/").filter(Boolean)].map(encodeURIComponent);
  return "#/" + segs.join("/") + (heading ? "?h=" + encodeURIComponent(heading) : "");
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const q = raw.indexOf("?");
  const parts = (q >= 0 ? raw.slice(0, q) : raw).split("/").filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : "");
  return { parts, heading: params.get("h"), params };
}

const linkEnv = (repo, fromPath, depth = 0) => {
  const tree = app.trees.get(repo.id);
  return {
    fromPath,
    depth,
    resolve: (target) => tree?.index.resolve(target, fromPath) ?? null,
    href: (path, heading) => hrefFor(repo, path, heading),
  };
};

// ================================================================
// The sidebar: shortcuts, recent files, the tree, search
// ================================================================

// Goes up whenever a tree's files change, so work done for an older tree (base views) is done again.
let treeVersion = 0;

async function loadTree(repo, force = false, { readOnly = false, current = () => true } = {}) {
  if (!readOnly && !force && app.trees.has(repo.id)) return app.trees.get(repo.id);
  // The branch's latest commit first, so the tree is that commit's and newer ones can be told apart later.
  let head = null;
  try { head = await gh.headSha(repo); } catch { /* the tree still loads by the branch's name */ }
  if (!current()) throw new Error("The source selection changed.");
  const data = await gh.tree(repo, head?.sha || repo.branch, { readOnly, current });
  const prefix = repo.folder ? repo.folder.replace(/\/+$/, "") + "/" : "";
  const files = new Map();
  for (const e of data.tree) {
    if (e.type !== "blob" || !e.path.startsWith(prefix)) continue;
    const rel = e.path.slice(prefix.length);
    if (rel.split("/").some((seg) => seg.startsWith("."))) continue; // dot-folders and files: .git, .trash, .gitkeep
    files.set(rel, e.sha);
  }
  const tree = {
    files, index: new LinkIndex([...files.keys()]), truncated: data.truncated, version: ++treeVersion,
    head: head?.sha || null, etag: head?.etag || null, newer: false,
    // From the copy on this device (src/mirror.js): opened with no connection, and the files changed here.
    offline: !!data.offline, syncedAt: data.syncedAt ?? null,
    changed: new Set([...(data.changed || [])].filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length))),
  };
  if (!readOnly) { app.trees.set(repo.id, tree); findOwnInbox(repo, tree); }
  return tree;
}

// ---- newer notes on GitHub ----

const CHECK_EVERY = 3 * 60 * 1000;
let checking = false;

/** Asks GitHub whether the open repo's branch has commits this tree doesn't, and shows the nudge if so. */
async function checkForNewer() {
  const repo = app.repo;
  const tree = repo && app.trees.get(repo.id);
  if (!tree?.head || checking || document.hidden || !app.token) return;
  checking = true;
  try {
    const { sha, etag } = await gh.headSha(repo, tree.etag);
    if (app.trees.get(repo.id) !== tree || !sha) return;
    tree.etag = etag;
    tree.newer = sha !== tree.head;
    renderNudge();
  } catch { /* offline or refused: ask again later */ } finally {
    checking = false;
  }
}

/** A save of ours moved the branch on: the tree is still up to date when ours was the only new commit. */
function wroteCommit(repo, res) {
  const tree = app.trees.get(repo.id);
  if (tree?.head && res?.commit && res.parent === tree.head) tree.head = res.commit;
}

function renderNudge() {
  const tree = app.repo && app.trees.get(app.repo.id);
  $("#nudge").hidden = !tree?.newer;
}

/** Reads the repo again from GitHub, asking first when the open note has unsaved changes. */
async function reloadFromGitHub() {
  if (app.file?.imageUpload) return toast("Wait for the upload to finish.", "info");
  if (app.file?.dirty && !(await confirmDialog(isLocal(app.repo) ? "Reload the notes?" : "Reload from GitHub?", "Your unsaved changes to this note will be lost.", "Reload", true))) return;
  if (app.file) store.remove(draftKey(app.file));
  if (app.repo) {
    app.trees.delete(app.repo.id);
    setups.delete(app.repo.id);
  }
  closeFile();
  app.repo = null;
  $("#nudge").hidden = true;
  route();
}

/** The Inbox button's page: the signed-in person's own inbox once it's found, else the repo's Inbox page. */
const inboxOf = (repo) => (repo && app.trees.get(repo.id)?.ownInbox) || repo?.inbox || "";

/**
 * Finds the signed-in person's own inbox (its `github` property is their login) among the repo's Inbox
 * page and the notes in its inboxes folder, reading only those few (cached by sha, like the bases' notes).
 * It runs in the background: the Inbox button and shortcut switch to it when it's found.
 */
async function findOwnInbox(repo, tree) {
  const login = loginFor(repo);
  const paths = inboxCandidates([...tree.files.keys()], repo.inbox, repo.inboxes || "");
  if (!login || !paths.some((p) => p !== repo.inbox)) return;
  try {
    const own = ownInboxPath(await baseNotes(repo, tree, paths), login, repo.inbox);
    if (app.trees.get(repo.id) !== tree || own === (tree.ownInbox || repo.inbox)) return;
    tree.ownInbox = own;
    if (app.repo === repo) { renderShortcuts(); renderHeader(); }
  } catch { /* the repo's Inbox page stays */ }
}

function treeChanged(repo, path, sha) {
  const tree = app.trees.get(repo.id);
  if (!tree) return;
  const isNew = !tree.files.has(path);
  tree.files.set(path, sha);
  tree.version = ++treeVersion;
  if (isNew) {
    tree.index = new LinkIndex([...tree.files.keys()]);
    renderTree();
  }
}

const fileRow = (repo, path, iconName = iconFor(path), label = shownName(path), sub = null, dot = "") => {
  const wait = !dot && COPY_BADGE[copyStatus(repo, path)]?.[0];
  return h("a", { class: "row file", href: hrefFor(repo, path), "data-path": path, title: dot ? `${path}: ${dot}` : wait ? `${path}: ${wait}` : path },
    icon(iconName), h("span", { class: "name" }, label, sub ? h("small", {}, sub) : null),
    dot ? h("span", { class: "inbox-dot", role: "img", "aria-label": dot }) : null,
    wait ? h("span", { class: "wait-dot", role: "img", "aria-label": wait }) : null);
};

// ---- the Inbox dot: something in your own inbox needs you ----

const INBOX_DOT_SAID = "Something needs you";

/**
 * Whether the signed-in person's own inbox (its `github` is their login) has something waiting, as its
 * ```needs-attention blocks would show it: a question with no answer yet, or a mention with no reply under
 * it that isn't marked seen. It runs in the background, once per tree version, and reuses the box's look-ups
 * (the notes are read once, then cached by sha). The dot follows `tree.attention`.
 */
async function checkInboxDot(repo) {
  const tree = app.trees.get(repo.id);
  const inbox = inboxOf(repo);
  const login = loginFor(repo);
  if (!tree || !usable(repo) || (!isLocal(repo) && !login) || !inbox || !tree.files.has(inbox)) return;
  const key = `${tree.version}:${inbox}:${login}`;
  if (tree.attentionKey === key) return;
  tree.attentionKey = key;
  let waits = false;
  try {
    const [note] = await baseNotes(repo, tree, [inbox]);
    if (isLocal(repo) ? !!String(note.props.owner ?? "").trim() : String(note.props.github ?? "").trim().replace(/^@/, "").toLowerCase() === login.toLowerCase()) {
      for (const b of await inboxAttention(repo, tree, inbox)) {
        if (isLocal(repo) && foldName(b.owner) !== foldName(note.props.owner)) continue;
        if (b.show.includes("reviews") && (b.owner || b.login)
          && (await loadReviews(repo, b.owner, b.login, b.reviewStatuses)).length) waits = true;
        if (!waits && b.show.includes("questions") && b.owner && [...tree.files.keys()].some(isTaskPath)
          && (await loadQuestions(repo, b.owner, b.login)).some((t) => !t.answer)) waits = true;
        if (!waits && b.show.includes("assignments") && (b.owner || b.login)
          && sortAssignments(await loadAssignments(repo, b.owner, b.login), note.props[SEEN_ASSIGNMENTS]).open.length) waits = true;
        if (!waits && b.show.includes("mentions") && b.login
          && sortMentions((await loadMentions(repo, b.login)).found, note.props[SEEN_MENTIONS]).open.length) waits = true;
        if (waits) break;
      }
    }
  } catch { /* no dot when the notes can't be read */ }
  if (app.trees.get(repo.id) !== tree || tree.attentionKey !== key || !!tree.attention === waits) return;
  tree.attention = waits;
  if (app.repo === repo) { paintInboxDot(); renderShortcuts(); }
}

/** The options of each ```needs-attention block in the inbox, read once per version of it (cached by sha). */
async function inboxAttention(repo, tree, inbox) {
  const cache = baseCache("attentionBlocks", repo);
  const sha = tree.files.get(inbox);
  if (!Object.hasOwn(cache, sha)) {
    const text = (await readNotes(repo, tree, [inbox])).get(inbox);
    if (text == null) return [];
    for (const k of Object.keys(cache)) delete cache[k];
    cache[sha] = blockContents(text, "needs-attention").map(attentionOptions);
    keepBaseCache("attentionBlocks", repo, (k) => k === sha);
  }
  return cache[sha];
}

/** The header's Inbox button shows the dot, on the desktop and the phone. */
function paintInboxDot() {
  const btn = $("#inbox-btn");
  const on = !!(app.repo && app.trees.get(app.repo.id)?.attention);
  btn.classList.toggle("has-dot", on);
  btn.title = on ? `Inbox: ${INBOX_DOT_SAID.toLowerCase()}` : "Inbox";
  btn.setAttribute("aria-label", btn.title);
}

function rememberRecent(repo, path) {
  const list = store.get("recent", []).filter((r) => !(r.repo === repo.id && r.path === path));
  list.unshift({ repo: repo.id, path });
  store.set("recent", list.slice(0, 20));
}

function renderShortcuts() {
  const host = $("#shortcuts");
  const repo = app.repo;
  const tree = repo && app.trees.get(repo.id);
  if (!tree) return fill(host);
  const fixed = [];
  const overview = overviewPrefs();
  const dashboard = app.repos.find((r) => r.id === overview.repo && r.local === "browser");
  if (overview.enabled && dashboard) fixed.push(fileRow(dashboard, overview.path, "inbox", "All inboxes"));
  const inbox = inboxOf(repo);
  if (inbox && tree.files.has(inbox)) fixed.push(fileRow(repo, inbox, "inbox", "Inbox", null, tree.attention ? INBOX_DOT_SAID : ""));
  if (repo.home && tree.files.has(repo.home) && repo.home !== inbox) fixed.push(fileRow(repo, repo.home, "home"));
  const skip = new Set([inbox, repo.home]);
  const recent = store.get("recent", [])
    .filter((r) => r.repo === repo.id && tree.files.has(r.path) && !skip.has(r.path)).slice(0, 5);
  fill(host, ...fixed,
    recent.length ? h("div", { class: "side-label" }, "Recent") : null,
    ...recent.map((r) => fileRow(repo, r.path)));
  markActive();
}

function renderTree() {
  const host = $("#tree");
  const repo = app.repo;
  const tree = repo && app.trees.get(repo.id);
  if (!tree) return fill(host);
  const q = $("#filter").value.trim().toLowerCase();
  document.body.classList.toggle("filtering", !!q);
  if (q) return renderMatches(host, repo, tree, q);

  const root = { dirs: new Map(), files: [], count: 0 };
  for (const path of tree.files.keys()) {
    let node = root;
    node.count++;
    for (const seg of path.split("/").slice(0, -1)) {
      if (!node.dirs.has(seg)) node.dirs.set(seg, { dirs: new Map(), files: [], count: 0 });
      node = node.dirs.get(seg);
      node.count++;
    }
    node.files.push(path);
  }
  const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  const build = (node, prefix) => [
    ...[...node.dirs.keys()].sort(byName).map((name) => {
      const folder = prefix + name;
      const sub = node.dirs.get(name);
      const el = h("details", { class: "folder", "data-folder": folder, open: app.openFolders.has(folder) },
        h("summary", { class: "row" }, icon("chevron", "chev"), icon("folder"), h("span", { class: "name" }, name),
          h("span", { class: "count" }, String(sub.count))),
        h("div", { class: "children" }, build(sub, folder + "/")));
      el.addEventListener("toggle", () => {
        el.open ? app.openFolders.add(folder) : app.openFolders.delete(folder);
        store.set("openFolders", [...app.openFolders]);
      });
      return el;
    }),
    ...node.files.sort((a, b) => byName(baseName(a), baseName(b))).map((path) => fileRow(repo, path)),
  ];
  fill(host, ...build(root, ""));
  if (tree.truncated) host.prepend(h("p", { class: "side-empty" }, "GitHub sent only part of the file list."));
  markActive();
}

function renderMatches(host, repo, tree, q) {
  const score = (p) => {
    const name = baseName(p).toLowerCase();
    return name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2;
  };
  const matches = [...tree.files.keys()].filter((p) => p.toLowerCase().includes(q))
    .sort((a, b) => score(a) - score(b) || a.localeCompare(b)).slice(0, 100);
  const query = $("#filter").value.trim();
  const results = h("div", {});
  fill(host, 
    ...matches.map((path) => fileRow(repo, path, iconFor(path), shownName(path), dirName(path) || null)),
    matches.length ? null : h("p", { class: "side-empty" }, "No file name matches."),
    h("button", { class: "btn small search-text", "data-icon": "search", onclick: () => searchText(repo, query, results) },
      `Search inside notes for “${query}”`),
    results,
  );
  fillIcons(host);
  markActive();
}

async function searchText(repo, query, host) {
  fill(host, h("p", { class: "side-empty" }, "Searching…"));
  try {
    const data = await gh.searchCode(repo, query);
    const prefix = repo.folder ? repo.folder.replace(/\/+$/, "") + "/" : "";
    const paths = data.items.map((i) => i.path).filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length));
    fill(host, 
      h("div", { class: "side-label" }, paths.length ? "Found inside" : "Nothing found inside notes"),
      ...paths.map((path) => fileRow(repo, path, iconFor(path), shownName(path), dirName(path) || null)),
      isLocal(repo) || mirror.searchesHere(repo) ? null : h("p", { class: "side-empty" }, "GitHub's search can lag a few minutes behind the latest saves."),
    );
    markActive();
  } catch (e) {
    fill(host, h("p", { class: "side-empty error" }, `Search failed: ${e.message}`));
  }
}

function markActive(path = app.file?.path) {
  for (const a of document.querySelectorAll("#side a.file")) a.classList.toggle("active", a.dataset.path === path);
  if (!path || $("#filter").value.trim()) return;
  const segs = path.split("/");
  for (let i = 1; i < segs.length; i++) {
    const el = document.querySelector(`#tree details[data-folder="${CSS.escape(segs.slice(0, i).join("/"))}"]`);
    if (el && !el.open) el.open = true;
  }
  document.querySelector("#tree a.file.active")?.scrollIntoView({ block: "nearest" });
}

function renderRepoPicker() {
  fill($("#repo-select"), ...app.repos.map((r) => h("option", { value: r.id, selected: r.id === app.repo?.id }, isLocal(r) ? `${r.label} · on this device` : r.label)));
}

function renderWho() {
  const u = store.get("user");
  fill($("#who"), 
    u?.avatar ? h("img", { src: u.avatar, alt: "" }) : h("span", { class: "avatar" }),
    h("span", {}, u?.login || "Not connected"));
}

async function refreshUser() {
  try {
    const u = await gh.user();
    const before = store.get("user")?.login;
    store.set("user", { login: u.login, avatar: u.avatar_url ? `${u.avatar_url}${u.avatar_url.includes("?") ? "&" : "?"}s=64` : "" });
    renderWho();
    const tree = app.repo && app.trees.get(app.repo.id);
    if (tree && u.login !== before) { findOwnInbox(app.repo, tree); checkInboxDot(app.repo); }
  } catch { /* shown in Settings when it matters */ }
}

function closeSideOnPhone() {
  if (isPhone()) document.body.classList.remove("side-open");
}

// ================================================================
// The toolbar
// ================================================================

/** The page above a note: the one its `parent` property links to, when that page exists. */
function parentPath(f) {
  if (f?.kind !== "md") return null;
  const target = parentTarget(f.text);
  const up = target && app.trees.get(f.repo.id)?.index.resolve(target, f.path);
  return up && up !== f.path ? up : null;
}

function renderHeader() {
  const f = app.file;
  const reload = $("#reload-btn");
  reload.hidden = !app.repo || !usable();
  reload.title = isLocal(app.repo) ? "Reload: read the notes on this device again" : "Reload from GitHub";
  reload.setAttribute("aria-label", reload.title);
  renderLocalNote();
  renderNudge();
  const up = parentPath(f);
  const upBtn = $("#up-btn");
  upBtn.hidden = !up;
  upBtn.title = up ? `Up to ${shownName(up)}` : "Up";
  upBtn.setAttribute("aria-label", upBtn.title);
  $("#inbox-btn").hidden = !inboxOf(app.repo) || !usable();
  $("#inbox-btn").classList.toggle("on", !!f && f.path === inboxOf(app.repo));
  paintInboxDot();
  if (app.repo) checkInboxDot(app.repo);
  const title = $("#title");
  const writable = canWrite();
  $("#new-btn").hidden = !writable;
  $("#export-pdf-btn").hidden = f?.kind !== "md";
  $("#side-new").hidden = !writable;
  if (f) {
    const dir = dirName(f.path);
    fill(title, dir ? h("span", { class: "crumbs" }, dir.split("/").join(" / ") + " /") : null,
      h("span", { class: "name" }, shownName(f.path)), f.dirty ? h("span", { class: "dirty", title: "Not saved yet" }) : null,
      writable ? null : h("span", { class: "badge", title: "You can read this repo but not change it" }, "Read only"),
      COPY_BADGE[copyStatus(f.repo, f.path)]
        ? h("span", { class: "badge", title: COPY_BADGE[copyStatus(f.repo, f.path)][1] }, COPY_BADGE[copyStatus(f.repo, f.path)][0])
        : null);
    title.title = f.path;
  } else {
    fill(title, h("span", { class: "name" }, app.pageTitle));
    title.title = "";
  }
  const modes = f?.kind === "md" ? [["read", "Read"], ["edit", "Edit"]] : f?.kind === "csv" ? [["table", "Table"], ["file", "Text"]] : null;
  const seg = $("#mode");
  seg.hidden = !modes || !writable;
  if (modes) {
    [...seg.children].forEach((b, i) => {
      fill(b, icon(modes[i][0]), h("span", { class: "label" }, modes[i][1]));
      b.classList.toggle("on", (app.mode === "edit") === (i === 1));
      b.title = modes[i][1];
    });
  }
  const save = $("#save-btn");
  save.hidden = !f || viewOnly(f.kind) || !writable;
  save.disabled = !(f?.dirty || uploadable(f)) || app.saving || !!f?.imageUpload;
  save.classList.toggle("busy", app.saving);
  const [ic, label] = app.saving ? ["spinner", "Saving"] : f?.dirty ? ["upload", "Save"] : uploadable(f) ? ["upload", "Upload"] : ["check", "Saved"];
  fill(save, icon(ic), h("span", { class: "label" }, label));
  document.title = f ? `${f.dirty ? "• " : ""}${shownName(f.path)} · ${APP_NAME}` : app.pageTitle ? `${app.pageTitle} · ${APP_NAME}` : APP_NAME;
}

// ================================================================
// Routing
// ================================================================

/**
 * How many of this app's pages lie behind the current one in the tab's history. Each history entry
 * keeps its number in `history.state`, so it survives a reload; a new entry is the last one + 1. The
 * browser's own `history.length` can't tell this app's pages from other sites', or back from forward.
 */
let navDepth = 0;
let navSeen = false;
function trackHistory() {
  const n = history.state?.navDepth;
  if (Number.isInteger(n) && n >= 0) navDepth = n;
  else {
    navDepth = navSeen ? navDepth + 1 : 0;
    try { history.replaceState({ ...(history.state ?? {}), navDepth }, ""); } catch { /* Back just stays hidden */ }
  }
  navSeen = true;
  $("#back-btn").hidden = navDepth === 0;
}

/** Goes to `href` in place of the current page (no new history entry), keeping its place in the history. */
function redirect(href) {
  try { history.replaceState({ ...(history.state ?? {}), navDepth }, "", href); } catch { return void location.replace(href); }
  return route();
}

/** Back to the page before, or the start page when this app has none behind it. */
function goBack() {
  if (navDepth > 0) history.back();
  else location.hash = "#/";
}

/** Set while the history is moved back to where it was, so that move doesn't route again. */
let skipRoute = false;
/** Set while the unsaved-changes question is open. */
let askingLeave = false;

async function route() {
  if (skipRoute) {
    skipRoute = false;
    trackHistory();
    return;
  }
  const depthBefore = navDepth;
  trackHistory();
  if (!(await mayLeave(depthBefore))) return;
  flushDraft();
  closeSideOnPhone();
  const { parts, heading, params } = parseHash();
  if (parts[0] === "join") return join(params);
  if (!app.token && !app.repos.some(isLocal)) return showWelcome(store.get("join"));
  document.body.classList.remove("no-token");
  if (parts[0] === "settings") {
    // #/settings?fields opens the Task fields of the repo the person was in (a note can link to it);
    // #/settings?fields=<repo id> names the repo.
    const fieldsOf = params.has("fields")
      ? app.repos.find((r) => r.id === params.get("fields")) || app.repo || app.repos.find((r) => r.id === store.get("lastRepo")) || app.repos[0]
      : null;
    showSettings(params.get("add") === "1", params.get("token") || "");
    if (fieldsOf) editTaskFields(fieldsOf);
    return;
  }
  const repo = app.repos.find((r) => r.id === parts[0]);
  if (!repo) {
    const last = app.repos.find((r) => r.id === store.get("lastRepo")) || app.repos[0];
    if (!last) {
      app.pageTitle = APP_NAME;
      renderHeader();
      return showMain(emptyState("folder", "No notes repo yet",
        "Add the GitHub repo that holds your notes in Settings, or open an invite link someone sent you.",
        h("a", { class: "btn primary", href: "#/settings?add=1" }, icon("plus"), "Add a repo in Settings")));
    }
    return redirect(hrefFor(last));
  }
  const path = parts.slice(1).join("/");
  if (app.file && app.file.repo === repo && app.file.path === path) {
    if (heading) scrollToHeading(heading);
    return;
  }
  const nav = ++app.nav;
  if (app.repo !== repo) {
    app.repo = repo;
    store.set("lastRepo", repo.id);
    $("#filter").value = "";
    document.body.classList.remove("filtering");
    renderRepoPicker();
    fill($("#shortcuts"));
    fill($("#tree"), h("p", { class: "side-empty" }, "Loading the files…"));
  }
  closeFile();
  app.pageTitle = "";
  renderHeader();
  showMain(skeleton());
  let tree;
  try {
    const hadTree = app.trees.has(repo.id);
    [tree] = await Promise.all([loadTree(repo), loadAccess(repo)]);
    if (!hadTree) { renderTree(); renderShortcuts(); }
  } catch (e) {
    if (nav === app.nav) {
      fill($("#tree"));
      if (isLocal(repo)) return showLocalProblem(repo, e);
      // GitHub answers 404 both for a repo that doesn't exist and for one this token may not see.
      const hint = e.status === 404
        ? `GitHub won't show it to this token. A token opens one owner's repos: if this device's token is for another owner, add one for ${repo.owner}. If you just made it, it may still be waiting for ${repo.owner} to approve it: reload once they have. Otherwise, check on GitHub that the token's resource owner is ${repo.owner} and that ${repo.repo} is selected.`
        : e.message;
      const addToken = e.status === 404 || e.status === 401 || e.status === 403
        ? h("a", { class: "btn primary", href: `#/settings?token=${encodeURIComponent(repo.owner)}` }, icon("key"), `Add a token for ${repo.owner}`) : null;
      showProblem(`Couldn't open ${repo.owner}/${repo.repo}`, hint, e, addToken);
    }
    return;
  }
  if (nav !== app.nav) return;
  if (!path) {
    // No start page (a folder opened as a vault, say): its first note at the top, else its first note anywhere.
    const notes = [...tree.files.keys()].filter((p) => /\.md$/i.test(p)).sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
    const home = [repo.home, repo.inbox, "Home.md", "README.md"].find((p) => p && tree.files.has(p)) || notes[0];
    if (home) return redirect(hrefFor(repo, home));
    app.pageTitle = repo.label;
    renderHeader();
    return showMain(emptyState("note", "No notes yet", `${repo.label} is empty. Start with a first note.`,
      h("button", { class: "btn primary", onclick: newNote }, icon("plus"), "New note")));
  }
  await openFile(repo, tree, path, heading, nav);
}

/**
 * Moving away from a file with unsaved changes (a link, Back, Settings, another repo) asks first: Save,
 * Keep as a draft (kept on this device, offered back when the file is opened again), or Discard. Stay, or
 * Escape, puts the address back. Resolves to whether the move goes on.
 */
async function mayLeave(depthBefore) {
  const f = app.file;
  if (!f) return true;
  const { parts } = parseHash();
  if (parts[0] === f.repo.id && parts.slice(1).join("/") === f.path) return true;
  if (f.imageUpload) {
    toast("Wait for the upload to finish.", "info");
    return restoreNoteRoute(f, depthBefore);
  }
  if (hasCaptureDraft(f)) {
    const leave = await confirmDialog("Leave unapplied ideas?", "Use Add or Keep changes before leaving to keep the text in the New tasks box. Leaving now discards that text.", "Leave without adding", true);
    if (!leave) return restoreNoteRoute(f, depthBefore);
  }
  if (!f.dirty) return true;
  if (askingLeave) return false;
  askingLeave = true;
  let choice;
  try {
    choice = await modal({
      title: "Leave without saving?",
      text: `${shownName(f.path)} has changes that aren't saved to ${savedOn(f.repo)} yet.`,
      buttons: [
        { label: "Stay", kind: "ghost", value: "stay" },
        { spacer: true },
        { label: "Discard", kind: "danger", value: "discard" },
        { label: "Keep as a draft", value: "draft" },
        { label: "Save", kind: "primary", icon: "upload", value: "save" },
      ],
    });
  } finally {
    askingLeave = false;
  }
  if (app.file !== f) return true;
  if (choice === "save") await save();
  else if (choice === "discard") {
    f.text = f.saved;
    f.dirty = false;
    store.remove(draftKey(f));
  }
  // Saved, discarded or kept as a draft: on to the new page. Stay, or a save that didn't go through
  // (refused, or someone else's change to sort out first): back to the file.
  if ((choice === "save" && !f.dirty) || choice === "discard" || choice === "draft") return true;
  return restoreNoteRoute(f, depthBefore);
}

function restoreNoteRoute(f, depthBefore) {
  if (navDepth !== depthBefore) {
    skipRoute = true;
    if (navDepth > depthBefore) history.back();
    else history.forward();
  } else {
    try { history.replaceState({ ...(history.state ?? {}), navDepth }, "", hrefFor(f.repo, f.path)); } catch { /* the address stays */ }
  }
  return false;
}

function closeFile() {
  clearPrintView();
  app.file?.editor?.destroy();
  app.file?.commentEditors?.forEach(({ view }) => view.destroy());
  app.file = null;
}

function showMain(...children) {
  fill($("#main"), ...children);
  $("#main").scrollTop = 0;
}

function showProblem(title, message, error, action = null) {
  closeFile();
  app.pageTitle = "";
  renderHeader();
  const toSettings = error?.status === 401 || error?.status === 403 || error?.status === 404;
  showMain(emptyState("warning", title, message, action,
    toSettings ? h("a", { class: "btn", href: "#/settings" }, icon("settings"), "Check the token and repos") : null));
}

// ================================================================
// Opening a file
// ================================================================

async function openFile(repo, tree, path, heading, nav) {
  if (!tree.files.has(path)) return showProblem("No such file", `There's no ${path} in ${repo.label}.`);
  const kind = kindOf(path);
  markActive(path);
  if (kind === "image" || kind === "binary" || kind === "pdf") {
    app.file = { repo, path, kind, sha: tree.files.get(path) };
    renderHeader();
    if (kind !== "image") return showMain(fileView(repo, path, tree.files.get(path), kind));
    const img = h("img", { class: "image-view", alt: path });
    showMain(h("div", { class: "image-wrap" }, img));
    blobUrl(repo, tree.files.get(path), path).then((url) => { img.src = url; }, (e) => toast(e.message, "error"));
    return;
  }
  let data;
  try {
    data = await gh.readText(repo, fullPath(repo, path));
  } catch (e) {
    if (nav === app.nav) showProblem(`Couldn't open ${shownName(path)}`, e.message, e);
    return;
  }
  if (nav !== app.nav) return;
  // A file with an unknown name that turns out not to be text: offer it as a download instead.
  if (kind === "text" && data.text.includes("\u0000")) {
    app.file = { repo, path, kind: "binary", sha: data.sha };
    renderHeader();
    return showMain(fileView(repo, path, data.sha, "binary"));
  }
  app.file = { repo, path, kind, sha: data.sha, saved: data.text, text: data.text, dirty: false };
  if (tree.files.get(path) !== data.sha) {
    tree.files.set(path, data.sha);
    tree.version = ++treeVersion;
  }
  rememberRecent(repo, path);
  renderShortcuts();
  renderFile();
  checkDraft();
  if (heading) scrollToHeading(heading);
}

/**
 * A PDF shows in the browser's own viewer where it has one in a page (not on phones, whose browsers
 * only open or download it); any other file the app can't show is offered as a download.
 */
function fileView(repo, path, sha, kind) {
  const name = baseName(path);
  const download = h("a", { class: "btn primary", download: name, "aria-disabled": "true" }, icon("download"), "Download");
  const open = kind === "pdf"
    ? h("a", { class: "btn", target: "_blank", rel: "noopener", "aria-disabled": "true" }, icon("external"), "Open in a new tab")
    : null;
  const frame = kind === "pdf" && navigator.pdfViewerEnabled && !isPhone() ? h("iframe", { class: "pdf-view", title: name }) : null;
  blobUrl(repo, sha, path).then((url) => {
    for (const a of [download, open]) if (a) { a.href = url; a.removeAttribute("aria-disabled"); }
    if (frame) frame.src = url;
  }, (e) => toast(`Couldn't load ${name}: ${e.message}`, "error"));
  if (frame) return h("div", { class: "pdf-wrap" }, h("div", { class: "file-actions" }, open, download), frame);
  const text = kind === "pdf"
    ? "This browser can't show a PDF inside the page. Open it in a new tab, or download it."
    : "The app can't show this kind of file. Download it to open it on this device.";
  return emptyState(kind === "pdf" ? "file" : "blank", name, text, h("div", { class: "file-actions" }, open, download));
}

function renderFile() {
  const f = app.file;
  const view = h("div", { class: `doc kind-${f.kind}` });
  f.dom = {
    view,
    banners: h("div", { class: "banners" }),
    editorPane: h("div", { class: "editor-pane" }),
    preview: h(f.kind === "md" ? "article" : "div", { class: f.kind === "md" || f.kind === "base" ? "preview" : "table-pane" }),
    linkWarn: h("div", { class: "banner warn link-warn", hidden: true }),
  };
  f.dom.banners.append(f.dom.linkWarn);
  if (f.kind === "md" && canWrite(f.repo)) setupImageTools(f);
  view.append(f.dom.banners, h("div", { class: "panes" }, f.dom.editorPane, f.dom.preview));
  showMain(view);
  f.dom.preview.addEventListener("click", onPreviewClick);
  // Wide tables are fitted again when the window changes size, and when a base view's rows arrive.
  app.wideWatch?.disconnect();
  if (f.kind === "md" && "ResizeObserver" in window) {
    app.wideWatch = new ResizeObserver(() => fitWide(f));
    app.wideWatch.observe($("#main"));
    app.wideWatch.observe(f.dom.preview);
  }
  applyMode();
}

/**
 * Shows the current file in the current mode, making the editor the first time it's needed.
 * The editor takes the focus only when asked to, so opening a note doesn't pop up a phone's keyboard.
 */
function applyMode(focus = false) {
  const f = app.file;
  if (!f?.dom) return;
  const editing = f.kind === "text" || (app.mode === "edit" && f.kind !== "base" && canWrite(f.repo));
  f.dom.view.classList.toggle("editing", editing);
  if (editing && !f.editor) {
    const tree = app.trees.get(f.repo.id);
    f.editor = createEditor(f.dom.editorPane, f.text, {
      onChange: onTextChanged,
      resolve: (target) => tree.index.resolve(target, f.path),
      isMarkdown: f.kind === "md",
      language: f.kind === "text" ? languageFor(f.path) : null,
      vault: f.repo.vault && f.kind === "md",
      readOnly: !canWrite(f.repo),
      people: () => loadPeople(f.repo),
    });
  }
  if (f.editor) setEditorText(f.editor, f.text);
  if (f.kind === "md" && (!editing || isWide())) renderPreview();
  if (f.kind === "csv" && !editing) renderTable();
  if (f.kind === "base") fill(f.dom.preview, h("h1", { class: "inline-title" }, baseName(f.path)), baseView(f.repo, f.path));
  if (editing && focus) f.editor.focus();
  updateLinkWarning();
  renderHeader();
}

function setMode(mode) {
  if (mode === "edit" && !canWrite()) return toast("You can read this repo but not change it.");
  app.mode = mode;
  store.set("mode", mode);
  applyMode(true);
}

function onTextChanged(text, changes) {
  const f = app.file;
  if (f?.imageUpload && !f.imageUpload.capture && changes) f.imageUpload.at = changes.mapPos(f.imageUpload.at, -1);
  if (!f || f.text === text) return;
  f.text = text;
  if (f.kind === "csv") f.csv = null;
  updateDirty();
  if (f.kind === "md" && isWide()) previewLater();
  warnLater();
}

/** The chooser, clipboard and editor drop all go through the same image action. */
function setupImageTools(f) {
  const input = h("input", { type: "file", accept: IMAGE_ACCEPT, hidden: true, "aria-label": "Choose an image",
    onchange: () => {
      const file = input.files[0];
      input.value = "";
      if (file) addImage(f, file);
    } });
  const pick = h("button", { type: "button", class: "btn small", onclick: () => input.click() }, icon("image"), "Add image");
  const status = h("span", { class: "muted", role: "status" });
  f.dom.imageTools = { pick, status };
  const pane = f.dom.editorPane;
  pane.append(h("div", { class: "image-tools" }, pick, input, status));
  const imageFile = (transfer) => transfer && ([...transfer.files].find((file) => file.type.startsWith("image/") || isImagePath(file.name))
    || [...(transfer.items ?? [])].find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile());
  const handle = (event, transfer, at) => {
    const file = imageFile(transfer);
    if (!file) return;
    event.preventDefault();
    event.stopPropagation();
    addImage(f, file, at);
  };
  pane.addEventListener("paste", (event) => handle(event, event.clipboardData), true);
  pane.addEventListener("dragover", (event) => {
    if ([...(event.dataTransfer?.items ?? [])].some((item) => item.kind === "file" && (!item.type || item.type.startsWith("image/")))) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }, true);
  pane.addEventListener("drop", (event) => handle(event, event.dataTransfer,
    f.editor?.posAtCoords({ x: event.clientX, y: event.clientY }) ?? undefined), true);
}

async function addImage(f, file, at = f.editor?.state.selection.main.head) {
  if (app.file !== f || app.mode !== "edit" || !canWrite(f.repo) || at == null) return;
  if (f.imageUpload || app.saving) return toast("Wait for the current save or upload to finish.", "info");
  if (!isLocal(f.repo) && navigator.onLine === false) return toast("Connect to GitHub before adding an image.", "error");
  const nav = f.repo.vault && findNavBlock(f.text);
  if (nav && at >= nav.from && at <= nav.to) return toast("Move the cursor outside the navigation box to add an image.", "info");

  const { pick, status } = f.dom.imageTools;
  const tree = app.trees.get(f.repo.id);
  f.imageUpload = { at };
  pick.disabled = true;
  status.textContent = "Uploading image…";
  renderHeader();
  try {
    const image = imageAttachment(file, f.path, f.repo.attachments, tree?.files.keys() ?? []);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await gh.writeBytes(f.repo, fullPath(f.repo, image.path), bytes, `Add ${image.path} from ${APP_NAME}`);
    wroteCommit(f.repo, saved);
    treeChanged(f.repo, image.path, saved.sha);
    if (app.file !== f) return toast(`Image saved to ${image.path}.`, "ok");
    const { at: cursor, insert } = imageInsertion(f.text, f.imageUpload.at, image.link);
    const currentNav = f.repo.vault && findNavBlock(f.text);
    if (currentNav && cursor >= currentNav.from && cursor <= currentNav.to) {
      // Keep the protected box on its original lines when insertion falls at its edge.
      const line = insert.endsWith("\n") ? insert : insert + "\n";
      f.editor.dispatch({ changes: { from: currentNav.from, insert: line }, filter: false });
    } else {
      f.editor.dispatch({ changes: { from: cursor, insert }, selection: { anchor: cursor + insert.length }, scrollIntoView: true });
    }
    if (app.mode === "edit") f.editor.focus();
    else renderPreview();
    toast("Image added. Save the note to keep the link.", "ok");
  } catch (e) {
    toast(`Image not added: ${e.message}`, "error");
  } finally {
    f.imageUpload = null;
    pick.disabled = false;
    status.textContent = "";
    renderHeader();
  }
}

function updateDirty() {
  const f = app.file;
  const was = f.dirty;
  f.dirty = f.text !== f.saved;
  saveDraftLater();
  if (was !== f.dirty) renderHeader();
}

// ================================================================
// The Markdown preview
// ================================================================

const previewLater = debounce(() => renderPreview(), 250);

function renderPreview() {
  const f = app.file;
  if (f?.kind !== "md") return;
  const env = linkEnv(f.repo, f.path);
  const { html, frontMatter } = renderNote(md, f.text, env);
  const body = h("div", { class: "note-body" });
  body.innerHTML = sanitize(html);
  // A note without a title of its own shows its file name.
  if (!body.querySelector("h1:not(.note-section h1)")) body.prepend(h("h1", { class: "inline-title" }, shownName(f.path)));
  const history = '.note-body > details[data-section="work-history"]';
  const previous = f.dom.preview.querySelectorAll(history);
  body.querySelectorAll(':scope > details[data-section="work-history"]').forEach((section, i) => { section.open = previous[i]?.open ?? false; });
  decorate(body, f.repo, f.path);
  if (!canWrite(f.repo)) for (const box of body.querySelectorAll("input.task")) box.disabled = true;
  fillEmbeds(body, f.repo, f.path);
  fillBases(body, f.repo, f.path);
  const previousBoards = [...f.dom.preview.querySelectorAll(".board-columns")].map((board) => board.scrollLeft);
  fillBoards(body, f);
  fillAiTime(body, f);
  if (previousBoards.some(Boolean)) {
    requestAnimationFrame(() => body.querySelectorAll(".board-columns").forEach((board, i) => {
      board.scrollLeft = previousBoards[i] ?? 0;
    }));
  }
  // The top tasks show only where a ```top-tasks block is, an inbox's too.
  fillTopTasks(body, f);
  // Inbox items show only where a ```needs-attention block is, like the top tasks.
  fillAttention(body, f);
  fillInboxOverview(body, f);
  // New tasks and Comments get their inline forms where the note can be changed.
  fillNewTasks(body, f);
  const commentFocus = fillComments(body, f);
  // A task shows its project's fields as a form, and the other properties in the box below it.
  const setup = usable(f.repo) ? taskSetupOf(f.repo) : null;
  if (usable(f.repo) && !setup) {
    loadTaskSetup(f.repo).then(() => { if (app.file === f && f.dom?.preview.isConnected && f.kind === "md") renderPreview(); });
  }
  const isTask = setup && isSetupTask(setup, f.path);
  const form = isTask && canWrite(f.repo) ? taskForm(f, setup) : null;
  // A task with a ```commits block shows its commits there, not again among its properties.
  const ownCommits = isTask && hasBlock(f.text, "commits");
  const inForm = isTask ? new Set([ASSIGNMENT_ID, ...(ownCommits ? ["commits"] : []), ...(form ? setup.fields.filter((x) => x.on).map((x) => x.prop.toLowerCase()) : [])]) : null;
  let props = null;
  if (isTask && frontMatter) try { props = yamlLoad(frontMatter); } catch { /* the properties box shows what's wrong */ }
  const isSprint = setup && !isTask && isSprintNote(setup, f.path);
  fillAppBlocks(body, {
    subtasks: isTask && (() => subtasksBox(f, setup)),
    relations: isTask && (() => relationsBox(f, setup)),
    commits: isTask && (() => commitsBox(f, props)),
    sprint: isSprint && (() => sprintBox(f, setup)),
  }, setup && ((kind, d) => kind === "sprint" ? otherSprintBox(f, setup, d.sprint) : otherTaskBox(f, setup, kind, d.task, isTask ? props : null)));
  const aiEstimate = isTask ? aiEstimateField(f, setup) : null;
  fill(f.dom.preview, form, aiEstimate, frontMatter ? propertiesBox(frontMatter, env, inForm) : "", body);
  commentFocus?.focus();
  fitWide(f);
}

// AI history stays in this vault and shares the existing task-property cache.
function aiEstimateField(f, setup) {
  const entry = taskNotes(f.repo, setup);
  if (!entry.notes) return null;
  const samples = aiTimeSamples(entry.notes, setup);
  // Vaults without AI records or an explicitly configured work_time field need no AI UI.
  if (!samples.length && !setup.fields.some((field) => field.prop === "work_time")) return null;
  const estimate = aiTimeEstimate(samples, noteProps(f.text), setup, f.path);
  if (!estimate) return null;
  return h("div", { class: "ai-time-estimate", "aria-label": "AI time estimate" },
    h("strong", {}, "AI time estimate: "), estimate.reason || `${aiTimeLabel(estimate.mean)} average`,
    estimate.count ? h("small", { class: "muted" }, ` · ${estimate.count} completed task${estimate.count === 1 ? "" : "s"} · observed ${aiTimeLabel(estimate.min)}–${aiTimeLabel(estimate.max)}${estimate.count === 1 ? " · provisional: one sample" : ""}`) : null,
    h("small", { class: "muted ai-time-note" }, "Recorded AI work only, never human time. A guide, not a promised finish time."));
}

function fillAiTime(root, f) {
  const blocks = root.querySelectorAll(".ai-time-block");
  const setup = taskSetupOf(f.repo);
  if (!blocks.length || !setup) return;
  const entry = taskNotes(f.repo, setup);
  for (const el of blocks) {
    // Embedded pages retain their fence, as other app blocks do.
    if (el.parentElement.closest(".embed-page")) continue;
    if (!entry.notes) { fill(el, h("p", { class: "muted", role: "status" }, "Loading AI work history…")); continue; }
    let options;
    try { options = yamlLoad(el.querySelector("code").textContent) || {}; }
    catch { fill(el, h("p", { class: "muted" }, "Check this ai-work-time block: use group: area-type, area or type.")); continue; }
    const group = options.group || "area-type";
    if (!["area-type", "area", "type"].includes(group)) { fill(el, h("p", { class: "muted" }, "Use group: area-type, area or type.")); continue; }
    const groups = aiTimeGroups(aiTimeSamples(entry.notes, setup), group);
    const largest = groups[0]?.mean || 1;
    el.replaceWith(h("section", { class: "ai-time-chart", "aria-label": "AI work history" },
      h("h3", {}, "AI work history"),
      h("p", { class: "muted" }, "Average recorded AI minutes by " + (group === "area-type" ? "area and type" : group) + ". Completed tasks only; never a measure of a person."),
      groups.length ? h("ul", { class: "ai-time-groups" }, groups.map((g) => h("li", {},
        h("strong", {}, g.label), h("span", {}, `${aiTimeLabel(g.mean)} average · ${g.count} task${g.count === 1 ? "" : "s"}`),
        h("div", { class: "ai-time-track", "aria-hidden": "true" }, h("span", { style: `width: ${g.mean / largest * 100}%` })),
        h("small", { class: "muted" }, `Observed ${aiTimeLabel(g.min)}–${aiTimeLabel(g.max)}${g.count === 1 ? " · one sample" : ""}`))))
        : h("p", { class: "muted" }, "No completed AI tasks with valid work_time minutes and these grouping fields yet."),
      h("small", { class: "muted" }, "work_time is AI-only whole minutes. Missing or invalid values, cancelled tasks and epics are excluded. History does not predict a guaranteed finish time.")));
  }
}

/** How wide a table or base view may grow on a big screen. */
const WIDE_MAX = 1400;

/**
 * On a big screen, a table or base view too wide for the note's column grows out of it, centered, as far as the
 * page has room (up to WIDE_MAX); one that fits stays as it is. On a phone there's no room beside the column, so
 * it scrolls inside its own box. Only those right in the note (not in an embedded page, a callout or a list), and
 * not while the editor is beside the preview.
 */
function fitWide(f) {
  const body = f?.dom?.preview?.querySelector(":scope > .note-body");
  if (!body?.isConnected) return;
  const items = [...body.querySelectorAll(":scope > table, :scope > .base-view")];
  for (const el of items) Object.assign(el.style, { width: "", maxWidth: "", marginLeft: "" });
  if (f.dom.view.classList.contains("editing")) return;
  const col = body.clientWidth;
  const doc = getComputedStyle(f.dom.view);
  const room = Math.min(WIDE_MAX, $("#main").clientWidth - parseFloat(doc.paddingLeft) - parseFloat(doc.paddingRight));
  if (!(col > 0) || room <= col + 1) return;
  for (const el of items) {
    // A Markdown table whose text wraps fits, and stays; one that can't fit (it scrolls) grows. A base view grows
    // once its rows are in. Either takes the width its columns want (a base's long cells stop at their max-width).
    if (el.matches("table") ? el.scrollWidth <= el.clientWidth + 1 : !el.querySelector(".base-scroll")) continue;
    Object.assign(el.style, { width: "max-content", maxWidth: "none" });
    const need = Math.ceil(el.offsetWidth);
    Object.assign(el.style, { width: "", maxWidth: "" });
    if (need <= col + 1) continue;
    const width = Math.min(need, room);
    Object.assign(el.style, { width: `${width}px`, maxWidth: "none", marginLeft: `${Math.round((col - width) / 2)}px` });
  }
}

/**
 * Puts each box where its block is written in the note (```subtasks, ```relations, ```commits, ```sprint).
 * A box with nothing to show leaves no trace; a block on a page that isn't a task (or a sprint), or one
 * inside an embedded page, keeps its code, as it does outside the app. No block, no box.
 */
function fillAppBlocks(body, boxes, other = null) {
  for (const el of body.querySelectorAll(".app-block")) {
    if (el.parentElement.closest(".embed-page")) continue;
    // A block with a `task:` (or, for a sprint, `sprint:`) line shows that task's or sprint's box, on any page.
    const box = (el.dataset.task || el.dataset.sprint) && other ? other(el.dataset.block, el.dataset) : undefined;
    if (box !== undefined) { el.replaceWith(box ?? ""); continue; }
    const make = boxes[el.dataset.block];
    if (make) el.replaceWith(make() ?? "");
  }
}

/** The task kinds of block that can name another task with `task:`. */
const TASK_BOX_KINDS = ["subtasks", "relations", "commits"];

/**
 * A ```subtasks, ```relations or ```commits block's box for the task its `task:` line names (an ID, a name or a
 * link), on any page. On another page it only reads: adding and taking out are on the task's own page. A name
 * that leads to no task says so. Undefined for a kind that takes no `task:`, so the block is drawn as before.
 */
function otherTaskBox(f, setup, kind, input, ownProps) {
  if (!TASK_BOX_KINDS.includes(kind) || !input) return undefined;
  const entry = taskNotes(f.repo, setup);
  if (!entry.notes) return h("div", { class: "subtasks none" }, h("span", { class: "muted" }, "Looking for the task…"));
  const t = findTask(entry.notes, input);
  if (!t) return h("div", { class: "subtasks none" }, h("span", { class: "muted" }, `No task is called “${linkName(input)}”, so this ${kind} block shows nothing.`));
  if (t.path === f.path) {
    return kind === "subtasks" ? subtasksBox(f, setup) : kind === "relations" ? relationsBox(f, setup) : commitsBox(f, ownProps ?? t.props);
  }
  const of = { path: t.path, props: t.props };
  return kind === "subtasks" ? subtasksBox(f, setup, of) : kind === "relations" ? relationsBox(f, setup, of) : commitsBox(f, t.props, of);
}

/** The task a box on another page is about, after its title: "of C-49 Agile tasks", linking to it. */
const ofTask = (repo, of) => (of ? h("a", { class: "st-of", href: hrefFor(repo, of.path), title: `Open ${shownName(of.path)}` },
  "of ", String(of.props.id ?? "").trim() ? h("span", { class: "st-id" }, String(of.props.id).trim()) : null, shownName(of.path)) : null);

/** An empty box for another task, so the page says there's nothing rather than showing nothing. */
const noneFor = (repo, title, of, said) => h("section", { class: "subtasks", "aria-label": title },
  h("div", { class: "st-head" }, h("span", { class: "st-title" }, title), ofTask(repo, of)), h("p", { class: "muted st-none" }, said));

// ---- a task's fields as a form (the project's task setup) ----

/** Each repo's task setup, read once from its .commonplace.json: repo id -> { setup, load }. */
const setups = new Map();
/** The repo's task setup if it's been read, else null (and `loadTaskSetup` reads it). */
const taskSetupOf = (repo) => setups.get(repo.id)?.setup ?? null;

/** Reads a repo's task setup; with no file, no `tasks` in it, or no connection, the fields repos always had. */
function loadTaskSetup(repo, force = false) {
  const known = setups.get(repo.id);
  if (known && !force) return known.load;
  const entry = { setup: known?.setup ?? null, load: null };
  entry.load = readMarker(repo)
    .then((m) => taskSetup(m.text ? JSON.parse(m.text).tasks ?? null : null))
    .catch(() => taskSetup(null))
    .then((s) => (entry.setup = s));
  setups.set(repo.id, entry);
  return entry.load;
}

/** A setup saved from Task fields is the one to use from now on. */
function useTaskSetup(repo, setup) {
  setups.set(repo.id, { setup, load: Promise.resolve(setup) });
}

/**
 * Some notes' properties (every task, or every sprint), read once per tree version from the bases' cache:
 * `${repo id}:${what}` -> { version, notes, load }. Until a new version is read, the last one's notes are
 * shown; the open note is drawn again when it's in.
 */
const propLoads = new Map();
function notesWithProps(repo, what, wanted) {
  const tree = app.trees.get(repo.id);
  const key = `${repo.id}:${what}`;
  const known = propLoads.get(key);
  if (!tree) return { notes: null };
  if (known?.version === tree.version) return known;
  const entry = { version: tree.version, notes: known?.notes ?? null };
  entry.load = baseNotes(repo, tree, [...tree.files.keys()].filter(wanted))
    .then((notes) => { entry.notes = notes; redrawNote(); }, () => { propLoads.delete(key); });
  propLoads.set(key, entry);
  return entry;
}
const taskNotes = (repo, setup) => notesWithProps(repo, "tasks", (p) => isSetupTask(setup, p));
const sprintNotes = (repo, setup) => notesWithProps(repo, "sprints", (p) => isSprintNote(setup, p));

/** The setup's sprint field, when sprints are on (or there's no setup, and the folder is `Sprints`). */
function sprintField(setup) {
  const field = setup?.fields.find((f) => f.key === "sprint");
  return field && (field.on || !setup.configured) ? field : null;
}
/** A sprint note: a Markdown note in the setup's sprints folder. */
function isSprintNote(setup, path) {
  const field = sprintField(setup);
  return !!field && /\.md$/i.test(path) && path.toLowerCase().startsWith(`${field.folder.toLowerCase()}/`);
}

/** Draws the open note's preview again, where it was scrolled to. */
function redrawNote() {
  if (app.file?.kind !== "md" || !app.file.dom?.preview.isConnected) return;
  const scroll = $("#main").scrollTop;
  renderPreview();
  $("#main").scrollTop = scroll;
}

/** A task's subtasks, each with its status, and a bar of how many are done; Add subtask makes a new one under it. */
function subtasksBox(f, setup, of = null) {
  const entry = taskNotes(f.repo, setup);
  if (!entry.notes) return null;
  const tree = app.trees.get(f.repo.id);
  const { tasks, done, total } = subtasksOf(entry.notes, of?.path ?? f.path,
    { prop: fieldProp(setup, "part_of"), resolve: (t, from) => tree.index.resolve(t, from), setup });
  // On another page it only reads: Add subtask is on the task's own page.
  const add = !of && canWrite(f.repo) ? h("button", { class: "btn small ghost", onclick: () => addSubtask(f, setup) }, icon("plus"), "Add subtask") : null;
  if (!total) return of ? noneFor(f.repo, "Subtasks", of, "No subtasks yet.") : add ? h("div", { class: "subtasks none" }, add) : null;
  return h("section", { class: "subtasks", "aria-label": "Subtasks" },
    h("div", { class: "st-head" }, h("span", { class: "st-title" }, "Subtasks"), ofTask(f.repo, of), h("span", { class: "st-count" }, `${done} of ${total} done`), add),
    h("div", { class: "st-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(done),
      "aria-label": `${done} of ${total} subtasks done` }, h("span", { style: `width: ${Math.round((done / total) * 100)}%` })),
    h("ul", { class: "st-list" }, tasks.map((t) => h("li", { class: t.done ? "done" : null },
      h("a", { href: hrefFor(f.repo, t.path) }, t.id ? h("span", { class: "st-id" }, t.id) : null, shownName(t.path)),
      t.status ? h("span", { class: "st-status" }, t.status) : null))));
}

// ---- a task's relations ----

/**
 * A task's relations both ways, grouped: Blocked by, Blocks, Comes after, Comes before, Related; each task
 * with its status. The task's own links can be taken out here, and Add relation links another task.
 */
function relationsBox(f, setup, of = null) {
  const fields = relationFields(setup);
  if (!fields.length) return null;
  const entry = taskNotes(f.repo, setup);
  if (!entry.notes) return null;
  const tree = app.trees.get(f.repo.id);
  const groups = taskRelations(entry.notes, of?.path ?? f.path, of ? of.props : noteProps(f.text), { setup, resolve: (t, from) => tree.index.resolve(t, from) });
  // On another page it only reads: adding and taking out are on the task's own page.
  const editable = !of && canWrite(f.repo);
  const add = editable ? h("button", { class: "btn small ghost", type: "button", onclick: () => addRelation(f, setup, fields) }, icon("plus"), "Add relation") : null;
  if (!groups.length) return of ? noneFor(f.repo, "Relations", of, "No relations yet.") : add ? h("div", { class: "subtasks none" }, add) : null;
  const remove = (t, button) => {
    const field = setup.fields.find((x) => x.key === t.key);
    const left = linkList(noteProps(f.text)[field.prop]).filter((n) => n.toLowerCase() !== t.name.toLowerCase());
    setTaskField(f, field, left, button);
  };
  const name = (t) => (t.path ? shownName(t.path) : t.name);
  return h("section", { class: "subtasks relations", "aria-label": "Relations" },
    h("div", { class: "st-head" }, h("span", { class: "st-title" }, "Relations"), ofTask(f.repo, of), add),
    groups.map((g) => h("div", { class: "rel-group" },
      h("div", { class: "rel-label" }, g.label),
      h("ul", { class: "st-list" }, g.tasks.map((t) => h("li", { class: t.done ? "done" : null },
        t.path
          ? h("a", { href: hrefFor(f.repo, t.path) }, t.id ? h("span", { class: "st-id" }, t.id) : null, shownName(t.path))
          : h("span", { class: "rel-missing", title: "No page has this name" }, t.name),
        t.status ? h("span", { class: "st-status" }, t.status) : null,
        editable && t.own ? h("button", { class: "icon-btn", type: "button", title: `Take ${name(t)} out of ${g.label}`,
          "aria-label": `Take ${name(t)} out of ${g.label}`, onclick: (e) => remove(t, e.currentTarget) }, icon("x")) : null))))));
}

/** Links another task to this one: how they're related, and which task (by its ID or name). One commit. */
async function addRelation(f, setup, fields) {
  const tree = app.trees.get(f.repo.id);
  const notes = taskNotes(f.repo, setup).notes || [];
  const resolve = (n) => tree.index.resolve(n, f.path);
  const kind = h("select", { class: "input", "aria-label": "How they're related" }, fields.map((x) => h("option", { value: x.key }, x.label)));
  const options = notes.filter((n) => n.path !== f.path)
    .map((n) => { const tid = String(n.props.id ?? "").trim(); return tid ? `${tid} ${shownName(n.path)}` : shownName(n.path); })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const task = h("input", { class: "input", list: "rel-task-list", autocomplete: "off", spellcheck: "false", placeholder: "A task's ID or name",
    "aria-label": "The other task" });
  const hint = h("small", {});
  const pick = () => {
    const s = task.value.trim();
    if (!s) return { error: "" };
    const found = findTask(notes, s);
    if (!found) return { error: `No task is called “${linkName(s)}”.` };
    if (found.path === f.path) return { error: "A task can't be related to itself." };
    const field = setup.fields.find((x) => x.key === kind.value);
    const now = linkList(noteProps(f.text)[field.prop]);
    if (now.some((n) => resolve(n) === found.path)) return { error: `${shownName(found.path)} is already under ${field.label}.` };
    return { found, field, now };
  };
  const update = () => {
    const p = pick();
    hint.textContent = p.error || (p.found ? `${shownName(f.path)}: ${p.field.label.toLowerCase()} ${shownName(p.found.path)}` : "");
    hint.classList.toggle("bad", !!p.error);
  };
  task.addEventListener("input", update);
  kind.addEventListener("change", update);
  const ok = await modal({
    title: "Add relation",
    text: `How ${shownName(f.path)} is related to another task. It shows on that task too, the other way round.`,
    body: [h("div", { class: "rel-add" }, kind, task), h("datalist", { id: "rel-task-list" }, options.map((v) => h("option", { value: v }))), hint],
    buttons: [{ label: "Cancel", value: false }, { label: "Add", kind: "primary", icon: "plus", value: true }],
    onOpen: () => task.focus(),
  });
  if (!ok) return;
  const p = pick();
  if (!p.found) return p.error && toast(p.error, "error");
  await setTaskField(f, p.field, [...p.now, shownName(p.found.path)], h("button"));
}

// ---- a task's commits ----

/**
 * The commits made for a task, from its `commits` property: the Task commits Action adds each pushed commit
 * whose message starts with the task's ID. Nothing is asked of GitHub; links open the commits there.
 */
function commitsBox(f, props, of = null) {
  const list = taskCommitLinks(props?.commits);
  if (!list.length) return of ? noneFor(f.repo, "Commits", of, "No commits yet.") : null;
  const own = `${f.repo.owner}/${f.repo.repo}`.toLowerCase();
  return h("section", { class: "commits", "aria-label": "Commits" },
    h("div", { class: "st-head" }, h("span", { class: "st-title" }, "Commits"), ofTask(f.repo, of),
      h("span", { class: "st-count" }, `${list.length} ${list.length === 1 ? "commit" : "commits"}`)),
    h("ul", { class: "st-list" }, list.map((c) => h("li", {},
      h("a", { href: c.url, target: "_blank", rel: "noopener noreferrer", title: c.title || c.short },
        h("span", { class: "st-id" }, c.short), c.title || c.url),
      c.repo !== own ? h("span", { class: "st-status" }, c.repo.slice(c.repo.indexOf("/") + 1)) : null))));
}

/** A new task under this one, in the tasks folder: linked to it, with its area and sprint, from the note template. */
async function addSubtask(parent, setup) {
  const { repo } = parent;
  const tree = await loadTree(repo);
  const folder = setup.configured ? setup.folder : dirName(parent.path);
  const name = h("input", { class: "input", autocomplete: "off", placeholder: "What's to be done?" });
  const hint = h("small", {});
  let createBtn;
  const plan = () => {
    const title = name.value.trim();
    if (!title) return {};
    const problem = titleProblem(title);
    if (problem) return { error: problem };
    const path = `${folder ? folder + "/" : ""}${title}.md`;
    if (tree.index.has(path)) return { error: `${path} already exists.` };
    const existing = repo.vault && tree.index.resolve(title);
    if (existing) return { error: `A page called “${title}” already exists: ${existing}` };
    return { path, title, kind: "md" };
  };
  const update = () => {
    const p = plan();
    hint.textContent = p.error || (p.path ? `It will be ${p.path}, under ${shownName(parent.path)}` : "");
    hint.classList.toggle("bad", !!p.error);
    if (createBtn) createBtn.disabled = !p.path;
  };
  name.addEventListener("input", update);
  name.addEventListener("keydown", (e) => { if (e.key === "Enter" && !createBtn.disabled) { e.preventDefault(); createBtn.click(); } });
  const props = noteProps(parent.text);
  const inherit = ["area", "sprint"].map((k) => fieldProp(setup, k)).filter((k) => String(props[k] ?? "").trim());
  const created = await modal({
    title: "Add subtask",
    text: `A new task under ${shownName(parent.path)}${inherit.length ? `, with the same ${inherit.join(" and ")}` : ""}.`,
    body: [h("label", { class: "field" }, h("span", {}, "Title"), name, hint)],
    buttons: [
      { label: "Cancel", value: null },
      { label: "Add subtask", kind: "primary", icon: "plus", onclick: async () => {
        const p = plan();
        if (!p.path) return false;
        createBtn.disabled = true;
        try {
          // In the tree of pages it sits where its parent task does, whatever the note template says.
          const place = typeof props.parent === "string" && props.parent.trim() ? [["parent", props.parent.trim()]] : [];
          const own = [...place, [fieldProp(setup, "part_of"), `[[${shownName(parent.path)}]]`], ...inherit.map((k) => [k, String(props[k]).trim()])];
          const text = withProps(await startingText(repo, tree, p), own);
          const id = String(props.id ?? "").trim();
          const res = await gh.writeText(repo, fullPath(repo, p.path), text, null,
            `${id ? id + ": add" : "Add"} ${p.path} as a subtask of ${shownName(parent.path)} from ${APP_NAME}`);
          wroteCommit(repo, res);
          baseCache("baseProps", repo)[res.sha] = noteProps(text);
          treeChanged(repo, p.path, res.sha);
          return p.path;
        } catch (e) {
          hint.textContent = `It wasn't added: ${e.message}`;
          hint.classList.add("bad");
          createBtn.disabled = false;
          return false;
        }
      } },
    ],
    onOpen: ({ buttons }) => { createBtn = buttons[1]; update(); name.focus(); },
  });
  if (!created) return;
  app.mode = "edit";
  store.set("mode", "edit");
  location.hash = hrefFor(repo, created);
  toast(`Added ${shownName(created)} under ${shownName(parent.path)}`, "ok");
}

// ---- sprints ----

const shortDay = (day, year = false) => (day
  ? new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: year ? "numeric" : undefined, timeZone: "UTC" })
  : "");
const WHEN = { now: "Now", next: "Next", later: "Later", past: "Ended" };
/** "1 point", "3 points", "0.5 days": an estimate with its unit. */
const amount = (n, unit = "") => `${n} ${n === 1 ? unit.replace(/s$/, "") : unit}`.trim();

/**
 * A sprint's page: its dates and where it stands, its tasks by status, how many are done (and how much of
 * the estimate), and on the latest sprint, Start the next sprint.
 */
/**
 * A ```sprint block's box for the sprint its `sprint:` line names (`current`, `next`, a name or a link), on any
 * page, naming it and linking to it. When there's no such sprint it says so; Start the next sprint stays on the
 * sprint's own page. Undefined without a `sprint:` line, so the block is drawn as before.
 */
function otherSprintBox(f, setup, input) {
  if (!input) return undefined;
  const none = (said) => h("section", { class: "sprint-box", "aria-label": "Sprint" },
    h("div", { class: "st-head" }, h("span", { class: "st-title" }, "Sprint")), h("p", { class: "muted sprint-empty" }, said));
  if (!sprintField(setup)) return none("Sprints are off in this repo's Task fields.");
  const tasks = taskNotes(f.repo, setup).notes;
  const all = sprintNotes(f.repo, setup).notes;
  if (!tasks || !all) return h("div", { class: "subtasks none" }, h("span", { class: "muted" }, "Looking for the sprint…"));
  const tree = app.trees.get(f.repo.id);
  const pick = pickSprint(sprints(all, isoDate()), input, (t) => tree.index.resolve(t, f.path));
  if (!pick) {
    const word = linkName(input).toLowerCase();
    return none(word === "current" || word === "now" ? "No sprint is going on today."
      : word === "next" ? "No sprint is planned after this one yet." : `No sprint is called “${linkName(input)}”.`);
  }
  return sprintBox(f, setup, pick.path);
}

function sprintBox(f, setup, path = null) {
  const tasks = taskNotes(f.repo, setup).notes;
  const all = sprintNotes(f.repo, setup).notes;
  if (!tasks || !all) return null;
  const tree = app.trees.get(f.repo.id);
  const list = sprints(all, isoDate());
  // `path` is another sprint's, from a `sprint:` line: then the box names it, and only reads.
  const away = !!path && path !== f.path;
  const me = list.find((s) => s.path === (path ?? f.path));
  if (!me) return null;
  const s = sprintTasks(tasks, me.path, { setup, resolve: (t, from) => tree.index.resolve(t, from) });
  const start = !away && canWrite(f.repo) && list[0]?.path === f.path
    ? h("button", { class: "btn small", onclick: () => startNextSprint(f, setup, me, s.open) }, icon("plus"), "Start the next sprint") : null;
  const dates = me.start ? `${shortDay(me.start)} – ${shortDay(me.end, true) || "?"}` : "No dates yet: set start and end";
  const done = `${s.done} of ${s.total} task${s.total === 1 ? "" : "s"} done`
    + (s.points ? ` · ${s.points.done} of ${amount(s.points.total, s.points.unit)}` : "");
  return h("section", { class: "sprint-box", "aria-label": "Sprint" },
    h("div", { class: "st-head" }, h("span", { class: "st-title" }, "Sprint"),
      away ? h("a", { class: "st-of", href: hrefFor(f.repo, me.path), title: `Open ${me.name}` }, me.name) : null,
      h("span", { class: `sprint-when ${me.when}` }, WHEN[me.when]),
      h("span", { class: "st-count" }, dates), start),
    me.goal ? h("p", { class: "sprint-goal" }, h("strong", {}, "Goal: "), me.goal) : null,
    s.total ? [
      h("div", { class: "st-count sprint-done" }, done),
      h("div", { class: "st-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(s.total), "aria-valuenow": String(s.done),
        "aria-label": done }, h("span", { style: `width: ${Math.round((s.done / s.total) * 100)}%` })),
      ...s.groups.map((g) => h("div", { class: "sprint-group" },
        h("div", { class: "sprint-status" }, g.status || "No status", h("span", { class: "muted" }, ` ${g.tasks.length}`)),
        h("ul", { class: "st-list" }, g.tasks.map((t) => h("li", { class: t.done ? "done" : null },
          h("a", { href: hrefFor(f.repo, t.path) }, t.id ? h("span", { class: "st-id" }, t.id) : null, shownName(t.path)),
          t.points != null ? h("span", { class: "st-status" }, amount(t.points, s.points?.unit)) : null))))),
    ] : h("p", { class: "muted sprint-empty" }, "No tasks in this sprint yet. Pick it in a task's Sprint field."));
}

/**
 * Makes the sprint after this one (its name counted on, its dates from the setup's length) and moves the
 * unfinished tasks the person keeps ticked into it: all in one commit.
 */
async function startNextSprint(f, setup, current, open) {
  const { repo } = f;
  const field = sprintField(setup);
  const tree = await loadTree(repo);
  const plan = nextSprint(current, field.length_days, isoDate());
  const name = h("input", { class: "input", value: plan.name, autocomplete: "off" });
  const start = h("input", { class: "input", type: "date", value: plan.start });
  const end = h("input", { class: "input", type: "date", value: plan.end });
  const goal = h("input", { class: "input", autocomplete: "off", placeholder: "What should this sprint get done?" });
  const hint = h("small", {});
  const boxes = open.map((t) => h("input", { type: "checkbox", checked: true, value: t.path }));
  let createBtn;
  const pathOf = () => `${field.folder}/${name.value.trim()}.md`;
  const problem = () => {
    const title = name.value.trim();
    if (!title) return "Give it a name.";
    if (titleProblem(title)) return titleProblem(title);
    if (tree.index.has(pathOf())) return `${pathOf()} already exists.`;
    if (repo.vault && tree.index.resolve(title)) return `A page called “${title}” already exists.`;
    if (!start.value || !end.value || end.value < start.value) return "The end has to be on or after the start.";
    return "";
  };
  const update = () => {
    const p = problem();
    hint.textContent = p || `It will be ${pathOf()}, ${shortDay(start.value)} – ${shortDay(end.value, true)}`;
    hint.classList.toggle("bad", !!p);
    if (createBtn) createBtn.disabled = !!p;
  };
  for (const el of [name, start, end]) el.addEventListener("input", update);
  const body = [
    h("label", { class: "field" }, h("span", {}, "Name"), name),
    h("div", { class: "sprint-dates" }, h("label", { class: "field" }, h("span", {}, "Start"), start), h("label", { class: "field" }, h("span", {}, "End"), end)),
    h("label", { class: "field" }, h("span", {}, "Goal"), goal),
    h("div", { class: "field" }, hint),
  ];
  if (open.length) {
    body.push(h("div", { class: "field" }, h("span", {}, `Move the unfinished tasks from ${current.name}`),
      h("div", { class: "sprint-move" }, open.map((t, i) => h("label", { class: "check-line" }, boxes[i],
        t.id ? h("span", { class: "st-id" }, t.id) : null, shownName(t.path), t.status ? h("span", { class: "muted" }, ` · ${t.status}`) : null)))));
  }
  const created = await modal({
    title: "Start the next sprint",
    text: `It starts after ${current.name} and lasts ${field.length_days} days, the task setup's sprint length. Change anything before you start it.`,
    body,
    buttons: [
      { label: "Cancel", value: null },
      { label: "Start sprint", kind: "primary", icon: "plus", onclick: async () => {
        if (problem()) return false;
        createBtn.disabled = true;
        try {
          const title = name.value.trim();
          const parent = noteProps(f.text).parent;
          const props = [...(typeof parent === "string" && parent.trim() ? [["parent", parent.trim()]] : []),
            ["start", start.value], ["end", end.value], ["goal", goal.value.trim()]];
          const files = [{ path: pathOf(), text: withProps(withBlocks(defaultNote(title), SPRINT_BLOCKS), props) }];
          for (const box of boxes.filter((b) => b.checked)) {
            const { text } = await gh.readText(repo, fullPath(repo, box.value));
            files.push({ path: box.value, text: withProps(text, [[field.prop, `[[${title}]]`]]) });
          }
          const moved = files.length - 1;
          const res = await gh.commitFiles(repo, files.map((x) => ({ path: fullPath(repo, x.path), text: x.text })),
            `Start ${title}${moved ? `, with ${moved} unfinished task${moved === 1 ? "" : "s"} from ${current.name}` : ""} from ${APP_NAME}`);
          wroteCommit(repo, res);
          for (const x of files) {
            const sha = res.shas[fullPath(repo, x.path)];
            baseCache("baseProps", repo)[sha] = noteProps(x.text);
            treeChanged(repo, x.path, sha);
          }
          return pathOf();
        } catch (e) {
          hint.textContent = e.status === 422 || e.status === 409
            ? (isLocal(repo) ? "Not started: the notes changed on this device. Reload and try again." : "Not started: GitHub has newer changes. Reload from GitHub and try again.")
            : `Not started: ${e.message}`;
          hint.classList.add("bad");
          createBtn.disabled = false;
          return false;
        }
      } },
    ],
    onOpen: ({ buttons }) => { createBtn = buttons[1]; update(); name.focus(); },
  });
  if (!created) return;
  location.hash = hrefFor(repo, created);
  toast(`Started ${shownName(created)}`, "ok");
}

/** The sprint picker's list: the current sprint first, then the next, then the rest, the latest first. */
function sprintList(f, field, setup, paths, lists) {
  const id = `tf-list-${field.prop}`;
  const known = sprintNotes(f.repo, setup).notes;
  const options = known
    ? sprintChoices(sprints(known, isoDate())).map((s) => h("option", { value: s.name, label: s.when === "now" || s.when === "next"
      ? `${WHEN[s.when]}${s.start ? `: ${shortDay(s.start)} – ${shortDay(s.end)}` : ""}` : s.start ? shortDay(s.start, true) : "" }))
    : paths.filter((p) => isSprintNote(setup, p)).map((p) => h("option", { value: shownName(p) }));
  lists.push(h("datalist", { id }, options));
  return id;
}

/** The value of a property as a control shows it. */
function shownValue(raw) {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (Array.isArray(raw)) return raw.join(", ");
  return raw == null ? "" : String(raw);
}

/** The setup's fields that are on, as pickers and inputs over a task's text. Each change saves that one line. */
function taskForm(f, setup) {
  const props = noteProps(f.text);
  const tree = app.trees.get(f.repo.id);
  const notes = tree ? [...tree.files.keys()].filter((p) => /\.md$/i.test(p) && p !== f.path) : [];
  const login = store.get("user")?.login || "";
  const lists = [];
  const listFor = (field, values) => {
    const id = `tf-list-${field.prop}`;
    lists.push(h("datalist", { id }, [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b)).map((v) => h("option", { value: v }))));
    return id;
  };
  // Relations are added and taken out in their own box, which shows them both ways.
  const cells = setup.fields.filter((x) => x.on && x.kind !== "tasks").flatMap((field) => {
    const cur = shownValue(props[field.prop]).trim();
    const id = `tf-${field.prop}`;
    let control;
    if (field.kind === "choice") {
      const known = field.values.some((v) => v.toLowerCase() === cur.toLowerCase());
      const options = cur && !known ? [cur, ...field.values] : field.values;
      control = h("select", { class: "input", id },
        h("option", { value: "", selected: !cur }, "—"),
        options.map((o) => h("option", { value: o, selected: o.toLowerCase() === cur.toLowerCase() }, o)));
    } else {
      const link = ["task", "sprint", "link"].includes(field.kind);
      let list = null;
      if (field.kind === "task") list = parentList(f, field, setup, notes, lists);
      else if (field.kind === "sprint") list = sprintList(f, field, setup, notes, lists);
      else if (field.kind === "link") list = listFor(field, notes.map(shownName));
      else if (field.key === "assignee") {
        list = "tf-list-" + field.prop;
        lists.push(assigneeList(f.repo, list));
      } else if (field.kind === "person") list = listFor(field, [login, cur]);
      control = h("input", {
        class: "input", id, list,
        type: field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text",
        step: field.kind === "number" ? "any" : null,
        value: link ? linkName(cur) : cur,
        placeholder: link ? "A page's name" : field.kind === "person" ? "Who" : "",
        autocomplete: "off", spellcheck: "false",
      });
    }
    control.addEventListener("change", () => setTaskField(f, field, control.value, control));
    const unit = field.kind === "number" && field.unit ? h("small", { class: "muted" }, ` (${field.unit})`) : null;
    return [h("label", { class: "tf-label", for: id }, field.label, unit), control];
  });
  if (!cells.length) return null;
  return h("section", { class: "task-form", "aria-label": "Task fields" }, h("div", { class: "tf-grid" }, cells), lists);
}

/**
 * The parent picker's list: every task by its ID and name ("C-12 Pick a name"), leaving out this task
 * and the ones under it, which can't be its parent. Until the tasks' properties are read, just their names.
 */
function parentList(f, field, setup, paths, lists) {
  const id = `tf-list-${field.prop}`;
  const tree = app.trees.get(f.repo.id);
  const known = taskNotes(f.repo, setup).notes;
  const notes = known ?? paths.filter((p) => isSetupTask(setup, p)).map((p) => ({ path: p, props: {} }));
  const resolve = (t, from) => tree.index.resolve(t, from);
  const options = notes
    .filter((n) => n.path !== f.path && (!known || !parentProblem(known, f.path, n.path, { prop: field.prop, resolve })))
    .map((n) => { const tid = String(n.props.id ?? "").trim(); return tid ? `${tid} ${shownName(n.path)}` : shownName(n.path); })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  lists.push(h("datalist", { id }, options.map((v) => h("option", { value: v }))));
  return id;
}

/** A field's new value in words: a page's name, or the names in a list; `none` when it's empty. */
const saidValue = (v, none) => (Array.isArray(v) ? (v.length ? v.map(linkName).join(", ") : none) : v ? linkName(v) : none);

/**
 * One field changed on the open task. With no unsaved edits it's one commit of that one line, at once;
 * with some, the line changes in the text and Save keeps it with the rest.
 */
async function setTaskField(f, field, input, control) {
  // A parent task is picked by its ID or name, and can't be the task itself or one under it.
  if (field.kind === "task" && String(input ?? "").trim()) {
    const setup = taskSetupOf(f.repo);
    const notes = setup ? taskNotes(f.repo, setup).notes : null;
    if (notes) {
      const tree = app.trees.get(f.repo.id);
      const undo = () => { control.value = linkTarget(noteProps(f.text)[field.prop]); };
      const task = findTask(notes, input);
      if (!task) { undo(); return toast(`${field.label}: no task is called “${linkName(input)}”.`, "error"); }
      const problem = parentProblem(notes, f.path, task.path, { prop: field.prop, resolve: (t, from) => tree.index.resolve(t, from) });
      if (problem) { undo(); return toast(problem, "error"); }
      input = shownName(task.path);
      control.value = input;
    }
  }
  const value = fieldValue(field, input);
  if (value == null) return toast(`${field.label}: that isn't a ${field.kind === "date" ? "date" : "number"}.`, "error");
  const assigned = field.key === "assignee" && value !== shownValue(noteProps(f.text)[field.prop]).trim();
  const entries = [[field.prop, value], ...(assigned ? assignmentEdits(value) : [])];
  const next = withProps(f.text, entries);
  if (next === toLf(f.text)) return;
  const redraw = () => {
    const scroll = $("#main").scrollTop;
    renderPreview();
    $("#main").scrollTop = scroll;
  };
  if (f.dirty || !f.sha) {
    f.text = next;
    if (f.editor) setEditorText(f.editor, next);
    updateDirty();
    redraw();
    return toast(`${field.label} changed. Save keeps it with your other changes.`);
  }
  control.disabled = true;
  try {
    const id = String(noteProps(f.text).id ?? "").trim();
    const res = await gh.writeText(f.repo, fullPath(f.repo, f.path), next, f.sha,
      `${id ? id + ": " : ""}${field.key === "assignee" ? field.prop + " updated" : field.prop + " set to " + saidValue(value, "nothing")} from ${APP_NAME}`);
    wroteCommit(f.repo, res);
    baseCache("baseProps", f.repo)[res.sha] = noteProps(next);
    treeChanged(f.repo, f.path, res.sha);
    if (assigned) checkInboxDot(f.repo);
    if (app.file === f) {
      f.sha = res.sha;
      f.saved = next;
      // Typed into the editor meanwhile: those edits stay, with the field's new line in them.
      f.text = f.dirty ? withProps(f.text, entries) : next;
      if (f.editor) setEditorText(f.editor, f.text);
      updateDirty();
      if (!f.dirty) store.remove(draftKey(f));
      redraw();
    }
    toast(`${field.label}: ${saidValue(value, "cleared")}`, "ok");
  } catch (e) {
    toast(e.isConflict ? `Not changed: ${shownName(f.path)} changed on ${savedOn(f.repo)}. Reload it first.` : `Not changed: ${e.message}`, "error");
    if (control.isConnected) control.disabled = false;
  }
}

// ---- the top tasks to start: in a ```top-tasks block, on an inbox or any other page ----

/** A deferred task can be shown as free before any change is written to the note. */
const returnFromWaiting = (note, days, today) => waitingReady(note.props, days, today)
  ? { ...note, props: { ...note.props, status: "To Do" }, backFromWaiting: true }
  : note;

const clearWaitingDate = (props) => props.waiting_since ? [["waiting_since", ""]] : [];

/** One look-up per tree version and options, so typing in the inbox doesn't redo it. */
const suggestLoads = new Map();
function loadSuggestions(repo, areas, who, count, sprintMode, order, waitDays) {
  const tree = app.trees.get(repo.id);
  const today = isoDate();
  const key = `${repo.id}:${tree.version}:${areas.join(",")}:${who}:${count}:${sprintMode}:${order}:${today}:${waitDays}`;
  if (!suggestLoads.has(key)) {
    for (const k of suggestLoads.keys()) if (k.startsWith(`${repo.id}:`)) suggestLoads.delete(k);
    const load = baseNotes(repo, tree, [...tree.files.keys()].filter(isTaskPath))
      .then(async (notes) => {
        // `sprint: off` (or no sprint line) takes from every task, sprints or not.
        const sprint = sprintMode === "off" ? null : await suggestSprints(repo, tree).catch(() => null);
        const resolve = (t, from) => tree.index.resolve(t, from);
        // A task blocked by an open task waits for it: it isn't suggested.
        const setup = await loadTaskSetup(repo).catch(() => null);
        const blocked = blockedTasks(notes, { setup, resolve });
        // `current-only` never reaches into the next sprint, and with no sprint running it has nothing to show.
        const only = sprintMode === "current-only";
        const available = notes.map((note) => returnFromWaiting(note, waitDays, today));
        const fromSprint = !sprint ? null : only && !sprint.now ? []
          : sprintSuggestions(available, { areas, count, prop: sprint.prop, now: sprint.now?.path, next: only ? null : sprint.next?.path, resolve, blocked, order });
        const free = fromSprint ?? suggestTasks(available, { areas, count, blocked, order });
        const returned = new Set(free.filter((note) => note.backFromWaiting).map((note) => note.path));
        const people = who ? await loadPeople(repo).catch(() => []) : [];
        const whoLogin = people.find((person) => foldName(person.name) === foldName(who))?.login ?? "";
        const shown = {
          mine: claimedTasks(notes, who, whoLogin), whoLogin, free,
          waiting: waitingTasks(notes, { areas, owner: who, login: whoLogin, order }).filter((note) => !returned.has(note.path)), allAreas: taskAreas(notes),
          sprint: fromSprint && (sprint.now || sprint.next) ? sprint : null,
          noSprintNow: !!fromSprint && only && !sprint.now, setup,
        };
        // Only the tasks shown are read whole, to tell whether each can be started now.
        const paths = [...shown.mine, ...shown.free, ...shown.waiting].map((n) => n.path);
        shown.states = await taskStates(repo, tree, paths).catch(() => new Map());
        return shown;
      });
    suggestLoads.set(key, load);
    load.catch(() => suggestLoads.delete(key));
  }
  return suggestLoads.get(key);
}

/**
 * When sprints are on: the sprint property and the current and next sprints ({ path, name }, either may be
 * missing); null when sprints are off or there are no sprint notes.
 */
async function suggestSprints(repo, tree) {
  const setup = await loadTaskSetup(repo);
  const field = sprintField(setup);
  if (!field) return null;
  const paths = [...tree.files.keys()].filter((p) => isSprintNote(setup, p));
  if (!paths.length) return null;
  const list = sprints(await baseNotes(repo, tree, paths), isoDate());
  return { prop: field.prop, now: list.find((s) => s.when === "now") ?? null, next: list.find((s) => s.when === "next") ?? null };
}

/**
 * Each ```top-tasks block on the page becomes the box, with only the options written in it: `range`, `areas`,
 * `sprint` and `owner` (whom Claim claims for). The page can set `waiting_days` for deferrals. A page
 * without the block has no box, an inbox too. In a repo without tasks, the block's code stays.
 */
function fillTopTasks(root, f) {
  const blocks = root.querySelectorAll(".top-tasks-block");
  if (!blocks.length) return;
  const waitDays = waitingDays(noteProps(f.text).waiting_days);
  for (const el of blocks) {
    if (el.parentElement.closest(".embed-page")) continue;
    const shown = (el.dataset.areas || "").split(",").map((a) => a.trim()).filter(Boolean);
    const box = suggestBox(f.repo, { areas: listProp(shown), shown, who: el.dataset.owner || "", waitDays,
      count: Number(el.dataset.count) || TOP_TASKS_COUNT, countSet: !el.dataset.countDefault,
      order: el.dataset.order || "priority-newest", orderSet: !el.dataset.orderDefault, sprintMode: el.dataset.sprint || "off",
      fields: el.dataset.fieldsDefault ? [...TOP_TASKS_FIELDS] : (el.dataset.fields || "").split(",").filter(Boolean), fieldsSet: !el.dataset.fieldsDefault });
    if (box) el.replaceWith(box);
  }
}

/** One look-up per tree version and owner, so typing in the inbox doesn't redo it. */
const questionLoads = new Map();
function loadQuestions(repo, who, login) {
  const tree = app.trees.get(repo.id);
  const key = `${repo.id}:${tree.version}:${who}:${login}`;
  if (!questionLoads.has(key)) {
    for (const k of questionLoads.keys()) if (k.startsWith(`${repo.id}:`)) questionLoads.delete(k);
    const load = baseNotes(repo, tree, [...tree.files.keys()].filter(isTaskPath)).then(async (notes) => {
      const tasks = questionTasks(notes, who, login);
      // Only the tasks with a question are read whole, to see whether an answer is written on them yet.
      const answers = await taskAnswers(repo, tree, tasks.map((t) => t.path)).catch(() => new Map());
      return tasks.map((t) => ({ ...t, answer: answers.get(t.path) ?? "" }));
    });
    questionLoads.set(key, load);
    load.catch(() => questionLoads.delete(key));
  }
  return questionLoads.get(key);
}

// ---- mentions: `@login` ----

/** The vault's people, from its inboxes' `github` and `owner`: one look-up per tree version. */
const peopleLoads = new Map();
const collaboratorLoads = new WeakMap();

function loadCollaborators(repo) {
  if (isLocal(repo) || !canWrite(repo) || !gh.tokenFor(repo.owner)) return Promise.resolve([]);
  if (!collaboratorLoads.has(gh)) collaboratorLoads.set(gh, new Map());
  const known = collaboratorLoads.get(gh);
  const key = (repo.owner + "/" + repo.repo).toLowerCase();
  if (!known.has(key)) known.set(key, gh.collaborators(repo).catch(() => []));
  return known.get(key);
}

/** An assignee suggestion list that updates while the input remains usable. */
function assigneeList(repo, id) {
  const list = h("datalist", { id });
  const login = loginFor(repo);
  let people = [];
  let collaborators = [];
  const draw = () => fill(list, assigneeOptions(people, collaborators, login)
    .map(({ value, label }) => h("option", { value, label: label || null })));
  draw();
  loadPeople(repo).then((known) => { people = known; draw(); }).catch(() => {});
  loadCollaborators(repo).then((known) => { collaborators = known; draw(); });
  return list;
}
function loadPeople(repo) {
  const tree = app.trees.get(repo.id);
  if (!tree) return Promise.resolve([]);
  const key = `${repo.id}:${tree.version}`;
  if (!peopleLoads.has(key)) {
    for (const k of peopleLoads.keys()) if (k.startsWith(`${repo.id}:`)) peopleLoads.delete(k);
    const paths = inboxCandidates([...tree.files.keys()], repo.inbox, repo.inboxes || "");
    const load = paths.length ? baseNotes(repo, tree, paths).then(vaultPeople) : Promise.resolve([]);
    peopleLoads.set(key, load);
    load.catch(() => peopleLoads.delete(key));
  }
  return peopleLoads.get(key);
}

/** Each `@login` of a person with an inbox becomes a link to that inbox; any other stays plain text. */
function fillMentions(root, repo) {
  const spans = [...root.querySelectorAll("span.mention")];
  if (!spans.length) return;
  loadPeople(repo).then((people) => {
    const byLogin = new Map(people.map((p) => [p.login.toLowerCase(), p]));
    for (const span of spans) {
      const p = byLogin.get(String(span.dataset.login).toLowerCase());
      if (!p || !span.isConnected) continue;
      span.replaceWith(h("a", { class: "mention", href: hrefFor(repo, p.path), title: `${p.name}'s inbox` }, `@${span.dataset.login}`));
    }
  }, () => {});
}

/** Every mention in a note (`findMentions`), from its whole text: cached by blob sha, like `taskStates`. */
async function noteMentions(repo, tree, paths) {
  // Mentions in named sections now count, so older scans must be rebuilt.
  store.remove(`mentions:${repo.id}`);
  store.remove(`mentions2:${repo.id}`);
  const cache = baseCache("mentions3", repo);
  const missing = paths.filter((p) => !Object.hasOwn(cache, tree.files.get(p)));
  if (missing.length) {
    for (const [p, text] of await readNotes(repo, tree, missing)) cache[tree.files.get(p)] = findMentions(text);
    const live = new Set(tree.files.values());
    keepBaseCache("mentions3", repo, (sha) => live.has(sha));
  }
  return new Map(paths.map((p) => [p, cache[tree.files.get(p)] ?? []]));
}

/** One look-up per tree version and login: every note is read once (then cached), and the notes with a mention get their dates. */
const mentionLoads = new Map();
function loadMentions(repo, login) {
  const tree = app.trees.get(repo.id);
  const key = `${repo.id}:${tree.version}:${login.toLowerCase()}`;
  if (!mentionLoads.has(key)) {
    for (const k of mentionLoads.keys()) if (k.startsWith(`${repo.id}:`)) mentionLoads.delete(k);
    const paths = [...tree.files.keys()].filter((p) => /\.md$/i.test(p));
    const load = noteMentions(repo, tree, paths).then(async (all) => {
      const me = login.toLowerCase();
      const found = [];
      for (const [path, list] of all) for (const m of list) if (m.login.toLowerCase() === me) found.push({ ...m, path });
      const dates = await lastCommitDates(repo, tree, [...new Set(found.map((m) => m.path))]).catch(() => new Map());
      for (const m of found) m.date = dates.get(m.path) ?? null;
      found.sort((a, b) => (b.date ?? 0) - (a.date ?? 0) || a.path.localeCompare(b.path) || a.line - b.line);
      return { found, read: paths.length };
    });
    mentionLoads.set(key, load);
    load.catch(() => mentionLoads.delete(key));
  }
  return mentionLoads.get(key);
}

/** Apply a change from an inline note control and keep the reader's place. */
function applyPreviewEdit(f, next) {
  if (app.file !== f || next === f.text) return false;
  f.text = next;
  if (f.editor) setEditorText(f.editor, f.text);
  updateDirty();
  const scroll = $("#main").scrollTop;
  renderPreview();
  $("#main").scrollTop = scroll;
  return true;
}

function noteAddForm(field, className, label, onAdd, read = () => field.value) {
  return h("form", { class: `note-add ${className}`, onsubmit: (e) => {
    e.preventDefault();
    const text = read().trim();
    if (text) onAdd(text);
  } }, field, h("button", { class: "btn small", type: "submit" }, icon("plus"), label));
}

// ---- new tasks: a ```new-tasks block's box ----

/** A multiline composer adds several ideas or edits one item/the whole list without changing its owner. */
function hasCaptureDraft(f) {
  return [...(f?.newTaskDrafts?.values() ?? [])].some((draft) => draft.text.trim() && draft.text !== (draft.initial ?? ""));
}

function fillNewTasks(root, f) {
  if (!canWrite(f.repo)) return;
  const boxes = [...root.querySelectorAll("section.newtasks")].filter((el) => !el.closest(".embed-page"));
  const boxAt = (n) => [...f.dom.preview.querySelectorAll("section.newtasks")].filter((el) => !el.closest(".embed-page"))[n];
  f.newTaskDrafts ||= new Map();
  boxes.forEach((el, n) => {
    const start = Number(el.dataset.start), close = Number(el.dataset.close);
    if (!(start >= 0 && close > start)) return;
    const source = f.text.split("\n").slice(start + 1, close).join("\n");
    const draft = f.newTaskDrafts.get(n) ?? { text: "", mode: "add", source };
    f.newTaskDrafts.set(n, draft);
    if (draft.mode === "add") draft.source = source;
    const focus = () => boxAt(n)?.querySelector(".newtasks-add textarea")?.focus();
    const begin = (mode, index = -1) => {
      if (f.imageUpload) return toast("Wait for the upload to finish.", "info");
      if (draft.text.trim()) return toast("Add or clear your current draft before editing another item.", "info");
      Object.assign(draft, { mode, source, index, text: mode === "list"
        ? newTasksBlock(source).items.map((item) => "- " + item).join("\n") : newTasksBlock(source).items[index] });
      draft.initial = draft.text;
      renderPreview();
      focus();
    };
    for (const [index, li] of [...el.querySelectorAll(".newtasks-list li[data-line]")].entries()) {
      const line = Number(li.dataset.line), was = li.dataset.item;
      li.append(h("span", { class: "newtasks-tools" },
        h("button", { class: "icon-btn", type: "button", title: "Change this task", "aria-label": "Change this task", onclick: () => begin("item", index) }, icon("edit")),
        h("button", { class: "icon-btn", type: "button", title: "Take this task out", "aria-label": "Take this task out", onclick: () => {
          if (app.saving || f.imageUpload) return toast("Wait for the current save or upload to finish.", "info");
          applyPreviewEdit(f, editNewTask(f.text, line, was, ""));
        } }, icon("x"))));
    }
    const input = h("textarea", { class: "input", rows: 4, placeholder: "Write ideas here, one per line. Bullets are optional.",
      "aria-label": draft.mode === "add" ? "New tasks" : draft.mode === "list" ? "Edit new tasks" : "Change this task",
      oninput: () => { draft.text = input.value; },
    }, draft.text);
    const reset = () => {
      if (f.imageUpload) return toast("Wait for the upload to finish.", "info");
      f.newTaskDrafts.delete(n);
      renderPreview();
      focus();
    };
    const attachments = h("div", { class: "newtasks-attachments" });
    const status = h("p", { class: "newtasks-hint", role: "status" });
    const paintAttachments = () => {
      const links = (draft.files ?? []).filter((file) => input.value.includes(file.link)).map((file) => file.link);
      attachments.innerHTML = sanitize(md.renderInline(links.join(" "), linkEnv(f.repo, f.path)));
      fillImages(attachments, f.repo, f.path);
      status.textContent = draft.upload ? "Uploading attachment…" : draft.error || "";
      status.setAttribute("role", draft.error ? "alert" : "status");
    };
    const upload = async (file, at = input.selectionStart) => {
      if (!file || app.file !== f || !canWrite(f.repo)) return;
      if (app.saving || f.imageUpload) return toast("Wait for the current save or upload to finish.", "info");
      if (!isLocal(f.repo) && navigator.onLine === false) {
        draft.error = "Connect to GitHub before adding an attachment. Your text is kept.";
        draft.failed = file;
        renderPreview();
        return;
      }
      draft.upload = true;
      draft.error = "";
      f.imageUpload = { at: 0, capture: true };
      for (const control of form.querySelectorAll("textarea, button, input")) control.disabled = true;
      paintAttachments();
      renderHeader();
      try {
        const tree = app.trees.get(f.repo.id);
        const attachment = captureAttachment(file, f.path, f.repo.attachments, tree?.files.keys() ?? []);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const saved = await gh.writeBytes(f.repo, fullPath(f.repo, attachment.path), bytes, `Add ${attachment.path} from ${APP_NAME}`);
        wroteCommit(f.repo, saved);
        treeChanged(f.repo, attachment.path, saved.sha);
        const inserted = captureAttachmentText(draft.text, at, attachment.link);
        draft.text = inserted.text;
        (draft.files ||= []).push(attachment);
        draft.failed = null;
      } catch (e) {
        draft.error = `Attachment not added: ${e.message} Your text is kept. Retry or choose another file.`;
        draft.failed = file;
      } finally {
        draft.upload = false;
        f.imageUpload = null;
        renderHeader();
        if (app.file === f) { renderPreview(); focus(); }
      }
    };
    let attachmentAt = input.value.length;
    const picker = h("input", { type: "file", hidden: true, "aria-label": "Choose an attachment", onchange: () => {
      const file = picker.files[0];
      picker.value = "";
      upload(file, attachmentAt);
    } });
    input.addEventListener("paste", (event) => {
      const transfer = event.clipboardData;
      const file = transfer?.files?.[0] || [...(transfer?.items ?? [])].find((item) => item.kind === "file")?.getAsFile();
      if (!file) return;
      event.preventDefault();
      upload(file);
    });
    input.addEventListener("input", paintAttachments);

    const form = h("form", { class: "note-add newtasks-add", onsubmit: (e) => {
      e.preventDefault();
      if (app.file !== f || !canWrite(f.repo)) return;
      if (app.saving || f.imageUpload) return toast("Wait for the current save or upload to finish.", "info");
      const entered = newTaskItems(input.value);
      if (draft.mode === "add" && !entered.length) return;
      const current = f.text.split("\n").slice(start + 1, close).join("\n");
      if (current !== draft.source) return toast("The list changed. Your text is kept; reopen the list before applying it.", "error");
      const items = newTasksBlock(current).items;
      if (draft.mode === "add") items.push(...entered);
      else if (draft.mode === "list") items.splice(0, items.length, ...entered);
      else items.splice(draft.index, 1, ...entered);
      const next = replaceNewTasks(f.text, start, close, current, items);
      if (next == null) {
        return toast("Close the New tasks block in Edit before changing its list.", "error");
      }
      f.newTaskDrafts.delete(n);
      if (!applyPreviewEdit(f, next)) renderPreview();
      focus();
    } }, input, picker, attachments, status, h("p", { class: "newtasks-hint" }, "One idea per line. Add or keep changes, then Save the note."),
    h("div", { class: "newtasks-actions" },
      h("button", { class: "btn small", type: "submit" }, icon(draft.mode === "add" ? "plus" : "check"), draft.mode === "add" ? "Add" : "Keep changes"),
      h("button", { class: "btn small ghost", type: "button", onclick: () => { attachmentAt = input.selectionStart; picker.click(); } }, icon("image"), "Attach file"),
      draft.failed ? h("button", { class: "btn small ghost", type: "button", onclick: () => upload(draft.failed) }, "Retry attachment") : null,
      draft.mode === "add" ? h("button", { class: "btn small ghost", type: "button", onclick: () => begin("list") }, "Edit list") : null,
      h("button", { class: "btn small ghost", type: "button", onclick: reset }, draft.mode === "add" ? "Clear" : "Cancel")));
    if (draft.mode === "list") el.querySelector(".newtasks-list").hidden = true;
    if (draft.upload) for (const control of form.querySelectorAll("textarea, button, input")) control.disabled = true;
    paintAttachments();
    el.append(form);
  });
}


// ---- comments: inline posting in a Markdown note ----

function fillComments(root, f) {
  const previous = f.commentEditors ?? [];
  const boxes = canWrite(f.repo)
    ? root.querySelectorAll(':scope > section.note-section[data-section="comments"][data-start][data-close]') : [];
  previous.slice(boxes.length).forEach(({ view }) => view.destroy());
  f.commentEditors = [];
  if (!boxes.length) return null;

  const source = f.text;
  const lines = source.split("\n");
  const login = isLocal(f.repo) ? "" : ownerTokens()[f.repo.owner.toLowerCase()]?.login || store.get("user")?.login || "";
  let focused = null;
  boxes.forEach((box, index) => {
    const start = Number(box.dataset.start), close = Number(box.dataset.close);
    const suggested = commentReply(lines.slice(start + 1, close).join("\n"), login);
    const old = previous[index];
    const field = old?.field ?? h("div", { class: "input comment-input" });
    const view = old?.view ?? createCommentEditor(field, suggested, () => loadPeople(f.repo));
    if (old && view.state.doc.toString() === old.suggested) setEditorText(view, suggested);
    if (view.hasFocus) focused = view;
    f.commentEditors.push({ field, view, suggested });
    box.append(noteAddForm(field, "comment-add", "Post", (message) => {
      if (app.file !== f || !canWrite(f.repo) || message === suggested.trim()) return;
      if (app.saving) return toast("Wait for the note to finish saving.", "info");
      if (f.text !== source) {
        renderPreview();
        return toast("The note changed. Review your comment and post it again.", "info");
      }
      const next = addComment(source, start, close, message, login);
      if (next === source) return toast("Close the Comments block in Edit before posting.", "info");
      const wasDirty = f.dirty;
      setEditorText(view, suggested);
      if (!applyPreviewEdit(f, next)) return;
      if (wasDirty) toast("Comment added to your draft. Save the note to post it.", "info");
      else save();
    }, () => view.state.doc.toString()));
  });
  return focused;
}

// ---- optional private inbox overview: no source reads until explicitly enabled ----
const overviewPrefs = () => upgradeInboxOverview(store.get("inboxOverview"));
let overviewModule = null;
function loadOverviewModule() {
  return overviewModule ||= import("./inbox-overview-view.js").catch((e) => { overviewModule = null; throw e; });
}

function overviewSettings() {
  const prefs = overviewPrefs();
  const toggle = h("input", { type: "checkbox", checked: prefs.enabled, "aria-label": "Enable inbox overview" });
  toggle.addEventListener("change", async () => {
    if (toggle.checked && !prefs.repo) {
      toggle.checked = false;
      try { await openOverviewSetup(); } catch (e) { toast(e.message, "error"); }
      return;
    }
    if (!store.set("inboxOverview", { ...overviewPrefs(), enabled: toggle.checked })) {
      toggle.checked = !toggle.checked; toast("Can't keep this setting in this browser.", "error"); return;
    }
    if (!toggle.checked) store.remove("inboxOverviewSourceSettings");
    renderShortcuts();
  });
  return h("div", { class: "field overview-setting" }, h("label", { class: "checkline" }, toggle, "Inbox overview"),
    h("small", { class: "hint" }, "Off by default. A private read-only view of vaults you select. Open or refresh it to read those sources; act on each item in its original vault."),
    h("div", { class: "btn-row" }, h("button", { class: "btn small", type: "button", onclick: () => openOverviewSetup().catch((e) => toast(e.message, "error")) }, "Set up inbox overview"),
      prefs.enabled && prefs.repo ? h("a", { class: "btn small", href: hrefFor({ id: prefs.repo }, prefs.path) }, "Open overview") : null));
}

async function openOverviewSetup() {
  const mod = await loadOverviewModule();
  return mod.showOverviewSetup({ h, fill, modal, preferences: overviewPrefs, repos: () => app.repos, login: loginFor,
    existing: async (prefs) => {
      const repo = app.repos.find((r) => r.id === prefs.repo && r.local === "browser");
      if (!repo) throw new Error("Choose a private dashboard kept in this browser.");
      const data = await gh.readText(repo, prefs.path);
      const blocks = mod.overviewContents(data.text);
      return { ...data, block: blocks.length === 1 ? blocks[0] : "" };
    },
    inspect: async (repo, inbox, current = () => true) => {
      const check = () => { if (!current()) throw new Error("The inbox check was cancelled."); };
      check();
      if (app.repos.find((r) => r.id === repo.id) !== repo) throw new Error("This source changed in Settings. Reopen setup.");
      const path = mod.overviewPath(inbox);
      if (!path.toLowerCase().endsWith(".md")) throw new Error("Choose an inbox Markdown page.");
      if (!isLocal(repo) && !gh.tokenFor(repo.owner)) throw new Error("Connect this source's owner in Settings first.");
      try {
        const marker = await readMarker(repo);
        check();
        if (marker.text && JSON.parse(marker.text).modules?.inboxes === false) throw new Error("This source has its inbox module turned off.");
        const data = await gh.readText(repo, fullPath(repo, path), { fresh: true, readOnly: true });
        check();
        if (app.repos.find((r) => r.id === repo.id) !== repo) throw new Error("This source changed in Settings. Reopen setup.");
        const props = noteProps(data.text);
        return { owner: props.owner, github: typeof props.github === "string" ? props.github : "" };
      } catch (e) {
        if (e.need === "folder" || e.need === "permission") throw new Error("Open this source and allow its folder, then check the inbox again.");
        if (e.status === 404) throw new Error(`The inbox ${path} was not found or this account cannot read it. Check the path and source access.`);
        throw e;
      }
    },
    save: async ({ target, path, options }) => {
      let repo = target ? app.repos.find((r) => r.id === target) : null;
      if (target && (!repo || repo.local !== "browser")) throw new Error("Use a private vault kept in this browser.");
      const fresh = !repo;
      if (fresh) repo = { id: `inbox-${crypto.randomUUID()}`, label: options.context, local: "browser", owner: "", repo: "", branch: "", folder: "", home: path, inbox: "", inboxes: "", notes: "", template: "", vault: false };
      let existing = { text: "# Inbox overview\n", sha: null };
      if (!fresh) {
        try { existing = await gh.readText(repo, path); } catch (e) { if (e.status !== 404) throw e; }
      }
      const text = mod.writeOverviewNote(existing.text, options);
      if (fresh) {
        if (!(await local.create(repo, { seed: [{ path, bytes: new TextEncoder().encode(text) }] }))) throw new Error("This dashboard already has files. Choose another one.");
        const next = [...app.repos, repo];
        if (!store.set("repos", next)) { await local.remove(repo); throw new Error("Can't keep the dashboard settings in this browser."); }
        app.repos = next;
      } else await gh.writeText(repo, path, text, existing.sha, "Update private inbox overview");
      if (!store.set("inboxOverview", { version: 1, enabled: true, repo: repo.id, path })) throw new Error("The private note was saved, but the overview switch could not be kept. Check browser storage.");
      app.trees.delete(repo.id);
      store.remove("inboxOverviewSourceSettings");
      renderRepoPicker(); renderShortcuts();
      location.hash = hrefFor(repo, path);
      if (app.file?.repo.id === repo.id && app.file.path === path) {
        const tree = await loadTree(repo, true);
        await openFile(repo, tree, path, null, ++app.nav);
      }
      toast("Private overview saved. Its source notes stay in their vaults.", "ok");
    },
  });
}

function fillInboxOverview(root, f) {
  const blocks = [...root.querySelectorAll(".inbox-overview-block")];
  if (!blocks.length) return;
  const prefs = overviewPrefs();
  for (const el of blocks) {
    const message = f.repo.local !== "browser" || el.parentElement.closest(".embed-page")
      ? "An inbox overview can run only in its private browser-local dashboard, never in a shared note or embed."
      : !prefs.enabled ? "Inbox overview is off. Enable it in Settings › This device."
        : prefs.repo !== f.repo.id || prefs.path !== f.path ? "This is not the private dashboard selected in Settings."
          : blocks.length !== 1 ? "Use one overview block per dashboard; choose separate notes for separate contexts."
            : f.dirty ? "Save the dashboard before reading its selected sources." : "";
    if (message) { fill(el, h("p", { class: "note" }, message)); continue; }
    const options = el.querySelector("code")?.textContent || "";
    // Repainting the note (layout, task settings) keeps this scan; only opening or Refresh reads again.
    if (f.overview?.options === options && f.overview.el.isConnected) { el.replaceWith(f.overview.el); continue; }
    f.overview = { options, el };
    const current = () => app.file === f && !f.dirty && el.isConnected && overviewPrefs().enabled
      && overviewPrefs().repo === f.repo.id && overviewPrefs().path === f.path;
    loadOverviewModule().then((mod) => {
      if (!current()) return;
      mod.mountOverview(el, options, { h, fill, icon, current, repos: () => app.repos, href: hrefFor,
        read: readOverviewSource,
        prune: (keys) => {
          const kept = store.get("inboxOverviewSourceSettings", {});
          if (!kept || typeof kept !== "object" || Array.isArray(kept)) { store.remove("inboxOverviewSourceSettings"); return; }
          for (const key of Object.keys(kept)) if (!keys.includes(key)) delete kept[key];
          store.set("inboxOverviewSourceSettings", kept);
        },
        forget: (key) => { const kept = store.get("inboxOverviewSourceSettings", {}); if (kept && typeof kept === "object") { delete kept[key]; store.set("inboxOverviewSourceSettings", kept); } },
      });
    }).catch(() => { if (current()) fill(el, h("p", { class: "note error" }, "Couldn't load the inbox overview. Reload and try again.")); });
  }
}

/** Only this adapter reads sources. The renderer receives data and source links, never write access. */
async function readOverviewSource(repo, source, options, files, current) {
  const fail = (kind, message, status) => Object.assign(new Error(message), { kind, status });
  const check = () => { if (!current()) throw fail("cancelled", "The overview selection changed."); };
  check();
  if (repo.id === overviewPrefs().repo) throw fail("setup", "Keep the dashboard separate from its selected source vaults.");
  const localSource = isLocal(repo), login = loginFor(repo);
  if (!localSource && !gh.tokenFor(repo.owner)) throw fail("access", "Connect this vault in Settings first.");
  if (!localSource && source.login && source.login.toLowerCase() !== login.toLowerCase()) throw fail("setup", "The selected mention login does not match this vault's connected account.");
  const key = JSON.stringify(localSource ? [repo.local, repo.id] : ["github", repo.owner.toLowerCase(), repo.repo.toLowerCase(), repo.branch, repo.folder || ""]);
  const credential = localSource ? repo.id : gh.tokenFor(repo.owner);
  if (files.credential !== credential) { files.clear(); files.credential = credential; files.accessEpoch = (files.accessEpoch || 0) + 1; }
  let offline = false;
  if (!localSource) {
    try { await gh.repo(repo); } catch (e) {
      if (e.status !== 0) throw fail("access", "Open this source to check its token and access.", e.status);
      // The copy may be on disk but not loaded in this session yet. Its tree validates availability below.
      offline = true;
    }
  }
  check();
  const settings = store.get("inboxOverviewSourceSettings", {});
  let marker = null;
  try {
    const read = await readMarker(repo);
    check();
    marker = read.text ? JSON.parse(read.text) : {};
    const latest = store.get("inboxOverviewSourceSettings", {});
    const kept = latest && typeof latest === "object" && !Array.isArray(latest) ? latest : {};
    kept[key] = { login, disabled: marker.modules?.inboxes === false, tasks: marker.tasks ?? null, checkedAt: Date.now() };
    store.set("inboxOverviewSourceSettings", kept);
  } catch (e) {
    if (e.need === "folder" || e.need === "permission") throw fail("permission", "Open this source and allow its folder.");
    const prior = settings?.[key];
    if ((offline || e.status === 0) && prior && prior.login === login) { marker = { modules: { inboxes: !prior.disabled }, tasks: prior.tasks }; offline = true; }
    else throw fail(e.status === 401 || e.status === 403 ? "access" : "setup", "The source's settings could not be checked. Open it online, then refresh.", e.status);
  }
  check();
  if (marker.modules?.inboxes === false) throw fail("disabled", "This source has its inbox module turned off.");
  const setup = taskSetup(marker.tasks ?? null);
  let tree;
  try { tree = await loadTree(repo, true, { readOnly: true, current }); } catch (e) {
    if (e.need === "folder" || e.need === "permission") throw fail("permission", "Open this source and allow its folder.");
    throw e;
  }
  check();
  if (!tree.files.has(source.inbox)) throw fail("setup", "The configured inbox page is missing. Check the source binding.");
  const whole = options.show.includes("mentions") || options.show.includes("new-tasks");
  const paths = [...tree.files.keys()].filter((p) => /\.md$/i.test(p) && (whole || p === source.inbox || isSetupTask(setup, p)));
  const missing = paths.filter((p) => files.get(p)?.sha !== tree.files.get(p));
  const readHere = localSource || mirror.searchesHere(repo);
  let failed = false;
  if (readHere) {
    let next = 0;
    const worker = async () => { while (current() && !failed && next < missing.length) {
      const path = missing[next++];
      try { const data = await gh.readText(repo, fullPath(repo, path), { readOnly: true }); check(); files.set(path, { sha: tree.files.get(path), text: data.text }); }
      catch (e) { failed = true; if (e.need === "folder" || e.need === "permission") throw fail("permission", "Open this source and allow its folder."); throw e; }
    } };
    await Promise.all(Array.from({ length: Math.min(6, missing.length) }, worker));
  } else {
    for (const batch of chunks(missing, BLOBS_PER_QUERY)) {
      check();
      const good = batch.filter((p) => IS_SHA.test(tree.files.get(p)));
      if (good.length) {
        const fields = good.map((p, i) => `b${i}: object(oid: "${tree.files.get(p)}") { ... on Blob { text } }`).join("\n");
        try {
          const data = await gh.graphql(`query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) {\n${fields}\n} }`, { owner: repo.owner, name: repo.repo });
          check();
          good.forEach((p, i) => { const text = data.repository?.[`b${i}`]?.text; if (text != null) files.set(p, { sha: tree.files.get(p), text }); });
        } catch (e) { if (e.status === 401 || e.status === 403 || e.status === 0) throw e; /* use this source's REST reader for unsupported GraphQL */ }
      }
      for (const path of batch.filter((p) => files.get(p)?.sha !== tree.files.get(p))) {
        check(); const data = await gh.readText(repo, fullPath(repo, path), { readOnly: true }); check(); files.set(path, { sha: tree.files.get(path), text: data.text });
      }
    }
  }
  check();
  for (const path of [...files.keys()]) if (!paths.includes(path)) files.delete(path);
  const notes = paths.map((path) => ({ path, ...files.get(path), props: noteProps(files.get(path).text) }));
  const inboxProps = notes.find((n) => n.path === source.inbox)?.props || {};
  return { notes, setup, inboxProps, state: tree.truncated ? "partial" : offline || tree.offline ? "offline" : "current",
    checkedAt: offline || tree.offline ? mirror.info(repo).syncedAt || Date.now() : Date.now(),
    message: tree.truncated ? "The vault file list is incomplete; these counts are partial." : options.show.includes("mentions") && !source.login ? "No mention login is configured; other selected kinds are shown." : "" };
}

window.addEventListener("storage", (event) => {
  if (["commonplace:token", "commonplace:tokens", "commonplace:user"].includes(event.key)) { app.token = store.get("token", ""); gh = client(app.token, tokenMap()); }
  if (["commonplace:inboxOverview", "commonplace:token", "commonplace:tokens", "commonplace:user"].includes(event.key)) {
    if (!overviewPrefs().enabled) store.remove("inboxOverviewSourceSettings");
    if (app.file) app.file.overview = null;
    if (app.file?.kind === "md") renderPreview();
    renderShortcuts();
  }
});

// ---- needs your attention: questions and mentions ----

/** Puts the box where each ```needs-attention block is (the top of an inbox), but not inside an embed. */
function fillAttention(root, f) {
  for (const el of root.querySelectorAll(".attention-block")) {
    if (el.parentElement.closest(".embed-page")) continue;
    const show = (el.dataset.show || "questions,mentions").split(",").filter(Boolean);
    let reviewStatuses = ["Testing"];
    try { reviewStatuses = JSON.parse(el.dataset.reviewStatuses || '["Testing"]'); } catch { /* use Testing for an older block */ }
    const box = attentionBox(f.repo, { owner: el.dataset.owner || "", login: el.dataset.login || "", show, showSet: !el.dataset.showDefault, reviewStatuses, note: f });
    if (box) el.replaceWith(box);
  }
}

/** Each kind of box: its name, and the icon in its head. */
function assignmentEdits(value) {
  return value ? [[ASSIGNMENT_ID, crypto.randomUUID()]] : [];
}

async function loadAssignments(repo, name, login) {
  const setup = await loadTaskSetup(repo);
  const entry = taskNotes(repo, setup);
  await entry.load;
  return assignmentTasks(entry.notes ?? [], setup, { name, login });
}

async function loadReviews(repo, name, login, statuses) {
  const setup = await loadTaskSetup(repo);
  const entry = taskNotes(repo, setup);
  await entry.load;
  return reviewTasks(entry.notes ?? [], setup, { name, login }, statuses);
}

const ATTENTION_TITLES = { both: ["Needs your attention", "info"], questions: ["Questions for you", "question"], mentions: ["Mentions of you", "info"], assignments: ["Assigned to you", "check"], reviews: ["For review", "check"] };

/**
 * What waits on someone, as one box or one of its halves (`show`): the questions waiting on `owner` (tasks with
 * a `question` property they asked for, review or whose agent has them), waiting for an answer first, then
 * answered; then the places that mention `@login`, newest first. Each row says which it is and links to the
 * task, or to the heading the mention is under. The head says whose, and what's missing from the block.
 * A mention with a reply right under it is left out (the head counts them); one marked **Seen** folds under
 * *Seen*. The seen list is the `seen_mentions` property of `note`, the open note the box is in.
 */
function attentionBox(repo, { owner = "", login = "", show = ["questions", "mentions"], showSet = true, reviewStatuses = ["Testing"], note = null }) {
  const tree = app.trees.get(repo.id);
  if (!tree) return null;
  const wantQ = show.includes("questions"), wantM = show.includes("mentions"), wantA = show.includes("assignments"), wantR = show.includes("reviews");
  const [title, iconName] = ATTENTION_TITLES[show.length === 1 ? show[0] : "both"] || ATTENTION_TITLES.both;
  const parts = () => [
    wantR ? (owner || login ? `For review by ${owner || "@" + login} · ${reviewStatuses.join(", ")}` : "Add owner or login to show reviews") : "",
    wantQ ? (owner ? `Questions for ${owner}` : "No owner: line, so no questions") : "",
    wantM ? (login ? `Mentions of @${login}` : "No login: line, so no mentions") : "",
    wantA ? (owner || login ? "Assigned to " + (owner || "@" + login) : "Add owner or login to show assignments") : "",
    showSet ? "" : "Questions and mentions (the block sets no show)",
  ].filter(Boolean);
  const head = h("small", { class: "muted" }, parts().join(" · "));
  const list = h("ol", { class: "attention-list" }, h("li", { class: "muted" }, "Looking…"));
  const box = h("section", { class: "attention", "aria-label": title },
    h("div", { class: "suggest-head" }, icon(iconName), h("strong", {}, title), head), list);
  const askQ = wantQ && owner, askM = wantM && login, askA = wantA && (owner || login), askR = wantR && (owner || login);
  if (!askQ && !askM && !askA && !askR) {
    list.replaceChildren(h("li", { class: "muted" }, "Add owner: (your name) or login: (your GitHub login) for the items this block shows."));
    return box;
  }
  const hasTasks = [...tree.files.keys()].some(isTaskPath);
  const kind = (k) => h("span", { class: `chip kind kind-${k}` }, ({ review: "Review", question: "Question", mention: "Mention", assignment: "Assignment" })[k]);
  const state = (t) => t.answer
    ? h("span", { class: "chip state state-ready", title: `Answered: ${t.answer.slice(0, 200)}` }, "Answered, waiting for the agent")
    : h("span", { class: "chip state state-decision", title: "Open the task and write your answer under Answer:" }, "Waiting for your answer");
  const questionRow = (t) => h("li", {}, show.length > 1 ? kind("question") : null,
    h("a", { href: hrefFor(repo, t.path), class: "suggest-name" }, t.props.id ? h("span", { class: "muted" }, `${t.props.id} `) : null, shownName(t.path)),
    h("span", { class: "suggest-tags" }, state(t)), h("span", { class: "attention-text" }, t.question));
  const seenNow = note ? noteProps(note.text)[SEEN_MENTIONS] : [];
  const canMark = !!note && canWrite(repo) && usable(repo);
  let allFound = [], allAssignments = [];
  const markSeen = (mentions, assignments = []) => markInboxSeen(note, mentions, allFound, assignments, allAssignments);
  const assignmentRow = (task, seen = false) => h("li", {}, show.length > 1 ? kind("assignment") : null,
    h("a", { href: hrefFor(repo, task.path), class: "suggest-name" }, task.id ? h("span", { class: "muted" }, task.id + " ") : null, shownName(task.path)),
    !seen && canMark ? h("button", { class: "btn small ghost attention-seen-btn", type: "button", title: "Mark assignment as seen", onclick: () => markSeen([], [task]) }, icon("check"), "Seen") : null);
  const mentionRow = (m, seen = false) => h("li", {}, show.length > 1 ? kind("mention") : null,
    h("a", { href: hrefFor(repo, m.path, m.heading || null), class: "suggest-name" }, shownName(m.path), m.heading ? h("span", { class: "muted" }, ` › ${m.heading}`) : null),
    m.date ? h("span", { class: "chip", title: m.date.toLocaleString() }, m.date.toLocaleDateString()) : null,
    !seen && canMark ? h("button", { class: "btn small ghost attention-seen-btn", type: "button", title: "Mark it as seen: it folds under Seen, and the Inbox dot stops counting it", onclick: () => markSeen([m]) }, icon("check"), "Seen") : null,
    h("span", { class: "attention-text" }, m.text));
  Promise.all([
    askR ? loadReviews(repo, owner, login, reviewStatuses) : [],
    askQ && hasTasks ? loadQuestions(repo, owner, login) : [],
    askM ? loadMentions(repo, login) : { found: [], read: 0 },
    askA ? loadAssignments(repo, owner, login) : [],
  ]).then(([reviews, tasks, { found, read }, assignments]) => {
    if (app.trees.get(repo.id) !== tree) return;
    allFound = found; allAssignments = assignments;
    const reviewPaths = new Set(reviews.map((t) => t.path));
    const questions = tasks.filter((t) => !reviewPaths.has(t.path));
    const ms = sortMentions(found, seenNow);
    const assigned = sortAssignments(assignments.filter((t) => !reviewPaths.has(t.path)), note && noteProps(note.text)[SEEN_ASSIGNMENTS]);
    head.textContent = [
      askR ? `${reviews.length} for review · ${reviewStatuses.join(", ")}` : wantR ? "Add owner or login to show reviews" : "",
      askQ ? `${questions.length} question${questions.length === 1 ? "" : "s"} for ${owner} · Answer on the task` : wantQ ? "No owner: line, so no questions" : "",
      askM ? `${ms.open.length} new mention${ms.open.length === 1 ? "" : "s"} of @${login} in ${read} notes` + (ms.seen.length ? `, ${ms.seen.length} seen` : "") + (ms.answered.length ? `, ${ms.answered.length} answered` : "") : wantM ? "No login: line, so no mentions" : "",
      askA ? assigned.open.length + " new assignment" + (assigned.open.length === 1 ? "" : "s") : "",
      showSet ? "" : "Questions and mentions (the block sets no show)",
    ].filter(Boolean).join(" · ");
    if (canMark && ms.open.length + assigned.open.length > 1) head.after(h("button", { class: "btn small ghost attention-all", type: "button", title: "Mark every new assignment and mention as seen", onclick: () => markSeen(ms.open, assigned.open) }, icon("check"), "All seen"));
    const reviewRow = (t) => h("li", { class: "attention-review" }, kind("review"),
      h("a", { href: hrefFor(repo, t.path), class: "suggest-name" }, t.id ? h("span", { class: "muted" }, `${t.id} `) : null, shownName(t.path)),
      h("span", { class: "chip" }, t.status), h("a", { href: hrefFor(repo, t.path), class: "btn small" }, "Review"),
      h("span", { class: "attention-text" }, tasks.find((q) => q.path === t.path)?.question || "Test, then close or request changes on the task."));
    const rows = [
      reviews.length && show.length > 1 ? h("li", { class: "attention-section" }, h("strong", {}, "For review")) : null,
      ...reviews.map(reviewRow), ...questions.filter((t) => !t.answer).map(questionRow), ...questions.filter((t) => t.answer).map(questionRow),
      ...assigned.open.map((t) => assignmentRow(t)), ...ms.open.map((m) => mentionRow(m)),
    ].filter(Boolean);
    const seenRows = [...assigned.seen.map((t) => assignmentRow(t, true)), ...ms.seen.map((m) => mentionRow(m, true))];
    if (seenRows.length) rows.push(h("li", { class: "attention-seen" }, h("details", {}, h("summary", { class: "muted" }, `Seen (${seenRows.length})`), h("ol", { class: "attention-list" }, seenRows))));
    list.replaceChildren(...(rows.length ? rows : [h("li", { class: "muted" }, "Nothing waits on you.")]));
  }, () => list.replaceChildren(h("li", { class: "muted" }, "The notes couldn't be read.")));
  return box;
}

/**
 * Saves the inbox's seen lists in one commit, or with its existing draft.
 */
function markInboxSeen(f, mentions, found, assignments, allAssignments) {
  if (app.file !== f || (!mentions.length && !assignments.length)) return;
  const was = f.dirty;
  const props = noteProps(f.text);
  const entries = [];
  if (mentions.length) entries.push([SEEN_MENTIONS, withSeenMentions(props[SEEN_MENTIONS], mentions, found)]);
  if (assignments.length) entries.push([SEEN_ASSIGNMENTS, withSeenAssignments(props[SEEN_ASSIGNMENTS], assignments, allAssignments)]);
  const next = setProps(f.text, entries);
  if (!next || next === f.text) return;
  f.text = next;
  if (f.editor) setEditorText(f.editor, f.text);
  updateDirty();
  const scroll = $("#main").scrollTop;
  renderPreview();
  $("#main").scrollTop = scroll;
  if (!was) save();
  else toast("Marked as seen: Save to keep it", "info");
}

/** How the box's head says each sprint choice. */
const SPRINT_SAID = { "current-only": "Current sprint only", "current-then-next": "Current sprint, then the next", off: "" };
/** How the box's head says each order. */
const ORDER_SAID = { "priority-newest": "By priority, newest first", "priority-oldest": "By priority, oldest first", newest: "Newest first", oldest: "Oldest first" };

/**
 * The top free tasks (`count` of them): the notes in a `Tasks` folder with no assignee, in `order` (`TASK_ORDERS`),
 * only in `areas` (lower case) when given; `shown` is how the areas are written, for the head. With `sprintMode`
 * (`current-only`, `current-then-next`), from the sprints. Above them, the tasks `who` has claimed and not
 * finished: waiting for their agent, or with an agent on it. Without `who`, nothing can be claimed, and the head
 * says to add an owner. The head says every option in use, and when the range or the order is the default.
 */
function suggestBox(repo, { areas = [], shown = [], who = "", waitDays = 7, count = TOP_TASKS_COUNT, countSet = true, order = "priority-newest", orderSet = true, sprintMode = "off",
  fields = TOP_TASKS_FIELDS, fieldsSet = true }) {
  const tree = app.trees.get(repo.id);
  if (!tree || ![...tree.files.keys()].some(isTaskPath)) return null;
  const list = h("ol", { class: "suggest-list" }, h("li", { class: "muted" }, "Looking for free tasks…"));
  const fieldsSaid = fields.length ? `Shows ${fields.join(", ")}` : "Shows the names only";
  const said = [areas.length ? `Areas: ${shown.join(", ")}` : "All areas", countSet ? `Top ${count}` : `Top ${count} (the block sets no range)`,
    orderSet ? ORDER_SAID[order] : `${ORDER_SAID[order]} (the block sets no order)`, SPRINT_SAID[sprintMode],
    fieldsSet ? fieldsSaid : `${fieldsSaid} (the block sets no fields)`, who ? `For ${who}` : "No owner in the block, so nothing can be claimed"].filter(Boolean);
  const box = h("section", { class: "suggest", "aria-label": "Tasks for today" },
    h("div", { class: "suggest-head" }, icon("todo"), h("strong", {}, "Tasks for today"),
      h("small", { class: "muted" }, said.join(" · "))),
    list);
  const editable = canWrite(repo) && usable(repo);
  let allAreas = [];
  const restore = (props) => waitingReady(props, waitDays) ? [["status", "To Do"], ...clearWaitingDate(props)] : [];
  /** A property as a chip, or as a chip-like picker that saves the task when it changes. */
  const tag = (path, t, key, options, cls = "", backFromWaiting = false) => {
    const value = String(t[key] ?? "").trim();
    if (!editable) return value ? h("span", { class: `chip ${cls}` }, value) : null;
    const list = value && !options.some((o) => o.toLowerCase() === value.toLowerCase()) ? [value, ...options] : options;
    const label = key === "priority" ? "Priority" : "Area";
    const pick = h("select", { class: `chip pick ${cls}`, "aria-label": `${label} of ${shownName(path)}`, title: `Change its ${label.toLowerCase()}` },
      value ? null : h("option", { value: "", selected: true, disabled: true }, label),
      list.map((o) => h("option", { value: o, selected: o.toLowerCase() === value.toLowerCase() }, o)));
    pick.addEventListener("change", () => changeTask(repo, path, key, pick.value, pick, backFromWaiting ? { also: restore } : {}));
    return pick;
  };
  let states = new Map();
  const STATE_LABEL = { ready: "Ready", decision: "Needs a decision", placeholder: "Placeholder" };
  /** Whether the task can be started now: a chip whose tooltip (or a tap, on a phone) says why. */
  const stateChip = (path) => {
    const s = states.get(path);
    if (!s) return null;
    return h("button", { type: "button", class: `chip state state-${s.state}`, title: s.reason,
      onclick: () => toast(`${shownName(path)}: ${s.reason}`, "info", 6000) }, STATE_LABEL[s.state]);
  };
  let setup = null;
  /** The task's parent task (`part_of`, or the property the setup keeps it in), as a link to it. */
  const parentChip = (path, t) => {
    const target = linkTarget(t[fieldProp(setup, "part_of")]);
    if (!target) return null;
    const to = tree.index.resolve(target, path);
    return to ? h("a", { class: "chip parent-chip", href: hrefFor(repo, to), title: `Part of ${shownName(to)}` }, icon("up"), shownName(to))
      : h("span", { class: "chip parent-chip", title: `Part of ${target}: no such page` }, target);
  };
  /** Any other property, as a chip with its value (links by their page's name); nothing when it's empty. */
  const valueChip = (t, name) => {
    const raw = t[fieldProp(setup, name)];
    const parts = (Array.isArray(raw) ? raw : [raw]).map((v) => (v instanceof Date ? isoDate(v) : linkName(v) || String(v ?? "").trim())).filter(Boolean);
    return parts.length ? h("span", { class: "chip", title: `${name}: ${parts.join(", ")}` }, parts.join(", ")) : null;
  };
  /** What each task shows besides its name and Claim: the block's `fields`, in its order. */
  const fieldChip = ({ path, props: t, backFromWaiting }, name) => name === "state" ? stateChip(path)
    : name === "parent" ? parentChip(path, t)
    : name === "priority" ? tag(path, t, "priority", PRIORITIES, t.priority ? `prio-${String(t.priority).trim().toLowerCase()}` : "", backFromWaiting)
    : name === "area" ? tag(path, t, "area", allAreas, "", backFromWaiting)
    : valueChip(t, name);
  const row = (note, extra) => {
    const { path, props: t } = note;
    return h("li", {},
      h("a", { href: hrefFor(repo, path), class: "suggest-name" }, t.id ? h("span", { class: "muted" }, `${t.id} `) : null, shownName(path)),
      h("span", { class: "suggest-tags" }, fields.map((name) => fieldChip(note, name))),
      extra);
  };
  const canDefer = (path, props) => suggestTasks([returnFromWaiting({ path, props }, waitDays)]).length > 0;
  const defer = (path, button) => changeTask(repo, path, "status", WAITING, button, {
    allow: (props) => canDefer(path, props),
    also: () => [["waiting_since", isoDate()]],
  });
  const bringBack = (path, button) => changeTask(repo, path, "status", "To Do", button, {
    allow: (props) => String(props.status ?? "").trim().toLowerCase() === WAITING.toLowerCase(),
    also: clearWaitingDate,
  });
  const WAIT_TITLE = `Put it on the waiting list for ${waitDays} ${waitDays === 1 ? "day" : "days"}`;
  loadSuggestions(repo, areas, who, count, sprintMode, order, waitDays).then(({ mine, whoLogin, free, waiting, allAreas: found, states: told, sprint, noSprintNow, setup: s }) => {
    allAreas = found;
    states = told;
    setup = s;
    /**
     * Putting a task off. With sprints, it's pushed to the next sprint (one commit of its sprint line); when
     * there's no sprint after the one it's in, the button says so and offers the waiting list instead.
     */
    const notNow = (n) => {
      if (!editable) return null;
      if (!sprint) return h("button", { class: "btn small ghost", type: "button", title: WAIT_TITLE,
        onclick: (e) => defer(n.path, e.currentTarget) }, "Not now");
      const next = sprint.now && sprint.next && !n.nextSprint && linkName(String(n.props[sprint.prop] ?? "")) !== sprint.next.name
        ? sprint.next : null;
      const latest = sprint.next ?? sprint.now;
      return h("button", { class: "btn small ghost", type: "button",
        title: next ? `Move it into ${next.name}: it leaves ${sprint.now.name}'s top tasks`
          : `There's no sprint after ${latest.name} yet: put it on the waiting list instead`,
        onclick: async (e) => {
          const button = e.currentTarget;
          if (next) return changeTask(repo, n.path, sprint.prop, `[[${next.name}]]`, button, {
            said: `pushed to ${next.name}`, allow: (props) => canDefer(n.path, props), also: restore,
          });
          if (await confirmDialog(`No sprint after ${latest.name} yet`,
            `Put ${shownName(n.path)} on the waiting list instead? It comes back after the waiting period. `
            + `To push tasks to a new sprint, open ${latest.name} and press Start the next sprint.`, "Not now")) {
            defer(n.path, button);
          }
        } }, "Push to the next sprint");
    };
    // With sprints, the free tasks are the current sprint's, or the next one's when it has none left.
    const sprintName = sprint ? (sprint.now ?? sprint.next).name : "";
    if (sprint) box.querySelector(".suggest-head").append(h("span", { class: "chip sprint-chip", title: sprint.now
      ? `The free tasks in the current sprint, ${sprint.now.name}${free.some((n) => n.nextSprint) ? `, which has none left, so ${sprint.next.name}'s` : ""}`
      : `No sprint is running, so the free tasks in the next one, ${sprint.next.name}` }, sprintName));
    /** Claiming a task from the next sprint moves it into the current one, in the same commit. */
    const moveTo = (n) => (n.nextSprint && sprint?.now ? { prop: sprint.prop, name: sprint.now.name } : null);
    const nextChip = (n) => (n.nextSprint ? h("span", { class: "chip next-sprint",
      title: sprint.now ? `From ${sprint.next.name}: ${sprint.now.name} has no free tasks left. Claiming it moves it into ${sprint.now.name}.`
        : `From ${sprint.next.name}, which starts on ${sprint.next.start}` }, "Next sprint") : null);
    const none = noSprintNow ? "No sprint is running now, and this box shows the current sprint only."
      : sprint ? `No free tasks in ${sprint.now ? sprint.now.name : sprint.next.name}${sprint.now && sprint.next ? ` or ${sprint.next.name}` : ""}.`
      : "No free tasks right now.";
    const claimed = mine.map((n) => row(n, editable && !n.agent
      ? h("button", { class: "chip claimed unclaim", type: "button",
        "aria-label": `Claimed task. Unclaim ${shownName(n.path)}`,
        onclick: (e) => unclaimSuggested(repo, n.path, who, whoLogin, e.currentTarget),
      }, h("span", { class: "claim-state", "aria-hidden": "true" }, "Claimed"),
      h("span", { class: "claim-action", "aria-hidden": "true" }, "Unclaim"))
      : h("span", { class: `chip claimed${n.agent ? " working" : ""}`,
        title: n.agent ? `${n.props.assignee}: an agent is working on it` : `Claimed by ${who}: your agent starts with it`,
      }, n.agent ? `${n.agent} is on it` : "Claimed")));
    const waitingList = waiting.length ? h("details", { class: "suggest-waiting" },
      h("summary", {}, icon("chevron"), `Waiting (${waiting.length})`),
      h("ol", { class: "suggest-list" }, waiting.map((n) => row(n,
        editable ? h("button", { class: "btn small ghost", type: "button",
          title: "Return this task to To Do", onclick: (e) => bringBack(n.path, e.currentTarget),
        }, "Bring back") : null)))) : null;
    if (!claimed.length && !free.length) return fill(list, h("li", { class: "muted" }, none), waitingList);
    fill(list, claimed, free.map((n) => row(n, [
      nextChip(n),
      n.backFromWaiting ? h("span", { class: "chip" }, "Back from waiting") : null,
      editable && who
        ? h("button", { class: "btn small", type: "button", title: `Set its status to In Progress and its assignee to ${who}${
          moveTo(n) ? `, and move it into ${moveTo(n).name}` : ""}`,
          onclick: (e) => claimSuggested(repo, n.path, who, e.currentTarget, moveTo(n), waitDays) }, icon("check"), "Claim")
        : null,
      notNow(n)])),
    !free.length ? h("li", { class: "muted" }, none) : null, waitingList);
  }, () => fill(list, h("li", { class: "muted" }, "The tasks couldn't be read.")));
  return box;
}

/**
 * Claims a task for `who`: one commit that sets its status and assignee, unless someone took it first.
 * `move` ({ prop, name }) also puts it in that sprint, in the same commit.
 */
async function claimSuggested(repo, path, who, button, move = null, waitDays = 7) {
  if (!await confirmDialog(`Claim ${shownName(path)}?`,
    `Its status becomes In Progress and its assignee ${who}${move ? `, and it moves into ${move.name}` : ""}. This saves the task to ${savedOn(repo)}.`, "Claim")) return;
  button.disabled = true;
  try {
    const { text, sha } = await gh.readText(repo, fullPath(repo, path));
    const now = noteProps(text);
    const taken = String(now.assignee ?? "").trim();
    const eligible = suggestTasks([returnFromWaiting({ path, props: now }, waitDays)]).length > 0;
    const extra = move ? [[move.prop, `[[${move.name}]]`]] : [];
    const next = eligible ? claimTask(text, who, [...extra, ...clearWaitingDate(now), ...assignmentEdits(who)]) : null;
    // What was just read or written is known, so the list needn't read the task again.
    const known = baseCache("baseProps", repo);
    if (!next) {
      known[sha] = now;
      treeChanged(repo, path, sha);
      toast(taken ? `${shownName(path)} is already taken by ${taken}.` : `${shownName(path)} is no longer available to claim.`, "error");
    } else {
      const id = String(now.id ?? "").trim();
      const res = await gh.writeText(repo, fullPath(repo, path), next, sha, `${id ? id + ": c" : "C"}laimed by ${who}${move ? `, moved into ${move.name}` : ""} from ${APP_NAME}`);
      wroteCommit(repo, res);
      known[res.sha] = noteProps(next);
      treeChanged(repo, path, res.sha);
      toast(`Claimed ${shownName(path)}`, "ok");
    }
  } catch (e) {
    toast(`Not claimed: ${e.message}`, "error");
  }
  if (!refreshInboxBox(repo)) button.disabled = false;
}

async function unclaimSuggested(repo, path, who, login, button) {
  if (!await confirmDialog(`Unclaim ${shownName(path)}?`,
    "This clears its assignee and returns it to To Do.", "Unclaim")) return;
  return changeTask(repo, path, "status", "To Do", button, {
    said: `unclaimed by ${who}`,
    also: () => [["assignee", ""]],
    allow: (props) => claimedTasks([{ path, props }], who, login).some((task) => !task.agent),
  });
}

/** Draws the open page again (its top tasks box re-sorts), keeping the scroll. False when no page of `repo` with one is open. */
function refreshInboxBox(repo) {
  if (!(app.file?.repo === repo && app.file.dom?.preview.isConnected && app.file.dom.preview.querySelector(".suggest"))) return false;
  const scroll = $("#main").scrollTop;
  renderPreview();
  $("#main").scrollTop = scroll;
  return true;
}

/**
 * Updates a task from a top tasks box in one commit. `said` (e.g.
 * "pushed to Sprint 2") is what the commit and the message say instead of "<key> set to <value>".
 */
async function changeTask(repo, path, key, value, picker, { said = "", also = () => [], allow = null } = {}) {
  picker.disabled = true;
  let saved = false;
  try {
    const { text, sha } = await gh.readText(repo, fullPath(repo, path));
    const now = noteProps(text);
    const known = baseCache("baseProps", repo);
    const changed = allow && !allow(now);
    const next = !changed && setProps(text, [[key, value], ...also(now)]);
    if (!next || next === toLf(text)) {
      known[sha] = now;
      treeChanged(repo, path, sha);
      if (changed) toast(`${shownName(path)} changed since this box was drawn.`, "error");
      else if (!next) toast(`${shownName(path)} has no properties to change.`, "error");
    } else {
      const id = String(now.id ?? "").trim();
      const res = await gh.writeText(repo, fullPath(repo, path), next, sha, `${id ? id + ": " : ""}${said || `${key} set to ${value}`} from ${APP_NAME}`);
      wroteCommit(repo, res);
      known[res.sha] = noteProps(next);
      treeChanged(repo, path, res.sha);
      checkInboxDot(repo);
      toast(said ? `${shownName(path)}: ${said}` : key === "status" && value === WAITING ? `${shownName(path)}: not now, it's on the waiting list`
        : `${shownName(path)}: ${key} is now ${value}`, "ok");
    }
    saved = !!next;
  } catch (e) {
    toast(`Not changed: ${e.message}`, "error");
  }
  if (!refreshInboxBox(repo)) picker.disabled = false;
  return saved;
}

/** Icons, external links and images: what the sanitized HTML still needs. */
function decorate(root, repo, fromPath) {
  fillIcons(root);
  for (const a of root.querySelectorAll('a[href^="http"]')) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  fillLinks(root, repo, fromPath);
  fillImages(root, repo, fromPath);
  fillDiagrams(root);
  fillFolds(root, fromPath);
  fillMentions(root, repo);
}

/**
 * Plain Markdown links to other files in the repo, `[Add a vault](Add%20a%20vault.md)`, open that file in the
 * app, as they do on GitHub. A link to a file the repo doesn't have is left as it is.
 */
function fillLinks(root, repo, fromPath) {
  const tree = app.trees.get(repo.id);
  if (!tree) return;
  for (const a of root.querySelectorAll("a[href]:not(.wikilink)")) {
    const link = relativeLink(a.getAttribute("href"), fromPath);
    if (link && tree.files.has(link.path)) a.setAttribute("href", hrefFor(repo, link.path, link.heading));
  }
}

// ---- folding a list's subpoints ----

/** The folded list items of the open note, by `listItemKey`: kept while it's open, so a redraw keeps them; never saved. */
const foldsOf = (f) => (f.folds ||= new Set());

/** A list item's own text (without its subpoints) and the page it's from: what a fold is remembered by, so typing above it doesn't move it. */
function listItemKey(li, fromPath) {
  const own = li.cloneNode(true);
  for (const x of own.querySelectorAll(":scope > ul, :scope > ol, .fold")) x.remove();
  return `${fromPath}\n${own.textContent.replace(/\s+/g, " ").trim().slice(0, 120)}`;
}

/**
 * Each list item with subpoints gets an arrow that folds them all away, or shows them again. It only changes
 * the view: the note's text stays as it is. A bullet's arrow takes the bullet's place; a numbered or task
 * item's sits at the start of its line.
 */
function fillFolds(root, fromPath) {
  const f = app.file;
  for (const li of root.querySelectorAll("li")) {
    if (![...li.children].some((c) => c.tagName === "UL" || c.tagName === "OL") || li.querySelector(":scope > .fold, :scope > p > .fold")) continue;
    const key = listItemKey(li, fromPath);
    const folds = f ? foldsOf(f) : new Set();
    const button = h("button", { type: "button", class: "fold" }, icon("chevron"));
    const show = (folded) => {
      li.classList.toggle("folded", folded);
      button.setAttribute("aria-expanded", String(!folded));
      button.setAttribute("aria-label", folded ? "Show the subpoints" : "Fold the subpoints");
      button.title = folded ? "Show the subpoints" : "Fold the subpoints";
    };
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const folded = !li.classList.contains("folded");
      if (folded) folds.add(key); else folds.delete(key);
      show(folded);
    });
    li.classList.add("has-fold");
    show(folds.has(key));
    // In a loose list the line is a paragraph: the arrow goes inside it, so it stays on the same line.
    const line = li.firstElementChild?.tagName === "P" ? li.firstElementChild : li;
    const box = line.querySelector(":scope > input.task");
    // A checkbox sits in the margin, so the arrow goes after it, in place of the space before the text.
    if (box?.nextSibling?.nodeType === Node.TEXT_NODE) box.nextSibling.textContent = box.nextSibling.textContent.replace(/^\s+/, "");
    if (box) box.after(button); else line.prepend(button);
  }
}

// ---- Mermaid diagrams: ```mermaid blocks ----

// Mermaid is ~3.5 MB, so it's a file of its own, loaded only when a page has a diagram.
let mermaidLoad = null;
function loadMermaid() {
  mermaidLoad ||= new Promise((resolve, reject) => {
    const script = h("script", { src: "vendor/mermaid.min.js" });
    script.onload = () => (window.mermaid ? resolve(window.mermaid) : reject(new Error("Mermaid didn't start")));
    script.onerror = () => { script.remove(); reject(new Error("Couldn't load Mermaid")); };
    document.head.append(script);
  }).catch((e) => { mermaidLoad = null; throw e; });
  return mermaidLoad;
}

const diagramSvgs = new Map(); // theme + source -> SVG, so the preview doesn't redraw while typing
let mermaidTheme = "", diagramCount = 0;

function diagramSvg(src, theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default") {
  const key = `${theme}\n${src}`;
  if (!diagramSvgs.has(key)) {
    diagramSvgs.set(key, loadMermaid().then(async (mermaid) => {
      if (mermaidTheme !== theme) {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true, theme });
        mermaidTheme = theme;
      }
      // suppressErrorRendering: on bad syntax render() just throws, leaving no error graphic in the page.
      return (await mermaid.render(`mermaid-${++diagramCount}`, src)).svg;
    }).catch((e) => { diagramSvgs.delete(key); throw e; }));
  }
  return diagramSvgs.get(key);
}

/** Draws each diagram placeholder (Mermaid's strict mode sanitizes the SVG); on a failure its code stays, with a note. */
function fillDiagrams(root) {
  for (const el of root.querySelectorAll(".mermaid-diagram")) {
    const src = el.querySelector("code")?.textContent;
    if (!src) continue;
    el.dataset.diagramSource = src;
    diagramSvg(src).then((svg) => {
      el.innerHTML = svg;
      el.classList.add("drawn");
      // Mermaid shrinks a wide diagram to fit the page. Below 70% of its size (about 11px labels) the box scrolls instead.
      const drawn = el.querySelector("svg");
      const natural = parseFloat(drawn?.style.maxWidth);
      if (natural) drawn.style.minWidth = `${Math.round(natural * 0.7)}px`;
    }, () => el.append(h("p", { class: "note diagram-error" }, "This diagram couldn't be drawn; its code is shown instead.")));
  }
}

/** The front matter as a Properties box; `skip` (lower-case keys) leaves out what a task's form already shows. */
function propertiesBox(raw, env, skip = null) {
  let data;
  try { data = yamlLoad(raw); } catch { return h("pre", { class: "props-raw" }, raw); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return h("pre", { class: "props-raw" }, raw);
  const show = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
  const entries = Object.entries(data).filter(([key]) => !skip?.has(key.toLowerCase()));
  if (!entries.length) return "";
  const cells = entries.flatMap(([key, value]) => {
    const vals = h("div", { class: "prop-vals" });
    vals.innerHTML = sanitize((Array.isArray(value) ? value : [value]).filter((v) => v !== "" && v != null)
      .map((v) => `<span class="prop-val">${md.renderInline(show(v), env)}</span>`).join(""));
    return [h("div", { class: "prop-key" }, key), vals];
  });
  const box = h("details", { class: "props", open: store.get("propsOpen", true) },
    h("summary", {}, icon("chevron"), "Properties"), h("div", { class: "prop-list" }, cells));
  box.addEventListener("toggle", () => store.set("propsOpen", box.open));
  return box;
}

const blobUrls = new Map();
function blobUrl(repo, sha, path = "") {
  const key = `${repo.id}:${sha}`;
  // GitHub sends the bytes untyped; browsers guess PNG or JPEG, but draw an SVG (or show a PDF) only when it says it is one.
  const type = /\.svg$/i.test(path) ? "image/svg+xml" : /\.pdf$/i.test(path) ? "application/pdf" : "";
  const typed = (b) => (type ? new Blob([b], { type }) : b);
  if (!blobUrls.has(key)) {
    blobUrls.set(key, gh.readBlob(repo, sha).then((b) => URL.createObjectURL(typed(b)), (e) => { blobUrls.delete(key); throw e; }));
  }
  return blobUrls.get(key);
}

/** Images live in a private repo, so each is fetched with the token and shown from a blob. */
function fillImages(root, repo, fromPath) {
  const tree = app.trees.get(repo.id);
  const show = (img, path, holder) => {
    const sha = path && tree.files.get(path);
    if (!sha) { holder.textContent = `Missing image: ${img.alt}`; holder.classList.add("missing"); return; }
    blobUrl(repo, sha, path).then((url) => { img.src = url; }, () => { holder.textContent = `Couldn't load ${img.alt}`; });
  };
  for (const el of root.querySelectorAll(".embed-img")) {
    const img = h("img", { alt: el.dataset.alt, loading: "lazy" });
    if (el.dataset.width) img.style.width = `${el.dataset.width}px`;
    el.append(img);
    show(img, el.dataset.path, el);
  }
  // Plain Markdown images with a relative path: ![](Attachments/x.png)
  for (const img of root.querySelectorAll("img[src]")) {
    const src = img.getAttribute("src");
    if (/^(https?:|data:|blob:)/i.test(src)) continue;
    let rel;
    try { rel = decodeURIComponent(src); } catch { rel = src; }
    const dir = fromPath.slice(0, fromPath.lastIndexOf("/") + 1);
    const path = tree.index.has(dir + rel) ? tree.index.resolve(dir + rel) : tree.index.resolve(rel, fromPath);
    img.removeAttribute("src");
    show(img, path, img.parentElement);
  }
}

// ---- embedded pages: ![[Page]] and ![[Page#Heading]] ----

const pageTexts = new Map();
function pageText(repo, path) {
  const key = `${repo.id}:${app.trees.get(repo.id).files.get(path)}`;
  if (!pageTexts.has(key)) {
    pageTexts.set(key, gh.readText(repo, fullPath(repo, path)).then((d) => d.text, (e) => { pageTexts.delete(key); throw e; }));
  }
  return pageTexts.get(key);
}

/** The part of a note an embed shows: one heading's section, or the whole note without its front matter and nav box. */
function embeddedPart(text, heading) {
  let src = toLf(text);
  const fm = splitFrontMatter(src);
  if (fm) src = src.slice(fm.length);
  const nav = findNavBlock(src);
  if (nav) src = src.slice(0, nav.from) + src.slice(nav.to);
  if (!heading) return src;
  const want = norm(heading);
  const headings = [];
  for (const token of md.parse(src, {})) {
    if (token.level !== 0) continue;
    if (token.type === "heading_open") {
      const [line, after] = token.map;
      headings.push({ name: token.attrGet("data-heading"), level: Number(token.tag[1]), line, after });
    } else if (token.type === "fence") {
      const kind = fenceLanguage(token.info);
      if (Object.hasOwn(NOTE_SECTIONS, kind)) headings.push({ name: NOTE_SECTIONS[kind], level: 2, line: token.map[0], content: token.content });
    }
  }
  const at = headings.findIndex(({ name }) => norm(name) === want);
  if (at < 0) return null;
  const { content, level, after } = headings[at];
  if (content !== undefined) return content;
  const end = headings.slice(at + 1).find((next) => next.level <= level)?.line;
  return src.split("\n").slice(after, end).join("\n");
}

function fillEmbeds(root, repo, fromPath) {
  for (const el of root.querySelectorAll(".embed-page")) {
    const { path, heading } = el.dataset;
    const head = el.querySelector(".embed-head");
    head.prepend(icon("file"));
    const body = el.querySelector(".embed-body");
    if (path === fromPath && !heading) { body.remove(); continue; }
    fill(body, h("div", { class: "sk" }), h("div", { class: "sk" }));
    pageText(repo, path).then((text) => {
      const part = embeddedPart(text, heading);
      if (part == null) { fill(body, h("p", { class: "note" }, `No heading “${heading}” on that page.`)); return; }
      body.innerHTML = sanitize(renderNote(md, part, linkEnv(repo, path, 1)).html);
      // Its checkboxes belong to the other page, so they can't be ticked from here.
      for (const box of body.querySelectorAll("input.task")) box.disabled = true;
      decorate(body, repo, path);
    }, (e) => fill(body, h("p", { class: "note error" }, `Couldn't load it: ${e.message}`)));
  }
}

// ---- Bases: ![[X.base]] embeds and .base files, shown as tables ----

const BLOBS_PER_QUERY = 100;
const HISTORIES_PER_QUERY = 50; // each one searches the branch's commits, so fewer per request
const IS_SHA = /^[0-9a-f]{40}$/;

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

/** Runs `fn` on every item, at most `n` at a time. */
async function inParallel(items, n, fn) {
  let next = 0;
  const worker = async () => { while (next < items.length) await fn(items[next++]); };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

/**
 * Caches kept in this browser per repo: front matter by blob sha (`baseProps`), last commit dates by
 * path@sha (`baseDates`). A changed note has a new sha, so it's read again by itself.
 */
const baseCaches = new Map();
function baseCache(name, repo) {
  const key = `${name}:${repo.id}`;
  if (!baseCaches.has(key)) {
    const kept = store.get(key, {});
    baseCaches.set(key, kept && typeof kept === "object" ? kept : {});
  }
  return baseCaches.get(key);
}

/** Drops what the tree no longer has, then saves. Full or blocked storage only means reading again next time. */
function keepBaseCache(name, repo, keep) {
  const cache = baseCache(name, repo);
  for (const k of Object.keys(cache)) if (!keep(k)) delete cache[k];
  store.set(`${name}:${repo.id}`, cache);
}

/** The texts of many notes: up to 100 per GraphQL request, and the REST API for whatever that didn't bring. */
async function readNotes(repo, tree, paths) {
  const texts = new Map();
  const bySha = paths.filter((p) => IS_SHA.test(tree.files.get(p)));
  if (!isLocal(repo)) await inParallel(chunks(bySha, BLOBS_PER_QUERY), 3, async (batch) => {
    const fields = batch.map((p, i) => `b${i}: object(oid: "${tree.files.get(p)}") { ... on Blob { text } }`).join("\n");
    try {
      const data = await gh.graphql(`query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) {\n${fields}\n} }`,
        { owner: repo.owner, name: repo.repo });
      batch.forEach((p, i) => {
        const text = data.repository?.[`b${i}`]?.text;
        if (text != null) texts.set(p, text);
      });
    } catch { /* GraphQL refused: the REST API reads these one by one below */ }
  });
  await inParallel(paths.filter((p) => !texts.has(p)), 6, async (p) => {
    const sha = tree.files.get(p);
    try {
      texts.set(p, IS_SHA.test(sha) ? await gh.readBlobText(repo, sha) : (await gh.readText(repo, fullPath(repo, p))).text);
    } catch { /* that note shows without properties, and isn't cached */ }
  });
  return texts;
}

/** The notes a base can show, as [{ path, props }], reading only those not cached yet. */
async function baseNotes(repo, tree, paths) {
  const cache = baseCache("baseProps", repo);
  const missing = paths.filter((p) => !Object.hasOwn(cache, tree.files.get(p)));
  if (missing.length) {
    for (const [p, text] of await readNotes(repo, tree, missing)) cache[tree.files.get(p)] = noteProps(text);
    const live = new Set(tree.files.values());
    keepBaseCache("baseProps", repo, (sha) => live.has(sha));
  }
  return paths.map((p) => ({ path: p, props: reviveDates(cache[tree.files.get(p)] ?? {}) }));
}

/** Whether each task can be started now (`taskState`), from its whole text: cached by blob sha, like the bases' properties. */
async function taskStates(repo, tree, paths) {
  store.remove(`taskState:${repo.id}`);
  const cache = baseCache("taskState2", repo);
  const missing = paths.filter((p) => !Object.hasOwn(cache, tree.files.get(p)));
  if (missing.length) {
    for (const [p, text] of await readNotes(repo, tree, missing)) cache[tree.files.get(p)] = taskState(text);
    const live = new Set(tree.files.values());
    keepBaseCache("taskState2", repo, (sha) => live.has(sha));
  }
  return new Map(paths.map((p) => [p, cache[tree.files.get(p)] ?? null]));
}

/** The answer written on each task (`taskAnswer`), from its whole text: cached by blob sha, like `taskStates`. */
async function taskAnswers(repo, tree, paths) {
  const cache = baseCache("taskAnswer", repo);
  const missing = paths.filter((p) => !Object.hasOwn(cache, tree.files.get(p)));
  if (missing.length) {
    for (const [p, text] of await readNotes(repo, tree, missing)) cache[tree.files.get(p)] = taskAnswer(text);
    const live = new Set(tree.files.values());
    keepBaseCache("taskAnswer", repo, (sha) => live.has(sha));
  }
  return new Map(paths.map((p) => [p, cache[tree.files.get(p)] ?? ""]));
}

/** "Last modified" is the date of the last commit that changed the note: a Map path -> Date. Failures leave gaps. */
async function lastCommitDates(repo, tree, paths) {
  const cache = baseCache("baseDates", repo);
  const key = (p) => `${p}@${tree.files.get(p)}`;
  if (isLocal(repo)) return new Map(); // no commits on this device
  const missing = paths.filter((p) => !Object.hasOwn(cache, key(p)));
  await inParallel(chunks(missing, HISTORIES_PER_QUERY), 3, async (batch) => {
    const fields = batch.map((p, i) => `h${i}: history(first: 1, path: ${JSON.stringify(fullPath(repo, p))}) { nodes { committedDate } }`).join("\n");
    try {
      const data = await gh.graphql(`query($owner: String!, $name: String!, $ref: String!) { repository(owner: $owner, name: $name) {
        ref(qualifiedName: $ref) { target { ... on Commit {\n${fields}\n} } } } }`,
      { owner: repo.owner, name: repo.repo, ref: `refs/heads/${repo.branch}` });
      const target = data.repository?.ref?.target;
      batch.forEach((p, i) => {
        const date = target?.[`h${i}`]?.nodes?.[0]?.committedDate;
        if (date) cache[key(p)] = date;
      });
    } catch { /* the column stays empty for these */ }
  });
  if (missing.length) {
    const live = new Set([...tree.files].map(([p, sha]) => `${p}@${sha}`));
    keepBaseCache("baseDates", repo, (k) => live.has(k));
  }
  return new Map(paths.filter((p) => cache[key(p)]).map((p) => [p, new Date(cache[key(p)])]));
}

/** One load per base and tree version, shared by every embed of it: { base, notes, tree, dates }. */
const baseLoads = new Map();
function loadBase(repo, path, source = null) {
  const tree = app.trees.get(repo.id);
  // A ```base block's view is its own text, so the text is part of the key: an edit to it is a new view.
  const prefix = `${repo.id}:${path}:${source == null ? "" : `block:${source}:`}`;
  const key = prefix + tree.version;
  if (!baseLoads.has(key)) {
    // Typing in a block makes a new key each time: the page's older block loads go (its notes stay cached by sha).
    const old = source == null ? prefix : `${repo.id}:${path}:block:`;
    for (const k of baseLoads.keys()) if (k.startsWith(old)) baseLoads.delete(k);
    const load = (async () => {
      const base = parseBase(source ?? await pageText(repo, path));
      const notes = await baseNotes(repo, tree, candidatePaths(base, [...tree.files.keys()]));
      return { base, notes, tree, dates: null, datesLoading: null };
    })();
    baseLoads.set(key, load);
    load.catch(() => baseLoads.delete(key));
  }
  return baseLoads.get(key);
}

function fillBases(root, repo, fromPath = "") {
  // A ```base block: the view written in the page itself, drawn like a .base file's (not inside an embedded page).
  [...root.querySelectorAll(".base-block")].forEach((el, n) => {
    if (el.parentElement.closest(".embed-page")) return;
    el.replaceWith(baseView(repo, fromPath, { source: el.querySelector("code")?.textContent ?? "", n }));
  });
  for (const el of root.querySelectorAll(".embed-base")) {
    const view = baseView(repo, el.dataset.path);
    // The embed is alone in its paragraph; the table takes the paragraph's place.
    const p = el.parentElement;
    if (p?.tagName === "P" && p.childNodes.length === 1) p.replaceWith(view);
    else el.replaceWith(view);
  }
}

/** A board shares the task and sprint property caches with the rest of the note. */
function fillBoards(root, f) {
  const blocks = root.querySelectorAll(".board-block");
  const setup = taskSetupOf(f.repo);
  const tree = app.trees.get(f.repo.id);
  if (!blocks.length || !setup || !tree) return;
  const tasks = taskNotes(f.repo, setup);
  const resolve = (target, from) => tree.index.resolve(target, from);
  for (const [index, el] of [...blocks].entries()) {
    const options = boardOptions(el.querySelector("code").textContent);
    const sprintList = options.sprint ? sprintNotes(f.repo, setup).notes : [];
    if (!tasks.notes || !sprintList) {
      fill(el, h("p", { class: "board-muted", role: "status" }, "Loading board…"));
      continue;
    }
    const sprint = options.sprint ? pickSprint(sprints(sprintList, isoDate()), options.sprint, (target) => resolve(target, f.path)) : null;
    const identity = f.myBoards?.get(index) ?? null;
    const columns = boardColumns(tasks.notes, options, setup, { sprint, resolve, identity });
    el.replaceWith(taskBoard(f, columns, setup, options, index, identity));
  }
}

function taskBoard(f, columns, setup, options, index, identity) {
  const writable = canWrite(f.repo);
  const editableFields = setup.fields.filter((field) => field.on && ["priority", "assignee"].includes(field.key));
  const login = loginFor(f.repo);
  const mine = login ? h("input", { type: "checkbox", checked: !!identity }) : null;
  mine?.addEventListener("change", async () => {
    if (!f.myBoards) f.myBoards = new Map();
    if (mine.checked) {
      const people = await loadPeople(f.repo).catch(() => []);
      if (!mine.isConnected || !mine.checked) return;
      const name = people.find((person) => person.login.toLowerCase() === login.toLowerCase())?.name ?? login;
      f.myBoards.set(index, { name, login });
    } else f.myBoards.delete(index);
    redrawNote();
    f.dom.preview.querySelectorAll(".task-board")[index]?.querySelector(".board-mine input")?.focus({ preventScroll: true });
  });
  const key = fieldProp(setup, "status");
  let dragged = null;
  const move = async (card, status, picker) => {
    if (picker.disabled || status.toLowerCase() === card.status.toLowerCase()) return;
    await changeTask(f.repo, card.path, key, status, picker,
      { allow: (current) => String(current[key] ?? "").trim() === card.status });
    if (picker.isConnected) redrawNote();
  };
  const scroller = h("div", { class: "board-columns", tabindex: "0", "aria-label": "Status columns" });
  for (const { status, cards } of columns) {
    const column = h("section", { class: "board-column", "aria-label": status },
      h("h3", {}, status, h("span", { class: "board-muted" }, String(cards.length))));
    if (writable) {
      column.addEventListener("dragover", (event) => {
        if (!dragged || dragged.card.status.toLowerCase() === status.toLowerCase()) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });
      column.addEventListener("drop", (event) => {
        if (!dragged) return;
        event.preventDefault();
        const { card, picker } = dragged;
        dragged = null;
        move(card, status, picker);
      });
    }
    for (const card of cards) {
      const title = shownName(card.path);
      const picker = writable ? h("select", { "aria-label": "Status of " + (card.id || title) },
        columns.map((target) => h("option", { value: target.status, selected: target.status === status }, target.status))) : null;
      picker?.addEventListener("change", () => move(card, picker.value, picker));
      const tile = h("article", { class: "board-card" },
        h("a", { href: hrefFor(f.repo, card.path) }, card.id && h("span", { class: "board-muted" }, card.id), title),
        h("div", { class: "board-card-meta" }, [card.priority, card.assignee, ...card.area].filter(Boolean).join(" · ")),
        writable && editableFields.length ? h("div", { class: "board-card-actions" }, picker,
          h("button", { class: "icon-btn board-edit", type: "button", title: "Edit card",
            "aria-label": "Edit card " + (card.id || title), onclick: () => editBoardCard(f, card, editableFields) }, icon("edit"))) : picker);
      if (writable) {
        tile.draggable = true;
        tile.addEventListener("dragstart", (event) => {
          if (picker.disabled) { event.preventDefault(); return; }
          dragged = { card, picker };
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", card.path);
        });
        tile.addEventListener("dragend", () => { dragged = null; });
      }
      column.append(tile);
    }
    scroller.append(column);
  }
  return h("section", { class: "task-board", "aria-label": "Task board" },
    !options.columns.length && h("p", { class: "board-muted" }, "Columns use the statuses from Task fields."),
    mine && h("label", { class: "board-mine" }, mine, "Assigned to me"), scroller);
}

/** Keep both fields in one card action; each field saves independently. */
function editBoardCard(f, card, fields) {
  const controls = [];
  let pending = null;
  const rows = fields.map((field) => {
    let current = card[field.key];
    const list = field.key === "assignee" ? assigneeList(f.repo, "board-assignee-options") : null;
    const control = list
      ? h("input", { type: "text", class: "input", list: list.id, value: current, autocomplete: "off", spellcheck: "false" })
      : h("select", { class: "input" }, [...new Set(["", ...field.values, current])]
        .map((value) => h("option", { value, selected: value === current }, value || "—")));
    control.id = "board-edit-" + field.key;
    controls.push(control);
    control.addEventListener("change", () => {
      const value = fieldValue(field, control.value);
      if (pending || value === current) return;
      controls.forEach((input) => { input.disabled = true; });
      pending = changeTask(f.repo, card.path, field.prop, value, control, {
        said: list ? "assignee updated" : "",
        also: () => list ? assignmentEdits(value) : [],
        allow: (props) => shownValue(props[field.prop]).trim() === current,
      }).then((saved) => {
        if (saved) current = value;
        control.value = current;
        controls.forEach((input) => { input.disabled = false; });
        pending = null;
        if (app.file === f) redrawNote();
      });
    });
    return h("label", { class: "field" }, h("span", {}, field.label), control, list);
  });
  modal({ title: shownName(card.path), body: rows,
    buttons: [{ label: "Done", kind: "primary", onclick: async () => { await pending; } }] });
}

/** A base's views as tabs over one table. The last tab chosen is remembered per base. */
function baseView(repo, path, block = null) {
  // A ```base block is known by its page and its place on it; a .base file by its path.
  const tabKey = `baseTab:${repo.id}:${path}${block ? `#base${block.n}` : ""}`;
  const tabs = h("div", { class: "base-tabs", role: "tablist", "aria-label": "Views" });
  const count = h("span", { class: "base-count" });
  const body = h("div", { class: "base-body" }, h("div", { class: "sk" }), h("div", { class: "sk" }), h("div", { class: "sk" }));
  const view = h("div", { class: "base-view", "data-path": path }, h("div", { class: "base-head" }, tabs, count), body);
  let loaded = null;
  let tab = 0;

  const show = () => {
    const { base } = loaded;
    const v = base.views[tab];
    fill(tabs, base.views.map((x, i) => h("button", {
      type: "button", role: "tab", class: "base-tab", "aria-selected": String(i === tab), tabindex: i === tab ? "0" : "-1",
      onclick: () => choose(i),
    }, x.name)));
    const left = body.querySelector(".base-scroll")?.scrollLeft || 0;
    count.textContent = "";
    if (v.type !== "table") return fill(body, h("p", { class: "note" }, `“${v.name}” is a ${v.type} view. The app shows only table views.`));
    let result;
    try {
      result = runView(base, tab, loaded.notes, loaded.dates);
    } catch (e) {
      return fill(body, h("p", { class: "note error" }, `This view can't be shown here: ${e.message}`));
    }
    count.textContent = `${result.count} ${result.count === 1 ? "note" : "notes"}`;
    const scroller = baseTable(repo, path, result);
    fill(body, scroller);
    // On a big screen, a view too wide for the note's column grows out of it now that its rows are in.
    if (view.isConnected && app.file?.kind === "md") fitWide(app.file);
    scroller.scrollLeft = left;
    if (usesFileMtime(base, tab) && !loaded.dates) loadDates();
  };

  // The table shows at once; the dates fill in when they come.
  const loadDates = () => {
    const shared = loaded;
    shared.datesLoading ??= lastCommitDates(repo, shared.tree, shared.notes.map((n) => n.path))
      .catch(() => new Map())
      .then((dates) => { shared.dates = dates; });
    shared.datesLoading.then(() => { if (view.isConnected && loaded === shared) show(); });
  };

  const choose = (i, focus = false) => {
    tab = i;
    store.set(tabKey, i);
    show();
    if (focus) tabs.children[i]?.focus();
  };
  tabs.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step || !loaded) return;
    e.preventDefault();
    const n = loaded.base.views.length;
    choose((tab + step + n) % n, true);
  });

  if (!app.trees.get(repo.id)) {
    fill(body, h("p", { class: "note error" }, "The file list isn't loaded."));
    return view;
  }
  loadBase(repo, path, block?.source).then((l) => {
    loaded = l;
    if (!l.base.views.length) return fill(body, h("p", { class: "note" }, "This base has no views."));
    const saved = Number(store.get(tabKey, 0));
    tab = Number.isInteger(saved) && saved >= 0 && saved < l.base.views.length ? saved : 0;
    show();
  }, (e) => fill(body, h("p", { class: "note error" }, `${block ? "This base block can't be read" : "Couldn't load this view"}: ${e.message}`)));
  return view;
}

const cellText = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "object" ? JSON.stringify(v) : String(v));

/** One value, shown the way the Properties box shows it. */
const isNameKey = (key) => key === "file.name" || key === "file.basename";

function baseCell(repo, row, key) {
  const v = row.values[key];
  const td = h("td", { "data-key": key });
  if (isNameKey(key)) {
    td.className = "base-name";
    td.append(h("a", { class: "wikilink", href: hrefFor(repo, row.path), "data-path": row.path, "data-heading": "", "data-target": shownName(row.path) },
      shownName(row.path)));
    return td;
  }
  if (v == null || v === "") return td;
  if (typeof v === "boolean") {
    td.textContent = v ? "✓" : "";
    return td;
  }
  if (typeof v === "number" || v instanceof Date) {
    td.className = "base-plain";
    td.textContent = cellText(v);
    return td;
  }
  const env = linkEnv(repo, row.path);
  if (Array.isArray(v)) {
    const vals = h("div", { class: "prop-vals" });
    vals.innerHTML = sanitize(v.filter((x) => x !== "" && x != null)
      .map((x) => `<span class="prop-val">${md.renderInline(cellText(x), env)}</span>`).join(""));
    td.append(vals);
    return td;
  }
  // Long texts (a card's ability) get a wider column, so rows stay a few lines tall.
  if (cellText(v).length > 80) td.className = "base-long";
  td.innerHTML = sanitize(md.renderInline(cellText(v), env));
  return td;
}

function baseTable(repo, path, result) {
  const span = result.columns.length;
  // The note's name (or else the first column) stays in view while the table scrolls sideways.
  const sticky = (result.columns.find((c) => isNameKey(c.key)) || result.columns[0])?.key;
  const head = h("tr", {}, result.columns.map((c) => h("th", {
    style: c.width ? `min-width: ${c.width}px` : null, "data-key": c.key, class: c.key === sticky ? "base-sticky" : null,
  }, c.label)));
  const rows = [];
  for (const g of result.groups) {
    if (g.label != null) {
      rows.push(h("tr", { class: "base-group" }, h("td", { colspan: span },
        h("span", { class: "base-group-label" }, g.label, h("span", { class: "base-group-count" }, String(g.rows.length))))));
    }
    for (const row of g.rows) {
      const cells = result.columns.map((c) => baseCell(repo, row, c.key));
      cells[result.columns.findIndex((c) => c.key === sticky)]?.classList.add("base-sticky");
      rows.push(h("tr", { "data-path": row.path }, cells));
    }
  }
  if (!result.count) rows.push(h("tr", {}, h("td", { colspan: span, class: "base-none" }, "No notes match this view.")));
  const scroller = h("div", { class: "base-scroll" }, h("table", { class: "base-table" }, h("thead", {}, head), h("tbody", {}, rows)));
  decorate(scroller, repo, path);
  return scroller;
}

function onPreviewClick(e) {
  const box = e.target.closest("input.task");
  if (box) {
    if (box.closest(".embed-page")) return e.preventDefault();
    return toggleTask(box);
  }
  const a = e.target.closest("a.wikilink");
  if (!a) return;
  e.preventDefault();
  if (!a.dataset.path) return toast(`No page is called “${a.dataset.target}”.`, "error");
  if (a.dataset.path === app.file.path) return scrollToHeading(a.dataset.heading);
  location.hash = a.getAttribute("href");
}

function scrollToHeading(heading) {
  if (!heading || !app.file?.dom) return;
  const want = norm(heading);
  const el = [...app.file.dom.preview.querySelectorAll(".note-body > [data-heading]")].find((x) => norm(x.dataset.heading) === want);
  el?.scrollIntoView({ block: "start", behavior: "smooth" });
}

/** Ticking a checkbox in the preview changes its line; Save commits it. */
function toggleTask(box) {
  const f = app.file;
  const line = Number(box.dataset.line);
  const lines = f.text.split("\n");
  if (!(line >= 0 && line < lines.length)) return;
  const next = lines[line].replace(/^(\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])/, (_m, a, c, b) => a + (c === " " ? "x" : " ") + b);
  if (next === lines[line]) return;
  lines[line] = next;
  f.text = lines.join("\n");
  if (f.editor) setEditorText(f.editor, f.text);
  updateDirty();
  const scroll = $("#main").scrollTop;
  renderPreview();
  $("#main").scrollTop = scroll;
}

// ---- links that lead nowhere ----

const warnLater = debounce(() => updateLinkWarning(), 400);

function updateLinkWarning() {
  const f = app.file;
  if (!f?.dom) return;
  const el = f.dom.linkWarn;
  if (f.kind !== "md" || (!f.dirty && app.mode !== "edit")) { el.hidden = true; return; }
  const tree = app.trees.get(f.repo.id);
  const missing = [...new Set(findWikilinks(f.text).filter((l) => l.target && !tree.index.resolve(l.target, f.path)).map((l) => l.target))];
  el.hidden = !missing.length;
  if (missing.length) {
    fill(el, icon("warning"), h("span", { class: "text" },
      `${missing.length === 1 ? "This link leads" : "These links lead"} to no page: `,
      ...missing.flatMap((t, i) => [i ? ", " : "", h("b", {}, `[[${t}]]`)]),
      f.repo.vault ? ". This repo's vault rules say every link must lead to a page." : "."));
  }
}

// ================================================================
// CSV as a table
// ================================================================

const columnName = (c) => {
  let s = "";
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** A big table shows this many rows at first, and as many more at each press of Show more. */
const TABLE_ROWS = 500;

function renderTable() {
  const f = app.file;
  f.csv ??= parseCsv(f.text, /\.tsv$/i.test(f.path) ? "\t" : null);
  const data = f.csv;
  if (!data.rows.length) data.rows.push(["Column 1"]);
  f.tableRows ??= TABLE_ROWS;
  const shown = Math.min(data.rows.length, f.tableRows);
  const showMore = () => { f.tableRows += TABLE_ROWS; renderTable(); };
  const width = data.rows.reduce((w, r) => Math.max(w, r.length), 1);
  const pane = f.dom.preview;
  const keepScroll = pane.querySelector(".table-scroll");
  const scroll = keepScroll ? [keepScroll.scrollLeft, keepScroll.scrollTop] : null;
  const commit = () => {
    f.text = serializeCsv(data.rows, data);
    updateDirty();
  };
  const rerender = () => { commit(); renderTable(); };
  const ro = !canWrite(f.repo);
  const cell = (r, c) => {
    const td = h("td", { "data-r": r, "data-c": c });
    td.textContent = data.rows[r][c] ?? "";
    if (ro) return td;
    td.setAttribute("spellcheck", "false");
    td.contentEditable = "plaintext-only";
    if (td.contentEditable !== "plaintext-only") td.contentEditable = "true";
    td.addEventListener("input", () => {
      const row = data.rows[r];
      while (row.length <= c) row.push("");
      row[c] = td.innerText.replace(/\n$/, "");
      commit();
    });
    td.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      if (r + 1 >= data.rows.length) return addRow(true);
      if (r + 1 >= f.tableRows) showMore();
      pane.querySelector(`td[data-r="${r + 1}"][data-c="${c}"]`)?.focus();
    });
    return td;
  };
  const addRow = (focus) => {
    const allShown = shown === data.rows.length;
    data.rows.push(Array(width).fill(""));
    // The new row is at the end: shown at once when the whole table is, else with a note.
    if (allShown) f.tableRows = Math.max(f.tableRows, data.rows.length);
    rerender();
    if (!allShown) return toast(`Row ${data.rows.length} added at the end of the table`, "ok");
    if (focus) pane.querySelector(`td[data-r="${data.rows.length - 1}"][data-c="0"]`)?.focus();
  };
  const addColumn = () => {
    data.rows.forEach((row) => { while (row.length < width) row.push(""); row.push(""); });
    rerender();
  };
  const xButton = (title, onclick) => (ro ? null : h("button", { class: "x", title, "aria-label": title, onclick }, icon("x")));
  const head = h("tr", {}, h("th", { class: "rownum" }), Array.from({ length: width }, (_, c) => h("th", {},
    h("div", { class: "cellhead" }, columnName(c), width > 1 ? xButton(`Delete column ${columnName(c)}`, async () => {
      if (!(await confirmDialog(`Delete column ${columnName(c)}?`, "Its cells in every row go too.", "Delete column", true))) return;
      data.rows.forEach((row) => row.splice(c, 1));
      rerender();
    }) : null))));
  const body = data.rows.slice(0, shown).map((_, r) => h("tr", { class: r === 0 ? "header-row" : "" },
    h("th", { class: "rownum" }, h("span", { class: "num" }, String(r + 1)), xButton(`Delete row ${r + 1}`, async () => {
      if (!(await confirmDialog(`Delete row ${r + 1}?`, null, "Delete row", true))) return;
      data.rows.splice(r, 1);
      rerender();
    })),
    Array.from({ length: width }, (_, c) => cell(r, c))));
  const scroller = h("div", { class: "table-scroll" }, h("table", { class: `csv${ro ? " readonly" : ""}` }, h("thead", {}, head), h("tbody", {}, body)));
  fill(pane, 
    h("div", { class: "table-tools" },
      ro ? null : h("button", { class: "btn small", onclick: () => addRow(true) }, icon("rows"), "Add row"),
      ro ? null : h("button", { class: "btn small", onclick: addColumn }, icon("columns"), "Add column"),
      h("span", { class: "note" }, `${data.rows.length} rows · ${width} columns`)),
    scroller,
    shown < data.rows.length ? h("button", { class: "btn small more-rows", onclick: showMore },
      `Show ${Math.min(TABLE_ROWS, data.rows.length - shown)} more rows (${data.rows.length - shown} not shown yet)`) : null);
  if (scroll) [scroller.scrollLeft, scroller.scrollTop] = scroll;
}

// ================================================================
// Saving
// ================================================================

async function save() {
  const f = app.file;
  if (!(f?.dirty || uploadable(f)) || app.saving || viewOnly(f.kind)) return;
  if (f.imageUpload) return toast("Wait for the upload to finish.", "info");
  const before = f.text;
  const text = toLf(before);
  app.saving = true;
  renderHeader();
  try {
    const res = await gh.writeText(f.repo, fullPath(f.repo, f.path), text, f.sha, `Edit ${f.path} from ${APP_NAME}`);
    wroteCommit(f.repo, res);
    if (app.file !== f) return;
    f.sha = res.sha;
    f.saved = text;
    if (f.text === before) f.text = text;
    updateDirty();
    flushDraft();
    treeChanged(f.repo, f.path, res.sha);
    updateLinkWarning();
    if (res.waiting) toast("Saved on this device. It goes to GitHub when the connection is back.", "ok", 5000);
    else toast(`Saved to ${savedOn(f.repo)}`, "ok");
  } catch (e) {
    if (e.isConflict) resolveConflict(f);
    else toast(`Not saved: ${e.message}`, "error");
  } finally {
    app.saving = false;
    renderHeader();
  }
}

/** Someone else saved the file first: show both versions and let the person choose. */
async function resolveConflict(f) {
  let latest;
  try {
    latest = await gh.readText(f.repo, fullPath(f.repo, f.path), { fresh: true });
  } catch (e) {
    return toast(`Not saved, and the newer version couldn't be read: ${e.message}`, "error");
  }
  const host = h("div", { class: "merge-host" });
  let mv;
  const choice = await modal({
    wide: true,
    title: `This file changed on ${savedOn(f.repo)} since you opened it`,
    text: "Nothing is lost until you choose. You can still edit your side before saving it.",
    body: [h("div", { class: "merge-labels" }, h("span", {}, isLocal(f.repo) ? "On this device now" : "On GitHub now"), h("span", {}, "Yours")), host],
    buttons: [
      { label: "Decide later", kind: "ghost", value: null },
      { spacer: true },
      { label: isLocal(f.repo) ? "Use the saved version" : "Use the GitHub version", value: "theirs" },
      { label: "Save my version", kind: "primary", icon: "upload", onclick: () => ({ mine: mv.b.state.doc.toString() }) },
    ],
    onOpen: () => { mv = createMergeView(host, latest.text, f.text, { vault: f.repo.vault && f.kind === "md" }); },
  });
  mv?.destroy();
  if (!choice) return;
  f.sha = latest.sha;
  if (choice === "theirs") {
    f.saved = f.text = latest.text;
    store.remove(draftKey(f));
    if (!isLocal(f.repo)) await mirror.settle(f.repo, fullPath(f.repo, f.path), latest.text, latest.sha);
    afterOutsideChange(f);
    toast(`Showing the version from ${savedOn(f.repo)}`, "ok");
  } else {
    f.saved = latest.text;
    f.text = choice.mine;
    afterOutsideChange(f);
    save();
  }
}

function afterOutsideChange(f) {
  if (app.file !== f) return;
  f.csv = null;
  if (f.editor) setEditorText(f.editor, f.text);
  updateDirty();
  applyMode();
}

// ================================================================
// Drafts
// ================================================================

const draftKey = (f) => `draft:${f.repo.id}:${f.path}`;
const saveDraftLater = debounce(() => flushDraft(), 400);

function flushDraft() {
  const f = app.file;
  if (!f || f.text == null) return;
  if (f.dirty) store.set(draftKey(f), { text: f.text, sha: f.sha, at: Date.now() });
  else store.remove(draftKey(f));
}

function checkDraft() {
  const f = app.file;
  const d = store.get(draftKey(f));
  if (!d) return;
  if (d.text === f.text) return store.remove(draftKey(f));
  const when = new Date(d.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const banner = h("div", { class: "banner info" }, icon("history"),
    h("span", { class: "text" }, `You have changes from ${when} that weren't saved.`
      + (d.sha !== f.sha ? ` The file has changed on ${savedOn(f.repo)} since then, so saving will show both versions.` : "")),
    h("span", { class: "actions" },
      h("button", { class: "btn small", onclick: async () => {
        if (!(await confirmDialog("Discard the unsaved changes?", `The changes from ${when} will be gone.`, "Discard", true))) return;
        store.remove(draftKey(f));
        banner.remove();
      } }, "Discard"),
      h("button", { class: "btn small primary", onclick: () => {
        f.text = d.text;
        f.sha = d.sha;
        banner.remove();
        afterOutsideChange(f);
      } }, "Restore them")));
  f.dom.banners.prepend(banner);
}

// ================================================================
// New notes
// ================================================================

/** A folder path as typed in Settings, without slashes at either end. */
const cleanDir = (s) => String(s ?? "").trim().replace(/^\/+|\/+$/g, "");

/**
 * What a new file starts with: a CSV gets two columns; a note starts from the repo's note template
 * (with {{title}} and {{date}} filled in) when it has one, else with its title as a heading.
 */
async function startingText(repo, tree, p) {
  if (p.kind === "csv") return "Column 1,Column 2\n";
  const template = cleanDir(repo.template);
  const sha = template && tree.files.get(template);
  if (sha) {
    try {
      return await asNewTask(repo, tree, p, fillTemplate(await gh.readBlobText(repo, sha), { title: p.title, date: isoDate() }));
    } catch { /* the template couldn't be read: start plain */ }
  }
  return asNewTask(repo, tree, p, defaultNote(p.title));
}

/**
 * A new task gets its box blocks, the writing sections if its body is blank, and the fields that are on
 * once a setup is saved. A sprint gets the ```sprint block.
 * With Reviewer on, its reviewer is who asked for it (Requested by), else whoever makes it. With sprints on, it goes on the next sprint, if there is one, so the current sprint's plan stays as agreed;
 * a sprint the template already sets stays, and Add subtask then gives it its parent's.
 */
async function asNewTask(repo, tree, p, text) {
  const setup = await loadTaskSetup(repo);
  // A new sprint note shows its sprint box where the block is.
  if (!isSetupTask(setup, p.path)) return isSprintNote(setup, p.path) ? withBlocks(text, SPRINT_BLOCKS) : text;
  text = withTaskLayout(text);
  if (!setup.configured) return text;
  const out = withReviewer(setup, withProps(text, newTaskProps(setup), { keep: true }), store.get("user")?.login);
  const sprint = sprintField(setup) ? await suggestSprints(repo, tree).catch(() => null) : null;
  if (!sprint?.next || String(noteProps(out)[sprint.prop] ?? "").trim()) return out;
  return setProps(out, [[sprint.prop, `[[${sprint.next.name}]]`]]) ?? out;
}

async function newNote() {
  const repo = app.repo;
  if (!repo) return;
  if (!canWrite(repo)) return toast("You can read this repo but not add notes to it.");
  const tree = await loadTree(repo);
  const notesDir = cleanDir(repo.notes);
  const name = h("input", { class: "input", autocomplete: "off", placeholder: notesDir ? "What's it about?" : "Name" });
  const hint = h("small", {});
  let kind = "md";
  let folder = null;
  const body = [h("label", { class: "field" }, h("span", {}, notesDir ? "Title" : "Name"), name, hint)];
  if (!notesDir) {
    const choice = h("div", { class: "choice" });
    const pick = (k) => { kind = k; [...choice.children].forEach((b) => b.classList.toggle("on", b.dataset.k === k)); update(); };
    choice.append(
      h("button", { type: "button", "data-k": "md", class: "on", onclick: () => pick("md") }, icon("file"), "Note"),
      h("button", { type: "button", "data-k": "csv", onclick: () => pick("csv") }, icon("table"), "Table (CSV)"));
    const folders = [...new Set([...tree.files.keys()].map(dirName))].sort((a, b) => a.localeCompare(b));
    if (!folders.includes("")) folders.unshift("");
    folder = h("select", { class: "input", onchange: () => update() },
      folders.map((d) => h("option", { value: d, selected: d === dirName(app.file?.path || "") }, d || "Top level")));
    body.push(h("div", { class: "field" }, h("span", {}, "Kind"), choice), h("label", { class: "field" }, h("span", {}, "Folder"), folder));
  }
  let createBtn;
  const plan = () => {
    const title = name.value.trim();
    if (!title) return {};
    const problem = titleProblem(title);
    if (problem) return { error: problem };
    const path = notesDir ? `${notesDir}/${title}.md` : (folder.value ? folder.value + "/" : "") + title + (kind === "csv" ? ".csv" : ".md");
    if (tree.index.has(path)) return { error: `${path} already exists.` };
    if (repo.vault && kindOf(path) === "md") {
      // With vault rules a bare [[Title]] link must lead to one page, so the name must be new.
      const existing = tree.index.resolve(title);
      if (existing) return { error: `A page called “${title}” already exists: ${existing}` };
    }
    return { path, title, kind: kindOf(path) };
  };
  function update() {
    const p = plan();
    hint.textContent = p.error || (p.path ? `It will be ${p.path}` : notesDir ? `New notes go in ${notesDir}/.` : "");
    hint.classList.toggle("bad", !!p.error);
    if (createBtn) createBtn.disabled = !p.path;
  }
  name.addEventListener("input", update);
  name.addEventListener("keydown", (e) => { if (e.key === "Enter" && !createBtn.disabled) { e.preventDefault(); createBtn.click(); } });
  const created = await modal({
    title: "New note",
    body,
    buttons: [
      { label: "Cancel", value: null },
      { label: "Create", kind: "primary", icon: "plus", onclick: async () => {
        const p = plan();
        if (!p.path) return false;
        createBtn.disabled = true;
        createBtn.lastChild.textContent = "Creating…";
        try {
          const text = await startingText(repo, tree, p);
          const res = await gh.writeText(repo, fullPath(repo, p.path), text, null, `Add ${p.path} from ${APP_NAME}`);
          wroteCommit(repo, res);
          treeChanged(repo, p.path, res.sha);
          return p.path;
        } catch (e) {
          hint.textContent = `It wasn't created: ${e.message}`;
          hint.classList.add("bad");
          createBtn.disabled = false;
          createBtn.lastChild.textContent = "Create";
          return false;
        }
      } },
    ],
    onOpen: ({ buttons }) => { createBtn = buttons[1]; update(); name.focus(); },
  });
  if (!created) return;
  if (kindOf(created) === "md") { app.mode = "edit"; store.set("mode", "edit"); }
  location.hash = hrefFor(repo, created);
  toast(`Created ${shownName(created)}`, "ok");
}

// ================================================================
// First run and settings
// ================================================================

function tokenSteps() {
  return h("ol", { class: "steps" },
    h("li", {}, h("span", {}, "Open ", h("a", { href: newTokenUrl(), target: "_blank", rel: "noopener" }, "GitHub › New fine-grained token"),
      ". The link fills in the name, ", h("b", {}, "Contents"), " set to ", h("b", {}, "Read and write"), ", and a year.")),
    h("li", {}, h("span", {}, "Set ", h("b", {}, "Resource owner"), " to whoever owns your notes repo (you, or an organization). Under ",
      h("b", {}, "Repository access"), ", choose ", h("b", {}, "Only select repositories"), " and pick your notes repos.")),
    h("li", {}, h("span", {}, "Generate the token, copy it, and paste it here.")));
}

const TOKEN_NOTE = "The token stays in this browser on this device and is sent only to GitHub. Anyone using this browser profile could read it, so revoke it on GitHub if the device is lost.";

async function connect(token, out) {
  fill(out, h("li", {}, icon("spinner"), "Checking the token…"));
  const probe = new GitHub(token);
  try {
    const u = await probe.user();
    app.token = token;
    gh = client(token, tokenMap());
    store.set("token", token);
    store.set("user", { login: u.login, avatar: u.avatar_url ? `${u.avatar_url}${u.avatar_url.includes("?") ? "&" : "?"}s=64` : "" });
    app.trees.clear();
    app.repo = null;
    renderWho();
    return true;
  } catch (e) {
    fill(out, h("li", { class: "bad" }, icon("failure"), e.message));
    return false;
  }
}

/**
 * Keeps a token for one owner's repos on this device, after GitHub says it works; the repos of that owner
 * are read again with it. With `check`, also says whether it opens that repo. Resolves to whether it was kept.
 */
async function saveOwnerToken(owner, token, out, check = null) {
  const key = String(owner).trim().toLowerCase();
  if (!key || !token) return false;
  fill(out, h("li", {}, icon("spinner"), "Checking the token…"));
  try {
    const u = await new GitHub(token).user();
    if (check) await new GitHub(token).repo(check);
    store.set("tokens", { ...ownerTokens(), [key]: { token, login: u.login } });
    gh = client(app.token, tokenMap());
    for (const r of app.repos) if (r.owner.toLowerCase() === key) { app.trees.delete(r.id); app.access.delete(r.id); }
    fill(out, h("li", { class: "ok" }, icon("success"), `The token for ${owner} works (made by ${u.login}).`));
    return true;
  } catch (e) {
    fill(out, h("li", { class: "bad" }, icon("failure"), e.status === 404 && check
      ? `The token works, but it can't open ${check.owner}/${check.repo}: check that its resource owner is ${check.owner} and that ${check.repo} is picked.`
      : e.message));
    return false;
  }
}

/** Takes this device's token for an owner off it: that owner's repos go back to the main token. */
function removeOwnerToken(owner) {
  const all = { ...ownerTokens() };
  delete all[owner];
  store.set("tokens", all);
  gh = client(app.token, tokenMap());
  for (const r of app.repos) if (r.owner.toLowerCase() === owner) { app.trees.delete(r.id); app.access.delete(r.id); }
}

/** The link that brings someone to one shared repo: #/join?owner=…&repo=…&branch=…&label=… */
function inviteLink(r) {
  const p = new URLSearchParams({ owner: r.owner, repo: r.repo, branch: r.branch || "main", label: r.label || r.repo });
  if (r.folder) p.set("folder", r.folder);
  if (r.vault) p.set("vault", "1");
  if (r.inbox) p.set("inbox", r.inbox);
  if (r.inboxes) p.set("inboxes", r.inboxes);
  if (r.home && r.home !== "README.md") p.set("home", r.home);
  if (r.notes) p.set("notes", r.notes);
  if (r.template) p.set("template", r.template);
  if (r.attachments) p.set("attachments", r.attachments);
  return `${location.origin}${location.pathname}#/join?${p}`;
}

function joinRepo(params) {
  const owner = (params.get("owner") || "").trim();
  const repo = (params.get("repo") || "").trim();
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  const path = (name) => cleanDir(params.get(name));
  return {
    owner, repo,
    branch: (params.get("branch") || "").trim() || "main",
    folder: path("folder"),
    label: (params.get("label") || "").trim() || repo,
    vault: params.get("vault") === "1",
    inbox: path("inbox"), inboxes: path("inboxes"),
    home: path("home") || "README.md",
    notes: path("notes"), template: path("template"), attachments: path("attachments"),
  };
}

/** Adds a shared repo to this device (or finds it there) and returns it. */
function addRepo(r) {
  const same = app.repos.find((x) => x.owner.toLowerCase() === r.owner.toLowerCase() && x.repo.toLowerCase() === r.repo.toLowerCase());
  if (same) return same;
  let id = r.repo.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "repo";
  while (app.repos.some((x) => x.id === id)) id += "-2";
  const added = { id, ...r };
  app.repos = [...app.repos, added];
  store.set("repos", app.repos);
  renderRepoPicker();
  return added;
}

// ---- Vaults found on GitHub: repos with a .commonplace.json show up by themselves ----

const DISCOVER_EVERY = 60 * 60 * 1000;
let discovering = null;

/**
 * Looks through the repos this token can save to for a marker file and adds the vaults it finds, so
 * a member needs no invite link for each one. Cheap: one listing of the repos, then one GraphQL request
 * per 40 repos that are new or changed since the last look; at most once an hour unless `now`.
 * Resolves to the repos it added.
 */
function discoverVaults(now = false) {
  if (!app.token) return Promise.resolve([]);
  return (discovering ||= (async () => {
    const state = store.get("discovery") || {};
    if (!now && Date.now() - (state.at || 0) < DISCOVER_EVERY) return [];
    const seen = { ...(state.seen || {}) };
    const found = [];
    // A token sees its own owner's repos: look with every token this device has.
    for (const token of [app.token, ...Object.values(tokenMap())]) await lookWith(new GitHub(token), seen, state.removed || [], found);
    store.set("discovery", { ...(store.get("discovery") || {}), at: Date.now(), seen });
    return found.map(addRepo);
  })().finally(() => { discovering = null; }));
}

/** One token's look: the repos it can save to that are new or changed since the last look, read for a marker file. */
async function lookWith(client, seen, removed, found) {
  const known = [...app.repos, ...found].map(repoKey);
  const todo = reposToCheck(await client.listRepos(), { seen, known, removed });
  for (let i = 0; i < todo.length; i += 40) {
    const part = todo.slice(i, i + 40);
    const vars = {};
    const fields = part.map((x, j) => {
      vars[`o${j}`] = x.owner;
      vars[`n${j}`] = x.repo;
      return `r${j}: repository(owner: $o${j}, name: $n${j}) { object(expression: "HEAD:${MARKER}") { ... on Blob { text } } }`;
    });
    const args = part.map((_, j) => `$o${j}: String!, $n${j}: String!`).join(", ");
    const data = await client.graphql(`query(${args}) {\n${fields.join("\n")}\n}`, vars);
    part.forEach((x, j) => {
      seen[repoKey(x)] = x.pushed;
      const text = data[`r${j}`]?.object?.text;
      const r = text != null ? parseMarker(text, x.owner, x.repo) : null;
      if (r) found.push({ ...r, branch: r.branch || x.branch });
    });
  }
}

/**
 * Looks for new vaults (at once when `now`) and says which were added. Quiet when there's none. When
 * GitHub can't be reached it's quiet too, unless `loud`: then it says why and resolves to null.
 */
async function lookForVaults(now = false, loud = now) {
  try {
    const added = await discoverVaults(now);
    if (added.length) {
      toast(`Found on GitHub: ${added.map((r) => r.label).join(", ")}. ${added.length === 1 ? "It's" : "They're"} in the list of repos now.`, "ok", 6000);
    }
    return added;
  } catch (e) {
    if (!loud) return [];
    toast(e.message, "error");
    return null;
  }
}

/**
 * A repo's marker file as it is on GitHub: `at` is where it lives (the default branch, where GitHub's
 * GraphQL reads it from), `text` and `sha` are null when there's none yet. One GraphQL request, which
 * answers a missing file with null rather than a 404.
 */
async function readMarker(r) {
  if (isLocal(r)) {
    try {
      const { text, sha } = await gh.readText(r, MARKER);
      return { at: r, text, sha };
    } catch (e) {
      if (e.status === 404) return { at: r, text: null, sha: null };
      throw e;
    }
  }
  const data = await gh.graphql(`query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) {
    defaultBranchRef { name } object(expression: "HEAD:${MARKER}") { ... on Blob { text oid } } } }`, { owner: r.owner, name: r.repo });
  const info = data.repository;
  if (!info) throw new Error(`${r.owner}/${r.repo} wasn't found, or the token can't see it.`);
  const at = { owner: r.owner, repo: r.repo, branch: info.defaultBranchRef?.name || r.branch };
  return { at, text: info.object?.text ?? null, sha: info.object?.oid ?? null };
}

/** Saves the marker file to a repo, so everyone who can save to it gets it with these settings. */
async function shareRepoSettings(r) {
  if (!(await confirmDialog("Share these settings with everyone?",
    `This saves ${MARKER} in ${r.owner}/${r.repo} (one commit). Then everyone who can save to the repo gets it in ${APP_NAME} by themselves, with these settings, without an invite link.`,
    "Share"))) return;
  try {
    const m = await readMarker(r);
    await gh.writeText(m.at, MARKER, mergeMarker(m.text, { repo: r }), m.sha, `Share settings in ${MARKER} from ${APP_NAME}`);
    toast(`Shared. Everyone who can save to ${r.repo} gets it in ${APP_NAME} within the hour.`, "ok", 6000);
  } catch (e) {
    toast(e.message, "error");
  }
}

// ---- Task fields: a project's task setup, kept in its marker file ----

/** The editor for a repo's task setup; saving is one commit to its marker file. */
async function editTaskFields(r) {
  let m;
  let saved = null;
  try {
    m = await readMarker(r);
    if (m.text) saved = JSON.parse(m.text).tasks ?? null;
  } catch (e) {
    return toast(e instanceof SyntaxError ? `${MARKER} in ${r.repo} isn't valid JSON. Fix it on GitHub first.` : e.message, "error");
  }
  // A repo without a setup starts from a new project's fields, every one on.
  const setup = taskSetup(saved ?? {});
  const fields = setup.fields.map((f) => ({ ...f, values: f.values ? [...f.values] : undefined }));
  const list = h("div", { class: "task-fields" });
  const problem = h("p", { class: "task-problem", role: "alert" });
  const folder = h("input", { class: "input", value: setup.folder, spellcheck: "false", autocapitalize: "off", "aria-label": "Tasks folder" });
  const values = (f) => h("input", { class: "input", value: (f.values || []).join(", "), spellcheck: "false",
    placeholder: "Values, split by commas", "aria-label": `${f.label}: values`,
    oninput: (e) => { f.values = e.target.value.split(",").map((v) => v.trim()).filter(Boolean); } });
  const row = (f) => {
    const extra = [];
    if (f.custom) {
      extra.push(h("select", { class: "input", "aria-label": `${f.label}: kind`, onchange: (e) => { f.kind = e.target.value; render(); } },
        ...CUSTOM_KINDS.map((k) => h("option", { value: k, selected: k === f.kind }, k))));
    }
    if (f.kind === "choice") extra.push(values(f));
    if (f.kind === "sprint") {
      extra.push(h("input", { class: "input", value: f.folder, "aria-label": "Sprints folder", title: "The folder the sprint notes are in",
        oninput: (e) => { f.folder = e.target.value.trim().replace(/^\/+|\/+$/g, "") || "Sprints"; } }));
      extra.push(h("label", { class: "task-days" }, h("input", { class: "input", type: "number", min: "1", max: "90", value: String(f.length_days),
        "aria-label": "Sprint length in days", oninput: (e) => { f.length_days = Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 14)); } }), "days"));
    }
    if (f.kind === "tasks") {
      extra.push(h("small", { class: "muted" }, `Links to tasks; the other task shows “${relationFields().find((x) => x.key === f.key)?.reverse}”`));
    }
    if (f.kind === "number") {
      extra.push(h("select", { class: "input", "aria-label": "Estimate unit", onchange: (e) => { f.unit = e.target.value; } },
        ...ESTIMATE_UNITS.map((u) => h("option", { value: u, selected: u === f.unit }, u))));
    }
    return h("div", { class: `task-field${f.on ? "" : " off"}` },
      h("label", { class: "task-on" }, h("input", { type: "checkbox", checked: f.on, onchange: (e) => { f.on = e.target.checked; render(); } }),
        f.custom
          ? h("input", { class: "input", value: f.label, "aria-label": "Field name", oninput: (e) => { f.label = e.target.value.trim(); } })
          : h("span", {}, f.label)),
      h("input", { class: "input mono", value: f.prop, spellcheck: "false", autocapitalize: "off", "aria-label": `${f.label}: property`,
        title: "The property the field is kept in, in each task's front matter", oninput: (e) => { f.prop = e.target.value.trim(); } }),
      h("div", { class: "task-extra" }, ...extra),
      f.custom ? h("button", { class: "icon-btn", type: "button", title: "Remove this field", "aria-label": `Remove ${f.label}`,
        onclick: () => { fields.splice(fields.indexOf(f), 1); render(); } }, icon("trash")) : h("span"));
  };
  const render = () => fill(list,
    h("div", { class: "task-field head" }, h("span", {}, "Field"), h("span", {}, "Property"), h("span", {}, "Choices and options"), h("span")),
    ...fields.map(row));
  render();
  const addField = () => {
    let n = 1;
    while (fields.some((f) => f.prop === `field_${n}`)) n++;
    fields.push({ key: `field_${n}`, label: `Field ${n}`, kind: "text", on: true, prop: `field_${n}`, custom: true });
    render();
  };
  await modal({
    title: `Task fields: ${r.label || r.repo}`,
    wide: true,
    text: saved
      ? `Every task in ${r.owner}/${r.repo} gets these fields. They're kept in its ${MARKER}, so everyone on the project shares them.`
      : `${r.repo} has no task setup yet, so its tasks have status, priority, area, assignee and requested by. Saving keeps the fields ticked below in its ${MARKER}, for everyone on the project.`,
    body: [
      h("label", { class: "field" }, h("span", {}, "Tasks folder"), folder, h("small", {}, "The folder the tasks are in, inside the repo's folder.")),
      list,
      h("button", { class: "btn small", type: "button", onclick: addField }, icon("plus"), "Add a field"),
      problem,
    ],
    buttons: [
      { label: "Cancel", value: false },
      { spacer: true },
      canWrite(r) ? { label: "Save to the repo", kind: "primary", onclick: async () => {
        const next = { folder: folder.value.trim().replace(/^\/+|\/+$/g, "") || "Tasks", fields: fields.map((f) => ({ ...f, key: f.custom ? f.prop : f.key })) };
        const wrong = next.fields.find((f) => f.custom && !f.label) ? "Every field of your own needs a name." : taskSetupProblem(next);
        if (wrong) { problem.textContent = wrong; return false; }
        problem.textContent = "";
        try {
          const latest = await readMarker(r);
          const text = mergeMarker(latest.text, { repo: latest.text || isLocal(r) ? null : r, tasks: taskSetupJson(next) });
          await gh.writeText(latest.at, MARKER, text, latest.sha, `Set up task fields in ${MARKER} from ${APP_NAME}`);
          useTaskSetup(r, taskSetup(taskSetupJson(next)));
          toast(`Task fields saved in ${r.repo || r.label}.`, "ok");
          return true;
        } catch (e) {
          problem.textContent = e.message;
          return false;
        }
      } } : null,
    ].filter(Boolean),
  });
}

/** Someone opened an invite link. */
async function join(params) {
  const r = joinRepo(params);
  if (!r) return showProblem("This invite link is broken", "It doesn't say which repo to open. Ask for a new link.");
  if (!app.token) {
    store.set("join", r);
    return showWelcome(r);
  }
  // A device already connected: its token may be for another owner. Then it needs one for this owner too.
  if (!ownerTokens()[r.owner.toLowerCase()]) {
    showMain(skeleton());
    try { await gh.repo(r); } catch (e) {
      if ([401, 403, 404].includes(e.status)) return showOwnerToken(r);
    }
  }
  redirect(hrefFor(addRepo(r)));
}

/**
 * This device's token can't open the repo an invite link (or a repo in the list) is for: a fine-grained
 * token opens one owner's repos. This page adds a token for that owner, with GitHub's form filled in.
 */
function showOwnerToken(r) {
  closeFile();
  app.pageTitle = "";
  renderHeader();
  const input = h("input", { class: "input", type: "password", placeholder: "github_pat_…", autocomplete: "off", spellcheck: "false" });
  const out = h("ul", { class: "checks" });
  const go = async () => {
    if (!input.value.trim()) return input.focus();
    if (!(await saveOwnerToken(r.owner, input.value.trim(), out, r))) return;
    redirect(hrefFor(addRepo(r)));
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  showMain(h("div", { class: "welcome" },
    h("h1", {}, `A token for ${r.owner}`),
    h("p", { class: "lead" }, "This device's token can't open ", h("b", {}, `${r.owner}/${r.repo}`),
      `. A token opens one owner's repos, so add one for ${r.owner}: this device keeps both, and each repo uses its owner's.`),
    h("div", { class: "card" },
      h("h2", {}, icon("key"), `Add a token for ${r.owner}`),
      guestSteps(r),
      h("div", { class: "inline-form" }, input, h("button", { class: "btn primary", onclick: go }, "Save token")),
      out,
      h("p", { class: "fine" }, TOKEN_NOTE, " ", h("a", { href: "#/settings" }, "Settings"), " lists this device's tokens."))));
}

function guestSteps(r) {
  const tokenUrl = newTokenUrl({ owner: r.owner, name: `${APP_NAME} - ${r.repo}` });
  return h("ol", { class: "steps" },
    h("li", {}, h("span", {}, "If you were invited on GitHub, accept the invitation first. It came by email; you can also open ",
      h("a", { href: `https://github.com/${r.owner}/${r.repo}/invitations`, target: "_blank", rel: "noopener" }, "the repo's invitation"), " or ",
      h("a", { href: `https://github.com/orgs/${r.owner}/invitation`, target: "_blank", rel: "noopener" }, "the organization's invitation"),
      " while signed in to GitHub.")),
    h("li", {}, h("span", {}, "Open ", h("a", { href: tokenUrl, target: "_blank", rel: "noopener" }, "GitHub › New fine-grained token"),
      ": it sets ", h("b", {}, "Resource owner"), " to ", h("b", {}, r.owner), " for you. Under ", h("b", {}, "Repository access"),
      ", choose ", h("b", {}, "Only select repositories"), " › ", h("b", {}, r.repo), ".")),
    h("li", {}, h("span", {}, "The link has filled in the rest: the name, ", h("b", {}, "Contents"), " set to ", h("b", {}, "Read and write"),
      ", and a year. If you were only asked to read, set ", h("b", {}, "Contents"), " to ", h("b", {}, "Read-only"), ".")),
    h("li", {}, h("span", {}, "Click ", h("b", {}, "Generate token"), " (for an organization it may say ", h("b", {}, "Generate token and request access"),
      "), copy the token, and paste it here. If ", r.owner, " has to approve tokens, it starts working once they do; until then the app says it can't find the notes.")));
}

function showWelcome(joining = null) {
  closeFile();
  document.body.classList.add("no-token");
  app.pageTitle = "";
  renderHeader();
  const input = h("input", { class: "input", type: "password", placeholder: "github_pat_…", autocomplete: "off", spellcheck: "false" });
  const out = h("ul", { class: "checks" });
  const go = async () => {
    if (!input.value.trim()) return input.focus();
    if (!(await connect(input.value.trim(), out))) return;
    // The welcome page takes no place in the history: Back must not lead to it once connected.
    // A new device without an invite has no repos yet: the next step is adding one.
    if (!joining) {
      await lookForVaults(true, false);
      return void redirect(app.repos.length ? "#/" : "#/settings?add=1");
    }
    const r = addRepo(joining);
    store.remove("join");
    redirect(hrefFor(r));
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  showMain(h("div", { class: "welcome" },
    h("img", { class: "logo", src: "icons/icon.svg", alt: "" }),
    h("h1", {}, APP_NAME),
    joining
      ? h("p", { class: "lead" }, "You're invited to the notes in ", h("b", {}, joining.label), ` (${joining.owner}/${joining.repo}). They live on GitHub, and this page reads them from there.`)
      : h("p", { class: "lead" }, "Your Markdown and CSV notes, kept in your own GitHub repo and opened on any device. Every save is a commit, so nothing is ever lost."),
    h("div", { class: "card" },
      h("h2", {}, icon("key"), "Connect this device"),
      h("p", {}, joining
        ? "You need a GitHub account and a token that lets this page open the shared notes. You make the token once per device."
        : "You need a GitHub repo for your notes (a private one is fine) and a token that can read and write it. You make the token once per device; after that you add the repo in Settings."),
      joining ? guestSteps(joining) : tokenSteps(),
      h("div", { class: "inline-form" }, input, h("button", { class: "btn primary", onclick: go }, "Connect")),
      out,
      h("p", { class: "fine" }, TOKEN_NOTE)),
    joining ? null : h("div", { class: "card" },
      h("h2", {}, icon("device"), "Or keep notes only on this device"),
      h("p", {}, "No GitHub needed: the notes stay in a folder on this device (Chrome and Edge on a computer, Brave once it's turned on) or in this browser. They're not on your other devices, and you can connect GitHub later."),
      h("button", { class: "btn", onclick: async () => {
        const r = await addLocalVault();
        if (r) redirect(hrefFor(r));
      } }, icon("plus"), "Add a vault on this device"))));
}

// ================================================================
// Local vaults: notes only on this device (src/local.js)
// ================================================================

/**
 * The line under the toolbar: a local vault is only here (and, kept in the browser, how to keep a copy); a GitHub
 * vault opened from its copy says so, and a copy in a folder that waits for the browser's OK asks for it.
 */
function renderLocalNote() {
  const el = $("#local-note");
  const r = app.repo;
  const tree = r && app.trees.get(r.id);
  const copy = r && !isLocal(r) ? mirror.info(r) : null;
  const here = app.file && app.file.repo === r ? copyStatus(r, app.file.path) : "";
  const waits = copy ? [...mirror.changedPaths(r)].map((p) => mirror.status(r, p)) : [];
  const count = (st) => waits.filter((w) => w === st).length;
  const kind = isLocal(r) ? "local" : copy?.needsAllow ? "allow" : here === "conflict" || here === "gone" ? here
    : tree?.offline ? `offline:${tree.syncedAt}:${count("waiting")}` : count("conflict") || count("gone") ? `trouble:${count("conflict")}:${count("gone")}`
      : count("waiting") ? `waiting:${count("waiting")}` : "";
  el.hidden = !kind;
  const key = `${r?.id}|${app.file?.path}|${kind}`;
  if (!kind || el.dataset.key === key) return;
  el.dataset.key = key;
  const upload = async () => {
    const { uploaded, waiting } = await mirror.flush(r);
    if (uploaded) toast(`Uploaded ${uploaded} ${uploaded === 1 ? "save" : "saves"} to GitHub.`, "ok");
    else if (waiting) toast("Not uploaded: GitHub can't be reached yet, or it refused. They keep waiting here.", "error");
  };
  if (kind === "conflict") {
    return fill(el, h("span", {}, icon("warning"), h("span", {}, h("b", {}, "Changed on GitHub too: "),
      "this note was saved here while it changed on GitHub. Compare them and pick, or merge.")),
    h("button", { class: "btn small", onclick: () => resolveConflict(app.file) }, icon("columns"), "Compare"));
  }
  if (kind === "gone") {
    return fill(el, h("span", {}, icon("warning"), h("span", {}, h("b", {}, "Deleted on GitHub: "),
      "this note was deleted or moved on GitHub while your save waited here.")),
    h("button", { class: "btn small", onclick: async () => {
      await mirror.recreate(r, fullPath(r, app.file.path));
      toast(copyStatus(r, app.file.path) ? "Not saved yet: GitHub can't be reached, or it refused." : "Saved to GitHub as a new note.", copyStatus(r, app.file.path) ? "error" : "ok");
    } }, icon("upload"), "Save it as a new note"));
  }
  if (kind.startsWith("trouble:")) {
    const first = [...mirror.changedPaths(r)].find((p) => ["conflict", "gone"].includes(mirror.status(r, p)));
    const rel = first && r.folder ? first.slice(r.folder.replace(/\/+$/, "").length + 1) : first;
    return fill(el, h("span", {}, icon("warning"), h("span", {}, h("b", {}, `${count("conflict") + count("gone")} saved here `),
      "couldn't go to GitHub: their notes changed or were deleted there meanwhile.")),
    rel ? h("a", { class: "btn small", href: hrefFor(r, rel) }, icon("file"), `Open ${shownName(rel)}`) : null);
  }
  if (kind.startsWith("waiting:")) {
    return fill(el, h("span", {}, icon("upload"), h("span", {}, h("b", {}, `${count("waiting")} ${count("waiting") === 1 ? "save" : "saves"} waiting `),
      "to upload to GitHub. They're only on this device until then.")),
    h("button", { class: "btn small", onclick: upload }, icon("upload"), "Upload now"));
  }
  if (kind === "allow") {
    return fill(el, h("span", {}, icon("folder"), h("span", {}, "This vault's copy is in the folder ", h("b", {}, copy.needsAllow),
      ". The browser asks for your OK each time it's opened.")),
    h("button", { class: "btn small", onclick: async () => {
      if (!(await mirror.allow(r))) return toast("The browser didn't allow the folder.", "error");
      app.trees.delete(r.id);
      el.dataset.key = "";
      app.repo = null;
      route();
    } }, icon("folder"), "Allow the folder"));
  }
  if (kind !== "local") {
    const when = tree.syncedAt ? new Date(tree.syncedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
    const n = count("waiting");
    return fill(el, h("span", {}, icon("device"), h("span", {}, h("b", {}, "Offline:"),
      ` showing the copy on this device${when ? ` from ${when}` : ""}. Saves wait here and go to GitHub when the connection is back`,
      n ? ` (${n} waiting).` : ".")),
    h("button", { class: "btn small", onclick: async () => { await upload(); reloadFromGitHub(); } }, icon("reload"), "Try again"));
  }
  const browser = r.local === "browser";
  fill(el, h("span", {}, icon("device"), h("span", {}, h("b", {}, "Only on this device:"), " not on GitHub, not on your other devices.",
    browser ? " Kept in this browser, so it's lost if the browser's data is cleared." : "")),
  browser ? h("button", { class: "btn small", onclick: () => downloadCopy(r) }, icon("download"), "Download a copy") : null);
}

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** A GitHub repo's copy on this device, on its card in Settings: where it's kept, and a folder instead of the browser. */
function copyField(r) {
  const text = h("small", {}, "…");
  const actions = h("div", { class: "card-actions" });
  const changed = () => { app.trees.delete(r.id); if (app.repo?.id === r.id) app.repo = null; showSettings(); };
  (async () => {
    const { folder, clone } = await mirror.place(r);
    if (folder) {
      fill(text, `Kept in the folder ${folder}: its files are the notes, so other tools and agents read them too. Each commit updates them; a file changed there by another tool shows as Not on GitHub and is never overwritten.`,
        clone ? h("span", {}, " It's a git clone: pull with ", h("code", {}, "git pull --rebase --autostash"),
          ", since the app's commits reach it as changed files until it pulls (a plain git pull can stop).") : null);
      fill(actions,
        canPickFolder() ? h("button", { class: "btn small", type: "button", onclick: async () => {
          const handle = await pickCopyFolder(r);
          if (handle) { await mirror.useFolder(r, handle); toast(`The copy is kept in ${handle.name} now.`, "ok"); changed(); }
        } }, icon("folder"), "Pick another folder") : null,
        h("button", { class: "btn small", type: "button", onclick: async () => {
          await mirror.useBrowser(r);
          toast(`The copy is kept in this browser now. ${folder} and its files stay on the disk.`, "ok", 6000);
          changed();
        } }, icon("device"), "Keep it in this browser instead"));
    } else {
      fill(text, "Kept in this browser, so the vault opens with no connection. ",
        canPickFolder() ? "It can be a folder on the disk instead, like the repo's clone: other tools and agents then read the same files, and each commit updates them."
          : isBrave() ? noFolderText("it stays in this browser. Once it's on, it can be a folder on the disk instead, like the repo's clone.") : null);
      fill(actions, canPickFolder() ? h("button", { class: "btn small", type: "button", onclick: async () => {
        const handle = await pickCopyFolder(r);
        if (handle) { await mirror.useFolder(r, handle); toast(`The copy is kept in ${handle.name} now.`, "ok"); changed(); }
      } }, icon("folder"), "Keep it in a folder") : null);
    }
  })();
  return h("div", { class: "field full copy-field" }, h("span", {}, "Copy on this device"), text, actions);
}

/**
 * The folder for a repo's copy: the repo's top folder (a clone, with .git) or an empty one. The vault's own folder
 * inside a clone (e.g. its Wiki) is refused, since the copy keeps the repo's paths.
 */
async function pickCopyFolder(r) {
  const handle = await pickFolder();
  if (!handle || !r.folder) return handle;
  let clone = false;
  try { await handle.getDirectoryHandle(".git"); clone = true; } catch { /* not a clone */ }
  if (!clone && handle.name.toLowerCase() === baseName(r.folder.replace(/\/+$/, "")).toLowerCase()) {
    toast(`That looks like the ${r.folder} folder itself. Pick the folder above it (the repo's own, with .git in it), or an empty folder.`, "error", 9000);
    return null;
  }
  return handle;
}

/** Every file of a local vault as one zip, downloaded: the way to keep a copy of a vault kept in the browser. */
async function downloadCopy(r) {
  try {
    const url = URL.createObjectURL(new Blob([await local.zip(r)], { type: "application/zip" }));
    const a = h("a", { href: url, download: `${r.label.replace(/[\\/:*?"<>|]+/g, "-")} ${isoDate()}.zip`, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    toast(e.message, "error");
  }
}

/** Brave's own switch for opening folders, which it turns off by default. */
const BRAVE_FLAG = "brave://flags/#file-system-access-api";

/**
 * Why a folder can't be opened here, then `rest`: in Brave, how to turn it on (Brave keeps it off by default);
 * in other browsers, which ones can.
 */
const noFolderText = (rest) => (isBrave()
  ? h("span", {}, "Brave turns off opening folders by default. To turn it on, open ", h("code", {}, BRAVE_FLAG),
    " (copy it into the address bar), set it to ", h("b", {}, "Enabled"), " and restart Brave. Until then, ", rest)
  : h("span", {}, "This browser doesn't let pages open a folder on the disk (Chrome, Edge and Brave on a computer do), so ", rest));

/** Chrome's and Edge's folder picker; null when it's closed or refused. */
async function pickFolder() {
  try {
    return await showDirectoryPicker({ id: "commonplace-local", mode: "readwrite" });
  } catch (e) {
    if (e?.name !== "AbortError") toast(e?.message || "The browser refused that folder.", "error");
    return null;
  }
}

/** A local vault that can't open yet: its folder needs the browser's OK again, or picking again. */
function showLocalProblem(repo, e) {
  closeFile();
  app.pageTitle = repo.label;
  renderHeader();
  const retry = () => { app.trees.delete(repo.id); route(); };
  if (e.need === "permission") {
    return showMain(emptyState("folder", `Open ${repo.label}`,
      `${e.message} Press Allow the folder, then Allow (or Allow on every visit, if the browser offers it).`,
      h("button", { class: "btn primary", onclick: async () => {
        if (await local.allow(repo)) retry();
        else toast("The browser didn't allow the folder.", "error");
      } }, icon("folder"), "Allow the folder")));
  }
  if (e.need === "folder") {
    return showMain(emptyState("folder", `Pick ${repo.label}'s folder`, e.message,
      canPickFolder() ? h("button", { class: "btn primary", onclick: async () => {
        const handle = await pickFolder();
        if (handle) { await local.create(repo, { handle }); retry(); }
      } }, icon("folder"), "Pick the folder") : null));
  }
  showProblem(`Couldn't open ${repo.label}`, e.message, e);
}

/**
 * Adds a vault on this device, as other Markdown apps do: **Create a new vault** (a name, a location the person picks, where
 * a new folder of that name is made, and what it starts with) or **Open a folder as a vault** (any folder of notes,
 * opened as it is). Where the browser can't open folders (Firefox, Safari, phones) only a new vault kept in the
 * browser is offered, and the dialog says why. Resolves to the new repo, or null.
 */
async function addLocalVault() {
  const folderOk = canPickFolder();
  let location = null; // where a new vault's folder is made
  let opened = null; // the folder opened as a vault
  const name = h("input", { class: "input", value: "My notes", spellcheck: "false", autocomplete: "off", "aria-label": "Name" });
  let named = false;
  name.addEventListener("input", () => { named = true; sync(); });
  const choice = (group, value, label, hint, checked = false) => h("label", { class: "check-line" },
    h("input", { type: "radio", name: group, value, checked }),
    h("span", {}, h("b", {}, label), hint ? [h("br"), h("small", { class: "muted" }, hint)] : null));
  const picked = (handle, none) => (handle ? h("span", {}, icon("folder"), " ", h("b", {}, handle.name)) : h("span", { class: "muted" }, none));
  const where = h("small", { class: "hint" });
  const locationText = h("span", { class: "picked" });
  const openedText = h("span", { class: "picked" });
  const mode = h("div", { class: "choices" },
    choice("local-mode", "create", "Create a new vault", "A new folder for it, in a place you pick.", true),
    choice("local-mode", "open", "Open a folder as a vault", "A folder that already holds notes, like another app's vault or a repo's clone. It opens as it is."));
  const keep = h("div", { class: "choices" },
    choice("local-keep", "folder", "In a folder on this device", "Real .md files your agent and other tools can read and change.", true),
    choice("local-keep", "browser", "In this browser", "No folder: lost if the browser's data is cleared, so download a copy now and then."));
  const start = h("div", { class: "choices" },
    choice("local-start", "empty", "Empty", "One note to start from.", true),
    choice("local-start", "example", "An example vault", "Try a set of notes you can edit and keep. Needs the connection this once."));
  const examplePicker = h("select", { class: "input", "aria-label": "Example vault" },
    EXAMPLE_VAULTS.map((example) => h("option", { value: example.key }, example.label)));
  const selectedExample = () => EXAMPLE_VAULTS.find((example) => example.key === examplePicker.value);
  const pickLocation = h("button", { class: "btn small", type: "button", onclick: async () => {
    const handle = await pickFolder();
    if (handle) { location = handle; sync(); }
  } }, icon("folder"), "Pick a location");
  const pickOpened = h("button", { class: "btn small", type: "button", onclick: async () => {
    const handle = await pickFolder();
    if (!handle) return;
    opened = handle;
    if (!named) name.value = handle.name;
    sync();
  } }, icon("folder"), "Pick the folder");
  const value = (group) => (group.querySelector("input:checked") || {}).value;
  const locationField = h("div", { class: "field" }, h("span", {}, "Location"), h("div", { class: "pick-line" }, pickLocation, locationText), where);
  const openedField = h("div", { class: "field" }, h("span", {}, "Folder"), h("div", { class: "pick-line" }, pickOpened, openedText),
    h("small", { class: "hint" }, "Nothing is added to it. An empty folder starts with no notes."));
  const keepField = h("div", { class: "field" }, h("span", {}, "Where it's kept"), keep);
  const startField = h("div", { class: "field" }, h("span", {}, "Start with"), start, examplePicker);
  const fine = h("p", { class: "fine" }, folderOk
    ? "The browser shows the app only the folder's name, not its whole path on the disk."
    : noFolderText("a new vault is kept in the browser. It's lost if the browser's data is cleared, so download a copy now and then (Settings, Download a copy)."));
  const problem = h("p", { class: "fine bad" });
  function sync() {
    const opening = folderOk && value(mode) === "open";
    const inFolder = folderOk && !opening && value(keep) === "folder";
    keepField.hidden = !folderOk || opening;
    locationField.hidden = !inFolder;
    openedField.hidden = !opening;
    startField.hidden = opening;
    examplePicker.hidden = value(start) !== "example";
    if (!opening && !named) name.value = examplePicker.hidden ? "My notes" : selectedExample().name;
    fill(locationText, picked(location, "No location picked yet"));
    fill(openedText, picked(opened, "No folder picked yet"));
    fill(where, location ? `The vault is made as a new folder, ${cleanName(name.value) || "My notes"}, inside ${location.name}.` : "The vault is made as a new folder with its name, inside the location you pick.");
    problem.textContent = "";
  }
  // A name typed while creating doesn't stick to a folder opened afterwards: the folder names it, unless typed again.
  mode.addEventListener("change", () => { named = false; sync(); });
  keep.addEventListener("change", sync);
  start.addEventListener("change", sync);
  examplePicker.addEventListener("change", sync);
  sync();
  return modal({
    title: "Add a vault on this device",
    text: "Its notes stay only on this device: not on GitHub, not on your other devices. Save keeps them here, and nothing is sent anywhere.",
    body: [folderOk ? h("div", { class: "field" }, h("span", {}, "What"), mode) : null,
      h("label", { class: "field" }, h("span", {}, "Name"), name), keepField, locationField, openedField, startField, fine, problem],
    buttons: [
      { label: "Cancel", value: null },
      { label: "Add vault", kind: "primary", onclick: async () => {
        const opening = folderOk && value(mode) === "open";
        const kind = opening || (folderOk && value(keep) === "folder") ? "folder" : "browser";
        const label = name.value.trim() || opened?.name || "My notes";
        const example = !opening && value(start) === "example" ? selectedExample() : null;
        const place = location;
        const folderName = !opening && kind === "folder" ? cleanName(label) : "";
        if (!opening && kind === "folder" && (!place || !folderName)) {
          problem.textContent = place ? "The name needs letters or numbers, to name its folder." : "Pick a location first: the vault's folder is made inside it.";
          return false;
        }
        let starter;
        if (example) {
          problem.textContent = "Getting the example notes…";
          try { starter = await fetchExample(example); }
          catch (e) { problem.textContent = e.message; return false; }
        }
        let handle = null;
        if (opening) {
          if (!opened) { problem.textContent = "Pick the vault's folder first."; return false; }
          handle = opened;
        } else if (kind === "folder") {
          try {
            let there = null;
            try { there = await place.getDirectoryHandle(folderName); } catch { /* not there yet: made below */ }
            if (there) {
              for await (const [entry] of there.entries()) {
                if (!entry.startsWith(".") || starter?.files.some((file) => file.path.split("/")[0] === entry)) {
                  problem.textContent = `${place.name} already has a folder ${folderName} with files in it. Open it instead (Open a folder as a vault), or pick another name.`;
                  return false;
                }
              }
            }
            handle = there || await place.getDirectoryHandle(folderName, { create: true });
          } catch (e) {
            problem.textContent = `The folder couldn't be made in ${location.name}: ${e?.message || e}`;
            return false;
          }
        }
        problem.textContent = "Setting it up…";
        try {
          const seed = opening ? [] : starter?.files ?? emptyVault(label, kind);
          let id = `local-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "vault"}`;
          while (app.repos.some((x) => x.id === id)) id += "-2";
          const r = {
            id, local: kind, owner: "", repo: "", branch: "", folder: "",
            home: "Home.md", inbox: "", inboxes: "", notes: "", template: "", vault: false, ...starter?.settings, label,
          };
          const seeded = await local.create(r, { handle, seed });
          if (opening || !seeded) Object.assign(r, { home: "", inbox: "", inboxes: "", notes: "", template: "", vault: false });
          app.repos.push(r);
          store.set("repos", app.repos);
          renderRepoPicker();
          return r;
        } catch (e) {
          problem.textContent = e.message;
          return false;
        }
      } },
    ],
  });
}

/** A vault's name as a folder's name: without the characters folders can't have on Windows and elsewhere. */
const cleanName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "");

/** Removes a local vault from the list, at once: a browser vault's notes are deleted, a folder's stay on the disk. */
async function removeLocalVault(r) {
  const ok = await confirmDialog(`Remove ${r.label}?`, r.local === "folder"
    ? "The app forgets it. The folder and its notes stay on the disk, so you can add it again."
    : "Its notes are deleted from this browser and can't be brought back. Download a copy first to keep them.", "Remove", true);
  if (!ok) return;
  try { await local.remove(r); } catch (e) { toast(e.message, "error"); }
  app.repos = app.repos.filter((x) => x.id !== r.id);
  store.set("repos", app.repos);
  app.trees.delete(r.id);
  if (app.repo?.id === r.id) app.repo = null;
  renderRepoPicker();
  showSettings();
}

/** Opened straight from a link (or after Settings), the sidebar still shows the last repo's files. */
async function ensureSidebar() {
  if (app.repo) return;
  const repo = app.repos.find((r) => r.id === store.get("lastRepo")) || app.repos[0];
  if (!repo || !usable(repo)) return;
  app.repo = repo;
  renderRepoPicker();
  try {
    await loadTree(repo);
    if (app.repo === repo) { renderTree(); renderShortcuts(); }
  } catch { /* Settings shows what's wrong when access is checked */ }
}

function showSettings(adding = false, tokenOwner = "") {
  closeFile();
  app.pageTitle = "Settings";
  renderHeader();
  ensureSidebar();
  const user = store.get("user");

  // ---- GitHub ----
  const tokenInput = h("input", { class: "input", type: "password", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_…", value: app.token });
  const reveal = h("button", { class: "icon-btn", title: "Show the token", "aria-label": "Show the token", onclick: () => {
    tokenInput.type = tokenInput.type === "password" ? "text" : "password";
  } }, icon("eye"));
  const out = h("ul", { class: "checks" });
  const checkAccess = async () => {
    fill(out, h("li", {}, icon("spinner"), "Checking…"));
    const items = [];
    try {
      const u = await gh.user();
      items.push(h("li", { class: "ok" }, icon("success"), `The token works for ${u.login}`));
    } catch (e) {
      items.push(h("li", { class: "bad" }, icon("failure"), e.message));
    }
    for (const [owner, t] of Object.entries(ownerTokens())) {
      try {
        const u = await new GitHub(t.token).user();
        items.push(h("li", { class: "ok" }, icon("success"), `The token for ${owner} works for ${u.login}`));
      } catch (e) {
        items.push(h("li", { class: "bad" }, icon("failure"), `The token for ${owner}: ${e.message}`));
      }
    }
    for (const r of app.repos) {
      try {
        const info = await gh.repo(r);
        await gh.branch(r);
        const canWrite = info.permissions ? info.permissions.push : true;
        items.push(h("li", { class: canWrite ? "ok" : "bad" }, icon(canWrite ? "success" : "failure"),
          `${r.label} (${r.owner}/${r.repo}, ${r.branch}): ${canWrite ? "can read and save" : "read only, so saving will fail"}`));
      } catch (e) {
        items.push(h("li", { class: "bad" }, icon("failure"),
          `${r.label} (${r.owner}/${r.repo}, ${r.branch}): ${e.status === 404 ? "not found, or the token can't see it" : e.message}`));
      }
    }
    fill(out, ...items);
  };
  const github = h("section", { class: "card" },
    h("h2", {}, icon("key"), "GitHub"),
    h("p", {}, user ? `Connected as ${user.login}.` : "Not connected."),
    h("div", { class: "inline-form" }, tokenInput, reveal,
      h("button", { class: "btn primary", onclick: async () => {
        const t = tokenInput.value.trim();
        if (!t) return tokenInput.focus();
        if (await connect(t, out)) { toast("Token saved on this device", "ok"); showSettings(); }
      } }, "Save token")),
    h("div", { class: "card-actions" },
      h("button", { class: "btn", onclick: checkAccess }, icon("success"), "Check access"),
      h("button", { class: "btn danger", onclick: async () => {
        if (!(await confirmDialog("Disconnect this device?", "Its tokens are removed from this browser. Unsaved drafts stay.", "Disconnect", true))) return;
        app.token = "";
        store.remove("token");
        store.remove("tokens");
        store.remove("user");
        gh = client("");
        app.trees.clear();
        app.repo = null;
        renderWho();
        location.hash = "#/";
        route();
      } }, "Disconnect")),
    out,
    h("details", { class: "fine" }, h("summary", {}, "How to make a new token"), tokenSteps()),
    h("p", { class: "fine" }, TOKEN_NOTE));

  // ---- tokens for other owners ----
  const others = ownerTokens();
  const ownerInput = h("input", { class: "input", list: "repo-owners", autocomplete: "off", spellcheck: "false", autocapitalize: "off",
    placeholder: "The owner: your-name or your-organization", value: tokenOwner, "aria-label": "Owner" });
  const repoOwners = [...new Set(app.repos.filter((r) => !isLocal(r)).map((r) => r.owner))].filter((o) => o && !others[o.toLowerCase()]);
  const makeLink = h("a", { class: "btn", target: "_blank", rel: "noopener" }, icon("key"), "Make it on GitHub");
  const syncLink = () => {
    const o = ownerInput.value.trim();
    makeLink.href = newTokenUrl({ owner: o, name: `${APP_NAME} - ${o || "notes"}` });
    makeLink.title = o ? `GitHub's new token page, filled in for ${o}` : "GitHub's new token page";
  };
  ownerInput.addEventListener("input", syncLink);
  syncLink();
  const ownerTokenInput = h("input", { class: "input", type: "password", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_…",
    "aria-label": "The token for that owner" });
  const ownerOut = h("ul", { class: "checks" });
  const saveOther = async () => {
    const o = ownerInput.value.trim();
    if (!o) return ownerInput.focus();
    if (!ownerTokenInput.value.trim()) return ownerTokenInput.focus();
    const check = app.repos.find((r) => !isLocal(r) && r.owner.toLowerCase() === o.toLowerCase()) || null;
    if (await saveOwnerToken(o, ownerTokenInput.value.trim(), ownerOut, check)) { toast(`Token for ${o} saved on this device`, "ok"); showSettings(); }
  };
  ownerTokenInput.addEventListener("keydown", (e) => { if (e.key === "Enter") saveOther(); });
  const ownersCard = h("section", { class: "card", id: "owner-tokens" },
    h("h2", {}, icon("key"), "Tokens for other owners"),
    h("p", {}, "A token opens one owner's repos. To open another owner's too, say your own account beside an organization, add a token for it: each repo then uses its owner's token, and the token above opens the rest."),
    Object.keys(others).length
      ? h("ul", { class: "checks owner-tokens" }, Object.entries(others).map(([o, t]) => h("li", {}, icon("key"),
        h("span", {}, h("b", {}, o), t.login ? h("small", { class: "muted" }, ` · made by ${t.login}`) : null),
        h("button", { class: "btn small danger", type: "button", onclick: async () => {
          if (!(await confirmDialog(`Remove the token for ${o}?`, `${o}'s repos go back to the main token, which may not open them.`, "Remove", true))) return;
          removeOwnerToken(o);
          showSettings();
        } }, "Remove"))))
      : null,
    h("h3", { class: "owner-tokens-add" }, "Add a token for an owner"),
    h("ol", { class: "steps" },
      h("li", {}, h("span", {}, "Type the owner, as in github.com/owner/repo.")),
      h("li", {}, h("span", {}, "Press ", h("b", {}, "Make it on GitHub"), ": the owner, ", h("b", {}, "Contents"), " (read and write) and a year are filled in. Pick the repos under ",
        h("b", {}, "Only select repositories"), ", and press ", h("b", {}, "Generate token"), ".")),
      h("li", {}, h("span", {}, "Paste it here and press ", h("b", {}, "Save"), "."))),
    h("div", { class: "inline-form" }, ownerInput, makeLink),
    h("datalist", { id: "repo-owners" }, repoOwners.map((o) => h("option", { value: o }))),
    h("div", { class: "inline-form" }, ownerTokenInput, h("button", { class: "btn primary", type: "button", onclick: saveOther }, "Save")),
    ownerOut);

  // ---- repos ----
  const forms = h("div", {});
  const field = (label, name, value, hint, full) => h("label", { class: `field${full ? " full" : ""}` }, h("span", {}, label),
    h("input", { class: "input", name, value: value ?? "", spellcheck: "false", autocapitalize: "off", autocomplete: "off" }),
    hint ? h("small", {}, hint) : null);
  const repoCard = (r, open = false) => {
    const loc = isLocal(r);
    const whereText = h("span", { class: "repo-where" }, loc ? `On this device · ${r.local === "folder" ? "a folder" : "in this browser"}`
      : r.repo ? `${r.owner}/${r.repo} · ${r.branch}${r.folder ? ` · ${r.folder}/` : ""}` : "Fill in the fields below");
    if (r.local === "folder") local.folderName(r).then((n) => { if (n) whereText.textContent = `On this device · the folder ${n}`; });
    return h("details", { class: "repo-card", "data-id": r.id || "", "data-local": r.local || null, open },
    h("summary", {}, icon(loc ? "device" : r.vault ? "home" : "folder"),
      h("span", {}, h("span", { class: "repo-name" }, r.label || "New repo"), h("br"), whereText),
      icon("chevron", "chev")),
    h("div", { class: "repo-fields" },
      loc ? h("p", { class: "full fine local-about" }, r.local === "folder"
        ? "Only on this device: not on GitHub, not on your other devices. The notes are the files in the folder you picked: your agent and other tools can read and change them, and Reload shows their changes. Each time the browser is opened again, it asks once before it lets the app into the folder."
        : "Only on this device, kept in this browser: not on GitHub, not on your other devices. It's lost if the browser's data is cleared (clearing the site's data, some private windows, or the browser making room), so download a copy now and then.") : null,
      field("Name shown", "label", r.label, loc ? "What the vault is called in the list at the top of the files." : "What the repo is called in the list at the top of the files. Empty: owner/repo.", true),
      loc ? null : [
        field("Owner", "owner", r.owner, "The GitHub user or organization the repo belongs to, as in github.com/owner/repo."),
        field("Repo", "repo", r.repo, "The repo's name, as in github.com/owner/repo."),
        field("Branch", "branch", r.branch, "The branch to read and save to. Empty: main."),
        field("Folder", "folder", r.folder, "Show only this folder of the repo, e.g. notes. Empty: the whole repo. The paths below are inside it."),
      ],
      !loc && r.repo && r.id ? copyField(r) : null,
      field("Start page", "home", r.home, "The note that opens first, e.g. Home.md."),
      field("Inbox page", "inbox", r.inbox, "A note for quick notes and tasks, e.g. Notes/Inbox.md. It gets an Inbox button. Empty: no button."),
      field("Inboxes folder", "inboxes", r.inboxes, "A folder with one inbox per person, e.g. Notes/Inboxes. The Inbox button opens the note whose github property is your GitHub login."),
      field("New notes folder", "notes", r.notes, "e.g. Notes. New note then asks only for a title and puts the note here. Empty: you pick the folder and kind each time."),
      field("Note template", "template", r.template, "A note new notes start from, e.g. Templates/Note.md; {{title}} and {{date}} are filled in. Empty: a new note starts with its title."),
      field("Attachments folder", "attachments", r.attachments, "Where added images go inside this vault, e.g. Attachments. Empty: next to the note."),
      h("label", { class: "check-line full" }, h("input", { type: "checkbox", name: "vault", checked: !!r.vault }),
        h("span", {}, "Vault rules: the generated navigation box (between %% nav: … %% and %% /nav %%) is folded and can't be edited, and links that lead to no page are warned about")),
      h("div", { class: "full card-actions" },
        loc ? h("button", { class: "btn small", type: "button", title: "Every file of this vault in one zip", onclick: () => downloadCopy(r) },
          icon("download"), "Download a copy") : null,
        loc ? h("button", { class: "btn small", type: "button", title: "The fields every task in this vault has: type, parent, sprint, estimate, your own",
          onclick: () => editTaskFields(r) }, icon("todo"), "Task fields") : null,
        r.repo ? h("button", { class: "btn small", type: "button", onclick: async () => {
          try {
            await navigator.clipboard.writeText(inviteLink(r));
            toast("Invite link copied. Send it with the GitHub invitation.", "ok");
          } catch {
            toast(inviteLink(r), "info", 15000);
          }
        } }, icon("external"), "Copy invite link") : null,
        r.repo ? h("button", { class: "btn small", type: "button", title: `Saves ${MARKER} in the repo, so everyone who can save to it gets it by themselves`,
          onclick: () => shareRepoSettings(r) }, icon("upload"), "Share with everyone") : null,
        r.repo ? h("button", { class: "btn small", type: "button", title: "The fields every task in this repo has: type, parent, sprint, estimate, your own",
          onclick: () => editTaskFields(r) }, icon("todo"), "Task fields") : null,
        h("button", { class: "btn small danger", type: "button", onclick: (e) => (loc ? removeLocalVault(r) : e.target.closest("details").remove()) },
          icon("trash"), loc ? "Remove this vault" : "Remove this repo"))));
  };
  const newCard = () => repoCard({ owner: store.get("user")?.login || "", branch: "main", home: "README.md" }, true);
  forms.append(...app.repos.map((r) => repoCard(r)));
  if (adding || !app.repos.length) forms.append(newCard());
  const saveRepos = () => {
    const ids = new Set();
    const repos = [...forms.querySelectorAll("details.repo-card")].map((card) => {
      const v = (n) => card.querySelector(`[name=${n}]`).value.trim();
      if (card.dataset.local) {
        const old = app.repos.find((x) => x.id === card.dataset.id);
        if (!old) return null;
        ids.add(old.id);
        return {
          ...old, label: v("label") || old.label, inbox: cleanDir(v("inbox")), inboxes: cleanDir(v("inboxes")), home: cleanDir(v("home")),
          notes: cleanDir(v("notes")), template: cleanDir(v("template")), attachments: cleanDir(v("attachments")), vault: card.querySelector("[name=vault]").checked,
        };
      }
      const r = {
        label: v("label"), owner: v("owner"), repo: v("repo"), branch: v("branch") || "main",
        folder: cleanDir(v("folder")), inbox: cleanDir(v("inbox")), inboxes: cleanDir(v("inboxes")), home: cleanDir(v("home")),
        notes: cleanDir(v("notes")), template: cleanDir(v("template")), attachments: cleanDir(v("attachments")),
        vault: card.querySelector("[name=vault]").checked,
      };
      let id = card.dataset.id || r.repo.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "repo";
      while (ids.has(id)) id += "-2";
      ids.add(id);
      return { id, ...r, label: r.label || `${r.owner}/${r.repo}` };
    }).filter((r) => r && (isLocal(r) || (r.owner && r.repo)));
    // A repo removed by hand isn't added back by the look for vaults on GitHub; one added again is.
    const kept = new Set(repos.map(repoKey));
    const discovery = store.get("discovery") || {};
    const removed = new Set((discovery.removed || []).filter((k) => !kept.has(k)));
    for (const r of app.repos) if (!isLocal(r) && !kept.has(repoKey(r))) removed.add(repoKey(r));
    store.set("discovery", { ...discovery, removed: [...removed] });
    app.repos = repos;
    store.set("repos", repos);
    app.trees.clear();
    app.repo = null;
    renderRepoPicker();
    toast("Repos saved", "ok");
    showSettings();
  };
  const repos = h("section", { class: "card" },
    h("h2", {}, icon("folder"), "Notes repos"),
    h("p", {}, app.repos.length
      ? "The GitHub repos and the vaults on this device the app opens. Switch between them at the top of the file list."
      : "No repos yet. Fill in the one that holds your notes (Owner and Repo are enough to start), then press Save repos."),
    h("p", { class: "fine" }, `Repos you can save to that have a ${MARKER} at the top are added by themselves. To share a repo's settings with everyone who can save to it, open it below and press Share with everyone.`),
    forms,
    h("div", { class: "card-actions" },
      h("button", { class: "btn", onclick: () => forms.append(newCard()) }, icon("plus"), "Add a repo"),
      h("button", { class: "btn", title: "A vault only on this device: in a folder, or in this browser. No GitHub needed.", onclick: async () => {
        const r = await addLocalVault();
        if (r) location.hash = hrefFor(r);
      } }, icon("device"), "Add a vault on this device"),
      h("button", { class: "btn", title: `Adds the repos you can save to that have a ${MARKER}`, onclick: async (e) => {
        const button = e.currentTarget;
        button.disabled = true;
        const added = await lookForVaults(true);
        if (added?.length) return showSettings();
        button.disabled = false;
        if (added) toast("No new vaults found on GitHub.");
      } }, icon("search"), "Look for vaults"),
      h("button", { class: "btn primary", onclick: saveRepos }, "Save repos")));

  // ---- this device ----
  const draftKeys = () => Object.keys(localStorage).filter((k) => k.startsWith(store.prefix + "draft:"));
  let drafts = [];
  try { drafts = draftKeys(); } catch { /* storage blocked */ }
  const copies = h("ul", { class: "checks copies" });
  const copyRepos = app.repos.filter((r) => !isLocal(r));
  for (const r of copyRepos) {
    const li = h("li", {}, icon("device"), h("span", {}, h("b", {}, r.label), " …"));
    copies.append(li);
    Promise.all([mirror.place(r), mirror.size(r)]).then(([{ folder }, size]) => {
      fill(li, icon("device"), h("span", {}, h("b", {}, r.label), folder ? ` · in the folder ${folder}`
        : size?.files ? ` · in this browser, ${size.files} files, ${formatSize(size.bytes)}` : " · in this browser, nothing kept yet"),
      !folder && size?.files ? h("button", { class: "btn small", type: "button", title: "It's downloaded again the next time the vault opens", onclick: async () => {
        await mirror.drop(r);
        app.trees.delete(r.id);
        toast(`${r.label}'s copy is dropped from this browser.`, "ok");
        showSettings();
      } }, icon("trash"), "Drop the copy") : null);
    });
  }
  const waitingBox = h("div", { class: "field", hidden: true }, h("span", {}, "Waiting to upload"),
    h("small", { class: "hint" }, "Saved on this device and not on GitHub yet. Saves made with no connection go by themselves when it's back; files changed by other tools go only when you press Upload. Until then they're only here: clearing the browser's data loses the list (a copy in a folder keeps the files)."));
  const waitingList = h("ul", { class: "checks copies" });
  waitingBox.append(waitingList);
  const WAIT_TEXT = { waiting: "waiting", conflict: "changed on GitHub too: open it to compare", gone: "deleted or moved on GitHub: open it to save it as a new note", changed: "changed by another tool" };
  for (const r of copyRepos) {
    mirror.waitingList(r).then((items) => {
      for (const w of items) {
        const rel = r.folder && w.path.startsWith(`${r.folder.replace(/\/+$/, "")}/`) ? w.path.slice(r.folder.replace(/\/+$/, "").length + 1) : w.path;
        waitingList.append(h("li", {}, icon(w.state === "waiting" || w.state === "changed" ? "upload" : "warning"),
          h("span", {}, h("a", { href: hrefFor(r, rel) }, `${r.label}: ${shownName(rel)}`), ` · ${WAIT_TEXT[w.state]}${w.error ? ` (${w.error})` : ""}`),
          w.state === "waiting" || w.state === "changed" ? h("button", { class: "btn small", type: "button", onclick: async (e) => {
            e.currentTarget.disabled = true;
            const { uploaded } = await mirror.upload(r, w.path, `Edit ${rel} from ${APP_NAME}`);
            toast(uploaded ? `${shownName(rel)} is on GitHub now.` : `Not uploaded: GitHub can't be reached, or it refused (${WAIT_TEXT[mirror.status(r, w.path)] || "see the note"}).`, uploaded ? "ok" : "error");
            showSettings();
          } }, icon("upload"), "Upload") : null));
        waitingBox.hidden = false;
      }
    }).catch(() => {});
  }
  const device = h("section", { class: "card" },
    h("h2", {}, icon("history"), "This device"),
    overviewSettings(),
    waitingBox,
    copyRepos.length ? h("div", { class: "field" }, h("span", {}, "Copies of the vaults"),
      h("small", { class: "hint" }, "Each vault on GitHub is kept on this device too, so it opens with no connection. GitHub keeps the main copy: dropping one here loses nothing."),
      copies) : null,
    h("p", {}, drafts.length ? `${drafts.length} unsaved ${drafts.length === 1 ? "draft is" : "drafts are"} kept in this browser.` : "No unsaved drafts are kept in this browser."),
    drafts.length ? h("button", { class: "btn small danger", onclick: async () => {
      if (!(await confirmDialog("Discard every unsaved draft?", "Changes you never saved will be gone.", "Discard all", true))) return;
      try { draftKeys().forEach((k) => localStorage.removeItem(k)); } catch { /* storage blocked */ }
      showSettings();
    } }, icon("trash"), "Discard all drafts") : null);

  showMain(h("div", { class: "page" },
    h("div", { class: "page-head" },
      h("button", { class: "icon-btn", title: "Back to the notes", "aria-label": "Back to the notes", onclick: goBack }, icon("back")),
      h("h1", {}, "Settings")),
    github, ownersCard, repos, device,
    h("section", { class: "card" },
      h("h2", {}, "Support Commonplace.md"),
      h("a", { class: "btn", href: "https://ko-fi.com/jansnieg", target: "_blank", rel: "noopener noreferrer" }, "Support on Ko-fi"))));
  // #/settings?token=<owner> opens straight to adding a token for that owner.
  if (tokenOwner) { ownersCard.scrollIntoView({ block: "start" }); ownerTokenInput.focus(); }
}

// ================================================================
// Start
// ================================================================

function start() {
  fillIcons(document.body);
  renderWho();
  renderRepoPicker();
  $("#menu-btn").addEventListener("click", () => document.body.classList.toggle(isPhone() ? "side-open" : "side-closed"));
  $("#scrim").addEventListener("click", () => document.body.classList.remove("side-open"));
  $("#side-close").addEventListener("click", () => document.body.classList.remove("side-open"));
  $("#repo-select").addEventListener("change", (e) => {
    const repo = app.repos.find((r) => r.id === e.target.value);
    if (repo) location.hash = hrefFor(repo);
  });
  $("#back-btn").addEventListener("click", goBack);
  $("#up-btn").addEventListener("click", () => {
    const up = parentPath(app.file);
    if (up) location.hash = hrefFor(app.file.repo, up);
  });
  $("#inbox-btn").addEventListener("click", () => { if (inboxOf(app.repo)) location.hash = hrefFor(app.repo, inboxOf(app.repo)); });
  $("#mode").addEventListener("click", (e) => {
    const i = [...$("#mode").children].indexOf(e.target.closest("button"));
    if (i >= 0) setMode(i ? "edit" : "read");
  });
  $("#save-btn").addEventListener("click", save);
  const more = $("#more");
  const closeMenu = () => more.removeAttribute("open");
  document.addEventListener("click", (e) => { if (!more.contains(e.target)) closeMenu(); });
  $("#new-btn").addEventListener("click", () => { closeMenu(); newNote(); });
  $("#export-pdf-btn").addEventListener("click", async () => {
    closeMenu();
    const f = app.file;
    if (f?.kind !== "md" || !f.dom?.preview) return;
    const button = $("#export-pdf-btn");
    button.disabled = true;
    try {
      // Flush the current editor into the preview; no save or remote write is needed.
      renderPreview();
      await printNote({ preview: f.dom.preview, title: shownName(f.path), isCurrent: () => app.file === f, drawDiagram: src => diagramSvg(src, "default") });
    } catch (error) { toast(error.message, "error"); }
    finally { button.disabled = false; }
  });
  addEventListener("beforeprint", () => {
    const f = app.file;
    if (!document.getElementById("print-note") && f?.kind === "md" && f.dom?.preview) createPrintView(f.dom.preview, shownName(f.path));
  });
  addEventListener("afterprint", clearPrintView);
  $("#side-new").addEventListener("click", () => { closeSideOnPhone(); newNote(); });
  $("#reload-btn").addEventListener("click", reloadFromGitHub);
  $("#nudge-reload").addEventListener("click", reloadFromGitHub);
  $("#settings-btn").addEventListener("click", () => { closeMenu(); location.hash = "#/settings"; });
  $("#side-settings").addEventListener("click", () => { location.hash = "#/settings"; });
  $("#filter").addEventListener("input", debounce(renderTree, 120));
  // Wide tables are fitted again when the window changes size (a ResizeObserver on the page does it too, where it runs).
  window.addEventListener("resize", debounce(() => { if (app.file?.kind === "md") fitWide(app.file); }, 100));
  $("#side").addEventListener("click", (e) => { if (e.target.closest("a.file, #who")) closeSideOnPhone(); });
  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    else if (mod && e.key.toLowerCase() === "e" && (app.file?.kind === "md" || app.file?.kind === "csv") && canWrite()) {
      e.preventDefault();
      setMode(app.mode === "edit" ? "read" : "edit");
    } else if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (isPhone()) document.body.classList.add("side-open");
      document.body.classList.remove("side-closed");
      $("#filter").focus();
      $("#filter").select();
    } else if (e.key === "Escape" && document.body.classList.contains("side-open")) {
      document.body.classList.remove("side-open");
    }
  });
  addEventListener("hashchange", route);
  // Back online: the saves that waited in the copies go to GitHub.
  addEventListener("online", () => { for (const r of app.repos) if (!isLocal(r) && app.trees.has(r.id)) mirror.flush(r).catch(() => {}); });
  addEventListener("pagehide", flushDraft);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushDraft(); else checkForNewer(); });
  setInterval(checkForNewer, CHECK_EVERY);
  addEventListener("beforeunload", (e) => { if (app.file?.dirty || app.file?.imageUpload || hasCaptureDraft(app.file)) e.preventDefault(); });
  matchMedia("(min-width: 1180px)").addEventListener("change", () => applyMode());
  // Diagrams are drawn in the scheme's colours, so a scheme change redraws them.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if ($(".mermaid-diagram")) renderPreview(); });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* the app works without it */ });
  }
  if (app.token) {
    refreshUser();
    lookForVaults();
  }
  route();
}

start();
