// The app: routing, the sidebar, one view per kind of file, saving, drafts, dialogs and settings.

import { DOMPurify, yamlLoad } from "../vendor/vendor.js";
import { GitHub } from "./github.js";
import {
  LinkIndex, findWikilinks, findNavBlock, isImagePath, defaultNote, fillTemplate, isoDate, splitFrontMatter, titleProblem, toLf,
  inboxCandidates, ownInboxPath, isTaskPath, MARKER, parseMarker, mergeMarker, reposToCheck, repoKey,
  CUSTOM_KINDS, ESTIMATE_UNITS, taskSetup, taskSetupJson, taskSetupProblem, isSetupTask, withProps, linkName, fieldValue, newTaskProps, suggestTasks, claimedTasks, waitingTasks, WAITING, taskState, claimTask, setProps, taskAreas, PRIORITIES, listProp, parentTarget,
  fieldProp, linkTarget, subtasksOf, parentProblem, findTask, sprints, sprintChoices, nextSprint, sprintTasks,
  sprintSuggestions, taskCommitLinks,
} from "./vault.js";
import { createMarkdown, renderNote, TOP_TASKS_COUNT } from "./markdown.js";
import { createEditor, setEditorText, createMergeView, languageFor, hasLanguage } from "./editor.js";
import { parseCsv, serializeCsv } from "./csv.js";
import { parseBase, candidatePaths, runView, usesFileMtime, noteProps, reviveDates } from "./bases.js";
import { store, upgradeRepo } from "./store.js";
import { icon, fillIcons } from "./icons.js";

// ================================================================
// Helpers
// ================================================================

const APP_NAME = "Commonplace.md";

// ---- which version: released (the main branch) or in development (the dev branch, served under dev/) ----

/** This is the development version, served under dev/ beside the released one, on the same origin. */
const DEV_BUILD = /\/dev\/(index\.html)?$/.test(location.pathname);
/** The name in the tab's title: the development version says so. Commit messages keep APP_NAME. */
const SHOWN_APP = DEV_BUILD ? `${APP_NAME} (dev)` : APP_NAME;
/** The address of the released (`dev` false) or development version, at the same page. */
const versionHref = (dev) =>
  new URL(DEV_BUILD ? (dev ? "./" : "../") : (dev ? "dev/" : "./"), location.href).pathname + location.hash;
/** Set in this tab just before the released version sends it on to the development one. */
const TO_DEV = "commonplace:to-dev";

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
let gh = new GitHub(app.token);

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

async function loadTree(repo, force = false) {
  if (!force && app.trees.has(repo.id)) return app.trees.get(repo.id);
  // The branch's latest commit first, so the tree is that commit's and newer ones can be told apart later.
  let head = null;
  try { head = await gh.headSha(repo); } catch { /* the tree still loads by the branch's name */ }
  const data = await gh.tree(repo, head?.sha || repo.branch);
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
  };
  app.trees.set(repo.id, tree);
  findOwnInbox(repo, tree);
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
  if (app.file?.dirty && !(await confirmDialog("Reload from GitHub?", "Your unsaved changes to this note will be lost.", "Reload", true))) return;
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
  const login = store.get("user")?.login;
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

