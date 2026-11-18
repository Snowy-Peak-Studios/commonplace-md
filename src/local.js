// Local vaults: notes kept only on this device, never on GitHub. In Chrome and Edge (desktop) a local vault is a
// folder on the disk, picked once, whose notes are real files other tools and agents can read and change; in the
// other browsers it's kept in the browser's own storage (IndexedDB). `LocalSource` answers the same calls the app
// makes on `GitHub` (tree, readText, readBlob, readBlobText, writeText, commitFiles, searchCode), so the rest of
// the app doesn't change, and `withLocal` sends a local vault's calls to it.

import { GitHubError, blobSha } from "./github.js";
import { MARKER, parseMarker } from "./vault.js";

/** Whether a repo is a local vault: "folder" (a folder on the disk) or "browser" (kept in this browser). */
export const isLocal = (r) => r?.local === "folder" || r?.local === "browser";

/** Whether this browser can open a folder on the disk (Chrome and Edge on a computer; Brave once it's turned on). */
export const canPickFolder = () => typeof globalThis.showDirectoryPicker === "function";

/** Brave: built on Chrome, but it turns opening folders off by default (a flag turns it on). */
export const isBrave = () => !!globalThis.navigator?.brave;

/** Something a local vault needs before it opens: `need` is "permission" (one tap to allow the folder again) or "folder". */
export class LocalError extends GitHubError {
  constructor(need, message) {
    super(0, message);
    this.need = need;
  }
}

// ---- the browser's storage: IndexedDB, guarded like the rest of storage ----

const DB_NAME = "commonplace";
let opening = null;
function db() {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const d = req.result;
      for (const name of ["files", "handles", "meta"]) if (!d.objectStoreNames.contains(name)) d.createObjectStore(name);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(() => {
    opening = null;
    throw new GitHubError(0, "This browser's storage is blocked or full, so local vaults can't be kept here.");
  });
  return opening;
}

const done = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

/** One request on one IndexedDB store (`files`, `handles` or `meta`), as a promise. */
export async function idb(name, mode, use) {
  const st = (await db()).transaction(name, mode).objectStore(name);
  try {
    return await done(use(st));
  } catch (e) {
    throw new GitHubError(0, `This browser's storage refused: ${e?.message || e}`);
  }
}

/** The folder a vault was given (a FileSystemDirectoryHandle), kept in IndexedDB: handles can't go anywhere else. */
export const folderOf = (id) => idb("handles", "readonly", (st) => st.get(id)).catch(() => null);
export const keepFolder = (id, handle) => idb("handles", "readwrite", (st) => st.put(handle, id));
export const forgetFolder = (id) => idb("handles", "readwrite", (st) => st.delete(id)).catch(() => {});

// ---- where a vault's files are ----

const SKIP = new Set(["node_modules"]);
const fileKey = (id, path) => `${id}:${path}`;
const vaultRange = (id) => IDBKeyRange.bound(`${id}:`, `${id}:￿`);

/** A vault kept in the browser: one IndexedDB record per file, { bytes, mtime }. */
export class BrowserFiles {
  constructor(id) {
    this.id = id;
  }
  async list(withDots = false, under = "") {
    const [keys, values] = await Promise.all([
      idb("files", "readonly", (st) => st.getAllKeys(vaultRange(this.id))),
      idb("files", "readonly", (st) => st.getAll(vaultRange(this.id))),
    ]);
    return keys.map((k, i) => ({
      path: k.slice(this.id.length + 1), size: values[i].bytes.byteLength, mtime: values[i].mtime,
      bytes: async () => new Uint8Array(values[i].bytes),
    })).filter((f) => f.path.startsWith(under));
  }
  async read(path) {
    const rec = await idb("files", "readonly", (st) => st.get(fileKey(this.id, path)));
    if (!rec) throw new GitHubError(404, `${path} isn't in this vault.`);
    return new Uint8Array(rec.bytes);
  }
  write(path, bytes) {
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return idb("files", "readwrite", (st) => st.put({ bytes: copy, mtime: Date.now() }, fileKey(this.id, path)));
  }
  remove(path) {
    return idb("files", "readwrite", (st) => st.delete(fileKey(this.id, path)));
  }
  clear() {
    return idb("files", "readwrite", (st) => st.delete(vaultRange(this.id)));
  }
}

