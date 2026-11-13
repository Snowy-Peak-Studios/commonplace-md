---
name: wrap-up-task
description: Finish the task you claimed - check every acceptance criterion, run the checks, mark it Done (or narrow it and split off what's left), keep the notes in step, commit with the task's ID and push. Use when the work is done, or your person says to wrap up, finish or commit.
---

# Wrap up a task

One task per wrap-up. If your changes cover another task too, stop and ask how to split them. Paths are from the vault's top folder.

## 1. The acceptance criteria

Go through every criterion in the task. Tick the ones that are met, and know how you know (a test passed, you looked at the result). For any that isn't met: finish it now, or split it off (step 3).

## 2. The checks

- Run the checks the project has (tests, a linter, a build), if `AGENTS.md` or the notes name any. Everything must pass.
- Where no test can tell, look at the result yourself: open the page, the file, the screen.

## 3. The task note

- **All done**: set `status: Done`, and add to its notes: `**Done (<date>)**:` what was done, in a few plain lines, and the commit (with its repo, if the work was in another one). Done tasks keep their `assignee`.
- **Part of it is left**: narrow the task to what was done (Done), and make a new To Do task from `Templates/Task.md` for exactly what's left, with the original's `requested_by`. Link the two to each other.

## 4. Keep the notes in step

- Change the pages that describe what changed, in the same commit: the page about the topic, a decision with its reason, a how-to.
- A new page gets a `parent` property and a link from the page above it.
- After a rename, no `[[link]]` may point at the old name (`grep -rn "\[\[Old name" .`).
- Write facts from the work, the commits and your person's words. Where something isn't known, say so rather than guess.

## 5. Commit and push

- Stage only your own changes, never other people's (no `git add -A` over files you didn't touch).
- Message: the task's ID, then what your person gets, in one line: `<ID>: what changed`. Several tasks: `<ID>, <ID>: ...`.
- Never skip a hook (`--no-verify`). If one fails, fix the cause.
- Push at once. If the push is refused, `git pull --rebase` and push again. Never force-push.

**The commit's hash**: a commit can't hold its own hash. If the work was in another repo, write that repo's commit into the task before this commit. If it was in this repo, after the commit write `git log -1 --format=%h` into the task's Done line, then commit that as `<ID>: commit noted` and push.

## 6. Report

In a few lines: what was done, the commits, which tasks changed status, any new task, and anything skipped and why. Suggest a fresh session before the next task.
