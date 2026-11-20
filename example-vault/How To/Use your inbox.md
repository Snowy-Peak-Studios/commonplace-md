---
parent: "[[How To]]"
---

# Use your inbox

> [!TIP]
> **tl;dr:** Write ideas under **New tasks** and thoughts under **Notes**. **Needs attention** shows the questions and mentions waiting on you, and the top tasks show what to start, with **Claim**.

The inbox is where you drop things first and sort them later. The **Inbox** button opens it.

## Write in it

- **New tasks**: anything that should become a task, in a ` ```new-tasks ` block (below). You, or your AI agent, turn each into a task note later.
- **Notes**: thoughts that aren't tasks. They stay.
- **Needs attention**: what waits on you. A ` ```needs-attention ` block there lists the tasks with a question for you, and the places that mention you (below). Open the task and write your answer under **Answer:** there, so the question and its answer stay with the work.

## New tasks, on any page

To include context, put the cursor on the intended idea in the multiline box and paste an image or file when the clipboard provides file data, or choose **Attach file** (desktop and phone). The file is saved in this vault's Attachments folder, or beside the inbox when none is configured. Its Markdown link is added to that line; pictures have a preview and other files keep a readable filename. Add or keep changes, then Save the note to keep the link. Files are limited to 10 MiB. A failed upload keeps your text and offers **Retry attachment**. When an agent turns the idea into a task, it carries the link into the new task note; the attachment stays in the vault after the capture is cleared.

Use the multiline box to write or paste several ideas, one per line (bullets are optional), then press **Add**. **Enter** adds a line. **Edit list** puts all items in the same box so you can revise or delete several at once; each item also has Edit and Remove. Choose **Keep changes**, then **Save** the note. The block keeps its `owner:` line, and agents still read one idea per Markdown list item.

A ` ```new-tasks ` block holds ideas that should become tasks, one per line. Its first line says whose they are:

```text
owner: Your name
- Try the app on a second device
- Add three books to the reading list
```

In Read mode it's a box with the items: **Add** puts a new one in, the pencil beside an item changes its text (Enter keeps it, Escape leaves it as it was), and the cross takes it out. Then **Save**. The block works on any page: write ideas down where you have them, like the one in the [Guide](../Guide.md). Your agent looks for every ` ```new-tasks ` block with your name in the whole vault, turns each item into a task, and takes it out of the block.

## Needs attention: questions and mentions

A ` ```needs-attention ` block in your inbox, under the top tasks, shows what waits on you:

- **Questions**: the tasks with a question for you. Your agent gives a task one with a `question` property (the question in a few words) and a *Question* part with the options and an **Answer:** line. Each row links to the task and says *Waiting for your answer*. Once you've written something under **Answer:**, it folds under *Answered, waiting for the agent*, until your agent acts on it.
- **Mentions**: every place in the vault that says `@` and your GitHub login (in Edit mode, typing `@` offers the people with an inbox). Each row links to the heading it's under, with the line and when the note last changed, newest first.

Everything it shows is written in the block, one line each:

```text
show: questions, mentions
owner: Your name
login: your-github-login
```

- `show`: `questions, mentions` for one box with both (also when left out), or just `questions` or `mentions`. Two blocks, one each, make two separate boxes, as in [Your name](../Notes/Inboxes/Your%20name.md).
- `owner`: whose questions: the tasks they asked for, review, or whose agent has them.
- `login`: whose mentions.

It reads every note once for the mentions (then only the changed ones), so the first look in a big vault takes a moment. A question stays until your agent acts on the answer. A mention goes away when it's answered: a reply on the very next line, starting with `@` and the other person's login. Or press **Seen** (or **All seen**): it folds under *Seen*, kept in your inbox's `seen_mentions` property, so all your devices agree.

While something waits on you (a question with no answer, a mention with no reply that isn't seen), the **Inbox** button shows a red dot. [Add a reading list](../Tasks/Add%20a%20reading%20list.md) has a question and the [Guide](../Guide.md) a mention, so your [inbox](../Notes/Inbox.md) lists both.

## An item for another vault

Your agent can route an item to a declared sibling using the **Sibling vaults and routing** section of [AGENTS.md](../AGENTS.md). Set up its name, purpose, storage type and exact location first; put private bindings in a private registry. The example starts with no sibling destinations.

The agent uses that vault's task format and ID and records where the request came from. It saves a transfer reference, verifies the destination task, and only then clears the original item. If permission, saving or verification fails, the source stays. Retrying finds the saved task instead of creating another one. Unclear destinations and changes of privacy boundary need your decision.

This is an agent workflow. The app's Inbox button still opens the current vault's inbox; the separate optional overview below combines selected sources without adding a Move action. A local-only vault does not become synced by being listed.

## Your own inbox

Each person can have their own in `Notes/Inboxes/`, with their GitHub login in its `github` property. The **Inbox** button opens yours when you're signed in with that login ([Your name](../Notes/Inboxes/Your%20name.md) shows how).

## Review completed work

Add `reviews` to a needs-attention block's show line. For a review-only panel, use the same block with `show: reviews`. Set `review-statuses: Testing`, or a comma-separated list such as `Testing, Needs review`. The default is Testing; older blocks retain their existing show choices.

Reviews come first. A named reviewer takes precedence over an assignee; with no reviewer the assignee identifies the person. A review task appears once within a combined box even when it also has a question or assignment. It stays visible until its status changes, including after Seen on other items.

Press **Review** to open the task, check its criteria, then use its Status field to close it as Done or return it to In Progress with a comment explaining changes. Follow your project's review handoff rules. [Review the example vault](../Tasks/Review%20the%20example%20vault.md) demonstrates the Testing state.

## Tasks for today

A ` ```top-tasks ` block shows the free tasks you could start now, each with **Claim**. Everything it shows is written in the block, one line each:

