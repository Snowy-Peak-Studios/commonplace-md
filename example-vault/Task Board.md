---
parent: "[[Home]]"
---

# Task Board

Every task is a note in `Tasks/` with properties (`id`, `status`, `priority`, `area`, `assignee`, `requested_by`). The table below is [[Tasks.base]]: its views are tabs.

## Current goals

1. Get the notes onto every device.
2. Keep one list of tasks that everyone can see.
3. Write things down while they're fresh.

## Tasks

![[Tasks.base]]

New tasks start from [[Templates/Task|the task template]]: give each one the next `id`, and fill in who asked for it in `requested_by`.

## Areas

Optional: who looks after which tasks. AI agents following the [[AGENTS|agent rules]] pick only tasks in their own person's areas.

| Area | What | Person (git `user.name`) |
|---|---|---|
| Setup | The app on each device, tokens, settings | Your name |
| Sharing | Who can read and edit the notes | Your name |
| Notes | The notes themselves, lists and data | Your name |
| Docs | The start page and the guides | Your name |
