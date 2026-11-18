// A copy of each GitHub vault on this device, so it opens with no connection: in a folder the person picks (Chrome
// and Edge on a computer, e.g. the repo's clone), else in the browser (IndexedDB). It's kept in step with GitHub
// whenever the vault opens or reloads: only the files whose sha changed are downloaded. GitHub stays the main copy.
// A file changed on the disk (an agent, another editor) is never overwritten: it shows as it is, marked as not on
// GitHub. `withLocal` (src/local.js) sends a GitHub vault's reads and saves here; this passes them on to GitHub.
// A save made while GitHub can't be reached waits in the copy and is uploaded, as its own commit, once it can.

import { GitHubError, blobSha } from "./github.js";
import { BrowserFiles, FolderFiles, folderOf, keepFolder, forgetFolder, idb } from "./local.js";

export const mirrorId = (r) => `mirror:${r.id}`;
const prefixOf = (r) => (r.folder ? `${r.folder.replace(/\/+$/, "")}/` : "");
const hidden = (rel) => rel.split("/").some((seg) => seg.startsWith("."));
/** GitHub can't be reached: no connection (status 0) or GitHub itself is down. */
export const unreachable = (e) => e instanceof GitHubError && (e.status === 0 || e.status >= 500);

const BINARY = new RegExp("\\.(png|jpe?g|gif|webp|avif|bmp|ico|svg|pdf|zip|7z|rar|gz|tgz|bz2|xz|tar|jar|apk|dmg|iso|msi|exe|dll"
  + "|so|dylib|bin|wasm|class|pyc|mp3|m4a|aac|flac|wav|ogg|opus|mid|mp4|m4v|mov|webm|mkv|avi|wmv|ttf|otf|woff2?|eot"
  + "|docx?|xlsx?|xlsm|pptx?|odt|ods|odp|epub|psd|ai|sketch|fig|xcf|kra|blend|fbx|glb|sqlite|db|pck)$", "i");
/** Kept as soon as the vault syncs: text files under 1 MB. Images, PDFs and the rest are kept once they're opened. */
export const keptAtOnce = (e) => !BINARY.test(e.path) && (e.size ?? 0) < 1_000_000;

const enc = (text) => new TextEncoder().encode(text);
const dec = (bytes) => new TextDecoder("utf-8").decode(bytes);
const SEARCHED = /\.(md|markdown|txt|csv|tsv|base|json|ya?ml|canvas)$/i;

/**
 * What to do with each file, from GitHub's files (`remote`: path -> { sha, size }), the copy's (`local`: path -> sha)
 * and each file's base (`bases`: path -> the sha it last had from GitHub). Returns the sha the app sees for each file
 * (`shas`), the files changed on this device and not on GitHub (`changed`), the files to download (`download`), the
 * files gone from GitHub and unchanged here (`remove`), and the files the copy already has as GitHub does (`adopt`,
 * path -> sha: a clone's files, kept with no download).
 */
export function plan(remote, local, bases) {
  const shas = new Map();
  const changed = new Set();
  const download = [];
  const remove = [];
  const adopt = new Map();
  for (const [path, e] of remote) {
    const here = local.get(path);
    const base = bases.get(path);
    if (here === e.sha) {
      shas.set(path, e.sha);
      if (base !== e.sha) adopt.set(path, e.sha);
    } else if (here != null && here !== base) {
      // Changed here since GitHub's last version, or a clone's file of unknown age: never overwritten.
      shas.set(path, here);
      changed.add(path);
    } else {
      shas.set(path, e.sha);
      if (here != null || keptAtOnce({ ...e, path })) download.push(path);
    }
  }
  for (const [path, here] of local) {
    if (remote.has(path)) continue;
    if (bases.get(path) === here) remove.push(path);
    else {
      shas.set(path, here);
      changed.add(path);
    }
  }
  return { shas, changed, download, remove, adopt };
}

let persisted = false;
/** Asks the browser to keep this site's storage when it needs room, once. */
function persist() {
  if (persisted) return;
  persisted = true;
  try { navigator.storage?.persist?.().catch(() => {}); } catch { /* not offered */ }
}

export class Mirror {
  constructor() {
    this.repos = new Map(); // repo id -> state, below
    /** Called with a repo when what waits or what changed here moves on (the app redraws its marks). */
    this.onChange = null;
  }

