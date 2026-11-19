import { test } from "node:test";
import assert from "node:assert/strict";
import { blobSha, GitHubError } from "../src/github.js";
import { plan, keptAtOnce, unreachable, Mirror } from "../src/mirror.js";

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);

test("plan: what to download, keep, remove and adopt", () => {
  const remote = new Map([
    ["Wiki/Same.md", { sha: "a1" }], // the copy has GitHub's version
    ["Wiki/Clone.md", { sha: "c1" }], // a clone's file, the same as GitHub's, no base yet
    ["Wiki/Stale.md", { sha: "s2" }], // GitHub moved on, unchanged here
    ["Wiki/Edited.md", { sha: "e1" }], // changed here since its base
    ["Wiki/Both.md", { sha: "b2" }], // changed here and on GitHub
    ["Wiki/Unknown.md", { sha: "u1" }], // a clone's file that differs, no base: can't tell, so it's kept
    ["Wiki/New on GitHub.md", { sha: "n1", size: 10 }],
    ["Wiki/pic.png", { sha: "p1", size: 10 }], // images wait until they're opened
  ]);
  const local = new Map([
    ["Wiki/Same.md", "a1"], ["Wiki/Clone.md", "c1"], ["Wiki/Stale.md", "s1"], ["Wiki/Edited.md", "e2"],
    ["Wiki/Both.md", "b3"], ["Wiki/Unknown.md", "u0"],
    ["Wiki/Gone.md", "g1"], // removed from GitHub, unchanged here
    ["Wiki/Gone but edited.md", "h2"], // removed from GitHub, changed here
    ["Wiki/New here.md", "x1"], // made here
  ]);
  const bases = new Map([
    ["Wiki/Same.md", "a1"], ["Wiki/Stale.md", "s1"], ["Wiki/Edited.md", "e1"], ["Wiki/Both.md", "b1"],
    ["Wiki/Gone.md", "g1"], ["Wiki/Gone but edited.md", "h1"],
  ]);
  const p = plan(remote, local, bases);
  assert.deepEqual(p.download.sort(), ["Wiki/New on GitHub.md", "Wiki/Stale.md"]);
  assert.deepEqual(p.remove, ["Wiki/Gone.md"]);
  assert.deepEqual([...p.adopt], [["Wiki/Clone.md", "c1"]]);
  assert.deepEqual([...p.changed].sort(), ["Wiki/Both.md", "Wiki/Edited.md", "Wiki/Gone but edited.md", "Wiki/New here.md", "Wiki/Unknown.md"]);
  // The app sees the copy's sha for what changed here, GitHub's for the rest.
  assert.equal(p.shas.get("Wiki/Edited.md"), "e2");
  assert.equal(p.shas.get("Wiki/Stale.md"), "s2");
  assert.equal(p.shas.get("Wiki/pic.png"), "p1");
  assert.equal(p.shas.has("Wiki/Gone.md"), false);
});

test("text files are kept at once, images and big files once opened; no connection is told apart", () => {
  assert.equal(keptAtOnce({ path: "a.md", size: 10 }), true);
  assert.equal(keptAtOnce({ path: "a.csv" }), true);
  assert.equal(keptAtOnce({ path: "a.png", size: 10 }), false);
  assert.equal(keptAtOnce({ path: "a.pdf", size: 10 }), false);
  assert.equal(keptAtOnce({ path: "big.md", size: 5_000_000 }), false);
  assert.equal(unreachable(new GitHubError(0, "offline")), true);
  assert.equal(unreachable(new GitHubError(503, "down")), true);
  assert.equal(unreachable(new GitHubError(404, "nope")), false);
});

// ---- the copy, with a fake GitHub and files in memory ----

function memoryFiles(start = {}) {
  const files = new Map(Object.entries(start).map(([p, t]) => [p, { bytes: enc(t), mtime: 1 }]));
  let clock = 1;
  return {
    files,
    async list(withDots, under = "") {
      return [...files].filter(([p]) => p.startsWith(under))
        .map(([path, f]) => ({ path, size: f.bytes.length, mtime: f.mtime, bytes: async () => f.bytes }));
    },
    async read(path) {
      if (!files.has(path)) throw new GitHubError(404, "missing");
      return files.get(path).bytes;
    },
    async write(path, bytes) { files.set(path, { bytes, mtime: ++clock }); },
    async remove(path) { files.delete(path); },
    edit(path, text) { files.set(path, { bytes: enc(text), mtime: ++clock }); },
  };
}