```text
range: 3
areas: Sharing, Notes
order: priority-newest
sprint: current-then-next
owner: Your name
fields: parent, state, priority, area
```

- `range`: how many (up to 20).
- `areas`: only these areas; empty for every area.
- `order`: `priority-newest`, `priority-oldest`, `newest` or `oldest`.
- `sprint`: `current-only`, `current-then-next`, or `off` for every task.
- `owner`: whom **Claim** claims a task for.
- `fields`: what each task shows besides its name and **Claim**, in that order: `parent` (a link to the task it's part of), `state`, `priority`, `area`, or any other property. Left out: `state, priority, area`.

**Claim** sets the task to *In Progress* and its assignee to the owner, in one commit. Hover over **Claimed** or focus it with the keyboard to reveal **Unclaim**. On touch screens it shows **Unclaim** directly. Confirm to return your own claim to *To Do* before an agent starts on it. **Not now** puts a free task off. You can change a task's priority and area in the box. The block works on any page: [Home](../Home.md) has one.


A free task put off with **Not now** comes back to the suggestions after seven days, marked **Back from waiting**. Set `waiting_days: 14` in the inbox's properties to wait 14 days. Use **Bring back** to return it earlier. Tasks without a waiting date stay on the waiting list until you bring them back.

## One overview of selected inboxes

In **Settings → This device**, choose **Set up inbox overview**. It starts off. Choose a private browser-local dashboard, name the context and select only the vaults to include. For each, enter your name in that vault and the exact path of your inbox. Add a mention login when you want mentions. **Save and open overview** enables the device's **All inboxes** shortcut.

**Check the person binding.** In a selected source's details, enter the inbox path and press **Check inbox**. This explicitly reads only that source's settings and chosen inbox; setup does not scan sources just by opening. The result shows the name in the inbox's `owner` property. **Use this inbox owner** copies it into Person in this vault; it changes nothing until you save. The mention login is a separate value. No source note is edited. Missing owners, locked folders and access problems explain what to check; changing the path or deselecting the source discards a pending result.

Name accents/case/spacing are compared consistently. A real overview mismatch shows both the selected and declared owner names and the inbox path, so you can correct the binding. A shared inbox without an owner can retain an explicitly entered person; the check cannot infer an owner there.

The dashboard is a private note kept in this browser profile. Back up its vault with **Download a copy**: clearing browser data loses it. It does not sync between devices. An exported dashboard still needs exact existing source bindings and local folder permission on the new device. Keep these private bindings out of shared notes, invite links and agent routing registries. Only the selected private browser-local note can run the block; shared GitHub notes and embeds cannot.

The overview shows **For review** first, followed by questions, assignments, mentions and owned new-task captures. Every row names its source, branch/folder or local-only location and links there. Open the original task or inbox to review, reply, mark Seen or Claim. The overview has no capture, move or source-edit action; reading it never uploads pending saves or updates files at its sources. The ordinary Inbox button still opens the current vault's inbox.

Opening the dashboard reads its explicitly selected sources; **Refresh selected vaults** reads them again. There is no background overview polling. Expand **Selected sources** for each source's status and checked time. Offline/stale results are labelled; access rejection hides that source's rows while other results remain. A locked folder must be allowed from its source. A source with `modules.inboxes: false` in its `.commonplace.json` is excluded before its notes are read. Switching the overview off clears its combined view and stops late results.

Combined rows and note text stay in memory. The app can reuse each source's existing device copy, and keeps only normalized task/module settings and identity metadata for offline checks. It scans up to three sources at a time. Mentions and captures can require every Markdown note on the first scan; the row limit limits display, not requests or bytes. With no selected sources it reads none. Local sources need no GitHub token; remote sources use their existing owner's credential, without trying a different token after rejection.

Setup writes an `inbox-overview` YAML block. These defaults are visible when omitted: context **My inbox**, all five kinds, manual refresh, 50 rows, review status Testing, no sources. `limit` accepts 1–200. `show` accepts `reviews`, `questions`, `assignments`, `mentions`, `new-tasks`; `review-statuses` is a list or comma-separated values. Missing bindings or invalid options show Setup needed rather than guessing.

For a GitHub source, setup records `kind: github` plus exact `owner`, `repo`, `branch`, `folder`, `inbox`, `person` and optional `login`. For an existing local vault, it records `kind: browser` or `folder`, its device `vault` ID, `inbox`, `person` and optional `login`. Matching names or task IDs in different sources stay distinct. Do not put tokens, URLs or credentials in the block.
