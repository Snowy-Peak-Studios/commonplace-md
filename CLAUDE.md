# CLAUDE.md

Guidance for contributors and AI agents working on Commonplace.md: a static browser app that reads and edits Markdown and CSV notes kept in GitHub repos. `README.md` says what it does, how to set it up and how the code is laid out.

## Rules

- **Commits:** no `Co-Authored-By` lines in commits or pull request descriptions.
- **Line endings:** every file in the repo is LF (`.gitattributes`). Notes the app saves are UTF-8 with LF line endings too (`src/app.js` saves through `toLf`), because many vault tools break on CRLF.
- **Personal notes:** anything about your own setup (accounts, repos, deployments) goes in `CLAUDE.local.md`, which git ignores. Never put names, emails, tokens or private repo names in tracked files.

## Working on it

- **No build step:** the browser loads `src/` and `vendor/vendor.js` as they are. Third-party code changes only through `tools/vendor` (see the README); never edit `vendor/` by hand.
- **Testing:**
  - `npm test` covers the logic (Node 20+). A change to `src/vault.js`, `src/bases.js`, `src/csv.js`, `src/markdown.js` or `src/store.js` adds or extends a test in `tests/`.
  - `tests/e2e/run.mjs` runs the app in Chrome against the example vault on GitHub; every save is intercepted. Run it after UI changes, and look at its screenshots in light and dark, at desktop and phone width. See `tests/e2e/README.md`.
- **Example vault:** `example-vault/` shows every feature. When a feature is added or changed, show it there too, and keep the README's tree in step.
- **Look:** colours are tokens on `:root` in `src/styles.css`, with dark values under `prefers-color-scheme`. Icons come from Lucide through `icon()` in `src/icons.js`; add a new one to `tools/vendor/entry.js` and rebuild.
- **Dialogs** go through `modal()` in `src/app.js`, never the browser's `prompt`, `confirm` or `alert`.
- **Storage** goes through `store` in `src/store.js` (keys under `commonplace:`); every access is guarded, since storage can be blocked or full. A change to saved settings needs a one-time migration there, with a test.
- **Service worker:** when an app file is added or changed, add new files to `SHELL` in `sw.js` and bump `CACHE`.
- **Privacy:** the page talks only to `api.github.com` (see the Content Security Policy in `index.html`). Don't add other network calls.
