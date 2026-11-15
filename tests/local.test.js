import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { blobSha } from "../src/github.js";
import { LocalSource, withLocal, isLocal, zipFiles, crc32, EXAMPLE_FILES, emptyVault } from "../src/local.js";

const enc = (s) => new TextEncoder().encode(s);

/** A vault's files in memory, with the calls LocalSource makes on a folder or the browser's storage. */
function memoryFiles(start = {}) {
  const files = new Map(Object.entries(start).map(([p, t]) => [p, { bytes: enc(t), mtime: 1 }]));
  let clock = 1;
  return {
    files,
    async list() {
      return [...files].map(([path, f]) => ({ path, size: f.bytes.length, mtime: f.mtime, bytes: async () => f.bytes }));
    },
    async read(path) {
      if (!files.has(path)) throw Object.assign(new Error(`${path} isn't in this vault.`), { status: 404 });
      return files.get(path).bytes;
    },
    async write(path, bytes) {
      files.set(path, { bytes, mtime: ++clock });
    },
  };
}

function source(start) {
  const mem = memoryFiles(start);
  const src = new LocalSource();
  src.files = async () => mem;
  return { src, mem };
}

const vault = { id: "local-notes", local: "browser", label: "Notes", owner: "", repo: "" };

test("a local vault is told apart from a GitHub repo", () => {
  assert.equal(isLocal(vault), true);
  assert.equal(isLocal({ ...vault, local: "folder" }), true);
  assert.equal(isLocal({ owner: "me", repo: "notes" }), false);
  assert.equal(isLocal(null), false);
});

test("the tree lists every file with git's sha, and the shas read the files back", async () => {
  const { src } = source({ "Home.md": "hello\n", "Notes/A.md": "a" });
  const { tree, truncated } = await src.tree(vault);
  assert.equal(truncated, false);
  const home = tree.find((e) => e.path === "Home.md");
  assert.deepEqual(home, { path: "Home.md", type: "blob", sha: "ce013625030ba8dba906f756967f9e9ca394464a" });
  assert.equal(await src.readBlobText(vault, home.sha), "hello\n");
  assert.equal(await (await src.readBlob(vault, home.sha)).text(), "hello\n");
  assert.deepEqual(await src.headSha(vault), { sha: null, etag: null });
  assert.equal((await src.repo(vault)).permissions.push, true);
});

test("saving checks the file didn't change since it was read, like GitHub", async () => {
  const { src, mem } = source({ "Home.md": "one\n" });
  const { text, sha } = await src.readText(vault, "Home.md");
  assert.equal(text, "one\n");
  const saved = await src.writeText(vault, "Home.md", "two\n", sha, "Edit");
  assert.equal(saved.sha, await blobSha("two\n"));
  assert.equal(new TextDecoder().decode(mem.files.get("Home.md").bytes), "two\n");
  // An agent changed it on the disk meanwhile: the old sha is refused as a conflict, and nothing is written.
  await assert.rejects(src.writeText(vault, "Home.md", "three\n", sha, "Edit"), (e) => e.isConflict);
  // A new file needs no sha; one that's there already refuses a save without one.
  await src.writeText(vault, "Notes/New.md", "new\n", null, "Add");
  await assert.rejects(src.writeText(vault, "Notes/New.md", "again\n", null, "Add"), (e) => e.isConflict);
  await assert.rejects(src.readText(vault, "Nope.md"), (e) => e.status === 404);
});

test("several files at once, and searching inside the notes", async () => {
  const { src } = source({ "Home.md": "The Garden plan", "Data/list.csv": "garden,tools", "pic.png": "garden" });
  const res = await src.commitFiles(vault, [{ path: "A.md", text: "garden plan b" }, { path: "B.md", text: "b" }], "Two");
  assert.equal(res.shas["A.md"], await blobSha("garden plan b"));
  const found = (await src.searchCode(vault, "garden PLAN")).items.map((i) => i.path).sort();
  assert.deepEqual(found, ["A.md", "Home.md"]);
});

test("the GitHub client sends a local vault's calls to the local source, and the rest to GitHub", async () => {
  const calls = [];
  const github = { token: "t", tree: async (r) => calls.push(["github", r.repo]), user: async () => "me" };
  const local = { tree: async (r) => calls.push(["local", r.id]) };
  const gh = withLocal(github, local);
  await gh.tree({ owner: "o", repo: "notes" });
  await gh.tree(vault);
  assert.deepEqual(calls, [["github", "notes"], ["local", "local-notes"]]);
  assert.equal(await gh.user(), "me");
  assert.equal(gh.token, "t");
});

test("a zip any unzip tool reads: names, sizes and CRC-32 of each file", () => {
  assert.equal(crc32(enc("123456789")), 0xcbf43926);
  const files = [{ path: "Home.md", bytes: enc("hello\n"), mtime: Date.UTC(2026, 10, 15) }, { path: "Notes/zażółć.md", bytes: enc("ą") }];
  const zip = zipFiles(files);
  const view = new DataView(zip.buffer);
  const end = zip.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 10, true), 2);
  // Walk the local headers: each holds its name and its bytes as they are (stored).
  let at = 0;
  for (const f of files) {
    assert.equal(view.getUint32(at, true), 0x04034b50);
    const size = view.getUint32(at + 18, true);
    const nameLen = view.getUint16(at + 26, true);
    assert.equal(new TextDecoder().decode(zip.subarray(at + 30, at + 30 + nameLen)), f.path);
    assert.deepEqual(zip.subarray(at + 30 + nameLen, at + 30 + nameLen + size), f.bytes);
    assert.equal(view.getUint32(at + 14, true), crc32(f.bytes));
    at += 30 + nameLen + size;
  }
  assert.equal(view.getUint32(end + 16, true), at); // the central directory starts right after the files
});

test("an empty vault starts with one note saying it's only on this device", () => {
  const [home] = emptyVault("My notes", "browser");
  assert.equal(home.path, "Home.md");
  const text = new TextDecoder().decode(home.bytes);
  assert.match(text, /^# My notes\n/);
  assert.match(text, /only on this device/);
  assert.match(text, /lost if the browser's data is cleared/);
});

test("EXAMPLE_FILES lists every file of example-vault/", () => {
  const root = fileURLToPath(new URL("../example-vault/", import.meta.url));
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [relative(root, p).split("\\").join("/")];
  });
  const files = walk(root).sort();
  assert.deepEqual([...EXAMPLE_FILES].sort(), files,
    "A file was added to or removed from example-vault/: change EXAMPLE_FILES in src/local.js to match.");
});