  notify(r) {
    try { this.onChange?.(r); } catch { /* the app's business */ }
  }

  state(r) {
    if (!this.repos.has(r.id)) {
      this.repos.set(r.id, {
        files: undefined, // FolderFiles, BrowserFiles, or null (no copy this time)
        folder: "", // the folder's name, when it's a folder
        needsAllow: "", // the folder's name, while the browser waits for the person's OK
        bases: null, // path -> sha it last had from GitHub
        syncedAt: null,
        local: new Map(), // path -> sha, as last looked at
        shaCache: new Map(), // "path|mtime|size" -> sha
        bySha: new Map(), // sha -> path, the files the copy has
        remote: new Map(), // path -> sha on GitHub, from the last tree
        remoteBySha: new Map(),
        changed: new Set(),
        offline: false,
        syncing: null,
        github: null, // the GitHub client last used, to upload with later
        remoteKnown: false, // `remote` comes from GitHub's tree this session
        pending: new Map(), // path -> { base, at, message, state: "" | "conflict" | "gone", error }: saves waiting to upload
        flushing: null,
      });
    }
    return this.repos.get(r.id);
  }

  /** Where the copy is; null when there's none this time (storage blocked, or a folder waiting for an OK). */
  async files(r) {
    const st = this.state(r);
    if (st.files !== undefined) return st.files;
    let files = null;
    try {
      await idb("meta", "readonly", (s) => s.count());
      const handle = await folderOf(mirrorId(r));
      if (handle) {
        st.folder = handle.name;
        const ok = (await handle.queryPermission?.({ mode: "readwrite" })) ?? "granted";
        if (ok === "granted") files = new FolderFiles(handle);
        else st.needsAllow = handle.name;
      } else files = new BrowserFiles(mirrorId(r));
    } catch { /* storage blocked: GitHub only */ }
    st.files = files;
    return files;
  }

  /** What Settings and the note's line say: { where: "folder" | "browser" | "", folder, needsAllow, offline, syncedAt }. */
  info(r) {
    const st = this.state(r);
    const where = st.files instanceof FolderFiles ? "folder" : st.files instanceof BrowserFiles ? "browser" : st.needsAllow ? "folder" : "";
    return { where, folder: st.folder, needsAllow: st.needsAllow, offline: st.offline, syncedAt: st.syncedAt };
  }

  async load(r, files) {
    const st = this.state(r);
    if (!st.bases) {
      const meta = await idb("meta", "readonly", (s) => s.get(`bases:${mirrorId(r)}`)).catch(() => null);
      st.bases = new Map(Object.entries(meta?.bases || {}));
      st.syncedAt = meta?.syncedAt ?? null;
      st.pending = new Map(Object.entries(meta?.pending || {}));
    }
    const list = await files.list(false, prefixOf(r));
    st.local = new Map();
    st.bySha = new Map();
    await Promise.all(list.map(async (f) => {
      if (hidden(f.path.slice(prefixOf(r).length))) return;
      const key = `${f.path}|${f.mtime}|${f.size}`;
      let sha = st.shaCache.get(key);
      if (!sha) {
        sha = await blobSha(await f.bytes());
        st.shaCache.set(key, sha);
      }
      st.local.set(f.path, sha);
      st.bySha.set(sha, f.path);
    }));
  }

  async saveBases(r) {
    const st = this.state(r);
    await idb("meta", "readwrite", (s) => s.put({
      bases: Object.fromEntries(st.bases), syncedAt: st.syncedAt, pending: Object.fromEntries(st.pending),
    }, `bases:${mirrorId(r)}`)).catch(() => {});
  }

