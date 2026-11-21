# Sharing and inboxes

[README](../README.md) · [Getting started](getting-started.md) · [Block reference](blocks.md)

## One per project, or one for the whole organization

The app opens as many repos as you add, and you switch between them at the top of the file list. Set it up the way your team works:

- **A vault per project:** keep each project's notes next to its code, in a folder of the project's own repo (say `Wiki/`, on the branch you work on). Add each repo in Settings with its **Folder** and **Branch**, then press **Share with everyone** there: every member who can save to the repo gets it by themselves, with no invite link per project ([Sharing](#sharing)). The notes then move with the code, and a commit can change both.
- **One vault for the organization:** one notes repo for everything: the company wiki, every project's pages and tasks, with a folder per project if you like.
- **Both:** an organization vault beside the projects' own vaults. Each repo keeps its own settings (start page, inboxes, template, vault rules).

A fine-grained token has one resource owner. Select only the repositories you want it to open. For repos owned by another account or organization, add that owner's token in **Settings › Tokens for other owners** ([token setup](getting-started.md#3-make-a-token)).

## Sharing

Notes are shared the GitHub way: whoever can open the repo on GitHub can open it in the app.

1. **Give them access on GitHub:** add them as a collaborator on the repo (**Settings › Collaborators**), or as a member of the organization that owns it.
2. **Send an invite link:** in **Settings**, open the repo and press **Copy invite link**. It opens the app with the repo's settings filled in:

   ```text
   https://snowy-peak-studios.github.io/commonplace-md/#/join?owner=ann-example&repo=notes&branch=main&label=Our+notes&folder=notes&vault=1&inbox=Notes%2FInbox.md&inboxes=Notes%2FInboxes&home=Home.md&notes=Notes&template=Templates%2FNote.md
   ```

   `owner` and `repo` are required; the rest are the fields in the [Settings reference](settings.md#settings-reference). The link carries no token and no notes.

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
- **Organizations:** the token's **Resource owner** must be the organization, and the organization may need to approve the token before it works (see [Make a token](getting-started.md#3-make-a-token)).

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

- Notes deeper in the folder are ignored, so `Notes/Inboxes/Local/` can hold inboxes kept off GitHub: add `Notes/Inboxes/Local/` to the notes repo's `.gitignore` and they stay on your computer, for a desktop editor only.
- **Status board:** add a ` ```board ` block to any page. The columns follow the order in `columns` or use the project's Task fields statuses when the line is left out. Optional filters are `areas` and `type` (comma-separated), `assignee` (one name), and `sprint` (a name, link, `current` or `next`). Drag a card or use its status menu to move it. **Edit card** opens Priority and Assignee. The board can also filter to **Assigned to me** when you are signed in. Readers see the same cards and columns.

  ```board
  columns: To Do, In Progress, Done
  areas: Notes, Docs
  ```

- **Top tasks to start:** a ` ```top-tasks ` block (in your inbox, or on any page) shows the free tasks you could start now: notes in a `Tasks` folder with no `assignee` and not *In Progress*, *Blocked* (any case) or *Done*, in the block's `order` (by default the highest `priority` first, *High*, *Medium*, *Low*, then the newest, highest `id`). Everything the box shows is written in the block, one option per line, and nothing is taken from anywhere else:

  ```top-tasks
  range: 3
  areas: Features, Docs
  order: priority-newest
  sprint: current-only
  owner: Your Name
  fields: parent, state, priority, area
  ```

  `range` is how many (up to 20; three when the block doesn't say, and the box says so; older blocks' `count` still works). `areas` keeps only those areas (empty or left out: every area). `order` is `priority-newest` (High, Medium, Low, then none; the newest first within each: also when left out, and the box says so), `priority-oldest`, `newest` or `oldest` (by the number in the task's `id`, priority not counted); it sorts the waiting list too. `sprint` is `current-only`, `current-then-next` or `off` (every task, also when left out). `owner` is whom **Claim** claims for: it sets the task's `status` to *In Progress* and its `assignee` to the owner, in one commit; with no `owner`, nothing can be claimed. `fields` is what each task shows besides its name and **Claim** (always there), in that order: `parent` (a link to the task it's part of, from `part_of` or the property your Task fields keep it in), `state` (whether it can be started now), `priority`, `area`, or any other property by its name; left out, `state, priority, area`, and the box says so; empty, the names only. The box's head says every option in use. A page without the block, an inbox too, has no box. Tasks claimed by the owner stay in the box, above the free ones, until they're done: *Claimed* while they wait, or *Claude is on it* once an agent has taken one (its `assignee` is then `<owner> (<agent>)`). Hover over or focus **Claimed** to reveal **Unclaim**. On touch screens it shows **Unclaim** directly. Confirm to return the task to *To Do*. Once an agent takes it, the inbox leaves the assignment in place. **Not now** is available on free tasks. With the example vault's agent rules, a task you claim this way is the first one your agent starts. Each task's **priority** and **area** can be changed right there, from a small picker: one commit that changes only that line, and the box sorts again. **Not now** puts a task on the waiting list (`status: Waiting`): it stops being suggested, shows in a folded *Waiting* list under the box, and **Bring back** returns it to *To Do* and clears the waiting date. **Not now** saves `waiting_since`; after seven days, tasks with that date can show again as **Back from waiting** in the free tasks. Set `waiting_days: 14` in the inbox's properties to wait 14 days. A waiting task with no date stays on the list until you bring it back. Each task also shows whether it can be started now: *Ready*, *Needs a decision* (an open criterion about deciding, or "TBD") or *Placeholder* (not written out yet); its tooltip, or a tap on a phone, says why. A `ready` property (`yes`, `decision`, `placeholder`) settles it by hand. **With sprints** (and `sprint: current-then-next`), the free tasks are the current sprint's, and the box names the sprint; when it has none left, a few from the next sprint show, marked *Next sprint*, and **Claim** on one of those also moves it into the current sprint, in the same commit. With sprints, **Not now** becomes **Push to the next sprint**: it moves the task into the next sprint (one commit of its sprint line); when there's no sprint after the task's yet, it says so and offers the waiting list instead. With `sprint: current-only`, it never reaches into the next sprint, and says so when no sprint is running. **On any page** (your Home, a project page, a sprint) the same block shows the same box. Other Markdown editors show the block as plain code.
- **New tasks:** a ` ```new-tasks ` block (in your inbox's *New tasks*, or on any page) holds ideas that should become tasks, one per line (a leading `- ` or `- [ ] ` is fine), and an `owner:` line saying whose they are:

  ```new-tasks
  owner: Your Name
  - Try the app on a second device
  ```

  In Read mode it's a *New tasks* box with the items (links and formatting work) and how many; without `owner:` it says no agent will sort them. Use the multiline box to write or paste several ideas, one per line (bullets are optional), then press **Add**. **Enter** adds a line. **Edit list** puts all items in the same box so you can revise or delete several at once; each item also has Edit and Remove. Choose **Keep changes**, then **Save** the note. The block keeps its `owner:` line, and agents still read one idea per Markdown list item. With the example vault's agent rules, your agent finds every block with your name in the vault, turns each item into a task, and takes it out of the block.
- **Mentions:** write `@` and a GitHub login in any note to mention that person; in Edit mode, typing `@` offers the people of the vault (every inbox with a `github` login, by its `owner`). In Read mode, the mention is a link to their inbox. Not in code, and not in an email address or a path.
- **Needs attention:** a ` ```needs-attention ` block (in your inbox, under the top tasks, or on any page) shows what waits on you. Everything it shows is written in it, one line each:

  ```needs-attention
  show: questions, mentions, assignments
  owner: Your Name
  login: your-github-login
  ```

  `show` is `questions, mentions` for one box, *Needs your attention*, with both (also when left out, and the box says so), or just `questions` (*Questions for you*) or `mentions` (*Mentions of you*): two blocks make two separate boxes. **Questions** are the tasks with an open question (a `question` property with the question in a few words) for `owner`: the tasks they asked for (`requested_by`), review (`reviewer`) or whose agent has them (`assignee`). Each links to its task, where the question's options are, and shows *Waiting for your answer*. Once something is written under the task's `**Answer:**` line, it no longer waits on you: it folds under *Answered, waiting for the agent* at the end of the box, and the head counts it apart. Such a task shows *Needs a decision* among the top tasks, until the agent acts on the answer and empties `question`. **Mentions** are every place in the vault that mentions `login`: the note and the heading above, as a link to that place, the line's words, and when the note last changed, newest first, after the questions. The box reads every note once and keeps what it found per note version on the device, so later looks only read what changed. A mention leaves the box when someone replies right under it: the very next line starts with `@` and another person's login. In a Comments block, a reply posted with **Post** counts too: the next comment's words start with `@` and another person's login. **Seen** (or **All seen**) folds it under *Seen*: it's kept in your inbox's `seen_mentions` property, one commit, so every device agrees, and it shows again if its line changes. **Clear seen**, inside the *Seen* fold, takes everything out of it in one commit; the items stay seen (kept in `seen_cleared` too), so they never come back as new, and the seen lists drop whatever no longer exists. Without `owner` or `login`, the box says which is missing.

  Add `assignments` to show the open tasks assigned to the inbox's GitHub login or vault name. **Seen** folds an assignment under *Seen* across devices. Changing the assignee through the app creates a new assignment. Email-only labels stay on the task.
- **The Inbox dot:** when your own inbox's ` ```needs-attention ` block has a question waiting for your answer, or a mention with no reply that isn't seen, the Inbox button (and the Inbox row in the sidebar) shows a red dot. It's checked in the background with the box's own look-ups, so it reads nothing new after the first time.