/** A vault in a folder on the disk, through the File System Access API. Dot-folders (.git) are never walked. */
export class FolderFiles {
  constructor(handle) {
    this.handle = handle;
  }
  /** Every file, or every file under the folder `under` ("Wiki/"), with its path from the top folder. */
  async list(withDots = false, under = "") {
    const out = [];
    const walk = async (dir, prefix) => {
      for await (const [name, h] of dir.entries()) {
        if ((!withDots && name.startsWith(".")) || name === ".git" || SKIP.has(name)) continue;
        if (h.kind === "directory") await walk(h, `${prefix}${name}/`);
        else {
          const file = await h.getFile();
          out.push({ path: prefix + name, size: file.size, mtime: file.lastModified, bytes: async () => new Uint8Array(await file.arrayBuffer()) });
        }
      }
    };
    let start = this.handle;
    try {
      for (const seg of under.split("/").filter(Boolean)) start = await start.getDirectoryHandle(seg);
    } catch {
      return out; // the folder isn't there yet
    }
    await walk(start, under);
    return out;
  }
  async fileHandle(path, create = false) {
    const segs = path.split("/").filter(Boolean);
    let dir = this.handle;
    try {
      for (const seg of segs.slice(0, -1)) dir = await dir.getDirectoryHandle(seg, { create });
      return await dir.getFileHandle(segs.at(-1), { create });
    } catch (e) {
      if (e?.name === "NotFoundError") throw new GitHubError(404, `${path} isn't in this folder.`);
      if (e?.name === "TypeMismatchError") throw new GitHubError(400, `${path} is a folder.`);
      if (e?.name === "NotAllowedError") throw new LocalError("permission", "The browser needs your OK to open this folder again.");
      throw new GitHubError(0, `${path}: ${e?.message || e}`);
    }
  }
  async read(path) {
    const file = await (await this.fileHandle(path)).getFile();
    return new Uint8Array(await file.arrayBuffer());
  }
  async write(path, bytes) {
    const w = await (await this.fileHandle(path, true)).createWritable();
    await w.write(bytes);
    await w.close();
  }
  async remove(path) {
    const segs = path.split("/").filter(Boolean);
    let dir = this.handle;
    try {
      for (const seg of segs.slice(0, -1)) dir = await dir.getDirectoryHandle(seg);
      await dir.removeEntry(segs.at(-1));
    } catch { /* gone already */ }
  }
}

const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder("utf-8").decode(bytes);
const SEARCHED = /\.(md|markdown|txt|csv|tsv|base|json|ya?ml|canvas)$/i;

/** The local vaults' files, with the calls the app makes on GitHub. */
export class LocalSource {
  constructor() {
    this.vaults = new Map(); // repo id -> { paths: Map(sha -> path), shas: Map("path|mtime|size" -> sha) }
  }

  state(r) {
    if (!this.vaults.has(r.id)) this.vaults.set(r.id, { paths: new Map(), shas: new Map() });
    return this.vaults.get(r.id);
  }

  async files(r) {
    if (r.local === "browser") return new BrowserFiles(r.id);
    const handle = await folderOf(r.id);
    if (!handle) throw new LocalError("folder", `This browser doesn't know ${r.label}'s folder any more. Pick it again.`);
    const state = await handle.queryPermission?.({ mode: "readwrite" });
    if (state && state !== "granted") throw new LocalError("permission", `The browser asks again for your OK to open the folder ${handle.name} each time it's opened.`);
    return new FolderFiles(handle);
  }

  /** Asks the browser for the folder again (it must come from a tap or a click). Resolves to whether it's allowed. */
  async allow(r) {
    const handle = await folderOf(r.id);
    if (!handle) return false;
    try {
      return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
    } catch {
      return false;
    }
  }

  /** The folder's name, for Settings; "" for a vault kept in the browser or a folder no longer known. */
  async folderName(r) {
    return r.local === "folder" ? (await folderOf(r.id))?.name || "" : "";
  }

  /** Every file and its sha (git's, so a note's sha means the same as on GitHub), like GitHub's tree. */
  async tree(r) {
    const all = await (await this.files(r)).list();
    const st = this.state(r);
    st.paths = new Map();
    const tree = await Promise.all(all.map(async (f) => {
      const key = `${f.path}|${f.mtime}|${f.size}`;
      let sha = st.shas.get(key);
      if (!sha) {
        sha = await blobSha(await f.bytes());
        st.shas.set(key, sha);
      }
      st.paths.set(sha, f.path);
      return { path: f.path, type: "blob", sha };
    }));
    return { tree, truncated: false };
  }

