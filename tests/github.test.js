import { test } from "node:test";
import assert from "node:assert/strict";
import { blobSha, encodeBase64, decodeBase64, ownerOfPath, newTokenUrl, GitHub } from "../src/github.js";

test("a file's blob sha is the one git gives it", async () => {
  // `printf 'hello\n' | git hash-object --stdin`, and the same for the text with Polish letters
  assert.equal(await blobSha("hello\n"), "ce013625030ba8dba906f756967f9e9ca394464a");
  assert.equal(await blobSha("zażółć\n"), "00580af6dbb5b45b5df5728c5395f3d0c6b1b977");
  assert.equal(await blobSha(""), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
});

test("base64 keeps UTF-8 text as it is", () => {
  for (const s of ["", "plain", "zażółć gęślą jaźń", "emoji 🌲\n"]) assert.equal(decodeBase64(encodeBase64(s)), s);
});

test("each request about a repo goes with its owner's token, else the main one", () => {
  assert.equal(ownerOfPath("/repos/Ann-Example/notes/contents/a.md"), "ann-example");
  assert.equal(ownerOfPath("/repos/ann/notes"), "ann");
  assert.equal(ownerOfPath("/user/repos?per_page=100"), "");
  assert.equal(ownerOfPath("/graphql"), "");
  const gh = new GitHub("main", { "our-studio": "studio" });
  assert.equal(gh.tokenFor("Our-Studio"), "studio");
  assert.equal(gh.tokenFor("ann"), "main");
  assert.equal(gh.tokenFor(""), "main");
  assert.equal(new GitHub("main").tokenFor("our-studio"), "main", "a device with one token uses it for everything");
});

test("the new-token link fills in GitHub's form for one owner", () => {
  const url = new URL(newTokenUrl({ owner: "ann-example", name: "Commonplace.md - ann-example" }));
  assert.equal(url.origin + url.pathname, "https://github.com/settings/personal-access-tokens/new");
  const p = url.searchParams;
  assert.equal(p.get("target_name"), "ann-example");
  assert.equal(p.get("contents"), "write");
  assert.equal(p.get("expires_in"), "366");
  assert.equal(p.get("name"), "Commonplace.md - ann-example");
  assert.match(p.get("description"), /reads and saves/);
  const ro = new URL(newTokenUrl({ write: false, name: "x".repeat(60) })).searchParams;
  assert.equal(ro.get("contents"), "read");
  assert.equal(ro.has("target_name"), false, "no owner: GitHub picks the person's own account");
  assert.equal(ro.get("name").length, 40, "GitHub takes at most 40 characters");
});
