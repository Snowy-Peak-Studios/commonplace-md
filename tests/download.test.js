import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { downloadIndex, packedScript, readMe } from "../tools/download/pack.mjs";
import { EXAMPLE_VAULTS, fetchExample } from "../src/local.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("the download's page runs plain, deferred scripts and allows no network", () => {
  const page = downloadIndex(html);
  assert.ok(!page.includes('type="module"'));
  assert.ok(page.indexOf('<script defer src="vault-data.js"></script>') < page.indexOf('<script defer src="app.js"></script>'));
  assert.match(page, /connect-src 'none';/);
  assert.ok(!page.includes("api.github.com"));
  assert.ok(!page.includes('rel="manifest"'));
  assert.ok(page.includes('href="src/styles.css"'), "the rest stays as it is");
});

test("the page build stops when index.html changes under it", () => {
  assert.throws(() => downloadIndex(html.replace('<script type="module" src="src/app.js"></script>', "")), /no <script type="module"/);
  assert.throws(() => downloadIndex(html.replace("connect-src 'self' https://api.github.com;", "")), /Content Security Policy/);
});

test("the packed script gives back every file's exact bytes", async () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 255]);
  const files = [{ path: "example-vault/Home.md", bytes: new TextEncoder().encode("# Home\n\nŁódź ✓\n") }, { path: "example-vault/Attachments/a.png", bytes }];
  const sandbox = {};
  vm.runInNewContext(packedScript(files).replace("globalThis.", "this."), sandbox);
  const packed = sandbox.COMMONPLACE_PACKED;
  assert.deepEqual(Object.keys(packed), ["example-vault/Attachments/a.png", "example-vault/Home.md"]);
  const example = { directory: "example-vault", files: ["Home.md", "Attachments/a.png"], settings: { home: "Home.md" } };
  const got = await fetchExample(example, null, packed);
  assert.equal(new TextDecoder().decode(got.files[0].bytes), "# Home\n\nŁódź ✓\n");
  assert.deepEqual([...got.files[1].bytes], [...bytes]);
});

test("a starter missing from the pack fails as a missing fetch does", async () => {
  const example = { directory: "example-vault", files: ["Home.md"], settings: { home: "Home.md" } };
  await assert.rejects(fetchExample(example, null, {}), /example notes didn't come/);
});

test("every starter's files are there to pack", () => {
  for (const example of EXAMPLE_VAULTS) {
    for (const path of example.files) readFileSync(new URL(`../${example.directory}/${path}`, import.meta.url));
  }
});

test("the read-me says how to open it and where the full setup is", () => {
  const text = readMe("v1.2.3");
  assert.match(text, /v1\.2\.3/);
  assert.match(text, /index\.html/);
  assert.match(text, /never go\s+to GitHub/);
  assert.match(text, /getting-started\.md#set-it-up-with-github/);
});
