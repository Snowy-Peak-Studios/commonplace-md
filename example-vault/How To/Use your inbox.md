---
parent: "[[How To]]"
---

# Use your inbox

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

In Read mode it's a box with the items, and **Add** puts a new one in (then **Save**). The block works on any page: write ideas down where you have them, like the one in the [Guide](../Guide.md). Your agent looks for every ` ```new-tasks ` block with your name in the whole vault, turns each item into a task, and takes it out of the block.

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

It reads every note once for the mentions (then only the changed ones), so the first look in a big vault takes a moment. A mention stays listed while the note says it; a question until your agent acts on the answer. [Add a reading list](../Tasks/Add%20a%20reading%20list.md) has a question and the [Guide](../Guide.md) a mention, so your [inbox](../Notes/Inbox.md) lists both.

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
```

- `range`: how many (up to 20).
- `areas`: only these areas; empty for every area.
- `order`: `priority-newest`, `priority-oldest`, `newest` or `oldest`.
- `sprint`: `current-only`, `current-then-next`, or `off` for every task.
- `owner`: whom **Claim** claims a task for.

**Claim** sets the task to *In Progress* and its assignee to the owner, in one commit. Each task's priority and area can be changed right there, and **Not now** puts one off. The block works on any page: [Home](../Home.md) has one.

