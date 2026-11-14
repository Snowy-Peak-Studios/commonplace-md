# Browser check

`run.mjs` opens the app in Chrome (headless) against the example vault on GitHub (`example-vault/` in this repo's
`main` branch). A fresh device joins it through an invite link (with `vault=1`, `notes=Notes`,
`template=Templates/Note.md`, the Inbox page, the Inboxes folder and the start page), and the script then checks:

- reading: the start page, an embedded section, an image, callouts, properties, the Inbox button and shortcut;
- links: following a wikilink, links with headings and aliases, no missing links;
- the navigation box: folded in the preview, and refused edits in the editor; a link to no page is warned about;
- ticking a checkbox and saving it, drafts after a reload, and the conflict view when a save is refused;
- a new note: only a title, in `Notes/`, started from `Templates/Note.md`;
- CSV tables: the reading list, and editing and saving a test table;
- the Task Board's base views, with every tab's count checked against the notes' real properties and the real `Bases/Tasks.base`;
- the Guide's Mermaid diagrams in light and dark, the phone layout, and read-only mode;
- Task fields: a repo with no setup opens with a new project's fields, and saving writes them to `.commonplace.json`;
- a new device without an invite (it looks for vaults on GitHub quietly, then is sent to add a repo), one that finds a vault through a `.commonplace.json` and gets it added, and an older device whose `notes-app:` settings move to `commonplace:`.

It only reads from GitHub: every save (`PUT`) is caught and answered by the script, and a fake
`Data/Test table.csv` is added to the tree for the CSV checks.

```sh
python -m http.server 8765 --bind 127.0.0.1      # in the repo root, left running
cd tests/e2e && npm install
GH_TOKEN=<a token that can read the repo> node run.mjs <folder for screenshots>
```

With the GitHub CLI, `GH_TOKEN=$(gh auth token)` works. Every line should start with `PASS`. The console errors
expected are the `409 (Conflict)` the script fakes, and two `404`s from Task fields reading a `.commonplace.json` that isn't there.

Settings, all optional:

| Variable | Default | What it is |
|---|---|---|
| `OWNER` | `Snowy-Peak-Studios` | The owner of the repo with the example vault |
| `REPO` | `commonplace-md` | That repo |
| `BRANCH` | `main` | Its branch |
| `FOLDER` | `example-vault` | The vault's folder in it (empty for the whole repo) |
| `BASE` | `http://localhost:8765/` | The app's address; use `http://127.0.0.1:8765/` if another server answers on `localhost:8765` |
| `CHROME` | Chrome's usual path on Windows | Chrome's path |

To check your own fork, push it and run with `OWNER=<you>`.
