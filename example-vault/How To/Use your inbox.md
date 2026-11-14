---
parent: "[[How To]]"
---

# Use your inbox

The inbox is where you drop things first and sort them later. The **Inbox** button opens it.

## Write in it

- **New tasks**: anything that should become a task. You, or your AI agent, turn each into a task note later.
- **Notes**: thoughts that aren't tasks. They stay.
- **Needs attention**: questions waiting for your answer, one per item. Answer under the item.

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
