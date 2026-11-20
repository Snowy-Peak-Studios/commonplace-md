# Browser check

`run.mjs` opens the app in Chrome (headless) against the example vault on GitHub (`example-vault/` in this repo's
`main` branch, which contains reviewed releases). A fresh device joins it through an invite link (with `vault=1`, `notes=Notes`,
`template=Templates/Note.md`, the Inbox page, the Inboxes folder and the start page), and the script then checks:

- reading: the start page, an embedded section, an image, callouts, properties, the Inbox button and shortcut;
- links: following a wikilink, links with headings and aliases, no missing links;
- the navigation box: folded in the preview, and refused edits in the editor; a link to no page is warned about;
- ticking a checkbox and saving it, drafts after a reload, the conflict view when a save is refused, and the question when leaving unsaved changes (Stay, Keep as a draft, Discard, Save);
- a new note: only a title, in `Notes/`, started from `Templates/Note.md`;
- CSV tables: the reading list, and editing and saving a test table;
- parent tasks and subtasks: the example epic's list and progress bar, the parent picker refusing a loop, and Add subtask; a task's commits, from its `commits` property, with no search;
- sprints: a sprint's page, the sprint picker's order, Start the next sprint (one commit through the Git data API, answered by the script) and the board's Current sprint view;
- other kinds of files: a TSV as a table, JSON and Python with colours, a PDF (in the page, or Open and Download on a phone), and a Download for a file the app can't show;
- the Task Board's base views, with every tab's count checked against the notes' real properties and the real `Bases/Tasks.base`;
- the Guide's Mermaid diagrams in light and dark, the phone layout, and read-only mode;
- Task fields: a repo with no setup opens with a new project's fields, and saving writes them to `.commonplace.json`;
- a new device without an invite (it looks for vaults on GitHub quietly, then is sent to add a repo), one that finds a vault through a `.commonplace.json` and gets it added, and an older device whose `notes-app:` settings move to `commonplace:`.

It only reads from GitHub: every save (`PUT`) is caught and answered by the script, and a fake
`Data/Test table.csv` is added to the tree for the CSV checks, and `Data/Test song.mp3` for the download.

```sh
python -m http.server 8765 --bind 127.0.0.1      # in the repo root, left running
cd tests/e2e && npm install
GH_TOKEN=<a token that can read the repo> node run.mjs <folder for screenshots>
```

With the GitHub CLI, `GH_TOKEN=$(gh auth token)` works. Every line should start with `PASS`. Every failed request is listed
at the end with its address; the one expected is the `409 (Conflict)` the script fakes.

Every write is answered by the script: PUTs, and the Git data API's trees, commits and refs (Start the next sprint). Any other write is refused, so the check never changes the repo.

Settings, all optional:

| Variable | Default | What it is |
|---|---|---|
| `OWNER` | `Snowy-Peak-Studios` | The owner of the repo with the example vault |
| `REPO` | `commonplace-md` | That repo |
| `BRANCH` | `main` | Its branch; override `OWNER`, `REPO` and `BRANCH` when checking a private candidate |
| `FOLDER` | `example-vault` | The vault's folder in it (empty for the whole repo) |
| `BASE` | `http://localhost:8765/` | The app's address; use `http://127.0.0.1:8765/` if another server answers on `localhost:8765` |
| `CHROME` | Chrome's usual path on Windows | Chrome's path |

To check your own fork, push it and run with `OWNER=<you>`.

## Isolated inbox overview check

`node inbox-overview.mjs <screenshot directory>` uses fictional accounts and local fixtures. It intercepts every GitHub call and refuses all remote writes; it needs no token. `BASE` and `CHROME` have the same defaults as the main check. It covers exact branch/folder and local bindings, per-owner credentials, reviews and repeated captures, disabled/locked/missing/revoked sources, stale results, switching off during a read, private-host restrictions, setup save, keyboard source navigation, no-token local use, and desktop/phone light/dark layouts.

## Expanded settings scrolling check

`node settings-scroll.mjs <screenshot directory>` creates seven fictional local vaults with no token. It expands their Settings cards and selects every source in the inbox-overview setup. Real wheel scrolling and keyboard focus must reach the last fields while Cancel and Save stay visible, at desktop, phone and short-window sizes in light/dark. It also checks that entered values survive and the background stays still. No GitHub calls are made.

## Inbox identity setup check

`node inbox-overview-bindings.mjs <screenshot directory>` uses fictional local and remote vaults with every GitHub request intercepted. It verifies accent-equivalent names, exact mismatch diagnostics, explicit Check inbox/Use owner, absent owners, no initial source reads, per-owner credentials, access/module/folder failures, cancellation, source-write isolation and privately saved corrections. Desktop/phone light/dark screenshots include the fixed action footer.

## AI work history

`node ai-time.mjs <screenshots-folder>` uses fictional local and intercepted read-only GitHub vaults, with no real token. It checks custom task fields/folders/statuses, completed-only records, invalid/cancelled/epic exclusion, vault isolation, matching area/type estimates, unchanged manual estimates, one/no-sample states, explicit chart blocks, grouping choices, no writes and desktop/phone light/dark layouts.

## PDF export check

`node export-pdf.mjs <output-folder>` uses local fixtures without a token or remote requests. It intercepts the print dialog, exports real A4 PDFs in desktop/phone light/dark modes, and checks expanded folds, callouts, embedded content, lazy images, Mermaid diagrams, a multi-page table, task field values and history, control removal, cleanup and unsaved drafts. Render the PDFs for visual review. The final native print/share sheet on mobile still depends on the browser and operating system.

## Local folder load check

`node local-load.mjs <screenshots-folder>` fills a folder in the browser's own private file system with notes and big files beside them, opens it as a local folder vault, and prints how long it took and how many bytes were read. It fails if opening reads the big files, makes any network call or shows a page error, and checks that a note and a big file still open from the list. `NOTES`, `BIG` and `BIG_MB` change the sizes; `BASE` and `CHROME` have the same defaults as the main check. No token is needed.

## Answered questions check

`node answered-questions.mjs <screenshots-folder>` makes a local browser vault with fictional people, an inbox and two tasks with questions. An answered question must fold under *Answered, waiting for the agent*, apart from what waits, and stay so after a reload; once both are answered nothing waits and the Inbox dot is off; a question the agent cleared leaves the list. Desktop/phone light/dark screenshots. No token or remote calls.

## Comment reply check

`node comment-reply.mjs <screenshots-folder>` makes a local browser vault with fictional people: a mention in a task's Comments and an unrelated one in another note. It replies with **Post** in the Comments box and checks the saved dated comment, that the answered mention leaves Needs attention while the other stays, and that the Inbox dot agrees, before and after a reload. No token or remote calls.

## Stuck folder check

`node local-stuck.mjs <screenshots-folder>` keeps a folder vault in the browser's own private file system and makes the browser never answer whether the page may open it, as Chrome has been seen to do for a folder kept from an earlier visit. Within a few seconds the app must ask to pick the folder again instead of staying on "Loading the files…", and picking it opens the vault. No token or network calls.
