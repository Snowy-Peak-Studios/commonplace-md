---
parent: "[[How To]]"
---

# Use your inbox

The inbox is where you drop things first and sort them later. The **Inbox** button opens it.

## Write in it

- **New tasks**: anything that should become a task. You, or your AI agent, turn each into a task note later.
- **Notes**: thoughts that aren't tasks. They stay.
- **Needs attention**: questions waiting for your answer. A ` ```questions ` block there lists the tasks with a question for you (below). Open the task and write your answer under **Answer:** there, so the question and its answer stay with the work.

## Mentions of you

Anyone can mention you in any note with `@` and your GitHub login (in Edit mode, typing `@` offers the people with an inbox). A ` ```mentions ` block at the top of your inbox lists every place that does: the note and the heading above, as a link to that place, the line's words, and when the note last changed, newest first. It takes one line:

```text
login: your-github-login
```

It reads every note once (then only the changed ones), so the first look in a big vault takes a moment. A mention stays listed while the note says it.

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

## The questions for you

A ` ```questions ` block lists the tasks with a question waiting for an answer: a task gets one when your agent writes it a `question` property (the question in a few words) and a *Question* part with the options and an **Answer:** line. Each row links to the task and says *Waiting for your answer*, or *Answered, waiting for the agent* once you've written something under **Answer:**. It takes one line:

```text
owner: Your name
```

- `owner`: whose questions: the tasks they asked for, review, or whose agent has them. Left out, everyone's.

[Add a reading list](../Tasks/Add%20a%20reading%20list.md) has one, so your [inbox](../Notes/Inbox.md) lists it.
