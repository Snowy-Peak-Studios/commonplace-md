---
parent: "[[Task Board]]"
---

# Set up tasks

Every task is a note in `Tasks/`, and its fields (status, priority, who it's for, and so on) are properties at the top of the note. Which fields your tasks have is up to you, and it's set up once for the whole project.

> [!tip] Open the setup
> **[Set up task fields](#/settings?fields)**: opens the Task fields of this repo in Commonplace.md. You can also get there from **Settings**, by opening the repo and pressing **Task fields**.

## What you can change

- **Turn fields on and off.** The app knows Status, Priority, Assignee, Area, Requested by, Type (Epic, Story, Task, Bug), Parent task, Sprint, Estimate and Due date.
- **Change the lists:** the statuses, the priorities, the types. Type them split by commas.
- **Rename a property:** each field is kept in a property of the same name (`status`, `priority`, ...). The parent task is kept in `part_of`, since `parent` places a page in the tree of pages.
- **Sprints:** the folder the sprint notes go in, and how many days a sprint lasts.
- **Estimate:** in points, hours or days.
- **Add a field of your own:** give it a name, a property and a kind: text, number, date, a choice from a list, a person, or a link to a page.

Press **Save to the repo**. The setup goes into the repo's `.commonplace.json` file, in one commit, so everyone on the project gets the same fields.

## On a task

Open any task, like [[Invite a friend]]: its fields are pickers and boxes above its other properties. A change is saved to GitHub at once, one line in one commit. If the note has changes you haven't saved yet, the field changes with them and **Save** keeps both.

A new note in `Tasks/` starts with every field that's on.

## Subtasks

A task can sit under another one: its **Parent task** (`part_of`) links to it. [[Get set up]] is an epic with three tasks under it: its page lists them with their status and a bar of how many are done, and **Add subtask** makes a new one, with the same area and sprint. Pick a parent by its ID or its name. The [[Task Board]]'s *By parent* view groups the tasks by their parent.

## Sprints

A sprint is a note in `Sprints/` with its `start`, `end` and `goal`, like [[Sprint 1]]. A task joins it in its **Sprint** field, which offers the current sprint first, then the next. A sprint's page lists its tasks by status, with how many are done and how many points. On the latest sprint, **Start the next sprint** makes the next one (its dates follow from the sprint length in the setup) and moves the unfinished tasks into it, all in one commit. The [[Task Board]] shows the sprint going on today.

## No setup yet?

A repo that was never set up has Status, Priority, Assignee, Area and Requested by, as before. The first time you open the setup, every field is ticked: untick the ones you don't need, then save.