  /** GitHub's tree with the copy's changes in it; with no connection, the copy's own tree (`offline: true`). */
  async tree(github, r, ref, { readOnly = false, current = () => true } = {}) {
    const files = await this.files(r);
    if (!files) return github.tree(r, ref);
    const st = this.state(r);
    st.github = github;
    let data;
    try {
      data = await github.tree(r, ref);
    } catch (e) {
      if (!unreachable(e)) throw e;
      try { await this.load(r, files); } catch { throw e; }
      if (!st.local.size) throw e;
      st.offline = true;
      st.changed = new Set([...st.local].filter(([p, sha]) => st.bases.get(p) !== sha).map(([p]) => p));
      return {
        tree: [...st.local].map(([path, sha]) => ({ path, type: "blob", sha })), truncated: false,
        offline: true, syncedAt: st.syncedAt, changed: st.changed,
      };
    }
    st.offline = false;
    try {
      await this.load(r, files);
    } catch {
      // The copy can't be read (a folder that went away): GitHub as it is, with no copy this time.
      st.files = null;
      return data;
    }
    const prefix = prefixOf(r);
    const remote = new Map(data.tree
      .filter((e) => e.type === "blob" && e.path.startsWith(prefix) && !hidden(e.path.slice(prefix.length)))
      .map((e) => [e.path, e]));
    const p = plan(remote, st.local, st.bases);
    st.remote = new Map([...remote].map(([path, e]) => [path, e.sha]));
    st.remoteKnown = true;
    st.remoteBySha = new Map([...remote].map(([path, e]) => [e.sha, path]));
    st.changed = p.changed;
    if (!readOnly) for (const [path, sha] of p.adopt) st.bases.set(path, sha);
    const tree = data.tree.map((e) => (p.shas.has(e.path) ? { ...e, sha: p.shas.get(e.path) } : e));
    for (const path of p.changed) if (!remote.has(path)) tree.push({ path, type: "blob", sha: p.shas.get(path) });
    // A combined overview must never start downloads, removals or queued uploads at its sources.
    if (!readOnly && current()) st.syncing = this.sync(github, r, files, p, remote).catch(() => {}).then(() => this.flush(r)).catch(() => {});
    return { ...data, tree, changed: p.changed, syncedAt: st.syncedAt };
  }

  /** Brings the copy up to GitHub's tree in the background: downloads, removals, and the bases saved. */
  async sync(github, r, files, p, remote) {
    const st = this.state(r);
    persist();
    for (const path of p.remove) {
      if (st.local.get(path) !== st.bases.get(path)) continue;
      await files.remove(path);
      st.bases.delete(path);
      st.local.delete(path);
    }
    const texts = await this.fetchTexts(github, r, p.download.filter((path) => keptAtOnce(remote.get(path))));
    for (const path of p.download) {
      const sha = remote.get(path).sha;
      let bytes = texts.has(path) ? enc(texts.get(path)) : null;
      if (!bytes || (await blobSha(bytes)) !== sha) {
        try { bytes = new Uint8Array(await (await github.readBlob(r, sha)).arrayBuffer()); } catch { continue; }
      }
      await this.keep(r, files, path, sha, bytes);
    }
    for (const path of [...st.bases.keys()]) if (!remote.has(path) && !st.local.has(path)) st.bases.delete(path);
    st.syncedAt = Date.now();
    await this.saveBases(r);
  }

