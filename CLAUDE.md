# CLAUDE.md

Guidance for contributors and AI agents working on Commonplace.md: a static browser app that reads and edits Markdown and CSV notes kept in GitHub repos. `README.md` introduces the app and links to detailed guides in `docs/`. See `docs/getting-started.md` for setup, `docs/blocks.md` for block options, and `docs/contributing.md` for local development and code layout.

## Rules

- **Commits:** no `Co-Authored-By` lines in commits or pull request descriptions.
- **Line endings:** every file in the repo is LF (`.gitattributes`). Notes the app saves are UTF-8 with LF line endings too (`src/app.js` saves through `toLf`), because many vault tools break on CRLF.
- **Branches:** commit and push to `dev` only, never to `main`. `main` is the latest release, and only the maintainer merges `dev` into it (with a version tag and release notes); an agent never pushes or merges into `main`. GitHub Pages serves both (`.github/workflows/pages.yml`): `main` at the site's address, `dev` under `dev/`; a push to either goes live there.
- **Personal notes:** anything about your own setup (accounts, repos, deployments) goes in `CLAUDE.local.md`, which git ignores. Never put names, emails, tokens or private repo names in tracked files.

## Working on it

- **Code graph:** `graphify-out/graph.json` is a [graphify](https://github.com/Graphify-Labs/graphify) graph of the app's own code (`src/`, `tests/`, `tools/`; `.graphifyignore` leaves out `vendor/`, the example vault and the docs). **Before any code change, ask it first:** `graphify explain "toLf()"` (who calls it), `graphify affected "splitFrontMatter()"` (what a change touches), `graphify path "A" "B"`. Calls through an object, like `gh.writeText`, show as file links, not calls, so check with `rg`. Its report names the commit it was built from; after code changes, `graphify update .` rebuilds it from the code alone, with no AI model, and the graph is committed with the change. The Pages workflow builds it again on every push and serves the clickable view at the site's `dev/graphify-out/graph.html`.
- **No build step:** the browser loads `src/` and `vendor/vendor.js` as they are. Third-party code changes only through `tools/vendor` (see the README); never edit `vendor/` by hand.
- **Testing:**
  - `npm test` covers the logic (Node 20+). A change to `src/vault.js`, `src/bases.js`, `src/csv.js`, `src/markdown.js` or `src/store.js` adds or extends a test in `tests/`.
  - `tests/e2e/run.mjs` runs the app in Chrome against the example vault on GitHub; every save is intercepted. Run it after UI changes, and look at its screenshots in light and dark, at desktop and phone width. See `tests/e2e/README.md`.
- **Example vault:** `example-vault/` shows every feature. When a feature is added or changed, show it there too, and keep the README's tree in step. A file added or removed there changes `EXAMPLE_FILES` in `src/local.js` too (a test checks it).
- **Look:** colours are tokens on `:root` in `src/styles.css`, with dark values under `prefers-color-scheme`. Icons come from Lucide through `icon()` in `src/icons.js`; add a new one to `tools/vendor/entry.js` and rebuild.
- **Dialogs** go through `modal()` in `src/app.js`, never the browser's `prompt`, `confirm` or `alert`.
- **Storage** goes through `store` in `src/store.js` (keys under `commonplace:`); every access is guarded, since storage can be blocked or full. A change to saved settings needs a one-time migration there, with a test. Notes kept on the device (local vaults, and each GitHub vault's copy) go through `src/local.js` and `src/mirror.js`: IndexedDB (`commonplace` database) or a folder the person picked.
- **Service worker:** when an app file is added or changed, add new files to `SHELL` in `sw.js` and bump `VERSION`. Each version of the app (released, and `dev/`) keeps its own caches, named after its scope.
- **Privacy:** the page talks only to `api.github.com`, and to its own site for the example notes a local vault can start with (see the Content Security Policy in `index.html`). Don't add other network calls. A local vault (`src/local.js`) never calls GitHub.