  /** A local vault has no commits: nothing newer to look for, and Reload reads it again. */
  async headSha() {
    return { sha: null, etag: null };
  }

  async repo() {
    return { permissions: { push: true } };
  }

  async branch() {
    return { name: "" };
  }

  async readText(r, path) {
    const bytes = await (await this.files(r)).read(path);
    const sha = await blobSha(bytes);
    this.state(r).paths.set(sha, path);
    return { text: decode(bytes), sha };
  }

  async readBlob(r, sha) {
    const path = this.state(r).paths.get(sha);
    if (!path) throw new GitHubError(404, "That file isn't in this vault any more. Reload it.");
    return new Blob([await (await this.files(r)).read(path)]);
  }

  async readBlobText(r, sha) {
    const path = this.state(r).paths.get(sha);
    if (!path) throw new GitHubError(404, "That file isn't in this vault any more. Reload it.");
    return decode(await (await this.files(r)).read(path));
  }

  /**
   * Saves a file, refusing like GitHub does when it changed since it was read (`sha` no longer the file's),
   * or when it's there already and no `sha` was given. Then the app offers to merge, as for a GitHub save.
   */
  writeText(r, path, text, sha) {
    return this.writeFile(r, path, encode(text), sha);
  }

  writeBytes(r, path, bytes) {
    return this.writeFile(r, path, bytes);
  }

  async writeFile(r, path, bytes, sha) {
    const files = await this.files(r);
    let current = null;
    try { current = await blobSha(await files.read(path)); } catch (e) { if (e.status !== 404) throw e; }
    if (current && current !== sha) {
      throw new GitHubError(409, sha ? `${path} changed on this device since it was opened.` : `${path} is there already.`);
    }
    await files.write(path, bytes);
    const next = await blobSha(bytes);
    this.state(r).paths.set(next, path);
    return { sha: next, commit: null, parent: null };
  }

  /** Several files at once (no commit here): { commit, parent, shas } like GitHub's. */
  async commitFiles(r, list) {
    const files = await this.files(r);
    const shas = {};
    for (const f of list) {
      const bytes = encode(f.text);
      await files.write(f.path, bytes);
      shas[f.path] = await blobSha(bytes);
      this.state(r).paths.set(shas[f.path], f.path);
    }
    return { commit: null, parent: null, shas };
  }

  /** Searches inside the notes on this device: the files holding every word, as GitHub's search answers. */
  async searchCode(r, query) {
    const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    const files = (await (await this.files(r)).list()).filter((f) => SEARCHED.test(f.path) && f.size < 2_000_000);
    const items = [];
    for (const f of files) {
      const text = decode(await f.bytes()).toLowerCase();
      if (words.every((w) => text.includes(w))) items.push({ path: f.path });
    }
    return { items: items.slice(0, 100) };
  }

  /**
   * Starts a vault: keeps its folder (for "folder"), and fills it with `seed` ([{ path, bytes }]) when it's empty,
   * so a folder that already holds notes (another vault, say) opens as it is. Resolves to whether it was seeded.
   */
  async create(r, { handle = null, seed = [] } = {}) {
    if (r.local === "folder") await keepFolder(r.id, handle);
    const files = r.local === "folder" ? new FolderFiles(handle) : new BrowserFiles(r.id);
    if ((await files.list()).length) return false;
    for (const f of seed) await files.write(f.path, f.bytes);
    return true;
  }

  /** Forgets a vault: a browser vault's notes are deleted; a folder's stay on the disk. */
  async remove(r) {
    this.vaults.delete(r.id);
    if (r.local === "browser") await new BrowserFiles(r.id).clear();
    await forgetFolder(r.id);
  }

  /** Every file of the vault, hidden ones too, as one zip (Uint8Array) to keep a copy. */
  async zip(r) {
    const files = await this.files(r);
    const all = files instanceof FolderFiles ? await files.list(true) : await files.list();
    return zipFiles(await Promise.all(all.map(async (f) => ({ path: f.path, bytes: await f.bytes(), mtime: f.mtime }))));
  }
}

