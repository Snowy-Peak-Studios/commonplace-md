---
parent: "[[Home]]"
---

# Rules for AI agents

The rules for any AI agent (and any person) working in these notes. Your person (the one you work for) decides what gets built and answers the questions. Paths below are from the vault's top folder.

## 🚦 First run: set these rules up with your person

**While this section is here, do this before anything else.** The rules below are suggestions. Go through them with your person so they become theirs:

1. **One rule at a time.** Take each rule below (each bullet or numbered step), section by section. Show it, say in one line why it's there, and ask: **keep, change or drop?** Wait for the answer before the next one; never batch them.
2. **Write the answers back as you go**: reword a changed rule, delete a dropped one. Commit and push after each section, so nothing is lost if you stop halfway.
3. **Ask what's missing**: their own habits, such as how they name things, when you must ask before acting, and what you must never touch. Add those as rules too.
4. **Local or global?** For every rule they keep or add, suggest where it belongs, and move it where they say:
   - **Local**, in this file: rules about these notes (the paths, the Task Board, the areas, the inboxes).
   - **Global**, in your own user-level rules, for all their vaults and projects: how they like to work, their language and tone, when to ask first, commit habits. For Claude Code that's `~/.claude/CLAUDE.md`, for Codex `~/.codex/AGENTS.md`, for others their user-level instructions. Ask before you write anything outside this repo.
5. **Then the skills** (see Skills below), one at a time the same way: show what it does, when it runs and its steps, and ask: **approve, change or drop?** Rewrite a changed one in `.agents/skills/` as they say; delete a dropped one and its pointer in `.claude/skills/` and its line in the Skills table. Ask if they want skills of their own, and add them the same way.
6. **Finish**: delete this whole section, commit as `Rules set up with <your person's name>`, and push.

If your person says the rules are already set up, just delete this section.

## The vault is the hub

- Everything about the work lives here: plain Markdown with `[[wikilinks]]` and front matter properties. Edit the files directly.
- Start at `Home.md`: it says where everything is.
- Every page but `Home.md` has a `parent` property that links to the page above it. A new page gets one too, and every `[[link]]` leads to a page that exists.

## Every session starts the same way

