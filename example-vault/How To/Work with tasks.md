---
parent: "[[How To]]"
---

# Work with tasks

> [!TIP]
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

Move a block to move its box, or take it out and the box goes. New tasks put Subtasks and Relations above the description, and Commits below Comments.

## Task sections

The [phone setup task](../Tasks/Try%20the%20app%20on%20a%20phone.md) uses four blocks. In **Edit**, write Markdown inside each pair of fences.

~~~markdown
```description
Keep the inbox handy on my phone.
```

```acceptance-criteria
- [ ] Add the app to the home screen
```

```comments
Does the shortcut open my inbox?
```

```work-history
- Tried it in the phone's browser.
```
~~~

Tick a criterion in **Read**, then **Save**. Work History opens from the folded section at the bottom. Put a `comments` block on any note and use `@` followed by a teammate's GitHub login to mention them. The [Guide](../Guide.md#comments) has a Comments block on a regular note.

Write in the Comments box and press **Post** to save a comment with its author and time. The box starts with an editable mention of the previous commenter when their login is known and differs from yours. Type `@` to pick a teammate with an inbox. If the note already has unsaved edits, the comment joins the draft. Press **Save** to post it with your changes. Open **Edit** to revise a saved comment.

## See them all

The [Task Board](../Task%20Board.md) shows the tasks as a table, with views by status, by parent and more. Your [inbox](Use%20your%20inbox.md) shows the top ones to start.