const ROUTED = new Set(["tree", "headSha", "repo", "branch", "readText", "readBlob", "readBlobText", "writeText", "writeBytes", "commitFiles", "searchCode"]);
const MIRRORED = new Set(["tree", "readText", "readBlob", "readBlobText", "writeText", "writeBytes", "commitFiles", "searchCode"]);

/**
 * The GitHub client, with every call about a local vault (its first argument) answered by `local` instead, and,
 * with a `mirror` (src/mirror.js), a GitHub vault's reads and saves going through its copy on this device.
 */
export function withLocal(github, local, mirror = null) {
  return new Proxy(github, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (!ROUTED.has(prop)) return typeof value === "function" ? value.bind(target) : value;
      return (r, ...rest) => (isLocal(r) ? local[prop](r, ...rest)
        : mirror && MIRRORED.has(prop) ? mirror[prop](target, r, ...rest)
          : value.call(target, r, ...rest));
    },
  });
}

// ---- a zip, to keep a copy: stored (not compressed), which every unzip tool reads ----

let crcTable = null;
export function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(ms) {
  const d = new Date(ms || Date.now());
  const year = Math.max(d.getFullYear(), 1980);
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** A zip of [{ path, bytes, mtime }]: names in UTF-8, files stored as they are. */
export function zipFiles(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = encode(f.path);
    const data = f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes);
    const crc = crc32(data);
    const { time, date } = dosTime(f.mtime);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // the name is UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(12, time, true);
    entry.setUint16(14, date, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) { out.set(p, at); at += p.length; }
  return out;
}

// ---- what a new vault starts with ----

/** The example vault's files (as in the app's example-vault/ folder), fetched from the app's own site. */
export const EXAMPLE_FILES = [
  ".agents/skills/public-check/SKILL.md", ".agents/skills/sort-inbox/SKILL.md", ".agents/skills/start-task/SKILL.md",
  ".agents/skills/wrap-up-task/SKILL.md", ".claude/skills/public-check/SKILL.md", ".claude/skills/sort-inbox/SKILL.md",
  ".claude/skills/start-task/SKILL.md", ".claude/skills/wrap-up-task/SKILL.md", "AGENTS.md", "Attachments/An example PDF.pdf",
  "Attachments/commonplace.svg", "Bases/Sprints.base", "Bases/Tasks.base", "CLAUDE.md", "Data/Pantry.tsv",
  "Data/Reading list.csv", "Data/settings.json", "Data/word_count.py", "Guide.md", "Home.md", "How To/Add a vault.md",
  "How To/Connect to GitHub.md", "How To/How To.md", "How To/Invite someone.md", "How To/Markdown and blocks.md",
  "How To/Run sprints.md",
  "How To/Save, drafts and conflicts.md", "How To/Use it on a phone.md", "How To/Use your inbox.md",
  "How To/Work with tasks.md", "How To/Write and link notes.md", "Notes/Inbox.md", "Notes/Inboxes/Your name.md",
  "Other kinds of files.md", "Set up tasks.md", "Sprints/Sprint 1.md", "Sprints/Sprint 2.md", "Task Board.md",
  "Tasks/Add a reading list.md", "Tasks/Get set up.md", "Tasks/Invite a friend.md", "Tasks/Make a note template.md",
  "Tasks/Review the example vault.md", "Tasks/Try the app on a phone.md", "Tasks/Write the welcome note.md", "Templates/Note.md", "Templates/Task.md",
];

/** The example vault's settings, as its README suggests them. */
const EXAMPLE_SETTINGS = {
  home: "Home.md", inbox: "Notes/Inbox.md", inboxes: "Notes/Inboxes", notes: "Notes", template: "Templates/Note.md", attachments: "Attachments", vault: true,
};

