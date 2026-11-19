# Contributing

[README](../README.md) · [Getting started](getting-started.md) · [Block reference](blocks.md)

## Running locally

There's no build step. Serve the folder over HTTP and open it:

```sh
python -m http.server 8765 --bind 127.0.0.1
# then open http://localhost:8765/
```

## Tests

```sh
npm test            # the logic: vault rules, templates, storage, Markdown, CSV, bases (Node 20+)
```

`tests/e2e/` has a browser check that runs the app in Chrome against the example vault on GitHub. It only reads from GitHub. See its [README](../tests/e2e/README.md).

## Updating the third-party code

`vendor/vendor.js` bundles CodeMirror, markdown-it, DOMPurify, js-yaml and the Lucide icons; `vendor/LICENSES.md` lists their licenses. The app imports them from there, so the page needs no build.

Mermaid (~3.5 MB) is a separate file, `vendor/mermaid.min.js`: the build copies the package's prebuilt `dist/mermaid.min.js`, and the app loads it only when a page has a diagram. The service worker doesn't precache it; it's cached the first time it's used.

To change or update the third-party code, edit `tools/vendor/entry.js` or `tools/vendor/package.json`, then run:

```sh
cd tools/vendor
npm install
npm run build
```

Commit the new `vendor/vendor.js` and `vendor/mermaid.min.js`.

## Code layout

| Path | What it holds |
|---|---|
| `index.html`, `src/styles.css` | The page and its look (light and dark) |
| `src/app.js` | Routing, the file tree, the views, saving, drafts, new notes, settings, invite links |
| `src/print.js`, `src/print.css` | A light print/PDF copy of the rendered note, with expanded folds and no app controls |
| `src/inbox-overview.js`, `src/inbox-overview-view.js` | Optional selected-source overview: strict bindings, source-scoped rows, lazy view and private setup |
| `src/github.js` | The GitHub REST and GraphQL calls |
| `src/local.js` | Local vaults: the same calls for a folder on the disk or the browser's storage, and a zip of a vault |
| `src/mirror.js` | Each GitHub vault's copy on the device: kept in step with GitHub, opened from it with no connection |
| `src/vault.js` | Vault rules: link resolution, front matter, the navigation box, note templates, inboxes, the `.commonplace.json` file and the task setup in it, a task's commits |
| `src/ai-time.js` | Local arithmetic over recorded AI work minutes: grouped chart statistics and exact area/type task estimates |
| `src/markdown.js` | The Markdown preview (markdown-it with wikilinks, embeds, callouts, checkboxes, Mermaid placeholders) |
| `src/bases.js` | Bases: the `.base` file, its filter and formula expressions, a table view's rows, sort and groups |
| `src/editor.js` | CodeMirror setup: the protected navigation box, link marks, the merge view, colours for code and other text files |
| `src/csv.js` | CSV and TSV parsing and writing |
| `src/store.js` | This browser's storage, and moving older settings forward |
| `src/icons.js` | The icons (Lucide), as SVG elements |
| `sw.js`, `manifest.webmanifest`, `icons/` | The installable app |
| `vendor/vendor.js` | Third-party code in one bundled file, made by `tools/vendor` |
| `vendor/mermaid.min.js` | Mermaid, copied by `tools/vendor`; loaded only when a page has a diagram |
| `example-vault/` | The example vault to copy into a notes repo |
| `examples/` | Four starter vaults for solo projects, teams and personal notes |
| `tools/task-commits/` | The GitHub Action (and its script) that adds commits to their tasks, to copy into a notes repo |
| `ROADMAP.md`, `roadmap/` | What we're working on and what's next: a list, and the same as a task board (one note per task, and `Roadmap.base`) |
| `tests/` | Unit tests (`npm test`), their fixtures, and the browser check in `tests/e2e/` |
| `docs/` | Setup, usage, block and contributor guides, plus documentation images |
