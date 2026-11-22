// Builds the download: the app as a folder that runs from the disk, with no server, no token and no internet,
// and that folder as a zip. Chrome and Edge refuse module scripts and fetches from a file:// page, so the app
// becomes one plain script (esbuild, from tools/vendor) and the example notes another (vault-data.js).
//
//   cd tools/vendor && npm ci && cd ../..
//   node tools/download/build.mjs [version] [out folder]
//
// Writes <out>/commonplace-md/ and <out>/commonplace-md-<version>.zip (default: dist/ in the repo's root).

import { readFile, writeFile, mkdir, rm, readdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { downloadIndex, packedScript, readMe } from "./pack.mjs";
import { EXAMPLE_VAULTS, zipFiles } from "../../src/local.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const version = process.argv[2] || "dev";
const outRoot = process.argv[3] || join(root, "dist");
const out = join(outRoot, "commonplace-md");
const esbuild = createRequire(join(root, "tools/vendor/package.json"))("esbuild");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// The app: one plain script. The lazily loaded modules go into it too.
await esbuild.build({
  entryPoints: [join(root, "src/app.js")],
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: true,
  legalComments: "eof",
  outfile: join(out, "app.js"),
  logLevel: "warning",
});

// The example notes: every starter the app offers, as it would fetch them.
const files = [];
for (const example of EXAMPLE_VAULTS) {
  for (const path of example.files) {
    const at = `${example.directory}/${path}`;
    files.push({ path: at, bytes: await readFile(join(root, at)) });
  }
}
await writeFile(join(out, "vault-data.js"), packedScript(files));

// The page and what it loads as it is.
await writeFile(join(out, "index.html"), downloadIndex(await readFile(join(root, "index.html"), "utf8")));
for (const file of ["src/styles.css", "src/print.css", "vendor/mermaid.min.js", "LICENSE"]) {
  await mkdir(dirname(join(out, file)), { recursive: true });
  await copyFile(join(root, file), join(out, file));
}
await mkdir(join(out, "icons"), { recursive: true });
for (const icon of await readdir(join(root, "icons"))) await copyFile(join(root, "icons", icon), join(out, "icons", icon));
await writeFile(join(out, "READ ME.txt"), readMe(version));

// The zip: one folder, commonplace-md/, so unzipping doesn't scatter files.
const zipped = [];
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else zipped.push({ path: `commonplace-md/${relative(out, full).split("\\").join("/")}`, bytes: new Uint8Array(await readFile(full)) });
  }
};
await walk(out);
const zipName = join(outRoot, `commonplace-md-${version}.zip`);
await writeFile(zipName, zipFiles(zipped.sort((a, b) => (a.path < b.path ? -1 : 1))));
console.log(`${relative(root, zipName)}: ${zipped.length} files`);
