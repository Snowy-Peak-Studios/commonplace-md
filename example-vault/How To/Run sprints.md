---
parent: "[[How To]]"
---

# Run sprints

> [!TIP]
> **tl;dr:** A sprint is a note in `Sprints/`. Pick it in a task's **Sprint** field, follow it on its page, and press **Start the next sprint** when it ends.

A sprint is a note in `Sprints/` with a `start`, an `end` and a `goal`, like [Sprint 1](../Sprints/Sprint%201.md). Sprints are a field of the task setup ([Set up tasks](../Set%20up%20tasks.md)), with their folder and how many days one lasts. A vault that has no setup yet, like this one, uses `Sprints/`.

## Put a task in a sprint

On the task, pick the sprint in its **Sprint** field. It offers the current sprint first, then the next. A new task goes on the next sprint by itself, so the current one's plan stays as agreed.

## Follow a sprint

A sprint's page shows its box where the note has a ` ```sprint ` block: its dates, its tasks by status, and how much is done.

## Start the next one

On the latest sprint, press **Start the next sprint**. The dialog starts with the unfinished tasks ticked, then uses up to the three most recent ended sprints to estimate how much work fits. It uses the estimate unit when every completed task has an estimate; otherwise it uses task counts. Free backlog tasks are sorted by priority, then oldest, and preselected while they fit the remaining average. Tasks with no estimate count as one unit when the history uses estimates. You can change any checkmark and see the selected total update. With no ended sprints, no backlog tasks start ticked and the dialog explains why.

Change the name, dates, goal or task selections, then press **Start sprint**. The new sprint note and every selected task move are saved in one commit.

## In your inbox

With `sprint: current-then-next` in the top-tasks block, your [inbox](Use%20your%20inbox.md) shows the current sprint's free tasks, then the next one's when it has none left. **Push to the next sprint** puts a task off until then.
