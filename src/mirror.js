// A copy of each GitHub vault on this device, so it opens with no connection: in a folder the person picks (Chrome
// and Edge on a computer, e.g. the repo's clone), else in the browser (IndexedDB). It's kept in step with GitHub
// whenever the vault opens or reloads: only the files whose sha changed are downloaded. GitHub stays the main copy.
// A file changed on the disk (an agent, another editor) is never overwritten: it shows as it is, marked as not on
// GitHub. `withLocal` (src/local.js) sends a GitHub vault's reads and saves here; this passes them on to GitHub.

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
    await idb("meta", "readwrite", (s) => s.put({ bases: Object.fromEntries(st.bases), syncedAt: st.syncedAt }, `bases:${mirrorId(r)}`)).catch(() => {});
  }

  /** GitHub's tree with the copy's changes in it; with no connection, the copy's own tree (`offline: true`). */
  async tree(github, r, ref) {
    const files = await this.files(r);
    if (!files) return github.tree(r, ref);
    const st = this.state(r);
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
    st.remoteBySha = new Map([...remote].map(([path, e]) => [e.sha, path]));
    st.changed = p.changed;
    for (const [path, sha] of p.adopt) st.bases.set(path, sha);
    const tree = data.tree.map((e) => (p.shas.has(e.path) ? { ...e, sha: p.shas.get(e.path) } : e));
    for (const path of p.changed) if (!remote.has(path)) tree.push({ path, type: "blob", sha: p.shas.get(path) });
    st.syncing = this.sync(github, r, files, p, remote).catch(() => {});
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
      this.keep(r, files, path, res.sha, enc(res.text)).catch(() => {});
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

  /** After a save on GitHub: the copy gets the same text, unless the file there changed again meanwhile. */
  async written(r, path, text, sha) {
    const files = await this.files(r);
    if (!files) return;
    const st = this.state(r);
    const prefix = prefixOf(r);
    if (!path.startsWith(prefix) || hidden(path.slice(prefix.length))) return;
    const bytes = enc(text);
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
    await this.saveBases(r);
  }

  async writeText(github, r, path, text, sha, message) {
    const res = await github.writeText(r, path, text, sha, message);
    await this.written(r, path, text, res.sha).catch(() => {});
    return res;
  }

  async commitFiles(github, r, list, message) {
    const res = await github.commitFiles(r, list, message);
    for (const f of list) await this.written(r, f.path, f.text, res.shas?.[f.path]).catch(() => {});
    return res;
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
