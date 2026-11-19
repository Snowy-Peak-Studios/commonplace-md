---
parent: "[[Home]]"
---

# Task Board

The demo has two epics. [[Make the station playable]] gets the route, lighting and sound into one build. [[Prepare the demo handoff]] packages it and checks a clean install.

| Sprint | Goal |
| --- | --- |
| [[Route sprint]] | Finish one walkable route |
| [[Demo sprint]] | Hand a clean build to a tester |

```base
filters: 'file.inFolder("Tasks")'
views:
  - type: table
    name: By status
    groupBy: status
    order: [file.name, area, assignee, sprint]
  - type: table
    name: By epic
    groupBy: part_of
    order: [file.name, status, assignee]
```
