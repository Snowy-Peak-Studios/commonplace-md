# Working with AI agents

[README](../README.md) · [Getting started](getting-started.md) · [Block reference](blocks.md)

## Working with AI agents (optional)

AI agents that can run git (Claude Code, Codex and others) can work in your vault beside you. The example vault comes with the rules for them: `AGENTS.md`, which any agent reads, and `CLAUDE.md`, which loads it for Claude Code, plus [step-by-step skills](#the-skills) for the jobs they do. With them, an agent:

- pulls first, and reads the **current goals** on the Task Board, so what it picks and proposes serves them;
- reads **your inbox**, and every ` ```new-tasks ` block with your name anywhere in the vault, and turns what you wrote there into task notes, with IDs and acceptance criteria;
- picks a free task and **claims** it (status and assignee, committed and pushed) before it changes anything, so two agents never work on the same task;
- keeps the Task Board and the other notes up to date, and writes what it did and the commit into the task when it's done;
- asks you on the task when it needs a decision, with a line under **Needs attention** in your inbox that links to it, and works on something else while it waits.

This is how the makers of Commonplace.md use it with their own agents: these are our rules and skills, made general. Change them to fit how you work.

### The skills

Each skill is one file, `.agents/skills/<name>/SKILL.md`, that walks an agent through one job step by step. Agents that know skills (Codex, Claude Code and others) find them there; Claude Code through the short pointers in `.claude/skills/`. Any other agent can be told to read the file.

| Skill | What it does |
| --- | --- |
| [`sort-inbox`](../example-vault/.agents/skills/sort-inbox/SKILL.md) | Starts a session: pulls, reads the current goals, turns your New tasks into task notes, acts on your answers, commits and pushes. |
| [`start-task`](../example-vault/.agents/skills/start-task/SKILL.md) | Picks or makes a task, claims it before any other change, checks it still fits, and plans it. |
| [`wrap-up-task`](../example-vault/.agents/skills/wrap-up-task/SKILL.md) | Checks every acceptance criterion, marks the task Done (or splits off what's left), keeps the notes in step, commits and pushes. |
| [`public-check`](../example-vault/.agents/skills/public-check/SKILL.md) | Before a push to a public repo: checks the files and the commits for names, emails, tokens, private repo names and task IDs. |

Not using the example vault? Copy the `.agents` and `.claude` folders and [`AGENTS.md`](../example-vault/AGENTS.md) into your repo, and change the paths in them to yours.

### Set it up

1. Keep `AGENTS.md`, `CLAUDE.md` and the `.agents` and `.claude` folders at the top of the notes repo, where agents look for them. If the vault is in a folder (say `notes/`), move them up to the repo's top and put the folder in front of the paths in them and in the skills (`notes/Home.md`, `notes/Tasks/`, ...).
2. Give each person an inbox in `Notes/Inboxes/` (or use the shared `Notes/Inbox.md`), with `owner` their name and `github` their GitHub login.
3. Set the agent's git `user.name` (`git config user.name`) to the inbox's `owner`, so the agent finds its person's inbox.
4. Optional: fill in the **Areas** table on the Task Board, so each person's agents pick only their own tasks.
5. **The first time** an agent works in the vault, it goes through the rules with you one by one: keep, change or drop each, add your own, and decide which stay **local** (this vault) and which go **global** (your agent's own user-level rules, for all your projects).
6. **Then the skills**, one at a time: the agent shows you what each [skill](#the-skills) does, when it runs and its steps, and you **approve, change or drop** it. A changed skill is rewritten the way you say, a dropped one is deleted (with its pointer in `.claude/skills/`), and you can ask for new ones. Then it removes the first-run section from `AGENTS.md`.

### Every day

1. You write in your inbox from the app, on your phone or anywhere: new tasks, notes, answers.
2. The agent pulls, sorts the inbox into tasks, claims one and works on it.
3. When it needs you, it writes the question on the task, with a line under **Needs attention** linking to it. You answer on the task, and the agent picks it up next time.
4. The agent pushes after every commit, so the app shows its changes on your phone at once.

To start a session, open the agent in the notes repo and paste:

```text
Read AGENTS.md and follow it: pull, read the current goals and my inbox, and sort my new tasks into
task notes. Then tell me which task you'd pick next and why, and wait for my go-ahead before you start it.
```
