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

A ` ```new-tasks ` block holds ideas that should become tasks, one per line. Its first line says whose they are:

```text
owner: Your name
- Try the app on a second device
- Add three books to the reading list
```

In Read mode it's a box with the items: **Add** puts a new one in, the pencil beside an item changes its text (Enter keeps it, Escape leaves it as it was), and the cross takes it out. Then **Save**. The block works on any page: write ideas down where you have them, like the one in the [Guide](../Guide.md). Your agent looks for every ` ```new-tasks ` block with your name in the whole vault, turns each item into a task, and takes it out of the block.

## Needs attention: questions and mentions

A ` ```needs-attention ` block in your inbox, under the top tasks, shows what waits on you:

- **Questions**: the tasks with a question for you. Your agent gives a task one with a `question` property (the question in a few words) and a *Question* part with the options and an **Answer:** line. Each row links to the task and says *Waiting for your answer*, or *Answered, waiting for the agent* once you've written something under **Answer:**.
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

This is an agent workflow. The app's Inbox button still opens the current vault's inbox; these rules add no combined app inbox or Move action. A local-only vault does not become synced by being listed.

## Your own inbox

Each person can have their own in `Notes/Inboxes/`, with their GitHub login in its `github` property. The **Inbox** button opens yours when you're signed in with that login ([Your name](../Notes/Inboxes/Your%20name.md) shows how).

## The top tasks to start

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
