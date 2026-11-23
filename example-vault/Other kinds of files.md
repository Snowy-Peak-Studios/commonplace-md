---
parent: "[[Home]]"
---

# Other kinds of files

A vault can hold more than notes. Keep data, scripts, PDFs and pictures next to the notes they belong to, and open them in the app.

| File | How it opens |
|---|---|
| [[Reading list.csv\|Reading list]] | A CSV file: a table you can edit, or its text. Quotes, commas and line breaks in cells, and `;` as the separator, are kept as they are |
| [[Pantry.tsv\|Pantry]] | A TSV file: the same, with tabs between the cells |
| [[settings.json]] | JSON, as text with colours |
| [[word_count.py]] | A Python script, as text with colours |
| [[An example PDF.pdf\|An example PDF]] | A PDF: shown in the page where the browser can (on a computer), and always with **Open in a new tab** and **Download** |
| [[commonplace.svg]] | A picture: shown as it is |
| [[A short chime.mp3\|A short chime]] | Audio: a small player |
| [[A test pattern.mp4\|A test pattern]] | Video: the same player, with the picture |

## What opens how

- **Notes** (`.md`): read, or edited with colours for the Markdown.
- **Tables** (`.csv`, `.tsv`): a table or the text. A big table shows 500 rows at a time.
- **Text with colours**: JSON, YAML, TOML, INI, HTML, XML, CSS, JavaScript, TypeScript, Python, shell, PowerShell, SQL, Go, Rust, C, C++, C#, Java, Kotlin, Lua, Ruby, diffs and Dockerfiles. Any other text file opens as plain text.
- **Pictures** (`.png`, `.jpg`, `.gif`, `.webp`, `.svg` and more): shown.
- **PDFs**: shown in the page, or opened in a new tab.
- **Audio and video** (`.mp3`, `.m4a`, `.wav`, `.ogg`, `.flac`, `.mp4`, `.webm`, `.mov` and more): a small player (below).
- **Anything else** (Word, Excel, archives): **Download**, to open it on your device.

## Audio and video in a note

Keep the recording in **Attachments** and put only its link in the note, as for a picture: `![[A short chime.mp3]]`. The note shows a small player there:

![[A short chime.mp3]]

![[A test pattern.mp4]]

- **Play, pause, the time bar and the volume** are your browser's own.
- **−5 s** and **+5 s** go back or on five seconds: hear a sentence again.
- **Speed** plays it slower or faster, from 0.5× to 2×. This device remembers the speed you chose.
- **Repeat** plays it again and again until you press it once more.
- **Download** keeps a copy on your device.

Starting one recording pauses any other on the page. `![[lesson.mp3|Lesson 3]]` shows *Lesson 3* as its name. If your browser can't play a file (some browsers have no `.mov` or `.flac`), the player says so, and **Download** still works. In **Edit**, paste or drop the file, or press **Add media** in the top bar: it goes into **Attachments**, up to 25 MiB.
