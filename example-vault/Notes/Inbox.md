---
parent: "[[Home]]"
owner: Your name
github: your-github-login
---

# Inbox

The shared inbox: write here first, sort it later. The Inbox button opens it, unless you have an inbox of your own in `Notes/Inboxes/` (see [[Your name]]).

## Top tasks

Put your GitHub login in `github` above to make this one yours. The box below shows the top three free tasks you could start; **Claim** makes one yours. It's the ` ```top-tasks ` block, and its lines say what it shows (the [[Home]] page says what each means): change them, move the block, or put one on any page.

```top-tasks
range: 3
areas:
order: priority-newest
sprint: current-then-next
owner: Your name
```

## Needs attention

*What waits on you: the questions on tasks, and the places that mention you, in one box. Answer a question on its task.*

```needs-attention
show: questions, mentions
owner: Your name
login: your-github-login
```

`show:` is what the box shows: `questions, mentions` in one box, or one of them (two blocks make two boxes, as in [[Your name]]). `owner:` is whose questions (your name), `login:` whose mentions (your GitHub login).

## New tasks

*Write anything that should become a task: your agent turns each item into a task note. The block works on any page.*

```new-tasks
owner: Your name
- Try the app on a second device
- Add three books to the [[Reading list.csv|reading list]]
```

## Notes

*Thoughts that aren't tasks. They stay here.*

- The [[Guide]] shows everything a note can hold.
