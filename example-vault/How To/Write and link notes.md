---
parent: "[[How To]]"
---

# Write and link notes

> [!TIP]
> **tl;dr:** Press **Edit**, write Markdown, press **Save**. Link with `[[Page]]`, and show a page or a picture inside a note with `![[...]]`.

## Write

1. Open a note and press **Edit** (or Ctrl+E). On a wide screen, the preview shows beside the editor as you type.
2. Write in Markdown.
3. Press **Save** (or Ctrl+S). See [Save, drafts and conflicts](Save%2C%20drafts%20and%20conflicts.md).

A new note: **New note** in the file list or the menu asks for a name and a folder. In a vault like this one, new notes go in `Notes/` and start from `Templates/Note.md`.

## Link

- **To a page**: `[[Guide]]`, or `[[Guide#Callouts]]` for a heading, or `[[Guide|the guide]]` to show other words. A bare name finds the page in any folder.
- **A plain Markdown link** works too: `[the guide](../Guide.md)`, as on GitHub. These How To pages link that way, so they read the same on GitHub.
- **Show a page or a picture inside the note**: `![[Guide#Callouts]]`, `![[picture.png]]`.

A link to a page that doesn't exist is marked in red, in the editor and in the preview.

## Add an image

Open **Edit** and place the cursor where the picture belongs. Paste an image from the clipboard, drop an image onto the editor, or press **Add image** to choose a file on your device. The note gets an embed such as `![[screenshot-2026-11-17-12-00-00-abcd1234.png]]`. Press **Save** to keep the link.

The file goes into **Attachments folder** in vault Settings, or next to the note if that setting is empty. GitHub saves the image in its own commit. To upload to GitHub, the app needs a connection and write access. You can also add images to a local vault. Images may be up to 10 MiB.

## What else a note can hold

Callouts, checkboxes, folding lists, diagrams, tables and more: [the guide](../Guide.md) shows them all.
