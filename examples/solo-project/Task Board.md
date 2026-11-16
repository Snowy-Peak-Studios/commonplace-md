---
parent: "[[Home]]"
---

# Task Board

Finish the first run screen before adding saved presets. Check both outdoor readability and silent mode before releasing.

```base
filters: 'file.inFolder("Tasks")'
views:
  - type: table
    name: By status
    groupBy: status
    order: [file.name, area, assignee, reviewer]
```
