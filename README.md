# Commonplace.md

**A common place for your everyday: your project's wiki, notes and task board, your private notes and recipes, all in your own GitHub repo, for free.**

## What it is

A tool for your everyday. The big work tools cost a lot and do so much that most people on a team just don't use them. Commonplace.md is the simple alternative: a wiki, notes and a task board that the whole team actually opens.

It's made for a team and AI together. Your notes are plain files, kept local and easy to reach. You set up your project's rules in the vault: AI agents follow their own rules, people follow theirs, and both work on the same pages. ([How it works with agents](#working-with-ai-agents-optional))

No more paying for Notion, Jira or Azure DevOps. Every page is a plain Markdown file in a repo you own, read and edited in the browser or on a phone, and every save is a commit, so nothing is ever lost. Keep the repo private and only you and the people you invite can see it.

Commonplace.md is a static web page (served by GitHub Pages) that talks straight to the GitHub API with a token you make. There's no server and no account of ours: your notes stay in your repo, and the app's repo holds none. The notes are plain Markdown, so the same folder opens in any Markdown editor too.

## Why

I was frustrated with the work tools I had to use, so I started making this for my own daily use. It grew until it became my main focus. Now I'm sharing it with everyone who has struggled with those tools like I did.

## What it does

- Your notes are plain Markdown files in your own GitHub repo, and every save is a commit.
- Read and edit them on a computer or a phone, and install it as an app.
- Wikilinks, embeds, callouts, diagrams, checklists, and tables of your notes from `.base` files.
- Inboxes, invite links and read-only mode for working as a team, and rules for AI agents if you like.
- Free: no server, no account of ours, nothing to install.

<details>
<summary>Everything it does</summary>

- **Up to date:** a Reload button beside Save, and a quiet banner when GitHub has newer notes than the ones you have open (checked when you come back to the tab and every few minutes, cheaply).
- **Files:** a folder tree of the chosen repo, a Back button (also in the installed app, which has no browser buttons), an Up button to the note's `parent` page, shortcuts to the Inbox and start page, recent files, a file-name filter, and a search inside notes (GitHub's code search).
- **Markdown:**
  - Read and Edit modes. On a wide screen, Edit shows the preview beside the editor (CodeMirror 6).
  - `[[Wikilinks]]` work, with headings and aliases. A bare name finds the page in any folder.
  - `![[image.png]]` embeds show, and so do callouts and the front matter as properties.
  - ` ```mermaid ` blocks are drawn as diagrams (flowcharts and the rest), in the light or dark scheme.
  - A ` ```top-tasks ` block shows the top tasks to start on any page, an inbox too, with everything it shows written in the block.
  - `![[Page]]` and `![[Page#Heading]]` show that page, or that heading's section, inside the note.
  - Checkboxes can be ticked in Read mode.
  - A point with subpoints (bullets, numbers or checkboxes) has an arrow in Read mode that folds them away; only the view changes, never the note.
- **Base views:** `.base` files show as tables, embedded with `![[X.base]]` or opened from the tree. Their views are tabs, with filters, sorting, groups and formulas (with `if()`, `today()` and `date()`); "Last modified" is the date of the note's last commit.
- **CSV and TSV:** opens as an editable table (add or delete rows and columns) or as text, and saves back as it was: quotes, line breaks in cells, `,` `;` or tab separators, Excel's byte order mark and `sep=` line. A big table shows 500 rows at a time.
- **Other files:** JSON, YAML, TOML, HTML, CSS, JavaScript, Python, shell and other code open as text with colours, any other text file as plain text. PDFs show in the page on a computer, with **Open in a new tab** and **Download** everywhere. Anything else (audio, video, Word, Excel, archives) offers a **Download**.
- **Saving:** one commit per save. If the file changed on GitHub in the meantime, GitHub refuses the save and the app shows both versions side by side, so nothing is overwritten.
- **Drafts:** unsaved changes stay in the browser and are offered back after the page closes. Leaving a note with unsaved changes asks first: **Save**, **Keep as a draft** or **Discard** (or **Stay**).
- **New notes:** pick a name, kind and folder, or set a repo's New notes folder and Note template so a new note needs only a title.
- **An app of its own:** installs on a computer or a phone, with its own window and icon ([how](#5-install-it-as-an-app-optional)). Works at phone width. It needs a connection.
- **Look:** light and dark, following the device.
- **Keys:** Ctrl+S saves, Ctrl+E switches between Read and Edit, Ctrl+K searches the files.
- **Vault rules (optional, per repo):** a generated navigation box shows folded and can't be edited, and a link to no page is warned about.
- **Task fields per project:** turn task fields on and off (status, priority, assignee, type, parent task, relations, sprint, estimate, due date), change their lists and property names, and add fields of your own; kept in the repo, so the whole team shares them ([more](#task-fields)).
- **Subtasks:** a task lists the tasks under it with their status and a progress bar, and **Add subtask** makes a new one under it.
- **Relations:** a task can be *blocked by*, *related to*, or *come after* or *before* other tasks; each shows on both tasks, and a task blocked by an open one isn't suggested.
- **Commits:** a task lists the commits made for it, each linking to GitHub; a GitHub Action adds every commit whose message starts with the task's ID ([more](#task-fields)).
- **Sprints:** a sprint's page lists its tasks by status with how much is done, and **Start the next sprint** moves what's left into the next one.
- **Inboxes:** an Inbox button that opens your own inbox, found by your GitHub login, with the top three free tasks you could start and a Claim button.
- **AI agents (optional):** rules and step-by-step skills in the example vault for agents that sort your inbox into tasks, work on them and keep the board up to date ([more](#working-with-ai-agents-optional)).
- **Sharing:** invite links that set up a repo on someone else's device; a `.commonplace.json` in a repo that adds it by itself for everyone who can save to it; read-only mode for people who can't push.

</details>

**What's next:** the [roadmap](ROADMAP.md) shows what we're working on now and what comes after.

## Quick start

Five steps, about ten minutes. Or let your AI agent do most of them:

<details>
<summary><b>🤖 Let your AI agent do it</b>: copy this prompt into an agent that can run git (Claude Code, Codex and others)</summary>

```text
Set up Commonplace.md for me: a notes app that reads and edits Markdown notes kept in a GitHub repo,
at https://snowy-peak-studios.github.io/commonplace-md/ (code: https://github.com/Snowy-Peak-Studios/commonplace-md).

1. Ask me for my name, my GitHub login, and where the notes go: a new repo, or a repo I already have.
   - A new repo: ask for its GitHub owner (my user name or an organization) and its name (default "notes").
     The notes go at the top of the repo, on the branch main.
   - A repo I already have (for example a project's own repo): ask for <owner>/<repo> and the folder for
     the notes in it (default "notes"; empty means the top of the repo). If the repo is public, tell me my
     notes would be public too, and ask before going on.
2. The repo:
   - New: make it private, with the GitHub CLI if it's installed and signed in
     (gh repo create <owner>/<repo> --private), otherwise ask me to make an empty private repo
     at https://github.com/new and wait for me. Then clone it.
   - Existing: clone it. Its branch is the one the clone is on (its default branch), unless I name another.
     Check that I can push to it: with the GitHub CLI, gh repo view <owner>/<repo> --json viewerPermission
     says WRITE, MAINTAIN or ADMIN; otherwise git push --dry-run works. If I can't, stop and tell me.
3. Fill it with the example vault:
   git clone --depth 1 --filter=blob:none --sparse https://github.com/Snowy-Peak-Studios/commonplace-md.git
   git -C commonplace-md sparse-checkout set example-vault
   Copy everything inside commonplace-md/example-vault/ (folders, the hidden .agents and .claude folders, and
   the AGENTS.md and CLAUDE.md files too) into the notes folder (for a new repo, its top).
   Never overwrite a file that's already there: if any of those paths exist, list them and ask me what to do.
4. Make the inbox mine: in Notes/Inbox.md (inside the notes folder) set owner to my name and github to my
   GitHub login, and rename Notes/Inboxes/Your name.md to my name with the same two properties. Then commit
   everything as "Start from the Commonplace.md example vault" and push to the branch. Delete the
   commonplace-md clone.
5. Tell me to make a token myself (you can't, and I must never paste it to you): at
   https://github.com/settings/personal-access-tokens/new, Resource owner: <owner>,
   Repository access: Only select repositories: <repo>, Repository permissions: Contents: Read and write.
6. Give me this link with <owner>, <repo> and <branch> filled in, to open and paste the token into. Put
   &folder=<folder> after &label=My+notes when the notes are in a folder (with / written as %2F):
   https://snowy-peak-studios.github.io/commonplace-md/#/join?owner=<owner>&repo=<repo>&branch=<branch>&label=My+notes&vault=1&inbox=Notes%2FInbox.md&inboxes=Notes%2FInboxes&home=Home.md&notes=Notes&template=Templates%2FNote.md
7. From now on, when you work in that repo, follow the AGENTS.md in the notes folder (its paths start
   there), with git user.name set to my name. If the repo already has its own AGENTS.md or CLAUDE.md at
   its top, ask me before adding a line there that points to the notes' AGENTS.md.
   Start with its "First run" section: go through the rules with me one by one, then the skills in
   .agents/skills/ one by one (what each does and its steps), so I can approve, change or drop each.
```

</details>

### 1. Open the app

Either:

- **A. Use the hosted app:** <https://snowy-peak-studios.github.io/commonplace-md/>. It's this repo's `main` branch, served by GitHub Pages: the latest release. Work in progress is on the `dev` branch, served beside it at <https://snowy-peak-studios.github.io/commonplace-md/dev/>, and reaches `main` at the next release. **Settings › This device › App version** picks which one your device opens: *Released* or *In development* (the newest work, which may break). The choice is kept, so the usual address and the installed app open the one you picked; both use the same token and settings.
- **B. Host your own copy:**
  1. Fork [github.com/Snowy-Peak-Studios/commonplace-md](https://github.com/Snowy-Peak-Studios/commonplace-md) (keep the name `commonplace-md`, or change the address below to match).
  2. In your fork: **Settings › Pages › Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`. Save.
  3. After a minute or two, open `https://<your-github-name>.github.io/commonplace-md/`.

   Free GitHub Pages serves public repos only. That's fine: the app's repo holds code, never notes.

   To serve the version in development too, fork with every branch (untick *Copy the main branch only*), and pick Source *GitHub Actions* in step 2 instead: `.github/workflows/pages.yml` then serves `main` at the address and `dev` under `dev/`, each time either branch moves. In **Settings › Environments › github-pages**, let the `dev` branch deploy too.

### 2. Make a notes repo

Make a new repo on GitHub for your notes ([github.com/new](https://github.com/new)), or use one you already have, such as a project's own repo (then put the vault in a folder, see below). **Private is fine**, and usually what you want. Then fill it with the example vault, so you start with something that shows every feature.

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

Without git: on this repo's GitHub page, **Code › Download ZIP**, unzip it, then in your notes repo on GitHub use **Add file › Upload files** and drop in everything inside `example-vault/` (folders included; the `.agents` and `.claude` folders are hidden on most computers, so show hidden files first if you want the agent skills).

This puts the vault at the top of the repo. To keep it in a folder instead (say `notes/`), copy it there and set **Folder** in step 4.

The vault comes with `AGENTS.md` and `CLAUDE.md`, rules for AI agents, and their skills in `.agents/` and `.claude/`. Keep them if you work with agents (see [Working with AI agents](#working-with-ai-agents-optional)); otherwise delete them.

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

- **A vault per project:** keep each project's notes next to its code, in a folder of the project's own repo (say `Wiki/`, on the branch you work on). Add each repo in Settings with its **Folder** and **Branch**, then press **Share with everyone** there: every member who can save to the repo gets it by themselves, with no invite link per project ([Sharing](#sharing)). The notes then move with the code, and a commit can change both.
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

Settings live in this browser's storage, so each device has its own. An invite link copies them to another device, and so does a repo's `.commonplace.json` (see [Sharing](#sharing)).

</details>

### Task fields

<details>
<summary>Set up the fields every task in a project has</summary>

A task is a note in the tasks folder (`Tasks/` unless you change it), and its fields are properties in its front matter. In **Settings**, open the repo and press **Task fields**:

- **Tick fields on and off.** The ones the app knows: Status, Priority, Assignee, Area, Requested by, Reviewer, Type (Epic, Story, Task, Bug), Parent task, the four relations (Blocked by, Related, Comes after, Comes before), Sprint, Estimate and Due date. A repo with no setup has the first five, as before; a new setup starts with all of them on but Reviewer, the person who checks and approves the work, which a project turns on if it wants one. A new task's reviewer is who asked for it (its Requested by), else whoever makes it, and can be changed.
- **Change the lists** (statuses, priorities, types), the **property** each field is kept in (the parent task is `part_of`, since `parent` places a page in the vault's tree), the sprints folder and length, and the estimate's unit (points, hours or days).
- **Add a field of your own:** a name, its property, and its kind: text, number, date, a choice from a list, a person or a link to a page.
- **Save to the repo** writes it into the repo's `.commonplace.json`, under `tasks`, in one commit. Everyone on the project shares it, and **Share with everyone** keeps it:

  ```json
  {
    "label": "Our notes",
    "tasks": {
      "folder": "Tasks",
      "fields": {
        "status": { "on": true, "values": ["To Do", "In Progress", "Waiting", "Done"] },
        "part_of": { "on": true },
        "sprint": { "on": true, "folder": "Sprints", "length_days": 14 },
        "estimate": { "on": true, "unit": "points" },
        "due": { "on": false }
      },
      "custom": [{ "name": "Component", "prop": "component", "kind": "choice", "values": ["App", "Docs"] }]
    }
  }
  ```

**On a task's page**, the fields that are on show as pickers and boxes above its other properties (a list for choices, a date picker, a number, a page name for parent task, sprint and links). A change is saved at once: one line in one commit. If the note has unsaved edits, the field changes with them and **Save** keeps both. A new note in the tasks folder starts with every field that's on, once a setup is saved.

**A link to the setup:** any note can link to `#/settings?fields`, which opens Task fields for the repo you're in, e.g. `[Set up task fields](#/settings?fields)`. The example vault's [Set up tasks](example-vault/Set%20up%20tasks.md) page does, and its Task Board links to it.

**Boxes are blocks in the note:** a task's Subtasks, Relations and Commits boxes, and a sprint's Sprint box, show where the note has a block for them, so nothing shows that the note doesn't ask for:

````markdown
```subtasks
```
````

- The blocks are ` ```subtasks `, ` ```relations `, ` ```commits ` and ` ```sprint `. Move a block to move its box; take it out and the box goes.
- A new task gets the three task blocks under its title, unless its template already has any of them; a new sprint gets ` ```sprint `.
- In other Markdown editors, and on a page that isn't a task or a sprint, a block shows as a short code block.

**Parent tasks and subtasks:** a task's parent is in its `part_of` property (or the property the setup names), as a link: `part_of: "[[Get set up]]"`.

- A task with subtasks lists them on its page, each with its status, under a bar of how many are done (*Done*, *Cancelled*, *Won't do* and the last status in your list count as done).
- **Add subtask** on a task makes a new task in the tasks folder, linked to it, with its area and sprint, and opens it.

**Relations:** a task can link other tasks as **Blocked by** (`blocked_by`), **Related** (`related`), **Comes after** (`after`) and **Comes before** (`before`), each a list of links: `blocked_by: ["[[Get set up]]"]` (other Markdown editors show plain links).

- A task's **Relations** box shows them both ways, each task with its status: its own links, and the other tasks' links to it, the other way round (a task blocked by B shows on B under *Blocks*; one that comes after B shows on B under *Comes before*).
- **Add relation** picks how they're related and the other task, by its ID or name; the x by one of the task's own links takes it out. Each is one commit of that one line.
- A task blocked by a task that isn't done isn't suggested in the top tasks; it is again once that task is done.
- The parent picker lists the tasks by ID and name (type either). A task can't be its own parent, or sit under one of its own subtasks.
- On the board, a base can group by the parent: the example vault's *By parent* view does (`groupBy: part_of`).

**Commits:** a task lists the commits in its `commits` property, the newest first, each linking to GitHub. The example vault's *Get set up* has two. The app reads them from the note, so it asks GitHub for nothing.

A GitHub Action fills them in by itself. After each push, it adds every commit whose message starts with a task's ID (`T-6: ...`, or `T-5, T-6: ...` for several tasks) to that task, as one line: `"[abc1234](https://github.com/you/notes/commit/...) T-6: the first line"`. To set it up in the repo that holds your vault:

1. Copy [`tools/task-commits/task-commits.yml`](tools/task-commits/task-commits.yml) to `.github/workflows/task-commits.yml`, with your vault's branch in it, and [`tools/task-commits/task_commits.py`](tools/task-commits/task_commits.py) to `.github/task_commits.py`.
2. To fill in the tasks you already have, run `python .github/task_commits.py --all` once at the repo's root, then commit.

- It adds its own commit after each push that has a task's ID, so pull before your next push.
- Commits made from the app (a save, a claim, a field change) are left out, and so is a push made only of them: those cost no Actions minutes.
- It sees the repo it runs in. Commits in other repos can still go in by hand, as a line like the ones above or a bare commit address.

**Sprints:** a sprint is a note in the sprints folder (`Sprints/` unless the setup says otherwise) with `start`, `end` and `goal`; a task joins it with `sprint: "[[Sprint 12]]"`.

- A sprint's page lists its tasks by status, with how many are done and, when estimates are on, how much of the estimate.
- The sprint picker on a task offers the current sprint first, then the next one.
- **A new task** (a new note in the tasks folder) goes on the next sprint, if there is one, so the current sprint's plan stays as agreed; change it in its Sprint field. **Add subtask** gives it its parent's sprint instead, when the parent has one.
- **Start the next sprint** (on the latest sprint) makes the next note, its name counted on and its dates from the setup's length, and moves the unfinished tasks you keep ticked: one commit for all of it.
- A base can show the sprint going on today with `start <= today()` and `end >= today()`: the example vault's *Current sprint* view.

</details>

## The example vault

<details>
<summary>The files it comes with, and what each one shows</summary>

`example-vault/` is a small vault to copy into your notes repo. Each file shows something the app supports.

```text
example-vault/
├── Home.md                      start page: links, a table, a callout, an embedded section, the top tasks, a Mermaid diagram, an image
├── Guide.md                     the navigation box, wikilinks with headings and aliases, embeds, callouts, checkboxes, folding lists, diagrams
├── Task Board.md                current goals, the tasks' base embedded with ![[Tasks.base]], the sprints, and an optional Areas table
├── Set up tasks.md              how to set up your tasks' fields, with a link that opens Task fields
├── Other kinds of files.md      what opens how: tables, text with colours, PDFs, pictures, and downloads for the rest
├── AGENTS.md                    optional: the rules for AI agents working in the vault
├── CLAUDE.md                    optional: loads AGENTS.md for Claude Code
├── .agents/skills/              optional: step-by-step skills for AI agents (sort-inbox, start-task, wrap-up-task, public-check)
├── .claude/skills/              optional: pointers to those skills, so Claude Code finds them
├── Bases/
│   ├── Tasks.base               a base with four views (By status, By parent, Open, Done), a formula, groups, sorts and filters
│   └── Sprints.base             the sprints, with a Current sprint view (start <= today() and end >= today())
├── Tasks/                       six task notes with id, status, priority, area, assignee and requested_by properties, and checklists;
│                                an epic, Get set up, with three of them under it (part_of); sprints and estimates
├── Sprints/
│   ├── Sprint 1.md              a sprint: start, end and goal; its page lists its tasks by status
│   └── Sprint 2.md              the next one
├── Notes/
│   ├── Inbox.md                 the shared inbox: owner and github properties, New tasks, Notes and Needs attention sections
│   └── Inboxes/
│       └── Your name.md         a personal inbox: copy it, rename it, put your GitHub login in github
├── Templates/
│   ├── Note.md                  the note template, with {{title}} and {{date}}
│   └── Task.md                  the task template: a user story, acceptance criteria and the task's properties
├── Data/
│   ├── Reading list.csv         a CSV file, opened as a table
│   ├── Pantry.tsv               a TSV file: tabs between the cells, commas inside them
│   ├── settings.json            JSON, opened as text with colours
│   └── word_count.py            a Python script, opened as text with colours
└── Attachments/
    ├── commonplace.svg          an image, embedded with ![[commonplace.svg|160]]
    └── An example PDF.pdf       a PDF, shown in the page, with Open in a new tab and Download
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
- ` ```top-tasks ` blocks: the top tasks to start, on any page
- checkboxes, ticked in Read mode
- lists whose subpoints fold away in Read mode
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

- **Without a link, for a whole team:** in **Settings**, open the repo and press **Share with everyone**. It saves a `.commonplace.json` with the repo's settings at the top of the repo, on its default branch (one commit). From then on, everyone who can save to the repo gets it in the app by themselves, with those settings: the app looks through the repos their token can save to when it opens (at most once an hour, one request to list the repos, then one more only for repos that are new or changed), or at once with **Look for vaults** in Settings. A repo someone removes from their list isn't added back. The file looks like this, every field but `label` optional:

   ```json
   {
     "label": "Our notes",
     "branch": "main",
     "folder": "notes",
     "home": "Home.md",
     "inbox": "Notes/Inbox.md",
     "notes": "Notes",
     "template": "Templates/Note.md",
     "vault": true
   }
   ```

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
- **Top tasks to start:** a ` ```top-tasks ` block (in your inbox, or on any page) shows the free tasks you could start now: notes in a `Tasks` folder with no `assignee` and not *In Progress*, *Blocked* (any case) or *Done*, highest `priority` first (*High*, *Medium*, *Low*), then the newest (highest `id`). Everything the box shows is written in the block, one option per line, and nothing is taken from anywhere else:

  ```top-tasks
  range: 3
  areas: Features, Docs
  sprint: current-only
  owner: Your Name
  ```

  `range` is how many (up to 20; three when the block doesn't say, and the box says so; older blocks' `count` still works). `areas` keeps only those areas (empty or left out: every area). `sprint` is `current-only`, `current-then-next` or `off` (every task, also when left out). `owner` is whom **Claim** claims for: it sets the task's `status` to *In Progress* and its `assignee` to the owner, in one commit; with no `owner`, nothing can be claimed. The box's head says every option in use. A page without the block, an inbox too, has no box. Tasks claimed by the owner stay in the box, above the free ones, until they're done: *Claimed* while they wait, or *Claude is on it* once an agent has taken one (its `assignee` is then `<owner> (<agent>)`). With the example vault's agent rules, a task you claim this way is the first one your agent starts. Each task's **priority** and **area** can be changed right there, from a small picker: one commit that changes only that line, and the box sorts again. **Not now** puts a task on the waiting list (`status: Waiting`): it stops being suggested, shows in a folded *Waiting* list under the box, and **Bring back** sets it to *To Do* again. Each task also shows whether it can be started now: *Ready*, *Needs a decision* (an open criterion about deciding, or "TBD") or *Placeholder* (not written out yet); its tooltip, or a tap on a phone, says why. A `ready` property (`yes`, `decision`, `placeholder`) settles it by hand. **With sprints** (and `sprint: current-then-next`), the free tasks are the current sprint's, and the box names the sprint; when it has none left, a few from the next sprint show, marked *Next sprint*, and **Claim** on one of those also moves it into the current sprint, in the same commit. With sprints, **Not now** becomes **Push to the next sprint**: it moves the task into the next sprint (one commit of its sprint line); when there's no sprint after the task's yet, it says so and offers the waiting list instead. With `sprint: current-only`, it never reaches into the next sprint, and says so when no sprint is running. **On any page** (your Home, a project page, a sprint) the same block shows the same box. Other Markdown editors show the block as plain code.

</details>

## Working with AI agents (optional)

<details>
<summary>What agents do with your notes, how to set them up, and a day with them</summary>

AI agents that can run git (Claude Code, Codex and others) can work in your vault beside you. The example vault comes with the rules for them: `AGENTS.md`, which any agent reads, and `CLAUDE.md`, which loads it for Claude Code, plus [step-by-step skills](#the-skills) for the jobs they do. With them, an agent:

- pulls first, and reads the **current goals** on the Task Board, so what it picks and proposes serves them;
- reads **your inbox** and turns what you wrote under **New tasks** into task notes, with IDs and acceptance criteria;
- picks a free task and **claims** it (status and assignee, committed and pushed) before it changes anything, so two agents never work on the same task;
- keeps the Task Board and the other notes up to date, and writes what it did and the commit into the task when it's done;
- asks you under **Needs attention** in your inbox when it needs a decision, and works on something else while it waits.

This is how the makers of Commonplace.md use it with their own agents: these are our rules and skills, made general. Change them to fit how you work.

### The skills

Each skill is one file, `.agents/skills/<name>/SKILL.md`, that walks an agent through one job step by step. Agents that know skills (Codex, Claude Code and others) find them there; Claude Code through the short pointers in `.claude/skills/`. Any other agent can be told to read the file.

| Skill | What it does |
| --- | --- |
| [`sort-inbox`](example-vault/.agents/skills/sort-inbox/SKILL.md) | Starts a session: pulls, reads the current goals, turns your New tasks into task notes, acts on your answers, commits and pushes. |
| [`start-task`](example-vault/.agents/skills/start-task/SKILL.md) | Picks or makes a task, claims it before any other change, checks it still fits, and plans it. |
| [`wrap-up-task`](example-vault/.agents/skills/wrap-up-task/SKILL.md) | Checks every acceptance criterion, marks the task Done (or splits off what's left), keeps the notes in step, commits and pushes. |
| [`public-check`](example-vault/.agents/skills/public-check/SKILL.md) | Before a push to a public repo: checks the files and the commits for names, emails, tokens, private repo names and task IDs. |

Not using the example vault? Copy the `.agents` and `.claude` folders and [`AGENTS.md`](example-vault/AGENTS.md) into your repo, and change the paths in them to yours.

### Set it up

1. Keep `AGENTS.md`, `CLAUDE.md` and the `.agents` and `.claude` folders at the top of the notes repo, where agents look for them. If the vault is in a folder (say `notes/`), move them up to the repo's top and put the folder in front of the paths in them and in the skills (`notes/Home.md`, `notes/Tasks/`, ...).
2. Give each person an inbox in `Notes/Inboxes/` (or use the shared `Notes/Inbox.md`), with `owner` their name and `github` their GitHub login.
3. Set the agent's git `user.name` (`git config user.name`) to the inbox's `owner`, so the agent finds its person's inbox.
4. Optional: fill in the **Areas** table on the Task Board, so each person's agents pick only their own tasks.
5. **The first time** an agent works in the vault, it goes through the rules with you one by one: keep, change or drop each, add your own, and decide which stay **local** (this vault) and which go **global** (your agent's own user-level rules, for all your projects).
6. **Then the skills**, one at a time: the agent shows you what each [skill](#the-skills) does, when it runs and its steps, and you **approve, change or drop** it. A changed skill is rewritten the way you say, a dropped one is deleted (with its pointer in `.claude/skills/`), and you can ask for new ones. Then it removes the first-run section from `AGENTS.md`.

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
- The page's Content Security Policy lets it connect to `api.github.com` only. There's no server, no analytics and no account of ours. (An image a note links from the web loads from that site. A PDF is shown from a copy in the page's own memory, never from another site.)
- The app's repo holds code only. Your notes are in your repo, private if you made it private; GitHub Pages serves only the app.
- Unsaved drafts stay in this browser until saved or discarded (**Settings › This device**). The released version and the one in development share this browser's storage (the same token, settings and drafts), and each keeps its own offline copy of the app.

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
| `src/vault.js` | Vault rules: link resolution, front matter, the navigation box, note templates, inboxes, the `.commonplace.json` file and the task setup in it, a task's commits |
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
| `tools/task-commits/` | The GitHub Action (and its script) that adds commits to their tasks, to copy into a notes repo |
| `ROADMAP.md`, `roadmap/` | What we're working on and what's next: a list, and the same as a task board (one note per task, and `Roadmap.base`) |
| `tests/` | Unit tests (`npm test`), their fixtures, and the browser check in `tests/e2e/` |

</details>

## License

MIT: see [LICENSE](LICENSE). The third-party code in `vendor/` keeps its own licenses, listed in [vendor/LICENSES.md](vendor/LICENSES.md).
