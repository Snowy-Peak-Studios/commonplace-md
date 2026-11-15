---
parent: "[[How To]]"
---

# Work with tasks

> **tl;dr:** A task is a note in `Tasks/`, with its fields as pickers at the top and boxes for its subtasks, relations and commits. The Task Board shows them all.

A task is a note in `Tasks/`. Its fields (status, priority, who it's for, and so on) are properties at the top of the note. Which fields there are is set once for the project: [Set up tasks](../Set%20up%20tasks.md).

## Make one

- **Add subtask**, on any task, makes a new task under it.
- **New note** puts new notes in the vault's New notes folder when it has one (here `Notes/`); in a vault without one, pick the `Tasks/` folder.

A new task starts with every field that's on, and with the boxes below.

## Change its fields

On a task, the fields are pickers above the note: a list for choices, a date picker, a number, a page name. A change is saved at once, one line in one commit.

## Subtasks, relations and commits

A task shows three boxes where its note has their blocks:

~~~markdown
```subtasks
```

```relations
```

```commits
```
~~~

- **Subtasks**: the tasks under this one (their **Parent task** links here), with a bar of how many are done. **Add subtask** makes a new one under it.
- **Relations**: tasks this one is blocked by, comes after or before, or is related to, both ways. **Add relation** links another.
- **Commits**: the commits made for it, from its `commits` property.

Move a block to move its box, or take it out and the box goes. A new task gets all three.

## See them all

The [Task Board](../Task%20Board.md) shows the tasks as a table, with views by status, by parent and more. Your [inbox](Use%20your%20inbox.md) shows the top ones to start.
