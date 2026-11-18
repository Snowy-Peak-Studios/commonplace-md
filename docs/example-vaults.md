# Example vaults

[README](../README.md) · [Getting started](getting-started.md) · [Block reference](blocks.md)

## The example vault

### Pick a starter vault

Open Commonplace.md and choose **Add a vault on this device**. Under **Start with**, pick **An example vault** and choose the one closest to what you do. The app copies its notes into your new local vault. You can try, edit and keep it without a GitHub account.

| If you want to… | Choose |
| --- | --- |
| Plan and build an app by yourself, with an optional AI agent | [Solo project · Trail Timer](../examples/solo-project/Home.md) |
| Hand work between a few people with their own inboxes | [Small team · Pocket Garden](../examples/small-team/Home.md) |
| Plan a demo across roles, epics and sprints | [Large team · Signal Station](../examples/large-team/Home.md) |
| Keep recipes, a meal plan and a pantry list | [Personal notes · Kitchen Notebook](../examples/personal-notes/Home.md) |

Use **Download a copy** for a ZIP of your local vault. You can also copy the contents of any starter folder, including its hidden `.commonplace.json`, to the root of a new GitHub repo. Keep the folder structure and change the sample names and dates to suit your project.

### Explore the features

`example-vault/` is a small vault to copy into your notes repo. Each file shows something the app supports.

```text
example-vault/
├── Home.md                      start page: links, a table, a callout, an embedded section, the top tasks, a Mermaid diagram, an image
├── Guide.md                     the navigation box, wikilinks with headings and aliases, embeds, callouts, checkboxes, folding lists, diagrams
├── Task Board.md                current goals, the tasks' base embedded with ![[Tasks.base]], the sprints, and an optional Areas table
├── Set up tasks.md              how to set up your tasks' fields, with a link that opens Task fields
├── How To/                      short how-to pages, one per thing people do, linked with plain Markdown links (they read the same on GitHub)
├── Other kinds of files.md      what opens how: tables, text with colours, PDFs, pictures, and downloads for the rest
├── AGENTS.md                    optional: the rules for AI agents working in the vault
├── CLAUDE.md                    optional: loads AGENTS.md for Claude Code
├── .agents/skills/              optional: step-by-step skills for AI agents (sort-inbox, start-task, wrap-up-task, public-check)
├── .claude/skills/              optional: pointers to those skills, so Claude Code finds them
├── Bases/
│   ├── Tasks.base               a base with four views (By status, By parent, Open, Done), a formula, groups, sorts and filters
│   └── Sprints.base             the sprints, with a Current sprint view (start <= today() and end >= today())
├── Tasks/                       seven task notes with id, status, priority, area, assignee, requested_by and optional reviewer properties, and checklists;
│                                an epic, Get set up, with three of them under it (part_of); sprints and estimates
├── Sprints/
│   ├── Sprint 1.md              a sprint: start, end and goal; its page lists its tasks by status
│   └── Sprint 2.md              the next one
├── Notes/
│   ├── Inbox.md                 the shared inbox: owner and github properties, Top tasks, Needs attention, New tasks and Notes sections
│   └── Inboxes/
│       └── Your name.md         a personal inbox: copy it, rename it, put your GitHub login in github
├── Templates/
│   ├── Note.md                  the note template, with {{title}} and {{date}}
│   └── Task.md                  the task template, with writing sections and properties
├── Data/
│   ├── Reading list.csv         a CSV file, opened as a table
│   ├── Pantry.tsv               a TSV file: tabs between the cells, commas inside them
│   ├── settings.json            JSON, opened as text with colours
│   └── word_count.py            a Python script, opened as text with colours
└── Attachments/
    ├── commonplace.svg          an image, embedded with ![[commonplace.svg|160]]
    └── An example PDF.pdf       a PDF, shown in the page, with Open in a new tab and Download
```

Every page but `Home.md` has a `parent` property that links to the page above it.

The navigation box in `Guide.md` is the kind a script writes and keeps up to date (a breadcrumb and the page's headings). The app doesn't make it; with **Vault rules** on, it only protects it. Leave it out if you don't use such a script.
