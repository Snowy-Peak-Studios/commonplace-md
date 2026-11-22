# Markdown support

[README](../README.md) · [Getting started](getting-started.md) · [Block reference](blocks.md)

## Works with other Markdown editors

The notes are plain Markdown files, so the same folder opens in any Markdown editor, and desktop note apps that use `[[wikilinks]]` read it as it is. What the app supports:

- `[[wikilinks]]`, with `#Heading` and `|alias`, found by bare name in any folder
- plain Markdown links to other files in the repo, `[Add a vault](How%20To/Add%20a%20vault.md)`, relative to the note (or from the top with `/`), as GitHub reads them
- embeds: `![[image.png]]` (with `|width`), `![[Page]]`, `![[Page#Heading]]`, `![[X.base]]`
- In **Edit**, paste or drop an image or press **Add image** to choose one. The image has its own commit on GitHub, or is saved in a local vault. The editor inserts its embed at the cursor. **Save** keeps the link in the note. Images up to 10 MiB are accepted. See [Write and link notes](../example-vault/How%20To/Write%20and%20link%20notes.md#add-an-image).
- In **Edit**, **Insert** lists common Markdown and every app block with a read-mode preview, and adds the chosen one at the cursor. See [Write and link notes](../example-vault/How%20To/Write%20and%20link%20notes.md#insert-markdown-or-a-block).
- ` ```base ` blocks: a base view written in the page
- a task's ` ```subtasks `, ` ```relations ` and ` ```commits ` blocks on any page, with `task:` and the task's ID, name or link
- `description`, `acceptance-criteria`, `comments` and `work-history` for Markdown task sections. Comments also work on regular notes.
- a ` ```sprint ` block on any page, with `sprint: current`, `next`, or a sprint's name or link
- callouts (`> [!note]`, folded with `-` or open with `+`)
- front matter, shown as properties
- bases (`.base` files): table views with filters, formulas, sorting, groups and column widths
- ` ```mermaid ` diagrams
- ` ```top-tasks ` blocks: the top tasks to start, on any page
- `@login` mentions
- ` ```new-tasks ` blocks: ideas to turn into tasks, on any page
- ` ```needs-attention ` blocks: the questions waiting for someone and the places that mention them
- checkboxes, ticked in Read mode
- lists whose subpoints fold away in Read mode
- `%% comments %%`, hidden in the preview
- note templates with `{{title}}` and `{{date}}`

What it doesn't do:

- plugins, canvases, a graph view
- base views other than tables (the app says so, and shows the base's other views)
- other template variables (`{{time}}`, custom date formats); they stay as written
- editing images or other binary files

Folders and files starting with a dot (like `.trash/`) are left out of the tree.