/** Starter vaults copied by the local vault dialog. Each starter folder can also be copied on its own. */
export const EXAMPLE_VAULTS = [
  { key: "feature-guide", label: "Feature guide · Commonplace.md", name: "My notes", directory: "example-vault", files: EXAMPLE_FILES, settings: EXAMPLE_SETTINGS },
  {
    key: "solo-project", label: "Solo project · Trail Timer", name: "Trail Timer", directory: "examples/solo-project",
    files: [
      ".commonplace.json",
      "AGENTS.md",
      "Home.md",
      "Notes/Inbox.md",
      "Notes/Run screen.md",
      "Task Board.md",
      "Tasks/Check silent mode.md",
      "Tasks/Save an interval preset.md",
      "Tasks/Sketch the run screen.md",
      "Templates/Note.md",
    ],
  },
  {
    key: "small-team", label: "Small team · Pocket Garden", name: "Pocket Garden", directory: "examples/small-team",
    files: [
      ".commonplace.json",
      "Home.md",
      "Notes/Inboxes/Miro Finch.md",
      "Notes/Inboxes/Neri Holt.md",
      "Notes/Inboxes/Tavi Vale.md",
      "Notes/Reminder rules.md",
      "Notes/Team Inbox.md",
      "Task Board.md",
      "Tasks/Check the first reminder.md",
      "Tasks/Design the garden list.md",
      "Tasks/Save a care note.md",
      "Templates/Note.md",
    ],
  },
  {
    key: "large-team", label: "Large team · Signal Station", name: "Signal Station", directory: "examples/large-team",
    files: [
      ".commonplace.json",
      "Home.md",
      "Notes/Demo brief.md",
      "Notes/Inboxes/Aven Moss.md",
      "Notes/Inboxes/Bren Alder.md",
      "Notes/Inboxes/Kest Wren.md",
      "Notes/Inboxes/Lio Beck.md",
      "Notes/Inboxes/Mera Linn.md",
      "Notes/Inboxes/Oren Pike.md",
      "Notes/Inboxes/Ryn Vale.md",
      "Notes/Inboxes/Sela Drift.md",
      "Notes/Inboxes/Tess Flint.md",
      "Notes/Inboxes/Vela Reed.md",
      "Notes/Team Inbox.md",
      "Sprints/Demo sprint.md",
      "Sprints/Route sprint.md",
      "Task Board.md",
      "Tasks/Connect the station route.md",
      "Tasks/Light the main route.md",
      "Tasks/Make the station playable.md",
      "Tasks/Package a clean build.md",
      "Tasks/Place the radio cue.md",
      "Tasks/Prepare the demo handoff.md",
      "Tasks/Run the demo from a clean install.md",
      "Templates/Note.md",
    ],
  },
  {
    key: "personal-notes", label: "Personal notes · Kitchen Notebook", name: "Kitchen Notebook", directory: "examples/personal-notes",
    files: [
      ".commonplace.json",
      "Home.md",
      "Notes/Pantry.md",
      "Notes/This week's meals.md",
      "Recipes/Apple oat jars.md",
      "Recipes/Lemon chickpea bowls.md",
      "Templates/Note.md",
    ],
  },
];

/** An empty vault's one note. */
export function emptyVault(name, kept) {
  const where = kept === "folder"
    ? "Its notes are the files in the folder you picked: your agent and other tools can read and change them, and Reload shows their changes."
    : "Its notes are kept in this browser. They're lost if the browser's data is cleared, so download a copy now and then (Settings, Download a copy).";
  return [{ path: "Home.md", bytes: encode(`# ${name}\n\nThis vault is only on this device: not on GitHub, not on your other devices. ${where}\n\nPress **New note** to start.\n`) }];
}

/** Fetches a starter before writing any notes. The feature guide keeps its existing best-effort fetch. */
export async function fetchExample(example = EXAMPLE_VAULTS[0], base = new URL(`${example.directory}/`, document.baseURI)) {
  const got = await Promise.all(example.files.map(async (path) => {
    try {
      const res = await fetch(new URL(path.split("/").map(encodeURIComponent).join("/"), base));
      return res.ok ? { path, bytes: new Uint8Array(await res.arrayBuffer()) } : null;
    } catch {
      return null;
    }
  }));
  const files = got.filter(Boolean);
  if (!files.some((f) => f.path === "Home.md") || (!example.settings && files.length !== example.files.length)) {
    throw new GitHubError(0, "The example notes didn't come. Check the connection and try again, or start with an empty vault.");
  }
  const marker = files.find((f) => f.path === MARKER);
  const settings = example.settings ?? (marker && parseMarker(decode(marker.bytes), "", ""));
  if (!settings) throw new GitHubError(0, "The example vault's settings could not be read.");
  return { files, settings };
}