async function fakeGitHub(start) {
  const gh = {
    online: true,
    files: new Map(),
    calls: [],
    async set(path, text) { this.files.set(path, { text, sha: await blobSha(text) }); },
    check() { if (!this.online) throw new GitHubError(0, "Can't reach GitHub."); },
    async tree() {
      this.check();
      return { tree: [...this.files].map(([path, f]) => ({ path, type: "blob", sha: f.sha, size: f.text.length })), truncated: false };
    },
    async readText(r, path) {
      this.check();
      this.calls.push(`readText ${path}`);
      const f = this.files.get(path);
      if (!f) throw new GitHubError(404, "Not Found");
      return { text: f.text, sha: f.sha };
    },
    async readBlob(r, sha) {
      this.check();
      const f = [...this.files.values()].find((x) => x.sha === sha);
      return new Blob([f.text]);
    },
    async graphql(query) {
      this.check();
      const repository = {};
      for (const [, name, oid] of query.matchAll(/(b\d+): object\(oid: "(\w+)"\)/g)) {
        const f = [...this.files.values()].find((x) => x.sha === oid);
        repository[name] = { text: f.text, isBinary: false };
      }
      return { repository };
    },
    async writeText(r, path, text, sha) {
      this.check();
      const f = this.files.get(path);
      if (f && f.sha !== sha) throw new GitHubError(409, "conflict");
      await this.set(path, text);
      return { sha: this.files.get(path).sha, commit: "c", parent: "p" };
    },
  };
  for (const [p, t] of Object.entries(start)) await gh.set(p, t);
  return gh;
}

function mirrorWith(mem) {
  const m = new Mirror();
  m.files = async (r) => { m.state(r).files = mem; return mem; };
  m.saveBases = async () => {};
  m.state({ id: "notes" }).bases = new Map();
  return m;
}

const repo = { id: "notes", owner: "o", repo: "notes", branch: "main", folder: "Wiki" };

test("the copy follows GitHub, and opens with no connection", async () => {
  const gh = await fakeGitHub({ "Wiki/Home.md": "home\n", "Wiki/A.md": "a\n", "README.md": "outside the folder" });
  const mem = memoryFiles();
  const m = mirrorWith(mem);
  await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  assert.deepEqual([...mem.files.keys()].sort(), ["Wiki/A.md", "Wiki/Home.md"]);
  // GitHub moves on: the next open downloads only that file, and drops the one removed there.
  await gh.set("Wiki/A.md", "a, changed\n");
  gh.files.delete("Wiki/Home.md");
  await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  assert.equal(dec(mem.files.get("Wiki/A.md").bytes), "a, changed\n");
  assert.equal(mem.files.has("Wiki/Home.md"), false);
  // No connection: the copy's own tree, and its text.
  gh.online = false;
  const t = await m.tree(gh, repo, "main");
  assert.equal(t.offline, true);
  assert.deepEqual(t.tree.map((e) => e.path), ["Wiki/A.md"]);
  assert.equal((await m.readText(gh, repo, "Wiki/A.md")).text, "a, changed\n");
});

test("a file changed on the disk is shown as it is and never overwritten", async () => {
  const gh = await fakeGitHub({ "Wiki/Home.md": "home\n" });
  const mem = memoryFiles();
  const m = mirrorWith(mem);
  await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  const base = gh.files.get("Wiki/Home.md").sha;
  mem.edit("Wiki/Home.md", "home, edited by an agent\n");
  await gh.set("Wiki/Home.md", "home, changed on GitHub\n");
  const t = await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  assert.ok(t.changed.has("Wiki/Home.md"));
  assert.equal(dec(mem.files.get("Wiki/Home.md").bytes), "home, edited by an agent\n");
  // The app reads the disk's text with the base sha, so a save would be checked against GitHub's last known version.
  assert.deepEqual(await m.readText(gh, repo, "Wiki/Home.md"), { text: "home, edited by an agent\n", sha: base });
  // The merge view asks GitHub itself.
  assert.equal((await m.readText(gh, repo, "Wiki/Home.md", { fresh: true })).text, "home, changed on GitHub\n");
});

test("a save goes to GitHub, then into the copy", async () => {
  const gh = await fakeGitHub({ "Wiki/Home.md": "home\n" });
  const mem = memoryFiles();
  const m = mirrorWith(mem);
  await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  const { text, sha } = await m.readText(gh, repo, "Wiki/Home.md");
  assert.equal(gh.calls.length, 0, "a file the copy has as GitHub does is read from the copy");
  const res = await m.writeText(gh, repo, "Wiki/Home.md", `${text}more\n`, sha, "Edit");
  assert.equal(dec(mem.files.get("Wiki/Home.md").bytes), "home\nmore\n");
  assert.equal(m.state(repo).bases.get("Wiki/Home.md"), res.sha);
  // A file outside the vault's folder can't wait in the copy: offline, its save fails as before.
  gh.online = false;
  await assert.rejects(m.writeText(gh, repo, "README.md", "x", null, "Edit"), (e) => unreachable(e));
});