const fileRow = (repo, path, iconName = iconFor(path), label = shownName(path), sub = null) =>
  h("a", { class: "row file", href: hrefFor(repo, path), "data-path": path, title: path },
    icon(iconName), h("span", { class: "name" }, label, sub ? h("small", {}, sub) : null));

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
  const inbox = inboxOf(repo);
  if (inbox && tree.files.has(inbox)) fixed.push(fileRow(repo, inbox, "inbox", "Inbox"));
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
      h("p", { class: "side-empty" }, "GitHub's search can lag a few minutes behind the latest saves."),
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
  fill($("#repo-select"), ...app.repos.map((r) => h("option", { value: r.id, selected: r.id === app.repo?.id }, r.label)));
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
    if (tree && u.login !== before) findOwnInbox(app.repo, tree);
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
  $("#reload-btn").hidden = !app.repo || !app.token;
  renderNudge();
  const up = parentPath(f);
  const upBtn = $("#up-btn");
  upBtn.hidden = !up;
  upBtn.title = up ? `Up to ${shownName(up)}` : "Up";
  upBtn.setAttribute("aria-label", upBtn.title);
  $("#inbox-btn").hidden = !inboxOf(app.repo) || !app.token;
  $("#inbox-btn").classList.toggle("on", !!f && f.path === inboxOf(app.repo));
  const title = $("#title");
  const writable = canWrite();
  $("#new-btn").hidden = !writable;
  $("#side-new").hidden = !writable;
  if (f) {
    const dir = dirName(f.path);
    fill(title, dir ? h("span", { class: "crumbs" }, dir.split("/").join(" / ") + " /") : null,
      h("span", { class: "name" }, shownName(f.path)), f.dirty ? h("span", { class: "dirty", title: "Not saved yet" }) : null,
      writable ? null : h("span", { class: "badge", title: "You can read this repo but not change it" }, "Read only"));
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
  save.disabled = !f?.dirty || app.saving;
  save.classList.toggle("busy", app.saving);
  const [ic, label] = app.saving ? ["spinner", "Saving"] : f?.dirty ? ["upload", "Save"] : ["check", "Saved"];
  fill(save, icon(ic), h("span", { class: "label" }, label));
  document.title = f ? `${f.dirty ? "• " : ""}${shownName(f.path)} · ${SHOWN_APP}` : app.pageTitle ? `${app.pageTitle} · ${SHOWN_APP}` : SHOWN_APP;
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
  if (!app.token) return showWelcome(store.get("join"));
  document.body.classList.remove("no-token");
  if (parts[0] === "settings") {
    // #/settings?fields opens the Task fields of the repo the person was in (a note can link to it);
    // #/settings?fields=<repo id> names the repo.
    const fieldsOf = params.has("fields")
      ? app.repos.find((r) => r.id === params.get("fields")) || app.repo || app.repos.find((r) => r.id === store.get("lastRepo")) || app.repos[0]
      : null;
    showSettings(params.get("add") === "1");
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
      // GitHub answers 404 both for a repo that doesn't exist and for one this token may not see.
      const hint = e.status === 404
        ? `GitHub won't show it to this token. If you just made the token, it may still be waiting for ${repo.owner} to approve it: reload once they have. Otherwise, check on GitHub that the token's resource owner is ${repo.owner} and that ${repo.repo} is selected.`
        : e.message;
      showProblem(`Couldn't open ${repo.owner}/${repo.repo}`, hint, e);
    }
    return;
  }
  if (nav !== app.nav) return;
  if (!path) {
    const home = [repo.home, repo.inbox, "Home.md", "README.md"].find((p) => p && tree.files.has(p));
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
  if (!f?.dirty) return true;
  const { parts } = parseHash();
  if (parts[0] === f.repo.id && parts.slice(1).join("/") === f.path) return true;
  if (askingLeave) return false;
  askingLeave = true;
  let choice;
  try {
    choice = await modal({
      title: "Leave without saving?",
      text: `${shownName(f.path)} has changes that aren't saved to GitHub yet.`,
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
  app.file?.editor?.destroy();
  app.file = null;
}

function showMain(...children) {
  fill($("#main"), ...children);
  $("#main").scrollTop = 0;
}

function showProblem(title, message, error) {
  closeFile();
  app.pageTitle = "";
  renderHeader();
  const toSettings = error?.status === 401 || error?.status === 403 || error?.status === 404;
  showMain(emptyState("warning", title, message,
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
  view.append(f.dom.banners, h("div", { class: "panes" }, f.dom.editorPane, f.dom.preview));
  showMain(view);
  f.dom.preview.addEventListener("click", onPreviewClick);
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

function onTextChanged(text) {
  const f = app.file;
  if (!f || f.text === text) return;
  f.text = text;
  if (f.kind === "csv") f.csv = null;
  updateDirty();
  if (f.kind === "md" && isWide()) previewLater();
  warnLater();
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
  if (!body.querySelector("h1")) body.prepend(h("h1", { class: "inline-title" }, shownName(f.path)));
  decorate(body, f.repo, f.path);
  if (!canWrite(f.repo)) for (const box of body.querySelectorAll("input.task")) box.disabled = true;
  fillEmbeds(body, f.repo, f.path);
  fillBases(body, f.repo);
  fillTopTasks(body, f);
  // A task shows its project's fields as a form, and the other properties in the box below it.
  const setup = app.token ? taskSetupOf(f.repo) : null;
  if (app.token && !setup) {
    loadTaskSetup(f.repo).then(() => { if (app.file === f && f.dom?.preview.isConnected && f.kind === "md") renderPreview(); });
  }
  const isTask = setup && isSetupTask(setup, f.path);
  const form = isTask && canWrite(f.repo) ? taskForm(f, setup) : null;
  // A task's commits show in their own box, not again among its properties.
  const inForm = isTask ? new Set(["commits", ...(form ? setup.fields.filter((x) => x.on).map((x) => x.prop.toLowerCase()) : [])]) : null;
  let props = null;
  if (isTask && frontMatter) try { props = yamlLoad(frontMatter); } catch { /* the properties box shows what's wrong */ }
  const sprint = setup && !isTask && isSprintNote(setup, f.path) ? sprintBox(f, setup) : null;
  fill(f.dom.preview, form, isTask ? subtasksBox(f, setup) : null, isTask ? commitsBox(f, props) : null, sprint,
    frontMatter ? propertiesBox(frontMatter, env, inForm) : "",
    isInbox(f.repo, f.path) ? inboxBox(f) : "", body);
}

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
function subtasksBox(f, setup) {
  const entry = taskNotes(f.repo, setup);
  if (!entry.notes) return null;
  const tree = app.trees.get(f.repo.id);
  const { tasks, done, total } = subtasksOf(entry.notes, f.path,
    { prop: fieldProp(setup, "part_of"), resolve: (t, from) => tree.index.resolve(t, from), setup });
  const add = canWrite(f.repo) ? h("button", { class: "btn small ghost", onclick: () => addSubtask(f, setup) }, icon("plus"), "Add subtask") : null;
  if (!total) return add ? h("div", { class: "subtasks none" }, add) : null;
  return h("section", { class: "subtasks", "aria-label": "Subtasks" },
    h("div", { class: "st-head" }, h("span", { class: "st-title" }, "Subtasks"), h("span", { class: "st-count" }, `${done} of ${total} done`), add),
    h("div", { class: "st-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(done),
      "aria-label": `${done} of ${total} subtasks done` }, h("span", { style: `width: ${Math.round((done / total) * 100)}%` })),
    h("ul", { class: "st-list" }, tasks.map((t) => h("li", { class: t.done ? "done" : null },
      h("a", { href: hrefFor(f.repo, t.path) }, t.id ? h("span", { class: "st-id" }, t.id) : null, shownName(t.path)),
      t.status ? h("span", { class: "st-status" }, t.status) : null))));
}

// ---- a task's commits ----

/**
 * The commits made for a task, from its `commits` property: the Task commits Action adds each pushed commit
 * whose message starts with the task's ID. Nothing is asked of GitHub; links open the commits there.
 */
function commitsBox(f, props) {
  const list = taskCommitLinks(props?.commits);
  if (!list.length) return null;
  const own = `${f.repo.owner}/${f.repo.repo}`.toLowerCase();
  return h("section", { class: "commits", "aria-label": "Commits" },
    h("div", { class: "st-head" }, h("span", { class: "st-title" }, "Commits"),
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
function sprintBox(f, setup) {
  const tasks = taskNotes(f.repo, setup).notes;
  const all = sprintNotes(f.repo, setup).notes;
  if (!tasks || !all) return null;
  const tree = app.trees.get(f.repo.id);
  const list = sprints(all, isoDate());
  const me = list.find((s) => s.path === f.path);
  if (!me) return null;
  const s = sprintTasks(tasks, f.path, { setup, resolve: (t, from) => tree.index.resolve(t, from) });
  const start = canWrite(f.repo) && list[0]?.path === f.path
    ? h("button", { class: "btn small", onclick: () => startNextSprint(f, setup, me, s.open) }, icon("plus"), "Start the next sprint") : null;
  const dates = me.start ? `${shortDay(me.start)} – ${shortDay(me.end, true) || "?"}` : "No dates yet: set start and end";
  const done = `${s.done} of ${s.total} task${s.total === 1 ? "" : "s"} done`
    + (s.points ? ` · ${s.points.done} of ${amount(s.points.total, s.points.unit)}` : "");
  return h("section", { class: "sprint-box", "aria-label": "Sprint" },
    h("div", { class: "st-head" }, h("span", { class: "st-title" }, "Sprint"), h("span", { class: `sprint-when ${me.when}` }, WHEN[me.when]),
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
          const files = [{ path: pathOf(), text: withProps(defaultNote(title), props) }];
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
            ? "Not started: GitHub has newer changes. Reload from GitHub and try again."
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
  const cells = setup.fields.filter((x) => x.on).flatMap((field) => {
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
      else if (field.kind === "person") list = listFor(field, [login, cur]);
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
  const next = withProps(f.text, [[field.prop, value]]);
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
      `${id ? id + ": " : ""}${field.prop} set to ${value ? linkName(value) : "nothing"} from ${APP_NAME}`);
    wroteCommit(f.repo, res);
    baseCache("baseProps", f.repo)[res.sha] = noteProps(next);
    treeChanged(f.repo, f.path, res.sha);
    if (app.file === f) {
      f.sha = res.sha;
      f.saved = next;
      // Typed into the editor meanwhile: those edits stay, with the field's new line in them.
      f.text = f.dirty ? withProps(f.text, [[field.prop, value]]) : next;
      if (f.editor) setEditorText(f.editor, f.text);
      updateDirty();
      if (!f.dirty) store.remove(draftKey(f));
      redraw();
    }
    toast(`${field.label}: ${value ? linkName(value) : "cleared"}`, "ok");
  } catch (e) {
    toast(e.isConflict ? `Not changed: ${shownName(f.path)} changed on GitHub. Reload it first.` : `Not changed: ${e.message}`, "error");
    if (control.isConnected) control.disabled = false;
  }
}

// ---- the top tasks to start: over an inbox, and in a ```top-tasks block on any page ----

/** The repo's Inbox page and the notes in its inboxes folder. */
const isInbox = (repo, path) => inboxCandidates([path], repo.inbox, repo.inboxes || "").length > 0;

/** One look-up per tree version and areas, so typing in the inbox doesn't redo it. */
const suggestLoads = new Map();
function loadSuggestions(repo, areas, who, count) {
  const tree = app.trees.get(repo.id);
  const key = `${repo.id}:${tree.version}:${areas.join(",")}:${who}:${count}`;
  if (!suggestLoads.has(key)) {
    for (const k of suggestLoads.keys()) if (k.startsWith(`${repo.id}:`)) suggestLoads.delete(k);
    const load = baseNotes(repo, tree, [...tree.files.keys()].filter(isTaskPath))
      .then(async (notes) => {
        const sprint = await suggestSprints(repo, tree).catch(() => null);
        const fromSprint = sprint && sprintSuggestions(notes, { areas, count, prop: sprint.prop, now: sprint.now?.path, next: sprint.next?.path,
          resolve: (t, from) => tree.index.resolve(t, from) });
        const shown = {
          mine: claimedTasks(notes, who), free: fromSprint ?? suggestTasks(notes, { areas, count }),
          waiting: waitingTasks(notes, { areas, owner: who }), allAreas: taskAreas(notes),
          sprint: fromSprint ? sprint : null,
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

/** Who the page's box claims tasks for: its `owner` property, else the signed-in GitHub user. */
const boxOwner = (props) => String(props.owner ?? "").trim() || store.get("user")?.login || "";

/** The inbox's box, over its text: its `areas` property limits the tasks, its `owner` is who Claim claims them for. */
function inboxBox(f) {
  const props = noteProps(f.text);
  const shown = Array.isArray(props.areas) ? props.areas.map(String) : listProp(props.areas).length ? [String(props.areas)] : [];
  return suggestBox(f.repo, { areas: listProp(props.areas), shown, who: boxOwner(props) });
}

/**
 * Each ```top-tasks block on the page becomes the same box, with its own `areas` and `count` lines; the page's
 * `owner` property (or the signed-in user) is who it claims for. In a repo without tasks, the block's code stays.
 */
function fillTopTasks(root, f) {
  const blocks = root.querySelectorAll(".top-tasks-block");
  if (!blocks.length) return;
  const who = boxOwner(noteProps(f.text));
  for (const el of blocks) {
    const shown = (el.dataset.areas || "").split(",").map((a) => a.trim()).filter(Boolean);
    const box = suggestBox(f.repo, { areas: listProp(shown), shown, who, count: Number(el.dataset.count) || TOP_TASKS_COUNT });
    if (box) el.replaceWith(box);
  }
}

/**
 * The top free tasks (three unless `count` says): the notes in a `Tasks` folder with no assignee, highest
 * priority first, only in `areas` (lower case) when given; `shown` is how the areas are written, for the head.
 * Above them, the tasks `who` has claimed and not finished: waiting for their agent, or with an agent on it.
 */
function suggestBox(repo, { areas = [], shown = [], who = "", count = TOP_TASKS_COUNT }) {
  const tree = app.trees.get(repo.id);
  if (!tree || ![...tree.files.keys()].some(isTaskPath)) return null;
  const list = h("ol", { class: "suggest-list" }, h("li", { class: "muted" }, "Looking for free tasks…"));
  const box = h("section", { class: "suggest", "aria-label": "Top tasks to start" },
    h("div", { class: "suggest-head" }, icon("todo"), h("strong", {}, "Top tasks to start"),
      h("small", { class: "muted" }, areas.length ? `Areas: ${shown.join(", ")}` : "All areas")),
    list);
  const editable = canWrite(repo) && !!app.token;
  let allAreas = [];
  /** A property as a chip, or as a chip-like picker that saves the task when it changes. */
  const tag = (path, t, key, options, cls = "") => {
    const value = String(t[key] ?? "").trim();
    if (!editable) return value ? h("span", { class: `chip ${cls}` }, value) : null;
    const list = value && !options.some((o) => o.toLowerCase() === value.toLowerCase()) ? [value, ...options] : options;
    const label = key === "priority" ? "Priority" : "Area";
    const pick = h("select", { class: `chip pick ${cls}`, "aria-label": `${label} of ${shownName(path)}`, title: `Change its ${label.toLowerCase()}` },
      value ? null : h("option", { value: "", selected: true, disabled: true }, label),
      list.map((o) => h("option", { value: o, selected: o.toLowerCase() === value.toLowerCase() }, o)));
    pick.addEventListener("change", () => changeTask(repo, path, key, pick.value, pick));
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
  const row = ({ path, props: t }, extra) => h("li", {},
    h("a", { href: hrefFor(repo, path), class: "suggest-name" }, t.id ? h("span", { class: "muted" }, `${t.id} `) : null, shownName(path)),
    h("span", { class: "suggest-tags" }, stateChip(path),
      tag(path, t, "priority", PRIORITIES, t.priority ? `prio-${String(t.priority).trim().toLowerCase()}` : ""),
      tag(path, t, "area", allAreas)),
    extra);
  /** Sets a task's status from the box: "Not now" puts it on the waiting list, "Bring back" takes it off. */
  const statusButton = (path, label, value, title) => editable
    ? h("button", { class: "btn small ghost", type: "button", title,
      onclick: (e) => changeTask(repo, path, "status", value, e.currentTarget) }, label)
    : null;
  const WAIT_TITLE = "Put it on the waiting list: it stops being suggested until you bring it back";
  loadSuggestions(repo, areas, who, count).then(({ mine, free, waiting, allAreas: found, states: told, sprint }) => {
    allAreas = found;
    states = told;
    /**
     * Putting a task off. With sprints, it's pushed to the next sprint (one commit of its sprint line); when
     * there's no sprint after the one it's in, the button says so and offers the waiting list instead.
     */
    const notNow = (n) => {
      if (!editable) return null;
      if (!sprint) return statusButton(n.path, "Not now", WAITING, WAIT_TITLE);
      const next = sprint.now && sprint.next && !n.nextSprint && linkName(String(n.props[sprint.prop] ?? "")) !== sprint.next.name
        ? sprint.next : null;
      const latest = sprint.next ?? sprint.now;
      return h("button", { class: "btn small ghost", type: "button",
        title: next ? `Move it into ${next.name}: it leaves ${sprint.now.name}'s top tasks`
          : `There's no sprint after ${latest.name} yet: put it on the waiting list instead`,
        onclick: async (e) => {
          const button = e.currentTarget;
          if (next) return changeTask(repo, n.path, sprint.prop, `[[${next.name}]]`, button, `pushed to ${next.name}`);
          if (await confirmDialog(`No sprint after ${latest.name} yet`,
            `Put ${shownName(n.path)} on the waiting list instead? It stops being suggested until you bring it back. `
            + `To push tasks to a new sprint, open ${latest.name} and press Start the next sprint.`, "Not now")) {
            changeTask(repo, n.path, "status", WAITING, button);
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
    const none = sprint
      ? `No free tasks in ${sprint.now ? sprint.now.name : sprint.next.name}${sprint.now && sprint.next ? ` or ${sprint.next.name}` : ""}.`
      : "No free tasks right now.";
    const claimed = mine.map((n) => row(n, [h("span", {
      class: `chip claimed${n.agent ? " working" : ""}`,
      title: n.agent ? `${n.props.assignee}: an agent is working on it` : `Claimed by ${who}: your agent starts with it`,
    }, n.agent ? `${n.agent} is on it` : "Claimed"), n.agent ? null : notNow(n)]));
    const waitingList = waiting.length ? h("details", { class: "suggest-waiting" },
      h("summary", {}, icon("chevron"), `Waiting (${waiting.length})`),
      h("ol", { class: "suggest-list" }, waiting.map((n) => row(n,
        statusButton(n.path, "Bring back", "To Do", "Take it off the waiting list: its status goes back to To Do"))))) : null;
    if (!claimed.length && !free.length) return fill(list, h("li", { class: "muted" }, none), waitingList);
    fill(list, claimed, free.map((n) => row(n, [
      nextChip(n),
      editable && who
        ? h("button", { class: "btn small", type: "button", title: `Set its status to In Progress and its assignee to ${who}${
          moveTo(n) ? `, and move it into ${moveTo(n).name}` : ""}`,
          onclick: (e) => claimSuggested(repo, n.path, who, e.currentTarget, moveTo(n)) }, icon("check"), "Claim")
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
async function claimSuggested(repo, path, who, button, move = null) {
  if (!await confirmDialog(`Claim ${shownName(path)}?`,
    `Its status becomes In Progress and its assignee ${who}${move ? `, and it moves into ${move.name}` : ""}. This saves the task to GitHub.`, "Claim")) return;
  button.disabled = true;
  try {
    const { text, sha } = await gh.readText(repo, fullPath(repo, path));
    const now = noteProps(text);
    const taken = String(now.assignee ?? "").trim();
    const next = taken ? null : claimTask(text, who, move ? [[move.prop, `[[${move.name}]]`]] : []);
    // What was just read or written is known, so the list needn't read the task again.
    const known = baseCache("baseProps", repo);
    if (!next) {
      known[sha] = now;
      treeChanged(repo, path, sha);
      toast(taken ? `${shownName(path)} is already taken by ${taken}.` : `${shownName(path)} has no properties to change.`, "error");
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

/** Draws the open page again (its top tasks box re-sorts), keeping the scroll. False when no page of `repo` with one is open. */
function refreshInboxBox(repo) {
  if (!(app.file?.repo === repo && app.file.dom?.preview.isConnected && app.file.dom.preview.querySelector(".suggest"))) return false;
  const scroll = $("#main").scrollTop;
  renderPreview();
  $("#main").scrollTop = scroll;
  return true;
}

/**
 * Sets one property of a task from a top tasks box: one commit that changes only that line. `said` (e.g.
 * "pushed to Sprint 2") is what the commit and the message say instead of "<key> set to <value>".
 */
async function changeTask(repo, path, key, value, picker, said = "") {
  picker.disabled = true;
  try {
    const { text, sha } = await gh.readText(repo, fullPath(repo, path));
    const now = noteProps(text);
    const known = baseCache("baseProps", repo);
    const next = setProps(text, [[key, value]]);
    if (!next) {
      known[sha] = now;
      treeChanged(repo, path, sha);
      toast(`${shownName(path)} has no properties to change.`, "error");
    } else if (next === toLf(text)) {
      known[sha] = now;
      treeChanged(repo, path, sha);
    } else {
      const id = String(now.id ?? "").trim();
      const res = await gh.writeText(repo, fullPath(repo, path), next, sha, `${id ? id + ": " : ""}${said || `${key} set to ${value}`} from ${APP_NAME}`);
      wroteCommit(repo, res);
      known[res.sha] = noteProps(next);
      treeChanged(repo, path, res.sha);
      toast(said ? `${shownName(path)}: ${said}` : key === "status" && value === WAITING ? `${shownName(path)}: not now, it's on the waiting list`
        : `${shownName(path)}: ${key} is now ${value}`, "ok");
    }
  } catch (e) {
    toast(`Not changed: ${e.message}`, "error");
  }
  if (!refreshInboxBox(repo)) picker.disabled = false;
}

/** Icons, external links and images: what the sanitized HTML still needs. */
function decorate(root, repo, fromPath) {
  fillIcons(root);
  for (const a of root.querySelectorAll('a[href^="http"]')) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  fillImages(root, repo, fromPath);
  fillDiagrams(root);
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

function diagramSvg(src) {
  const theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default";
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
  const lines = src.split("\n");
  const want = norm(heading);
  const start = lines.findIndex((l) => /^#{1,6}\s/.test(l) && norm(l.replace(/^#+\s*/, "")) === want);
  if (start < 0) return null;
  const level = /^#+/.exec(lines[start])[0].length;
  let end = lines.findIndex((l, i) => i > start && /^#{1,6}\s/.test(l) && /^#+/.exec(l)[0].length <= level);
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join("\n");
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
  await inParallel(chunks(bySha, BLOBS_PER_QUERY), 3, async (batch) => {
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
  const cache = baseCache("taskState", repo);
  const missing = paths.filter((p) => !Object.hasOwn(cache, tree.files.get(p)));
  if (missing.length) {
    for (const [p, text] of await readNotes(repo, tree, missing)) cache[tree.files.get(p)] = taskState(text);
    const live = new Set(tree.files.values());
    keepBaseCache("taskState", repo, (sha) => live.has(sha));
  }
  return new Map(paths.map((p) => [p, cache[tree.files.get(p)] ?? null]));
}

/** "Last modified" is the date of the last commit that changed the note: a Map path -> Date. Failures leave gaps. */
async function lastCommitDates(repo, tree, paths) {
  const cache = baseCache("baseDates", repo);
  const key = (p) => `${p}@${tree.files.get(p)}`;
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
function loadBase(repo, path) {
  const tree = app.trees.get(repo.id);
  const prefix = `${repo.id}:${path}:`;
  const key = prefix + tree.version;
  if (!baseLoads.has(key)) {
    for (const k of baseLoads.keys()) if (k.startsWith(prefix)) baseLoads.delete(k);
    const load = (async () => {
      const base = parseBase(await pageText(repo, path));
      const notes = await baseNotes(repo, tree, candidatePaths(base, [...tree.files.keys()]));
      return { base, notes, tree, dates: null, datesLoading: null };
    })();
    baseLoads.set(key, load);
    load.catch(() => baseLoads.delete(key));
  }
  return baseLoads.get(key);
}

function fillBases(root, repo) {
  for (const el of root.querySelectorAll(".embed-base")) {
    const view = baseView(repo, el.dataset.path);
    // The embed is alone in its paragraph; the table takes the paragraph's place.
    const p = el.parentElement;
    if (p?.tagName === "P" && p.childNodes.length === 1) p.replaceWith(view);
    else el.replaceWith(view);
  }
}

/** A base's views as tabs over one table. The last tab chosen is remembered per base. */
function baseView(repo, path) {
  const tabKey = `baseTab:${repo.id}:${path}`;
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
  loadBase(repo, path).then((l) => {
    loaded = l;
    if (!l.base.views.length) return fill(body, h("p", { class: "note" }, "This base has no views."));
    const saved = Number(store.get(tabKey, 0));
    tab = Number.isInteger(saved) && saved >= 0 && saved < l.base.views.length ? saved : 0;
    show();
  }, (e) => fill(body, h("p", { class: "note error" }, `Couldn't load this view: ${e.message}`)));
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
  if (!f?.dirty || app.saving || viewOnly(f.kind)) return;
  const text = toLf(f.text);
  app.saving = true;
  renderHeader();
  try {
    const res = await gh.writeText(f.repo, fullPath(f.repo, f.path), text, f.sha, `Edit ${f.path} from ${APP_NAME}`);
    wroteCommit(f.repo, res);
    if (app.file !== f) return;
    f.sha = res.sha;
    f.saved = text;
    f.text = text;
    f.dirty = false;
    store.remove(draftKey(f));
    treeChanged(f.repo, f.path, res.sha);
    updateLinkWarning();
    toast("Saved to GitHub", "ok");
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
    latest = await gh.readText(f.repo, fullPath(f.repo, f.path));
  } catch (e) {
    return toast(`Not saved, and the newer version couldn't be read: ${e.message}`, "error");
  }
  const host = h("div", { class: "merge-host" });
  let mv;
  const choice = await modal({
    wide: true,
    title: "This file changed on GitHub since you opened it",
    text: "Nothing is lost until you choose. You can still edit your side before saving it.",
    body: [h("div", { class: "merge-labels" }, h("span", {}, "On GitHub now"), h("span", {}, "Yours")), host],
    buttons: [
      { label: "Decide later", kind: "ghost", value: null },
      { spacer: true },
      { label: "Use the GitHub version", value: "theirs" },
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
    afterOutsideChange(f);
    toast("Showing the version from GitHub", "ok");
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
      + (d.sha !== f.sha ? " The file has changed on GitHub since then, so saving will show both versions." : "")),
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
 * A new note in a project's tasks folder starts with the fields that are on (only once a setup is saved).
 * With sprints on, it goes on the next sprint, if there is one, so the current sprint's plan stays as agreed;
 * a sprint the template already sets stays, and Add subtask then gives it its parent's.
 */
async function asNewTask(repo, tree, p, text) {
  const setup = await loadTaskSetup(repo);
  if (!setup.configured || !isSetupTask(setup, p.path)) return text;
  const out = withProps(text, newTaskProps(setup), { keep: true });
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
    h("li", {}, h("span", {}, "Open ", h("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener" }, "GitHub › New fine-grained token"), ".")),
    h("li", {}, h("span", {}, "Under ", h("b", {}, "Repository access"), ", choose ", h("b", {}, "Only select repositories"), " and pick your notes repos.")),
    h("li", {}, h("span", {}, "Under ", h("b", {}, "Permissions"), ", click ", h("b", {}, "Add permissions"), ", tick ", h("b", {}, "Contents"),
      ", and set it to ", h("b", {}, "Read and write"), ".")),
    h("li", {}, h("span", {}, "Generate the token, copy it, and paste it here.")));
}

const TOKEN_NOTE = "The token stays in this browser on this device and is sent only to GitHub. Anyone using this browser profile could read it, so revoke it on GitHub if the device is lost.";

async function connect(token, out) {
  fill(out, h("li", {}, icon("spinner"), "Checking the token…"));
  const probe = new GitHub(token);
  try {
    const u = await probe.user();
    app.token = token;
    gh = probe;
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
    notes: path("notes"), template: path("template"),
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
    const todo = reposToCheck(await gh.listRepos(), { seen, known: app.repos.map(repoKey), removed: state.removed || [] });
    const found = [];
    for (let i = 0; i < todo.length; i += 40) {
      const part = todo.slice(i, i + 40);
      const vars = {};
      const fields = part.map((x, j) => {
        vars[`o${j}`] = x.owner;
        vars[`n${j}`] = x.repo;
        return `r${j}: repository(owner: $o${j}, name: $n${j}) { object(expression: "HEAD:${MARKER}") { ... on Blob { text } } }`;
      });
      const args = part.map((_, j) => `$o${j}: String!, $n${j}: String!`).join(", ");
      const data = await gh.graphql(`query(${args}) {\n${fields.join("\n")}\n}`, vars);
      part.forEach((x, j) => {
        seen[repoKey(x)] = x.pushed;
        const text = data[`r${j}`]?.object?.text;
        const r = text != null ? parseMarker(text, x.owner, x.repo) : null;
        if (r) found.push({ ...r, branch: r.branch || x.branch });
      });
    }
    store.set("discovery", { ...(store.get("discovery") || {}), at: Date.now(), seen });
    return found.map(addRepo);
  })().finally(() => { discovering = null; }));
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
          const text = mergeMarker(latest.text, { repo: latest.text ? null : r, tasks: taskSetupJson(next) });
          await gh.writeText(latest.at, MARKER, text, latest.sha, `Set up task fields in ${MARKER} from ${APP_NAME}`);
          useTaskSetup(r, taskSetup(taskSetupJson(next)));
          toast(`Task fields saved in ${r.repo}.`, "ok");
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
function join(params) {
  const r = joinRepo(params);
  if (!r) return showProblem("This invite link is broken", "It doesn't say which repo to open. Ask for a new link.");
  if (!app.token) {
    store.set("join", r);
    return showWelcome(r);
  }
  redirect(hrefFor(addRepo(r)));
}

function guestSteps(r) {
  const tokenUrl = `https://github.com/settings/personal-access-tokens/new?${new URLSearchParams({ name: `${APP_NAME}: ${r.repo}`, target_name: r.owner })}`;
  return h("ol", { class: "steps" },
    h("li", {}, h("span", {}, "If you were invited on GitHub, accept the invitation first. It came by email; you can also open ",
      h("a", { href: `https://github.com/${r.owner}/${r.repo}/invitations`, target: "_blank", rel: "noopener" }, "the repo's invitation"), " or ",
      h("a", { href: `https://github.com/orgs/${r.owner}/invitation`, target: "_blank", rel: "noopener" }, "the organization's invitation"),
      " while signed in to GitHub.")),
    h("li", {}, h("span", {}, "Open ", h("a", { href: tokenUrl, target: "_blank", rel: "noopener" }, "GitHub › New fine-grained token"),
      ". Set ", h("b", {}, "Resource owner"), " to ", h("b", {}, r.owner), ", and under ", h("b", {}, "Repository access"),
      " choose ", h("b", {}, "Only select repositories"), " › ", h("b", {}, r.repo), ".")),
    h("li", {}, h("span", {}, "Under ", h("b", {}, "Permissions"), ", click ", h("b", {}, "Add permissions"), ", tick ", h("b", {}, "Contents"),
      ", and set it to ", h("b", {}, "Read and write"), " if you were asked to edit, or leave it at ", h("b", {}, "Read-only"), " if not.")),
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
      h("p", { class: "fine" }, TOKEN_NOTE))));
}

/** Opened straight from a link (or after Settings), the sidebar still shows the last repo's files. */
async function ensureSidebar() {
  if (app.repo || !app.token) return;
  const repo = app.repos.find((r) => r.id === store.get("lastRepo")) || app.repos[0];
  if (!repo) return;
  app.repo = repo;
  renderRepoPicker();
  try {
    await loadTree(repo);
    if (app.repo === repo) { renderTree(); renderShortcuts(); }
  } catch { /* Settings shows what's wrong when access is checked */ }
}

function showSettings(adding = false) {
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
        if (!(await confirmDialog("Disconnect this device?", "The token is removed from this browser. Unsaved drafts stay.", "Disconnect", true))) return;
        app.token = "";
        store.remove("token");
        store.remove("user");
        gh = new GitHub("");
        app.trees.clear();
        app.repo = null;
        renderWho();
        location.hash = "#/";
        route();
      } }, "Disconnect")),
    out,
    h("details", { class: "fine" }, h("summary", {}, "How to make a new token"), tokenSteps()),
    h("p", { class: "fine" }, TOKEN_NOTE));

  // ---- repos ----
  const forms = h("div", {});
  const field = (label, name, value, hint, full) => h("label", { class: `field${full ? " full" : ""}` }, h("span", {}, label),
    h("input", { class: "input", name, value: value ?? "", spellcheck: "false", autocapitalize: "off", autocomplete: "off" }),
    hint ? h("small", {}, hint) : null);
  const repoCard = (r, open = false) => h("details", { class: "repo-card", "data-id": r.id || "", open },
    h("summary", {}, icon(r.vault ? "home" : "folder"),
      h("span", {}, h("span", { class: "repo-name" }, r.label || "New repo"), h("br"),
        h("span", { class: "repo-where" }, r.repo ? `${r.owner}/${r.repo} · ${r.branch}${r.folder ? ` · ${r.folder}/` : ""}` : "Fill in the fields below")),
      icon("chevron", "chev")),
    h("div", { class: "repo-fields" },
      field("Name shown", "label", r.label, "What the repo is called in the list at the top of the files. Empty: owner/repo.", true),
      field("Owner", "owner", r.owner, "The GitHub user or organization the repo belongs to, as in github.com/owner/repo."),
      field("Repo", "repo", r.repo, "The repo's name, as in github.com/owner/repo."),
      field("Branch", "branch", r.branch, "The branch to read and save to. Empty: main."),
      field("Folder", "folder", r.folder, "Show only this folder of the repo, e.g. notes. Empty: the whole repo. The paths below are inside it."),
      field("Start page", "home", r.home, "The note that opens first, e.g. Home.md."),
      field("Inbox page", "inbox", r.inbox, "A note for quick notes and tasks, e.g. Notes/Inbox.md. It gets an Inbox button. Empty: no button."),
      field("Inboxes folder", "inboxes", r.inboxes, "A folder with one inbox per person, e.g. Notes/Inboxes. The Inbox button opens the note whose github property is your GitHub login."),
      field("New notes folder", "notes", r.notes, "e.g. Notes. New note then asks only for a title and puts the note here. Empty: you pick the folder and kind each time."),
      field("Note template", "template", r.template, "A note new notes start from, e.g. Templates/Note.md; {{title}} and {{date}} are filled in. Empty: a new note starts with its title."),
      h("label", { class: "check-line full" }, h("input", { type: "checkbox", name: "vault", checked: !!r.vault }),
        h("span", {}, "Vault rules: the generated navigation box (between %% nav: … %% and %% /nav %%) is folded and can't be edited, and links that lead to no page are warned about")),
      h("div", { class: "full card-actions" },
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
        h("button", { class: "btn small danger", type: "button", onclick: (e) => e.target.closest("details").remove() }, icon("trash"), "Remove this repo"))));
  const newCard = () => repoCard({ owner: store.get("user")?.login || "", branch: "main", home: "README.md" }, true);
  forms.append(...app.repos.map((r) => repoCard(r)));
  if (adding || !app.repos.length) forms.append(newCard());
  const saveRepos = () => {
    const ids = new Set();
    const repos = [...forms.querySelectorAll("details.repo-card")].map((card) => {
      const v = (n) => card.querySelector(`[name=${n}]`).value.trim();
      const r = {
        label: v("label"), owner: v("owner"), repo: v("repo"), branch: v("branch") || "main",
        folder: cleanDir(v("folder")), inbox: cleanDir(v("inbox")), inboxes: cleanDir(v("inboxes")), home: cleanDir(v("home")),
        notes: cleanDir(v("notes")), template: cleanDir(v("template")),
        vault: card.querySelector("[name=vault]").checked,
      };
      let id = card.dataset.id || r.repo.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "repo";
      while (ids.has(id)) id += "-2";
      ids.add(id);
      return { id, ...r, label: r.label || `${r.owner}/${r.repo}` };
    }).filter((r) => r.owner && r.repo);
    // A repo removed by hand isn't added back by the look for vaults on GitHub; one added again is.
    const kept = new Set(repos.map(repoKey));
    const discovery = store.get("discovery") || {};
    const removed = new Set((discovery.removed || []).filter((k) => !kept.has(k)));
    for (const r of app.repos) if (!kept.has(repoKey(r))) removed.add(repoKey(r));
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
      ? "The GitHub repos the app opens. Switch between them at the top of the file list."
      : "No repos yet. Fill in the one that holds your notes (Owner and Repo are enough to start), then press Save repos."),
    h("p", { class: "fine" }, `Repos you can save to that have a ${MARKER} at the top are added by themselves. To share a repo's settings with everyone who can save to it, open it below and press Share with everyone.`),
    forms,
    h("div", { class: "card-actions" },
      h("button", { class: "btn", onclick: () => forms.append(newCard()) }, icon("plus"), "Add a repo"),
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
  const pickVersion = (dev) => {
    store.set("version", dev ? "dev" : "main");
    if (dev !== DEV_BUILD) location.assign(versionHref(dev));
  };
  const device = h("section", { class: "card" },
    h("h2", {}, icon("history"), "This device"),
    h("div", { class: "field" },
      h("span", {}, "App version"),
      h("div", { class: "seg version-pick", role: "group", "aria-label": "App version" },
        h("button", { type: "button", class: DEV_BUILD ? "" : "on", "aria-pressed": String(!DEV_BUILD), onclick: () => pickVersion(false) }, "Released"),
        h("button", { type: "button", class: DEV_BUILD ? "on" : "", "aria-pressed": String(DEV_BUILD), onclick: () => pickVersion(true) }, "In development")),
      h("small", { class: "hint" }, DEV_BUILD
        ? "You're on the version in development: the newest work, not released yet, so things may break. This device opens it from now on, also from the usual address."
        : "You're on the released version. The version in development has the newest work before it's released, and things may break there.")),
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
    github, repos, device));
}

// ================================================================
// Start
// ================================================================

/**
 * Which version this device follows. The released version sends a device that picked the development one on
 * to it, once per try: if the development version doesn't open (the device comes back here), it stays.
 * Resolves to false when the page is leaving.
 */
function followVersion() {
  let session = null;
  try { session = sessionStorage; } catch { /* storage blocked: no sending on */ }
  if (DEV_BUILD) {
    session?.removeItem(TO_DEV);
    if (store.get("version") !== "dev") store.set("version", "dev");
    document.body.classList.add("dev-build");
    return true;
  }
  if (store.get("version") !== "dev" || !session) return true;
  if (session.getItem(TO_DEV)) {
    session.removeItem(TO_DEV);
    setTimeout(() => toast("The version in development didn't open, so this is the released one. Settings › This device picks the version.", "error"), 0);
    return true;
  }
  session.setItem(TO_DEV, "1");
  location.replace(versionHref(true));
  return false;
}

function start() {
  if (!followVersion()) return;
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
  $("#side-new").addEventListener("click", () => { closeSideOnPhone(); newNote(); });
  $("#reload-btn").addEventListener("click", reloadFromGitHub);
  $("#nudge-reload").addEventListener("click", reloadFromGitHub);
  $("#settings-btn").addEventListener("click", () => { closeMenu(); location.hash = "#/settings"; });
  $("#side-settings").addEventListener("click", () => { location.hash = "#/settings"; });
  $("#filter").addEventListener("input", debounce(renderTree, 120));
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
  addEventListener("pagehide", flushDraft);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushDraft(); else checkForNewer(); });
  setInterval(checkForNewer, CHECK_EVERY);
  addEventListener("beforeunload", (e) => { if (app.file?.dirty) e.preventDefault(); });
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