  /** Many text files by sha: up to 100 per GraphQL request; what doesn't come is read one by one later. */
  async fetchTexts(github, r, paths) {
    const st = this.state(r);
    const out = new Map();
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const fields = batch.map((p, n) => `b${n}: object(oid: "${st.remote.get(p)}") { ... on Blob { text isBinary } }`).join("\n");
      try {
        const data = await github.graphql(`query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) {\n${fields}\n} }`,
          { owner: r.owner, name: r.repo });
        batch.forEach((p, n) => {
          const blob = data.repository?.[`b${n}`];
          if (blob && !blob.isBinary && blob.text != null) out.set(p, blob.text);
        });
      } catch (e) {
        if (unreachable(e)) break;
      }
    }
    return out;
  }

  /** Writes GitHub's version of a file into the copy, unless the file there changed since its base. */
  async keep(r, files, path, sha, bytes) {
    const st = this.state(r);
    const prefix = prefixOf(r);
    if (!path.startsWith(prefix) || hidden(path.slice(prefix.length))) return;
    const here = st.local.get(path);
    if (here != null && here !== st.bases.get(path) && here !== sha) return;
    try {
      await files.write(path, bytes);
    } catch {
      return;
    }
    st.bases.set(path, sha);
    st.local.set(path, sha);
    st.bySha.set(sha, path);
  }

  /** The copy's text and base sha, for a file changed here or when GitHub can't be reached. */
  async readHere(r, files, path) {
    const text = dec(await files.read(path));
    return { text, sha: this.state(r).bases.get(path) ?? null };
  }

  /**
   * A file's text. From the copy when it has GitHub's version, or the file changed here, or GitHub can't be reached;
   * else from GitHub, and kept. `{ fresh: true }` always asks GitHub (the merge view needs GitHub's own version).
   */
  async readText(github, r, path, opts = {}) {
    const files = await this.files(r);
    if (!files) return github.readText(r, path);
    const st = this.state(r);
    if (!opts.fresh) {
      if (st.offline || st.changed.has(path)) return this.readHere(r, files, path);
      const sha = st.remote.get(path);
      if (sha && st.local.get(path) === sha) {
        try { return { text: dec(await files.read(path)), sha }; } catch { /* read it from GitHub */ }
      }
    }
    try {
      const res = await github.readText(r, path);
      if (!opts.readOnly) this.keep(r, files, path, res.sha, enc(res.text)).catch(() => {});
      return res;
    } catch (e) {
      if (!unreachable(e) || opts.fresh || !st.local.has(path)) throw e;
      st.offline = true;
      return this.readHere(r, files, path);
    }
  }

  async bytesBySha(github, r, sha) {
    const files = await this.files(r);
    const st = this.state(r);
    const here = files && st.bySha.get(sha);
    if (here) {
      try { return await files.read(here); } catch { /* read it from GitHub */ }
    }
    const bytes = new Uint8Array(await (await github.readBlob(r, sha)).arrayBuffer());
    const path = st.remoteBySha.get(sha);
    if (files && path) this.keep(r, files, path, sha, bytes).catch(() => {});
    return bytes;
  }

  async readBlob(github, r, sha) {
    return new Blob([await this.bytesBySha(github, r, sha)]);
  }

  async readBlobText(github, r, sha) {
    return dec(await this.bytesBySha(github, r, sha));
  }

  /** After a save on GitHub: the copy gets the same file, unless it changed locally meanwhile. */
  async written(r, path, text, sha) {
    const files = await this.files(r);
    if (!files) return;
    const st = this.state(r);
    const prefix = prefixOf(r);
    if (!path.startsWith(prefix) || hidden(path.slice(prefix.length))) return;
    const bytes = typeof text === "string" ? enc(text) : text;
    let now = null;
    try { now = await blobSha(await files.read(path)); } catch { /* not there yet */ }
    if (now != null && now !== st.local.get(path)) return; // changed on the disk since the app read it
    try { await files.write(path, bytes); } catch { return; }
    // The sha of what was saved, as git gives it (GitHub's is the same): if GitHub ends up with something else,
    // the next sync brings that, since this copy then simply looks behind.
    const local = await blobSha(bytes);
    st.bases.set(path, local);
    st.local.set(path, local);
    st.bySha.set(local, path);
    st.remote.set(path, local);
    st.changed.delete(path);
    st.pending.delete(path);
    await this.saveBases(r);
    this.notify(r);
  }

  /** Inside the vault's folder, and not hidden: the files the copy keeps. */
  inVault(r, path) {
    const prefix = prefixOf(r);
    return path.startsWith(prefix) && !hidden(path.slice(prefix.length));
  }

  /**
   * Keeps a save in the copy to upload later (GitHub can't be reached): the file is written, and the save waits
   * with the sha it was based on (the first one, if it waited already), its time and its commit message.
   */
  async wait(r, files, path, text, base, message) {
    const st = this.state(r);
    const bytes = enc(text);
    await files.write(path, bytes);
    const sha = await blobSha(bytes);
    st.local.set(path, sha);
    st.bySha.set(sha, path);
    st.changed.add(path);
    const before = st.pending.get(path);
    // Saved again before it went: one commit, with each different message (a claim, then an edit) kept.
    const said = before && !before.message.split("; ").includes(message) ? `${before.message}; ${message}` : before?.message ?? message;
    st.pending.set(path, { base: before ? before.base : base ?? null, at: before?.at ?? Date.now(), message: said, state: "" });
    st.offline = true;
    await this.saveBases(r);
    this.notify(r);
    return sha;
  }

  async writeText(github, r, path, text, sha, message) {
    let res;
    try {
      res = await github.writeText(r, path, text, sha, message);
    } catch (e) {
      const files = unreachable(e) && this.inVault(r, path) && (await this.files(r));
      if (!files) throw e;
      return { sha: await this.wait(r, files, path, text, sha, message), commit: null, parent: null, waiting: true };
    }
    await this.written(r, path, text, res.sha).catch(() => {});
    return res;
  }

  /** Upload the attachment online first, then keep a local copy of its exact bytes. */
  async writeBytes(github, r, path, bytes, message) {
    const res = await github.writeBytes(r, path, bytes, message);
    await this.written(r, path, bytes, res.sha).catch(() => {});
    return res;
  }

  async commitFiles(github, r, list, message) {
    let res;
    try {
      res = await github.commitFiles(r, list, message);
    } catch (e) {
      const files = unreachable(e) && list.every((f) => this.inVault(r, f.path)) && (await this.files(r));
      if (!files) throw e;
      const shas = {};
      for (const f of list) shas[f.path] = await this.wait(r, files, f.path, f.text, this.state(r).bases.get(f.path) ?? null, message);
      return { commit: null, parent: null, shas, waiting: true };
    }
    for (const f of list) await this.written(r, f.path, f.text, res.shas?.[f.path]).catch(() => {});
    return res;
  }

  // ---- saves waiting to upload ----

  /**
   * Uploads the saves that wait, the oldest first, each as its own commit with the sha it was based on. GitHub
   * refuses one whose note changed there meanwhile ("conflict": the app shows both versions) and one whose note
   * is gone ("gone": it offers to save it as a new note); both keep waiting, nothing is dropped. Stops when
   * GitHub can't be reached. Resolves to { uploaded, waiting }.
   */
  flush(r) {
    const st = this.state(r);
    st.flushing ??= (async () => {
      const files = await this.files(r);
      const github = st.github;
      let uploaded = 0;
      if (!files || !github) return { uploaded, waiting: st.pending.size };
      if (!st.bases) await this.load(r, files);
      const list = [...st.pending].filter(([, p]) => !p.state).sort((a, b) => a[1].at - b[1].at);
      if (list.length && !st.remoteKnown) {
        try {
          const data = await github.tree(r, r.branch);
          st.remote = new Map(data.tree.filter((e) => e.type === "blob").map((e) => [e.path, e.sha]));
          st.remoteKnown = true;
        } catch (e) {
          if (unreachable(e)) return { uploaded, waiting: st.pending.size };
        }
      }
      for (const [path, p] of list) {
        let bytes;
        try { bytes = await files.read(path); } catch { st.pending.delete(path); continue; } // gone from the copy
        if (p.base && st.remoteKnown && !st.remote.has(path)) { p.state = "gone"; continue; }
        try {
          await github.writeText(r, path, dec(bytes), p.base, p.message);
        } catch (e) {
          if (unreachable(e)) { st.offline = true; break; }
          if (e.isConflict) p.state = "conflict";
          else if (e.status === 404) p.state = "gone";
          else p.error = e.message;
          continue;
        }
        const sha = await blobSha(bytes);
        st.pending.delete(path);
        st.bases.set(path, sha);
        st.remote.set(path, sha);
        st.local.set(path, sha);
        st.changed.delete(path);
        st.offline = false;
        uploaded++;
      }
      await this.saveBases(r);
      this.notify(r);
      return { uploaded, waiting: st.pending.size };
    })().finally(() => { st.flushing = null; });
    return st.flushing;
  }

  /**
   * Where a file stands: "waiting" (saved here, waiting to upload), "conflict" (changed on GitHub too), "gone"
   * (deleted or moved on GitHub), "changed" (changed here by another tool), or "".
   */
  status(r, path) {
    const st = this.state(r);
    const p = st.pending.get(path);
    if (p) return p.state || "waiting";
    return st.changed.has(path) ? "changed" : "";
  }

  /** The files changed here (waiting or by another tool), as full paths. */
  changedPaths(r) {
    const st = this.state(r);
    return new Set([...st.changed, ...st.pending.keys()]);
  }

  /** What waits, for the line above the note and Settings: [{ path, state, at }], waiting saves first. */
  async waitingList(r) {
    const files = await this.files(r);
    if (!files) return [];
    const st = this.state(r);
    if (!st.bases) await this.load(r, files).catch(() => {});
    const saves = [...st.pending].sort((a, b) => a[1].at - b[1].at).map(([path, p]) => ({ path, state: p.state || "waiting", at: p.at, error: p.error }));
    const others = [...st.changed].filter((path) => !st.pending.has(path)).sort().map((path) => ({ path, state: "changed" }));
    return [...saves, ...others];
  }

  /** Uploads a file changed here by another tool (or waiting) now: it's checked against its base like any save. */
  async upload(r, path, message) {
    const st = this.state(r);
    if (!st.pending.has(path)) st.pending.set(path, { base: st.bases.get(path) ?? null, at: Date.now(), message, state: "" });
    else st.pending.get(path).state = "";
    return this.flush(r);
  }

  /** A note deleted or moved on GitHub while its save waited: uploads it again, as a new note at the same path. */
  async recreate(r, path) {
    const p = this.state(r).pending.get(path);
    if (p) Object.assign(p, { base: null, state: "" });
    return this.flush(r);
  }

  /** The person took GitHub's version over what waited here: the copy gets it, and nothing waits any more. */
  async settle(r, path, text, sha) {
    const files = await this.files(r);
    const st = this.state(r);
    st.pending.delete(path);
    st.changed.delete(path);
    if (files && this.inVault(r, path)) {
      const bytes = enc(text);
      try { await files.write(path, bytes); } catch { /* the next sync tries again */ }
      st.bases.set(path, sha);
      st.local.set(path, await blobSha(bytes));
      st.remote.set(path, sha);
    }
    await this.saveBases(r);
    this.notify(r);
  }

  /** Whether "search inside notes" searches the copy (it's been brought up to date once, or GitHub can't be reached). */
  searchesHere(r) {
    const st = this.state(r);
    return !!st.files && (st.offline || !!st.syncedAt);
  }

  async searchCode(github, r, query) {
    const files = await this.files(r);
    if (!files || !this.searchesHere(r)) return github.searchCode(r, query);
    const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    const items = [];
    for (const f of await files.list(false, prefixOf(r))) {
      if (!SEARCHED.test(f.path) || f.size > 2_000_000) continue;
      const text = dec(await f.bytes()).toLowerCase();
      if (words.every((w) => text.includes(w))) items.push({ path: f.path });
      if (items.length >= 100) break;
    }
    return { items };
  }

  // ---- Settings ----

  /** Forgets what the app knew about a copy, so the next open looks again. */
  reset(r) {
    this.repos.delete(r.id);
  }

  /** Keeps the copy in a folder from now on (the browser's copy is dropped); the folder's files are used as they are. */
  async useFolder(r, handle) {
    await keepFolder(mirrorId(r), handle);
    await new BrowserFiles(mirrorId(r)).clear().catch(() => {});
    await idb("meta", "readwrite", (s) => s.delete(`bases:${mirrorId(r)}`)).catch(() => {});
    this.reset(r);
  }

  /** Back to a copy in the browser: the folder and its files stay on the disk, the app forgets it. */
  async useBrowser(r) {
    await forgetFolder(mirrorId(r));
    await idb("meta", "readwrite", (s) => s.delete(`bases:${mirrorId(r)}`)).catch(() => {});
    this.reset(r);
  }

  /** Drops the browser's copy (it's downloaded again on the next open). */
  async drop(r) {
    await new BrowserFiles(mirrorId(r)).clear().catch(() => {});
    await idb("meta", "readwrite", (s) => s.delete(`bases:${mirrorId(r)}`)).catch(() => {});
    this.reset(r);
  }

  /** Asks again for the folder (from a tap). Resolves to whether it's allowed. */
  async allow(r) {
    const handle = await folderOf(mirrorId(r));
    try {
      const ok = handle && (await handle.requestPermission({ mode: "readwrite" })) === "granted";
      if (ok) this.reset(r);
      return !!ok;
    } catch {
      return false;
    }
  }

  /** How much the browser's copy takes: { files, bytes }; null when the copy is a folder or there's none. */
  async size(r) {
    if (await folderOf(mirrorId(r))) return null;
    try {
      const list = await new BrowserFiles(mirrorId(r)).list();
      return { files: list.length, bytes: list.reduce((n, f) => n + f.size, 0) };
    } catch {
      return null;
    }
  }

  /** Where the copy is kept, for Settings: { folder: the folder's name or "", clone: whether it's a git clone }. */
  async place(r) {
    const handle = await folderOf(mirrorId(r));
    return { folder: handle?.name || "", clone: handle ? await this.isClone(r) : false };
  }

  /** Whether the copy's folder is a git clone (it has a .git folder). */
  async isClone(r) {
    const handle = await folderOf(mirrorId(r));
    if (!handle) return false;
    try {
      await handle.getDirectoryHandle(".git");
      return true;
    } catch {
      return false;
    }
  }
}