test("an image upload keeps exact bytes in the mirror and reports an offline error without queuing a file", async () => {
  const { gh, mem, m } = await synced({ "Wiki/Home.md": "home\n" });
  const bytes = new Uint8Array([0, 100, 128, 255]);
  const path = "Wiki/Attachments/test.png";
  gh.writeBytes = async (r, receivedPath, received, message) => {
    gh.check();
    assert.equal(receivedPath, path);
    assert.equal(message, "Add image");
    assert.deepEqual(received, bytes);
    return { sha: await blobSha(bytes), commit: "image-commit" };
  };
  const saved = await m.writeBytes(gh, repo, path, bytes, "Add image");
  assert.equal(saved.commit, "image-commit");
  assert.deepEqual(mem.files.get(path).bytes, bytes);
  gh.online = false;
  assert.deepEqual(new Uint8Array(await (await m.readBlob(gh, repo, saved.sha)).arrayBuffer()), bytes);
  await assert.rejects(m.writeBytes(gh, repo, "Wiki/failed.png", bytes, "Add image"), (e) => unreachable(e));
  assert.equal(m.state(repo).pending.size, 0);
  assert.equal(mem.files.has("Wiki/failed.png"), false);
});

async function synced(start, local = {}) {
  const gh = await fakeGitHub(start);
  const mem = memoryFiles(local);
  const m = mirrorWith(mem);
  await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  return { gh, mem, m };
}

test("offline, a save waits in the copy and is uploaded when GitHub is back, the oldest first", async () => {
  const { gh, mem, m } = await synced({ "Wiki/Home.md": "home\n", "Wiki/A.md": "a\n" });
  const commits = [];
  const write = gh.writeText.bind(gh);
  gh.writeText = async (...args) => { const res = await write(...args); commits.push(`${args[1]}: ${args[4]}`); return res; };
  gh.online = false;
  const home = await m.readText(gh, repo, "Wiki/Home.md");
  const res = await m.writeText(gh, repo, "Wiki/Home.md", "home, offline\n", home.sha, "Edit Home");
  assert.equal(res.waiting, true);
  assert.equal(dec(mem.files.get("Wiki/Home.md").bytes), "home, offline\n");
  // Saved twice offline: still one waiting save, based on GitHub's version it started from.
  const again = await m.readText(gh, repo, "Wiki/Home.md");
  assert.equal(again.text, "home, offline\n");
  await m.writeText(gh, repo, "Wiki/Home.md", "home, offline twice\n", again.sha, "Edit Home again");
  await m.writeText(gh, repo, "Wiki/Notes/New.md", "made offline\n", null, "Add New");
  assert.equal(m.status(repo, "Wiki/Home.md"), "waiting");
  assert.deepEqual((await m.waitingList(repo)).map((w) => w.path), ["Wiki/Home.md", "Wiki/Notes/New.md"]);
  // Still offline: nothing goes, nothing is lost.
  assert.deepEqual(await m.flush(repo), { uploaded: 0, waiting: 2 });
  gh.online = true;
  assert.deepEqual(await m.flush(repo), { uploaded: 2, waiting: 0 });
  assert.deepEqual(commits, ["Wiki/Home.md: Edit Home; Edit Home again", "Wiki/Notes/New.md: Add New"]);
  assert.equal(gh.files.get("Wiki/Home.md").text, "home, offline twice\n");
  assert.equal(gh.files.get("Wiki/Notes/New.md").text, "made offline\n");
  assert.equal(m.status(repo, "Wiki/Home.md"), "");
});

test("a waiting save whose note changed on GitHub keeps waiting, and the person picks", async () => {
  const { gh, mem, m } = await synced({ "Wiki/Home.md": "home\n" });
  gh.online = false;
  const home = await m.readText(gh, repo, "Wiki/Home.md");
  await m.writeText(gh, repo, "Wiki/Home.md", "mine\n", home.sha, "Edit");
  gh.online = true;
  await gh.set("Wiki/Home.md", "theirs\n");
  // The next open: the copy keeps the waiting save, and GitHub refuses the upload.
  const t = await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  assert.ok(t.changed.has("Wiki/Home.md"));
  assert.equal(m.status(repo, "Wiki/Home.md"), "conflict");
  assert.equal(dec(mem.files.get("Wiki/Home.md").bytes), "mine\n");
  assert.equal(gh.files.get("Wiki/Home.md").text, "theirs\n");
  // The merge view: GitHub's own version, then the person saves over it (the app saves with GitHub's sha).
  const latest = await m.readText(gh, repo, "Wiki/Home.md", { fresh: true });
  await m.writeText(gh, repo, "Wiki/Home.md", "mine and theirs\n", latest.sha, "Edit");
  assert.equal(m.status(repo, "Wiki/Home.md"), "");
  assert.equal(dec(mem.files.get("Wiki/Home.md").bytes), "mine and theirs\n");
});

