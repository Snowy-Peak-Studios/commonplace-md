---
parent: "[[How To]]"
---

# Switch AI agents

> [!TIP]
> **tl;dr:** Your agents remember through the vault, not through their chats. Each one saves what it did on the task, and a handoff before it stops; the next one reads the task and carries on.

*Don't rely on your agent's memory: make your own vault with all the answers.* An agent's chat and its own memory end with the session, and another agent never sees them. Your notes stay. So the [rules for AI agents](../AGENTS.md#the-vault-is-your-memory) have every agent keep the project's facts in the vault, where you and the next agent can read them.

## Where things go

| What | Where |
| --- | --- |
| What a task is, and when it's done | The task's Description and Acceptance Criteria |
| What was done, checked and found | The task's Work History |
| What changed and what to test | The task's Review block, which your inbox shows under *For review* |
| A question, and your answer | The task, with a line in your inbox ([Use your inbox](Use%20your%20inbox.md)) |
| A decision and why | The task, and the page about that topic |
| How something works | A page of its own, like these how-to pages |
| Work stopped before it's done | A **handoff** at the end of the task's Work History |

## A handoff

When an agent stops in the middle of a task (the session ends, you switch agents, it waits for your answer), it writes a handoff in the task's Work History, then commits and pushes it:

~~~markdown
- **Handoff** (2026-05-02, Your name (Claude) → the next agent)
  - Done: the criteria met, and the commit.
  - Next: the very next step.
  - Open: questions waiting, and where they are.
  - Checks: what ran, and what still fails.
~~~

It sets the task's assignee to your name alone, so the task stays yours and your next agent takes it first. [Try the app on a phone](../Tasks/Try%20the%20app%20on%20a%20phone.md) has one: open its Work History.

## Switch to another agent

1. Make sure the last agent pushed its handoff: the task shows it, in the app too.
2. Open the new agent in the same notes repo. It reads `AGENTS.md` (Claude Code through `CLAUDE.md`).
3. Tell it which task, or let it pick: a task claimed for you comes first.

```text
Read AGENTS.md and follow it. Then continue the task "Try the app on a phone":
read it from the top, start from the Next in its last handoff, and tell me your plan first.
```

The new agent needs nothing from the old one's chat. If something is missing from the task, it asks you on the task, and the answer is saved there for the agent after it.

## Keep it private

- Agents save short facts and reasons, never whole chats or anything you'd not keep in your notes.
- A vault only on your device stays there. An agent working in it saves to it, and never copies notes elsewhere to remember them.
- Your agent's own memory can keep how you like to work. Project facts go in the vault, even when it remembers them too.
