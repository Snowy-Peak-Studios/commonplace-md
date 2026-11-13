# Commonplace.md

**Your project's wiki, notes and task board, in your own GitHub repo, for free.**

No more paying for Notion, Jira, Azure DevOps or Obsidian Sync. Every page is a plain Markdown file in a repo you own, read and edited in the browser or on a phone, and every save is a commit, so nothing is ever lost. Keep the repo private and only you and the people you invite can see it.

Commonplace.md is a static web page (served by GitHub Pages) that talks straight to the GitHub API with a token you make. There's no server and no account of ours: your notes stay in your repo, and the app's repo holds none. The same folder opens in Obsidian too.

## What it does

- **Files:** a folder tree of the chosen repo, shortcuts to the Inbox and start page, recent files, a file-name filter, and a search inside notes (GitHub's code search).
- **Markdown:**
  - Read and Edit modes. On a wide screen, Edit shows the preview beside the editor (CodeMirror 6).
  - Obsidian's `[[wikilinks]]` work, with headings and aliases. A bare name finds the page in any folder, as in Obsidian.
  - `![[image.png]]` embeds show, and so do callouts and the front matter as properties.
  - ` ```mermaid ` blocks are drawn as diagrams (flowcharts and the rest), in the light or dark scheme.
  - `![[Page]]` and `![[Page#Heading]]` show that page, or that heading's section, inside the note.
  - Checkboxes can be ticked in Read mode.
- **Base views:** Obsidian's `.base` files show as tables, embedded with `![[X.base]]` or opened from the tree. Their views are tabs, with filters, sorting, groups and formulas; "Last modified" is the date of the note's last commit.
- **CSV:** opens as an editable table (add or delete rows and columns) or as text, and saves back as CSV.
- **Saving:** one commit per save. If the file changed on GitHub in the meantime, GitHub refuses the save and the app shows both versions side by side, so nothing is overwritten.
- **Drafts:** unsaved changes stay in the browser and are offered back after the page closes.
- **New notes:** pick a name, kind and folder, or set a repo's New notes folder and Note template so a new note needs only a title.
- **Phone:** works at phone width and installs as an app (PWA). It needs a connection.
- **Look:** light and dark, following the device.
- **Keys:** Ctrl+S saves, Ctrl+E switches between Read and Edit, Ctrl+K searches the files.
- **Vault rules (optional, per repo):** a generated navigation box shows folded and can't be edited, and a link to no page is warned about.
- **Inboxes:** an Inbox button that opens your own inbox, found by your GitHub login.
- **Sharing:** invite links that set up a repo on someone else's device; read-only mode for people who can't push.

## Quick start

### 1. Open the app

Either:

- **A. Use the hosted app:** <https://snowy-peak-studios.github.io/commonplace-md/>. It's this repo's `main` branch, served by GitHub Pages.
- **B. Host your own copy:**
  1. Fork [github.com/Snowy-Peak-Studios/commonplace-md](https://github.com/Snowy-Peak-Studios/commonplace-md) (keep the name `commonplace-md`, or change the address below to match).
  2. In your fork: **Settings › Pages › Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`. Save.
  3. After a minute or two, open `https://<your-github-name>.github.io/commonplace-md/`.

   Free GitHub Pages serves public repos only. That's fine: the app's repo holds code, never notes.

### 2. Make a notes repo

Make a new repo on GitHub for your notes ([github.com/new](https://github.com/new)). **Private is fine**, and usually what you want. Then fill it with the example vault, so you start with something that shows every feature.

With git:

```sh
# Get only the example-vault folder of this repo
git clone --depth 1 --filter=blob:none --sparse https://github.com/Snowy-Peak-Studios/commonplace-md.git
git -C commonplace-md sparse-checkout set example-vault

# Copy it into your notes repo and push
git clone https://github.com/<you>/<your-notes-repo>.git
cp -r commonplace-md/example-vault/. <your-notes-repo>/
cd <your-notes-repo>
git add -A
git commit -m "Start from the Commonplace.md example vault"
git push
```

Without git: on this repo's GitHub page, **Code › Download ZIP**, unzip it, then in your notes repo on GitHub use **Add file › Upload files** and drop in everything inside `example-vault/` (folders included).

This puts the vault at the top of the repo. To keep it in a folder instead (say `notes/`), copy it there and set **Folder** in step 4.

### 3. Make a token

Make a fine-grained token at [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):

- **Resource owner:** you, or the organization that owns the notes repo.
- **Repository access:** *Only select repositories*, and pick your notes repo(s).
- **Repository permissions › Contents:** *Read and write* (or *Read-only* for a device that only reads).

For a repo owned by an organization, the organization may hold new tokens until an owner approves them (organization **Settings › Personal access tokens › Pending requests**). The token works once it's approved.

Make one token per device, so you can revoke one without the others.

### 4. Connect and add the repo

1. Open the app, paste the token and press **Connect**.
2. The app takes you to **Settings › Notes repos** with a new repo to fill in. **Owner** and **Repo** are enough to start; for the example vault, also set:
   - **Start page:** `Home.md`
   - **Inbox page:** `Notes/Inbox.md`
   - **Inboxes folder:** `Notes/Inboxes`
   - **New notes folder:** `Notes`
   - **Note template:** `Templates/Note.md`
   - **Obsidian vault rules:** on
3. Press **Save repos**, then **Check access** to see that the token can read and save it.

That's it: pick the repo at the top of the file list and start writing.

## One per project, or one for the whole organization

The app opens as many repos as you add, and you switch between them at the top of the file list. Set it up the way your team works:

- **A vault per project:** keep each project's notes next to its code, in a folder of the project's own repo (say `Wiki/`, on the branch you work on). Add each repo in Settings with its **Folder** and **Branch**; each one gets its own invite link. The notes then move with the code, and a commit can change both.
- **One vault for the organization:** one notes repo for everything: the company wiki, every project's pages and tasks, with a folder per project if you like.
- **Both:** an organization vault beside the projects' own vaults. Each repo keeps its own settings (start page, inboxes, template, vault rules).

A device holds one token, so the repos it opens should share an owner. Make the token with the organization as **Resource owner** and *All repositories*, and every repo of the organization works, new ones too. A fine-grained token has one owner, so repos of your own account and of an organization can't share one.

## Settings reference

Each repo in **Settings › Notes repos** has these fields. Paths are inside the repo's **Folder** (or the whole repo when it's empty). The second column is the same setting's name in an invite link.

| Field | In a link | What it does | Example |
|---|---|---|---|
| Name shown | `label` | What the repo is called in the list at the top of the files. Empty: `owner/repo`. | `My notes` |
| Owner | `owner` | The GitHub user or organization the repo belongs to. | `ann-example` |
| Repo | `repo` | The repo's name. | `notes` |
| Branch | `branch` | The branch the app reads and saves to. Empty: `main`. | `main` |
| Folder | `folder` | Show only this folder of the repo. Empty: the whole repo. | `notes` |
| Start page | `home` | The note that opens first. | `Home.md` |
| Inbox page | `inbox` | A note for quick notes and tasks. It gets an Inbox button and shortcut. Empty: no button. | `Notes/Inbox.md` |
| Inboxes folder | `inboxes` | A folder with one inbox per person. The Inbox button opens the one whose `github` property is your login. | `Notes/Inboxes` |
| New notes folder | `notes` | New note asks only for a title and puts the note here. Empty: you pick the name, kind (note or CSV) and folder each time. | `Notes` |
| Note template | `template` | A note that new Markdown notes start from. `{{title}}` becomes the title and `{{date}}` today's date (YYYY-MM-DD). Empty, or the file isn't there: a new note starts with `# Title`. | `Templates/Note.md` |
| Obsidian vault rules | `vault=1` | The generated navigation box (between `%% nav: … %%` and `%% /nav %%`) shows folded and can't be edited, links that lead to no page are warned about, and a new note's title must not already be a page anywhere. | on |

Settings live in this browser's storage, so each device has its own. An invite link copies them to another device.

## The example vault

`example-vault/` is a small Obsidian-style vault to copy into your notes repo. Each file shows something the app supports.

```text
example-vault/
├── Home.md                      start page: links, a table, a callout, an embedded section, a Mermaid diagram, an image
├── Guide.md                     the navigation box, wikilinks with headings and aliases, embeds, callouts, checkboxes, diagrams
├── Task Board.md                current goals, and the tasks' base embedded with ![[Tasks.base]]
├── Bases/
│   └── Tasks.base               a base with three views (By status, Open, Done), a formula, groups, sorts and filters
├── Tasks/                       five task notes with status, priority, area and assignee properties, and checklists
├── Notes/
│   ├── Inbox.md                 the shared inbox: owner and github properties, New tasks and Notes sections
│   └── Inboxes/
│       └── Your name.md         a personal inbox: copy it, rename it, put your GitHub login in github
├── Templates/
│   └── Note.md                  the note template, with {{title}} and {{date}}
├── Data/
│   └── Reading list.csv         a CSV file, opened as a table
└── Attachments/
    └── commonplace.svg          an image, embedded with ![[commonplace.svg|160]]
```

Every page but `Home.md` has a `parent` property that links to the page above it.

The navigation box in `Guide.md` is the kind a script writes and keeps up to date (a breadcrumb and the page's headings). The app doesn't make it; with **Obsidian vault rules** on, it only protects it. Leave it out if you don't use such a script.

## Obsidian compatibility

The same folder opens in Obsidian and in the app. What the app supports:

- `[[wikilinks]]`, with `#Heading` and `|alias`, found by bare name in any folder
- embeds: `![[image.png]]` (with `|width`), `![[Page]]`, `![[Page#Heading]]`, `![[X.base]]`
- callouts (`> [!note]`, folded with `-` or open with `+`)
- front matter, shown as properties
- bases (`.base` files): table views with filters, formulas, sorting, groups and column widths
- ` ```mermaid ` diagrams
- checkboxes, ticked in Read mode
- `%% comments %%`, hidden in the preview
- note templates with `{{title}}` and `{{date}}`, as Obsidian's core Templates plugin writes them

What it doesn't do:

- community plugins (Dataview, Templater and the like), Canvas, the graph view
- base views other than tables (the app says so, and shows the base's other views)
- other template variables (`{{time}}`, custom date formats); they stay as written
- editing images or other binary files
- working offline

Folders and files starting with a dot (`.obsidian/`, `.trash/`) are left out of the tree.

## Sharing

Notes are shared the GitHub way: whoever can open the repo on GitHub can open it in the app.

1. **Give them access on GitHub:** add them as a collaborator on the repo (**Settings › Collaborators**), or as a member of the organization that owns it.
2. **Send an invite link:** in **Settings**, open the repo and press **Copy invite link**. It opens the app with the repo's settings filled in:

   ```text
   https://snowy-peak-studios.github.io/commonplace-md/#/join?owner=ann-example&repo=notes&branch=main&label=Our+notes&folder=notes&vault=1&inbox=Notes%2FInbox.md&inboxes=Notes%2FInboxes&home=Home.md&notes=Notes&template=Templates%2FNote.md
   ```

   `owner` and `repo` are required; the rest are the fields in the [Settings reference](#settings-reference). The link carries no token and no notes.

3. **They make their own token** (the app shows them the steps for that repo) and paste it. The repo is added to their device.

- **Read only:** when GitHub says a person can't push to a repo, the app hides Edit, Save and New note there and shows *Read only*.
- **Organizations:** the token's **Resource owner** must be the organization, and the organization may need to approve the token before it works (see step 3 of the Quick start).

## Inboxes

An inbox is a note for things to sort later: new tasks, notes, questions.

- The repo's **Inbox page** (e.g. `Notes/Inbox.md`) gets an **Inbox** button in the toolbar and a shortcut in the file list.
- With an **Inboxes folder** (e.g. `Notes/Inboxes`), each person can have their own inbox there. The app reads the `github` property of the Inbox page and of each note directly in that folder, and the Inbox button opens the one that matches the signed-in GitHub login (any case). With no match, it opens the Inbox page.

  ```yaml
  ---
  owner: Ann Example
  github: ann-example
  ---
  ```

- Notes deeper in the folder are ignored, so `Notes/Inboxes/Local/` can hold inboxes kept off GitHub: add `Notes/Inboxes/Local/` to the notes repo's `.gitignore` and they stay on your computer, for Obsidian only.

## Privacy and security

- The token is kept in this browser's storage (`localStorage`) on this device, and is sent only to `api.github.com`. Anyone who can use this browser profile could read it, so revoke it on GitHub if a device is lost.
- Make tokens for the notes repos only (*Only select repositories*), with *Contents* as the only permission.
- The page's Content Security Policy lets it connect to `api.github.com` only. There's no server, no analytics and no account of ours. (An image a note links from the web loads from that site.)
- The app's repo holds code only. Your notes are in your repo, private if you made it private; GitHub Pages serves only the app.
- Unsaved drafts stay in this browser until saved or discarded (**Settings › This device**).

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

`tests/e2e/` has a browser check that runs the app in Chrome against the example vault on GitHub. It only reads from GitHub. See its [README](tests/e2e/README.md).

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
| `src/github.js` | The GitHub REST and GraphQL calls |
| `src/vault.js` | Obsidian rules: link resolution, front matter, the navigation box, note templates, inboxes |
| `src/markdown.js` | The Markdown preview (markdown-it with wikilinks, embeds, callouts, checkboxes, Mermaid placeholders) |
| `src/bases.js` | Obsidian bases: the `.base` file, its filter and formula expressions, a table view's rows, sort and groups |
| `src/editor.js` | CodeMirror setup: the protected navigation box, link marks, the merge view |
| `src/csv.js` | CSV parsing and writing |
| `src/store.js` | This browser's storage, and moving older settings forward |
| `src/icons.js` | The icons (Lucide), as SVG elements |
| `sw.js`, `manifest.webmanifest`, `icons/` | The installable app |
| `vendor/vendor.js` | Third-party code in one bundled file, made by `tools/vendor` |
| `vendor/mermaid.min.js` | Mermaid, copied by `tools/vendor`; loaded only when a page has a diagram |
| `example-vault/` | The example vault to copy into a notes repo |
| `tests/` | Unit tests (`npm test`), their fixtures, and the browser check in `tests/e2e/` |

## License

MIT: see [LICENSE](LICENSE). The third-party code in `vendor/` keeps its own licenses, listed in [vendor/LICENSES.md](vendor/LICENSES.md).
