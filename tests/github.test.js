import { test } from "node:test";
import assert from "node:assert/strict";
import { blobSha, encodeBase64, decodeBase64 } from "../src/github.js";

test("a file's blob sha is the one git gives it", async () => {
  // `printf 'hello\n' | git hash-object --stdin`, and the same for the text with Polish letters
  assert.equal(await blobSha("hello\n"), "ce013625030ba8dba906f756967f9e9ca394464a");
  assert.equal(await blobSha("zażółć\n"), "00580af6dbb5b45b5df5728c5395f3d0c6b1b977");
  assert.equal(await blobSha(""), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
});

test("base64 keeps UTF-8 text as it is", () => {
  for (const s of ["", "plain", "zażółć gęślą jaźń", "emoji 🌲\n"]) assert.equal(decodeBase64(encodeBase64(s)), s);
});
