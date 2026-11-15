---
parent: "[[Inbox]]"
owner: Your name
github: your-github-login
---

# Your name's inbox

One inbox per person: copy this note, name it after yourself, and put your GitHub login in `github`. When you're signed in with that login, the Inbox button opens this note instead of the shared [[Inbox]].

## Needs attention

*What waits on you, here in two boxes: the questions on tasks, then the places that mention you. Answer a question on its task.*

```needs-attention
show: questions
owner: Your name
```

```needs-attention
show: mentions
login: your-github-login
```

## Top tasks

The box below (the ` ```top-tasks ` block) shows the top three free tasks to start, from `Tasks/`. Its `areas:` line keeps only the tasks in those areas; empty it to see every area. Its `owner:` is whom **Claim** claims for: put your name there too.

```top-tasks
range: 3
areas: Sharing, Notes
order: priority-newest
sprint: current-then-next
owner: Your name
```

## New tasks

*Write anything that should become a task: your agent turns each item into a task note.*

```new-tasks
owner: Your name
- Rename this note
```

## Notes

*Thoughts that aren't tasks. They stay here.*

- Nothing yet.
