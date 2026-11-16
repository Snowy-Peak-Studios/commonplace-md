---
parent: "[[Home]]"
---

# Task Board

This week's goal is to log one watering and see the next reminder. Open a task to see who is doing it and who reviews it.

```base
filters: 'file.inFolder("Tasks")'
views:
  - type: table
    name: By status
    groupBy: status
    order: [file.name, area, assignee, reviewer]
```
