---
parent: "[[Home]]"
---

# How To

> [!TIP]
> **tl;dr:** Pick your way below, then follow the short steps for each thing you do.

*Don't rely on your agent's memory: make your own vault with all the answers.* These pages show how, one short page for each thing you do in **Commonplace.md**. They read the same on GitHub and in the app.

## Which way fits you

The app is the same for everyone. What you pick is where your vault lives:

```mermaid
flowchart LR
    q1{"Just you,<br/>on one device?"}
    q1 -- Yes --> local["💻 A local vault<br/>on your device<br/>(coming soon)"]:::local
    q1 -- "No: a team,<br/>or several devices" --> q2{"Does the project<br/>have its own repo?"}
    q2 -- "Yes" --> project["📁 In the<br/>project's repo"]:::repo
    q2 -- "No, or keep<br/>them apart" --> own["🔒 In a repo<br/>of its own"]:::repo
    classDef local fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef repo fill:#fef3c7,stroke:#d97706,color:#78350f
```

- 🟩 **Just you, on one device**: a local vault, with no GitHub account, only the app (*coming soon*; until then, a repo of its own).
- 🟨 **A team, or several devices**: the vault in a GitHub repo, **the project's own** (next to the code) or **one of its own** (private, even for a public project).

More on each, with what it costs: [the README](https://github.com/Snowy-Peak-Studios/commonplace-md#which-way-fits-you).

## Getting started

1. [Connect to GitHub](Connect%20to%20GitHub.md): make a token and paste it.
2. [Add a vault](Add%20a%20vault.md): open a notes repo in the app.
3. [Use it on a phone](Use%20it%20on%20a%20phone.md): install it as an app.

## Every day

- [Write and link notes](Write%20and%20link%20notes.md)
- [Save, drafts and conflicts](Save%2C%20drafts%20and%20conflicts.md)
- [Use your inbox](Use%20your%20inbox.md), and its top tasks to start

## Tasks and teams

- [Work with tasks](Work%20with%20tasks.md): fields, subtasks, relations and commits
- [Run sprints](Run%20sprints.md)
- [Invite someone](Invite%20someone.md)
- [Set up tasks](../Set%20up%20tasks.md): which fields your tasks have

## More

- [The guide](../Guide.md): everything a note can hold.
- [Rules for AI agents](../AGENTS.md): how an AI agent works in these notes.
