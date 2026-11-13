---
name: start-task
description: Pick or make a task on the Task Board and claim it before any other change - In Progress, your assignee, committed and pushed alone - then check it still fits and plan it. Use when your person asks you to start, build or work on something, or names a task.
---

# Start a task

Claim first, then work (`AGENTS.md`, Tasks). Paths are from the vault's top folder.

## 1. A clean start

Run `git status --short`. If there's uncommitted work from before, say so in the report. Don't mix it into this task.

## 2. Pull

`git pull --rebase --autostash`, so the claims others pushed are in.

## 3. Find the task

- **Your person named it** (an ID or some words): find its note (`grep -l "^id: <ID>$" Tasks/*.md`, or `ls Tasks | grep -i <word>`).
- **They didn't**: pick the next free one yourself: no `assignee`, an `area` that's your person's (if `Task Board.md` has an Areas table), the highest priority that serves the current goals, and within a priority the **newest first** (the highest ID). Say why you picked it.
- **No task for what they asked**: make one from `Templates/Task.md` (see the `sort-inbox` skill for the fields), with `requested_by` your person.

## 4. Can you take it?

- It has an `assignee`: it's taken, whatever its status, even when the name is your own person's (another session may be on it). Stop and report, unless that person told you to take it over.
- Its `area` belongs to someone else: stop and report, unless your person named this task.

## 5. Claim it, before any other change

1. Set `status: In Progress` and `assignee: <git user.name> (<agent name>)`, e.g. `Ann Example (Claude)`.
2. Stage only that task note, commit as `<ID>: claimed by <assignee>`, and push.
3. If the push is refused, pull and look again. If the task is now someone else's, theirs stands: drop your claim and pick another.

One task at a time: finish this one before you claim another.

## 6. Does it still fit?

An old task can go stale. See when it was made (`git log --follow --diff-filter=A --format=%as -- "Tasks/<title>.md" | tail -1`) and check its story and criteria still fit the notes and the goals. If not, rewrite or narrow it (and say so), or ask under **Needs attention** in your person's inbox and move on to another task. Never build a stale task as written.

## 7. Plan it

- Which current goal it serves, or that it serves none.
- Its acceptance criteria, and how you'll check each one (a test, a look at the result).
- What's unclear. A decision that's your person's: ask them now, or under **Needs attention** if they're away.

## 8. Report (under 10 lines)

The task's ID and title, the claim's commit, the goal it serves, the criteria, the plan and any questions. If the plan has choices for your person, wait for their answer before you build.
