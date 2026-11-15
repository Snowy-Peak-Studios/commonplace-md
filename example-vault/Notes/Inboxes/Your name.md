---
parent: "[[Inbox]]"
owner: Your name
github: your-github-login
---

# Your name's inbox

One inbox per person: copy this note, name it after yourself, and put your GitHub login in `github`. When you're signed in with that login, the Inbox button opens this note instead of the shared [[Inbox]].

Mentions of you come first: the ` ```mentions ` block lists every place in the vault that says `@` and your login (put it in its `login:` line).

```mentions
login: your-github-login
```

The box below (the ` ```top-tasks ` block) shows the top three free tasks to start, from `Tasks/`. Its `areas:` line keeps only the tasks in those areas; empty it to see every area. Its `owner:` is whom **Claim** claims for: put your name there too.

```top-tasks
range: 3
areas: Sharing, Notes
order: priority-newest
sprint: current-then-next
owner: Your name
```

## New tasks

*The notes below will be transferred to tasks.*

- [ ] Rename this note

## Notes

*Thoughts that aren't tasks. They stay here.*

- Nothing yet.

## Needs attention

*Questions waiting for you: the tasks with a question, found by the block below. Answer on the task.*

```questions
owner: Your name
```
