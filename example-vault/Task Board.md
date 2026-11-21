---
parent: "[[Home]]"
---

# Task Board

Every task is a note in `Tasks/` with properties (`id`, `status`, `priority`, `area`, `assignee`, `requested_by`). The table below is [[Tasks.base]]: its views are tabs.

Which fields a task has is set up per project: **[Set up task fields](#/settings?fields)** to turn on a type, a parent task, a sprint, an estimate or a due date, or to add fields of your own. The setup is kept in the repo, so everyone shares it. How it works: [[Set up tasks]].

## Current goals

1. Get the notes onto every device.
2. Keep one list of tasks that everyone can see.
3. Write things down while they're fresh.

## Tasks

![[Tasks.base]]

New tasks start from [[Templates/Task|the task template]]: give each one the next `id`, and fill in who asked for it in `requested_by`.

## Status board

Use the card's status menu or drag the card to move it to a different column. Open the pencil button to edit priority or assignee. **Assigned to me** focuses the board on your own tasks when you are signed in.

```board
```

## AI work history

This chart uses fictional AI-only `work_time` minutes from completed tasks. An unfinished task with the same Area and Type shows its historical average beside its fields; [[Try the app on a phone]] has one matching sample. It never measures people or changes a manual estimate.

```ai-work-time
group: area-type
```

Use `group: area` or `group: type` for a broader chart. Only this vault is read. [[Set up tasks]] explains the records.

## Occupied assets

The files that tasks in progress plan to change, from each task's ` ```assets ` block, and where two tasks overlap. A task counts while it's in progress or claimed; handing it to Testing, unclaiming it, putting it off or finishing it frees its files. Here [[Try the app on a phone]] holds the reading list, so claiming [[Add a reading list]] warns first. A warning, not a lock.

```occupied
```

Write `show: conflicts` in the block to list only the files more than one task plans to change.

## Getting set up

The epic [[Get set up]] and its subtasks, shown here by a ` ```subtasks ` block with a `task:` line (the task's ID, name or link). A task's ` ```subtasks `, ` ```relations ` and ` ```commits ` can show on any page this way; away from the task's own page they only read.

```subtasks
task: T-6
```

## Sprints

Each sprint is a note in `Sprints/` with its dates and goal; a task joins one in its `sprint` property. *Current sprint* shows the one going on today: open it to see its tasks by status. [[Sprints.base]] has them all.

![[Sprints.base]]

## Areas

Optional: who looks after which tasks. AI agents following the [[AGENTS|agent rules]] pick only tasks in their own person's areas.

| Area | What | Person (git `user.name`) |
|---|---|---|
| Setup | The app on each device, tokens, settings | Your name |
| Sharing | Who can read and edit the notes | Your name |
| Notes | The notes themselves, lists and data | Your name |
| Docs | The start page and the guides | Your name |
