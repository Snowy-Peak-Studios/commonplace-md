---
name: sort-inbox
description: Start a working session in the notes - pull, read the current goals, and sort your person's inbox and new-tasks blocks (new tasks into task notes, answers acted on), then commit and push. Use at the start of every session, or when your person says to check or sort the inbox.
---

# Sort the inbox

How every working session starts (`AGENTS.md`, Every session starts the same way). Paths are from the vault's top folder.

## 1. Pull

`git pull --rebase --autostash`. People write from their phones and other devices all day. If the rebase stops on a conflict, sort it out first, keeping both sides' edits.

## 2. The goals

Read the **current goals** at the top of `Task Board.md`. Weigh every new task's priority and everything you propose against them.

## 3. Your person's inbox

- Find it by your `git config user.name`: `grep -rl "^owner: <name>$" Notes`. If there's none, it's the shared `Notes/Inbox.md`.
- Read only that one. Other people's inboxes are theirs: leave them alone.

## 4. New tasks

The new tasks are in ` ```new-tasks ` blocks, on any page. Find them all: `grep -rln '^```new-tasks' --include=*.md .`. Yours are the blocks whose `owner:` line is your person; leave the others, and blocks with no `owner:`. An inbox may also have items written as a list under its **New tasks** heading: they count too.

For each of your items (each line in the block but `owner:`):

**Check the declared sibling registry before making a local task.** If the item clearly belongs elsewhere, follow **Sibling vaults and routing** in `AGENTS.md`: verify authorization and destination rules, save the transfer ID at the source, create or find the destination task with that ID, and verify its saved copy before clearing the source. Keep provenance in plain text. A retry reuses the transfer record and destination task; a failed or queued remote write leaves the item intact. A missing/ambiguous destination or privacy boundary needs the person's decision. Then continue with the next item; do not also create a local task. If it belongs elsewhere but no allowed sibling is configured, leave the item and ask. Items that belong here follow the normal steps below.

1. **Is there a task for it already?** Look for its words in the task file names first (`ls Tasks | grep -i <word>`), then in their text. If one covers it, add the item to that task: quote it in the task's notes with the date, and add or change an acceptance criterion if needed.
2. **If not, make a task** from `Templates/Task.md`:
   - `id`: the highest one + 1 (`grep -h "^id:" Tasks/*.md | sort -V | tail -1`). IDs are never reused.
   - The title is the file name, so no `: * ? " < > | / \` in it (use ` - `).
   - A user story ("**As** ..., **I want** ..., **so that** ...") and acceptance criteria you can check.
   - `requested_by`: the inbox's owner. `status: To Do`, `assignee: ""`.
   - `area`: from the Areas table on `Task Board.md`, if there is one. `priority`: by the current goals.
   - In its notes, quote the item word for word, with the date: `From <owner>'s inbox, <date>: "..."`.
3. **Unclear?** Make the task with what you know, and ask the rest on it: `question:` in its properties, a *Question* part with the options and an **Answer:** line, and, if the inbox has no ` ```needs-attention ` block showing questions, one line under **Needs attention** linking to the task (`AGENTS.md`, Questions).
4. Delete the item from its block (or the inbox). Keep the block itself, with its `owner:` line, even when it's empty.

## 5. Notes

Leave the **Notes** section as it is: they're thoughts, not tasks.

## 6. Needs attention

The ` ```needs-attention ` block there (or each line, with no block) points to each task with a question. For each one that's yours (your own question, or one on a task you've claimed), open the task: is there an answer under **Answer:** (or under the inbox's line)?

- Act on the answer: write it in the task's notes (quoted, with the date), tick the criterion it settles, change the pages it changes.
- Then take out the task's *Question* part, empty its `question:`, and delete the inbox's line if there is one.

Leave questions with no answer, and other people's, as they are.

## 7. Commit and push

- Stage only the inbox and the notes you changed. Message: the new tasks' IDs, then what happened, e.g. `T-7, T-8: inbox sorted into tasks`. With no new task: `Inbox sorted`.
- Push at once. If the push is refused, `git pull --rebase` and push again.

## 8. Report

In a few lines: the new tasks (ID, title, priority, which goal it serves), the answers you acted on, and the questions you asked. Then say which task you'd pick next and why (the `start-task` skill's rules), and wait for your person's go-ahead, unless they already named the task.