test("taking GitHub's version settles a waiting save", async () => {
  const { gh, mem, m } = await synced({ "Wiki/Home.md": "home\n" });
  gh.online = false;
  await m.writeText(gh, repo, "Wiki/Home.md", "mine\n", gh.files.get("Wiki/Home.md").sha, "Edit");
  gh.online = true;
  await gh.set("Wiki/Home.md", "theirs\n");
  await m.flush(repo);
  assert.equal(m.status(repo, "Wiki/Home.md"), "conflict");
  const latest = await m.readText(gh, repo, "Wiki/Home.md", { fresh: true });
  await m.settle(repo, "Wiki/Home.md", latest.text, latest.sha);
  assert.equal(m.status(repo, "Wiki/Home.md"), "");
  assert.equal(dec(mem.files.get("Wiki/Home.md").bytes), "theirs\n");
});

test("a waiting save whose note was deleted on GitHub can be saved as a new note", async () => {
  const { gh, m } = await synced({ "Wiki/Home.md": "home\n", "Wiki/Old.md": "old\n" });
  gh.online = false;
  await m.writeText(gh, repo, "Wiki/Old.md", "old, edited\n", gh.files.get("Wiki/Old.md").sha, "Edit");
  gh.online = true;
  gh.files.delete("Wiki/Old.md");
  await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  assert.equal(m.status(repo, "Wiki/Old.md"), "gone");
  assert.equal(gh.files.has("Wiki/Old.md"), false);
  await m.recreate(repo, "Wiki/Old.md");
  assert.equal(gh.files.get("Wiki/Old.md").text, "old, edited\n");
  assert.equal(m.status(repo, "Wiki/Old.md"), "");
});

test("a file changed by another tool is uploaded only when asked", async () => {
  const { gh, mem, m } = await synced({ "Wiki/Home.md": "home\n" });
  mem.edit("Wiki/Home.md", "home, by an agent\n");
  await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  assert.equal(m.status(repo, "Wiki/Home.md"), "changed");
  assert.equal(gh.files.get("Wiki/Home.md").text, "home\n", "never uploaded by itself");
  await m.upload(repo, "Wiki/Home.md", "Upload Home");
  assert.equal(gh.files.get("Wiki/Home.md").text, "home, by an agent\n");
  assert.equal(m.status(repo, "Wiki/Home.md"), "");
});

test("a clone's files are used as they are: nothing downloaded that's the same", async () => {
  const gh = await fakeGitHub({ "Wiki/Home.md": "home\n", "Wiki/B.md": "b\n" });
  const mem = memoryFiles({ "Wiki/Home.md": "home\n", "Wiki/B.md": "b, not pulled yet\n" });
  const m = mirrorWith(mem);
  const t = await m.tree(gh, repo, "main");
  await m.state(repo).syncing;
  assert.deepEqual([...t.changed], ["Wiki/B.md"]);
  assert.equal(dec(mem.files.get("Wiki/B.md").bytes), "b, not pulled yet\n");
  assert.equal(m.state(repo).bases.get("Wiki/Home.md"), gh.files.get("Wiki/Home.md").sha);
  // Search inside notes looks in the copy once it's up to date.
  assert.deepEqual((await m.searchCode(gh, repo, "PULLED")).items, [{ path: "Wiki/B.md" }]);
});

test("read-only overview reads never sync, remove, keep or flush a source copy", async () => {
  const { gh, mem, m } = await synced({ "Wiki/Home.md": "home\n", "Wiki/Old.md": "old\n" });
  gh.online = false;
  await m.writeText(gh, repo, "Wiki/Home.md", "waiting edit\n", gh.files.get("Wiki/Home.md").sha, "Edit");
  gh.online = true;
  gh.files.delete("Wiki/Old.md");
  await gh.set("Wiki/New.md", "new\n");
  m.sync = () => { throw Error("overview started sync"); };
  m.flush = () => { throw Error("overview started an upload"); };
  m.keep = () => { throw Error("overview wrote a copy"); };
  const t = await m.tree(gh, repo, "main", { readOnly: true });
  assert(t.tree.some(e => e.path === "Wiki/New.md"));
  assert.equal((await m.readText(gh, repo, "Wiki/Home.md", { readOnly: true })).text, "waiting edit\n");
  assert.equal((await m.readText(gh, repo, "Wiki/New.md", { readOnly: true })).text, "new\n");
  assert(mem.files.has("Wiki/Old.md"), "read-only scan never removes source files");
  assert(!mem.files.has("Wiki/New.md"), "read-only scan never downloads into the source");
  assert.equal(gh.files.get("Wiki/Home.md").text, "home\n", "pending source edit is not uploaded");
});