1. `git pull --rebase --autostash`. People write from their phones and other devices all day. If the rebase stops on a conflict, sort it out first, keeping both sides' edits.
2. Read the **current goals** at the top of `Task Board.md`. Weigh every task you pick and everything you propose against them, say which goal a task serves, and flag work that serves none.
3. Read **your own person's inbox**, and no one else's: the note in `Notes/Inboxes/` whose `owner` is your `git config user.name` (`grep -rl "^owner: <name>$" Notes`); if there's none, the shared `Notes/Inbox.md`.
   - **New tasks:** every ` ```new-tasks ` block in the vault whose `owner:` is your person, on any page (`grep -rln '^```new-tasks' --include=*.md .`), and the items written under **New tasks** in their inbox: turn each item into a task note (or add it to a task that already covers it), with `requested_by` your person. Then take the item out of its block. Blocks with someone else's `owner:`, or none, are not yours.
   - **Notes:** leave them as they are.
   - **Needs attention:** act on the answers to your own questions (or to questions on a task you've claimed), written on their tasks (see Questions), then clear them.
   - Commit and push the sorted inbox and the new tasks at once.

## Tasks

- One note per task in `Tasks/`, made from `Templates/Task.md`. Each task is a user story with acceptance criteria.
- Properties: `id`, `status` (To Do / In Progress / Waiting / Done; *Waiting* is a task your person put off with **Not now**), `assignee`, `requested_by`, `area`, `priority` (High / Medium / Low).
- A new task's `id` is the highest one + 1 (`grep -h "^id:" Tasks/*.md | sort -V | tail -1`). IDs are never reused.

### Picking a task

- Your person names one, or you take the next one in this order:
  1. **Tasks your person claimed for you**: `assignee` is exactly their name, with no agent after it (e.g. `Ann Example`), and the task isn't done. That's how they pick your next task, for example with **Claim** in the app's inbox. The highest priority first.
  2. **Free tasks**: no `assignee`, not *Waiting* (your person put it off: leave it until they bring it back), the highest priority that serves the current goals, and within a priority the **newest first** (the highest ID).
- If `Task Board.md` has an **Areas** table, pick only free tasks whose `area` belongs to your person.
- A task with an agent in its `assignee` (e.g. `Ann Example (Claude)`) is taken, whatever its status: another session is on it. So is a task with someone else's name.
- **Is it ready?** Don't build a task that needs a decision first: an open criterion about deciding ("Decided with ..."), "TBD", or `ready: decision`. Ask the decision on the task (see Questions), and pick another task meanwhile. Skip a placeholder (a title starting with "Placeholder" or ending in "- placeholder", the `placeholder` tag, `ready: placeholder`, or criteria still "..."): it isn't written out yet. The app's inbox shows each task's state the same way.
- Before you build an old task, check that it still fits the notes and the goals. If it doesn't, rewrite or narrow it, or ask (see Questions). Never build a stale task as written.

### Claim before any other change

1. `git pull --rebase --autostash`.
2. Set `status: In Progress` and `assignee: <git user.name> (<agent name>)`, e.g. `Ann Example (Claude)`. A task your person claimed for you gets your agent name added the same way, so other sessions see it's taken.
3. Commit only that task note, as `<ID>: claimed by <assignee>`, and push.
4. If the push is refused, pull and look again. If the task is now someone else's, theirs stands: drop your claim and pick another.

### One task at a time

- Finish the task you claimed before you start another.
- **Giving one up:** set it back to `status: To Do` and `assignee: ""`, add a line on how far it got, commit and push.

### Done

- Set `status: Done` only when every acceptance criterion is met. Write what was done and the commit in the task's notes. Done tasks keep their assignee.
- If part of it is left, narrow the task to what was done (Done) and add a new To Do task for exactly what's left.

## Questions

A question lives on the task it's about, with its answer next to it. The inbox only points to it.

1. **On the task**, two things:
   - `question:` in its properties: the question in a few words, e.g. `question: "Books only, or articles too?"`. The app finds the open questions by it.
   - A *Question* part right under the user story, before the acceptance criteria: who asks and the date, the question, the options (your pick first, with why), and an empty **Answer:** line for your person:

     ```markdown
     ## ❓ Question

     *(Claude, 2026-05-01)* Should the list hold only books, or articles too?

     - **(a) Books only** (my pick): the list stays short.
     - **(b) Articles too**: ...

     **Answer:**
     ```

     One question per task at a time; several open ones go in the same part as (1), (2).
2. **In your person's inbox**, under **Needs attention**: a ` ```needs-attention ` block there lists the task by itself (from its `question:`), so write nothing. With no block there, write one line, `- [[<task title>]]: <the question in a few words>`, nothing more.
3. **The answer** is written under **Answer:** on the task. An answer written under the inbox's line counts the same.
4. **Acting on it**: do what the answer says, then move it into the task's notes as a record (who, the date, the options in short, their words), take out the *Question* part, empty `question:`, take out the inbox's line if you wrote one, and tick the criterion it settles (and drop `ready: decision`).
5. **A question with no task**: make the task first if it's work for this vault; if it isn't, ask it in the inbox as a whole item.

Then move on to another task while it waits.

## Mentions

- To point someone to a place, write `@` and their GitHub login there (the `github` of their inbox). The ` ```needs-attention ` block at the top of their inbox lists it; nothing else needs writing.
- A question for your own person still goes on its task (see Questions).

## Keep the vault in step

- When something changes, change the pages that describe it in the same commit: the task, the page about the topic, and the links and `parent` properties of any page you add, move or rename.
- Facts come from the notes, the commits and your person's words. Where something isn't known, say so rather than guess.

## Skills

Step-by-step ways of doing the jobs above, one per folder in `.agents/skills/<name>/SKILL.md`. Agents that know skills find them there (Claude Code through the pointers in `.claude/skills/`); any other agent reads the file and follows it.

| When | Skill |
| --- | --- |
| A session starts, or your person says to check the inbox | `sort-inbox`: pull, the goals, the inbox into tasks, the answers acted on |
| Starting work on something | `start-task`: pick or make the task, claim it, check it still fits, plan it |
| The work is done | `wrap-up-task`: the criteria, the checks, Done or split, the notes in step, commit and push |
| Before a push to a public repo | `public-check`: nothing private in the files or the commits |

A skill is kept in one place, `.agents/skills/`. To change one, change it there; a new skill also gets a pointer in `.claude/skills/` (the same `name` and `description`) and a line here.

## Commits

- The message starts with the task's ID: `<ID>: what changed`. Several tasks: `<ID>, <ID>: ...`. A change with no task (an inbox sorted) gets a plain description.
- Commit only your own changes, never other people's files.
- **Push after every commit.** If the push is refused, `git pull --rebase` and push again.
- Never force-push or rewrite pushed commits.
- Files are UTF-8 with LF line endings.
