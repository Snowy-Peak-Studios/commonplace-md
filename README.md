# Commonplace.md

**Your project's wiki, notes and task board, in your own GitHub repo, for free.**

No more paying for Notion, Jira or Azure DevOps. Every page is a plain Markdown file in a repo you own, read and edited in the browser or on a phone, and every save is a commit, so nothing is ever lost. Keep the repo private and only you and the people you invite can see it.

Commonplace.md is a static web page (served by GitHub Pages) that talks straight to the GitHub API with a token you make. There's no server and no account of ours: your notes stay in your repo, and the app's repo holds none. The notes are plain Markdown, so the same folder opens in any Markdown editor too.

## What it does

- Your notes are plain Markdown files in your own GitHub repo, and every save is a commit.
- Read and edit them on a computer or a phone, and install it as an app.
- Wikilinks, embeds, callouts, diagrams, checklists, and tables of your notes from `.base` files.
- Inboxes, invite links and read-only mode for working as a team, and rules for AI agents if you like.
- Free: no server, no account of ours, nothing to install.

<details>
<summary>Everything it does</summary>

- **Files:** a folder tree of the chosen repo, shortcuts to the Inbox and start page, recent files, a file-name filter, and a search inside notes (GitHub's code search).
- **Markdown:**
  - Read and Edit modes. On a wide screen, Edit shows the preview beside the editor (CodeMirror 6).
  - `[[Wikilinks]]` work, with headings and aliases. A bare name finds the page in any folder.
  - `![[image.png]]` embeds show, and so do callouts and the front matter as properties.
  - ` ```mermaid ` blocks are drawn as diagrams (flowcharts and the rest), in the light or dark scheme.
  - `![[Page]]` and `![[Page#Heading]]` show that page, or that heading's section, inside the note.
  - Checkboxes can be ticked in Read mode.
- **Base views:** `.base` files show as tables, embedded with `![[X.base]]` or opened from the tree. Their views are tabs, with filters, sorting, groups and formulas; "Last modified" is the date of the note's last commit.
- **CSV:** opens as an editable table (add or delete rows and columns) or as text, and saves back as CSV.
- **Saving:** one commit per save. If the file changed on GitHub in the meantime, GitHub refuses the save and the app shows both versions side by side, so nothing is overwritten.
- **Drafts:** unsaved changes stay in the browser and are offered back after the page closes.
- **New notes:** pick a name, kind and folder, or set a repo's New notes folder and Note template so a new note needs only a title.
- **An app of its own:** installs on a computer or a phone, with its own window and icon ([how](#5-install-it-as-an-app-optional)). Works at phone width. It needs a connection.
- **Look:** light and dark, following the device.
- **Keys:** Ctrl+S saves, Ctrl+E switches between Read and Edit, Ctrl+K searches the files.
- **Vault rules (optional, per repo):** a generated navigation box shows folded and can't be edited, and a link to no page is warned about.
- **Inboxes:** an Inbox button that opens your own inbox, found by your GitHub login.
- **AI agents (optional):** rules in the example vault for agents that sort your inbox into tasks, work on them and keep the board up to date ([more](#working-with-ai-agents-optional)).
- **Sharing:** invite links that set up a repo on someone else's device; read-only mode for people who can't push.

</details>

## Quick start

Five steps, about ten minutes. Or let your AI agent do most of them:

<details>
<summary><b>🤖 Let your AI agent do it</b>: copy this prompt into an agent that can run git (Claude Code, Codex and others)</summary>

```text
Set up Commonplace.md for me: a notes app that reads and edits Markdown notes kept in a GitHub repo,
at https://snowy-peak-studios.github.io/commonplace-md/ (code: https://github.com/Snowy-Peak-Studios/commonplace-md).

1. Ask me for: the GitHub owner of the notes repo (my user name or an organization), the repo's name
   (default "notes"), my name, and my GitHub login.
2. Make the repo, private: with the GitHub CLI if it's installed and signed in
   (gh repo create <owner>/<repo> --private), otherwise ask me to make an empty private repo
   at https://github.com/new and wait for me.
3. Fill it with the example vault:
   git clone --depth 1 --filter=blob:none --sparse https://github.com/Snowy-Peak-Studios/commonplace-md.git
   git -C commonplace-md sparse-checkout set example-vault
   Copy everything inside commonplace-md/example-vault/ (folders and the AGENTS.md and CLAUDE.md files too)
   to the top of my notes repo.
4. Make the inbox mine: in Notes/Inbox.md set owner to my name and github to my GitHub login, and rename
   Notes/Inboxes/Your name.md to my name with the same two properties. Then commit everything as
   "Start from the Commonplace.md example vault" and push to main. Delete the commonplace-md clone.
5. Tell me to make a token myself (you can't, and I must never paste it to you): at
   https://github.com/settings/personal-access-tokens/new, Resource owner: <owner>,
   Repository access: Only select repositories: <repo>, Repository permissions: Contents: Read and write.
6. Give me this link with <owner> and <repo> filled in, to open and paste the token into:
   https://snowy-peak-studios.github.io/commonplace-md/#/join?owner=<owner>&repo=<repo>&branch=main&label=My+notes&vault=1&inbox=Notes%2FInbox.md&inboxes=Notes%2FInboxes&home=Home.md&notes=Notes&template=Templates%2FNote.md
7. From now on, when you work in that repo, follow its AGENTS.md, with git user.name set to my name.
```

</details>

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

The vault comes with `AGENTS.md` and `CLAUDE.md`, rules for AI agents. Keep them if you work with agents (see [Working with AI agents](#working-with-ai-agents-optional)); otherwise delete them.

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
   - **Vault rules:** on
3. Press **Save repos**, then **Check access** to see that the token can read and save it.

That's it: pick the repo at the top of the file list and start writing.

### 5. Install it as an app (optional)

Commonplace.md can be installed like any other app: it gets its own window and icon, and opens straight to your notes.

- **On a computer** (Chrome, Edge, Brave and other Chromium browsers): click the **install icon** at the right end of the address bar (a screen with a small arrow), or open the browser's menu and pick **Install Commonplace.md** (in some browsers under *Cast, save and share* or *Apps*). It then sits in the Start menu or the Dock, and can be pinned to the taskbar.
- **On Android** (Chrome): the menu (⋮) › **Install app** or **Add to home screen**.
- **On iPhone and iPad** (Safari): the **Share** button › **Add to Home Screen**.

The installed app is the same page, and it updates by itself when the app does. On a computer and on Android it shares the browser's storage, so your token and repos are already there. On iPhone and iPad it has storage of its own: connect the token and add your repos once more inside it. It still needs a connection, and your notes stay on GitHub. To remove it, uninstall it like any other app.

## One per project, or one for the whole organization

<details>
<summary>A vault per project, one for the organization, or both</summary>

The app opens as many repos as you add, and you switch between them at the top of the file list. Set it up the way your team works:

- **A vault per project:** keep each project's notes next to its code, in a folder of the project's own repo (say `Wiki/`, on the branch you work on). Add each repo in Settings with its **Folder** and **Branch**; each one gets its own invite link. The notes then move with the code, and a commit can change both.
- **One vault for the organization:** one notes repo for everything: the company wiki, every project's pages and tasks, with a folder per project if you like.
- **Both:** an organization vault beside the projects' own vaults. Each repo keeps its own settings (start page, inboxes, template, vault rules).

A device holds one token, so the repos it opens should share an owner. Make the token with the organization as **Resource owner** and *All repositories*, and every repo of the organization works, new ones too. A fine-grained token has one owner, so repos of your own account and of an organization can't share one.

</details>

## Settings reference

<details>
<summary>Every setting a repo has, and its name in an invite link</summary>

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
| Vault rules | `vault=1` | The generated navigation box (between `%% nav: … %%` and `%% /nav %%`) shows folded and can't be edited, links that lead to no page are warned about, and a new note's title must not already be a page anywhere. | on |

Settings live in this browser's storage, so each device has its own. An invite link copies them to another device.

</details>

## The example vault

<details>
<summary>The files it comes with, and what each one shows</summary>

`example-vault/` is a small vault to copy into your notes repo. Each file shows something the app supports.

```text
example-vault/
├── Home.md                      start page: links, a table, a callout, an embedded section, a Mermaid diagram, an image
├── Guide.md                     the navigation box, wikilinks with headings and aliases, embeds, callouts, checkboxes, diagrams
├── Task Board.md                current goals, the tasks' base embedded with ![[Tasks.base]], and an optional Areas table
├── AGENTS.md                    optional: the rules for AI agents working in the vault
├── CLAUDE.md                    optional: loads AGENTS.md for Claude Code
├── Bases/
│   └── Tasks.base               a base with three views (By status, Open, Done), a formula, groups, sorts and filters
├── Tasks/                       five task notes with id, status, priority, area, assignee and requested_by properties, and checklists
├── Notes/
│   ├── Inbox.md                 the shared inbox: owner and github properties, New tasks, Notes and Needs attention sections
│   └── Inboxes/
│       └── Your name.md         a personal inbox: copy it, rename it, put your GitHub login in github
├── Templates/
│   ├── Note.md                  the note template, with {{title}} and {{date}}
│   └── Task.md                  the task template: a user story, acceptance criteria and the task's properties
├── Data/
│   └── Reading list.csv         a CSV file, opened as a table
└── Attachments/
    └── commonplace.svg          an image, embedded with ![[commonplace.svg|160]]
```

Every page but `Home.md` has a `parent` property that links to the page above it.

The navigation box in `Guide.md` is the kind a script writes and keeps up to date (a breadcrumb and the page's headings). The app doesn't make it; with **Vault rules** on, it only protects it. Leave it out if you don't use such a script.

</details>

## Works with other Markdown editors

<details>
<summary>What the app understands, and what it doesn't</summary>

The notes are plain Markdown files, so the same folder opens in any Markdown editor, and desktop note apps that use `[[wikilinks]]` read it as it is. What the app supports:

- `[[wikilinks]]`, with `#Heading` and `|alias`, found by bare name in any folder
- embeds: `![[image.png]]` (with `|width`), `![[Page]]`, `![[Page#Heading]]`, `![[X.base]]`
- callouts (`> [!note]`, folded with `-` or open with `+`)
- front matter, shown as properties
- bases (`.base` files): table views with filters, formulas, sorting, groups and column widths
- ` ```mermaid ` diagrams
- checkboxes, ticked in Read mode
- `%% comments %%`, hidden in the preview
- note templates with `{{title}}` and `{{date}}`

What it doesn't do:

- plugins, canvases, a graph view
- base views other than tables (the app says so, and shows the base's other views)
- other template variables (`{{time}}`, custom date formats); they stay as written
- editing images or other binary files
- working offline

Folders and files starting with a dot (like `.trash/`) are left out of the tree.

</details>

## Sharing

<details>
<summary>Give people access, send an invite link, read-only mode</summary>

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

</details>

## Inboxes

<details>
<summary>How the Inbox button finds your own inbox</summary>

An inbox is a note for things to sort later: new tasks, notes, questions.

- The repo's **Inbox page** (e.g. `Notes/Inbox.md`) gets an **Inbox** button in the toolbar and a shortcut in the file list.
- With an **Inboxes folder** (e.g. `Notes/Inboxes`), each person can have their own inbox there. The app reads the `github` property of the Inbox page and of each note directly in that folder, and the Inbox button opens the one that matches the signed-in GitHub login (any case). With no match, it opens the Inbox page.

  ```yaml
  ---
  owner: Ann Example
  github: ann-example
  ---
  ```

- Notes deeper in the folder are ignored, so `Notes/Inboxes/Local/` can hold inboxes kept off GitHub: add `Notes/Inboxes/Local/` to the notes repo's `.gitignore` and they stay on your computer, for a desktop editor only.

</details>

## Working with AI agents (optional)

<details>
<summary>What agents do with your notes, how to set them up, and a day with them</summary>

AI agents that can run git (Claude Code, Codex and others) can work in your vault beside you. The example vault comes with the rules for them: `AGENTS.md`, which any agent reads, and `CLAUDE.md`, which loads it for Claude Code. With them, an agent:

- pulls first, and reads the **current goals** on the Task Board, so what it picks and proposes serves them;
- reads **your inbox** and turns what you wrote under **New tasks** into task notes, with IDs and acceptance criteria;
- picks a free task and **claims** it (status and assignee, committed and pushed) before it changes anything, so two agents never work on the same task;
- keeps the Task Board and the other notes up to date, and writes what it did and the commit into the task when it's done;
- asks you under **Needs attention** in your inbox when it needs a decision, and works on something else while it waits.

This is how the makers of Commonplace.md use it with their own agents. Change the rules to fit how you work.

### Set it up

1. Keep `AGENTS.md` and `CLAUDE.md` at the top of the notes repo, where agents look for them. If the vault is in a folder (say `notes/`), move the two files up to the repo's top and put the folder in front of the paths in them (`notes/Home.md`, `notes/Tasks/`, ...).
2. Give each person an inbox in `Notes/Inboxes/` (or use the shared `Notes/Inbox.md`), with `owner` their name and `github` their GitHub login.
3. Set the agent's git `user.name` (`git config user.name`) to the inbox's `owner`, so the agent finds its person's inbox.
4. Optional: fill in the **Areas** table on the Task Board, so each person's agents pick only their own tasks.

### Every day

1. You write in your inbox from the app, on your phone or anywhere: new tasks, notes, answers.
2. The agent pulls, sorts the inbox into tasks, claims one and works on it.
3. When it needs you, it leaves a question under **Needs attention**. You answer under the item, and the agent picks it up next time.
4. The agent pushes after every commit, so the app shows its changes on your phone at once.

To start a session, open the agent in the notes repo and paste:

```text
Read AGENTS.md and follow it: pull, read the current goals and my inbox, and sort my new tasks into
task notes. Then tell me which task you'd pick next and why, and wait for my go-ahead before you start it.
```

</details>

## Privacy and security

<details>
<summary>Where your token lives, and what the app talks to</summary>

- The token is kept in this browser's storage (`localStorage`) on this device, and is sent only to `api.github.com`. Anyone who can use this browser profile could read it, so revoke it on GitHub if a device is lost.
- Make tokens for the notes repos only (*Only select repositories*), with *Contents* as the only permission.
- The page's Content Security Policy lets it connect to `api.github.com` only. There's no server, no analytics and no account of ours. (An image a note links from the web loads from that site.)
- The app's repo holds code only. Your notes are in your repo, private if you made it private; GitHub Pages serves only the app.
- Unsaved drafts stay in this browser until saved or discarded (**Settings › This device**).

</details>

## Running locally

<details>
<summary>Serve the folder and open it</summary>

There's no build step. Serve the folder over HTTP and open it:

```sh
python -m http.server 8765 --bind 127.0.0.1
# then open http://localhost:8765/
```

</details>

## Tests

<details>
<summary>The unit tests and the browser check</summary>

```sh
npm test            # the logic: vault rules, templates, storage, Markdown, CSV, bases (Node 20+)
```

`tests/e2e/` has a browser check that runs the app in Chrome against the example vault on GitHub. It only reads from GitHub. See its [README](tests/e2e/README.md).

</details>

## Updating the third-party code

<details>
<summary>How <code>vendor/</code> is built</summary>

`vendor/vendor.js` bundles CodeMirror, markdown-it, DOMPurify, js-yaml and the Lucide icons; `vendor/LICENSES.md` lists their licenses. The app imports them from there, so the page needs no build.

Mermaid (~3.5 MB) is a separate file, `vendor/mermaid.min.js`: the build copies the package's prebuilt `dist/mermaid.min.js`, and the app loads it only when a page has a diagram. The service worker doesn't precache it; it's cached the first time it's used.

To change or update the third-party code, edit `tools/vendor/entry.js` or `tools/vendor/package.json`, then run:

```sh
cd tools/vendor
npm install
npm run build
```

Commit the new `vendor/vendor.js` and `vendor/mermaid.min.js`.

</details>

## Code layout

<details>
<summary>Which file does what</summary>

| Path | What it holds |
|---|---|
| `index.html`, `src/styles.css` | The page and its look (light and dark) |
| `src/app.js` | Routing, the file tree, the views, saving, drafts, new notes, settings, invite links |
| `src/github.js` | The GitHub REST and GraphQL calls |
| `src/vault.js` | Vault rules: link resolution, front matter, the navigation box, note templates, inboxes |
| `src/markdown.js` | The Markdown preview (markdown-it with wikilinks, embeds, callouts, checkboxes, Mermaid placeholders) |
| `src/bases.js` | Bases: the `.base` file, its filter and formula expressions, a table view's rows, sort and groups |
| `src/editor.js` | CodeMirror setup: the protected navigation box, link marks, the merge view |
| `src/csv.js` | CSV parsing and writing |
| `src/store.js` | This browser's storage, and moving older settings forward |
| `src/icons.js` | The icons (Lucide), as SVG elements |
| `sw.js`, `manifest.webmanifest`, `icons/` | The installable app |
| `vendor/vendor.js` | Third-party code in one bundled file, made by `tools/vendor` |
| `vendor/mermaid.min.js` | Mermaid, copied by `tools/vendor`; loaded only when a page has a diagram |
| `example-vault/` | The example vault to copy into a notes repo |
| `tests/` | Unit tests (`npm test`), their fixtures, and the browser check in `tests/e2e/` |

</details>

## License

MIT: see [LICENSE](LICENSE). The third-party code in `vendor/` keeps its own licenses, listed in [vendor/LICENSES.md](vendor/LICENSES.md).
