# Graph Report - NotesApp  (2026-11-22)

## Corpus Check
- 57 files · ~141,338 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1191 nodes · 3827 edges · 51 communities (45 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `934cfa63`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub
- Mirror
- run.mjs
- app.js
- editor.js
- bases.js
- icon
- toLf
- inbox-overview.js
- build.mjs
- vault.js
- markdown.js
- addLocalVault
- task_commits.py
- .resolve
- .has
- toast
- LocalSource
- startNextSprint
- ref_node_assert
- languageFor
- version-switch.mjs
- answered-questions.mjs
- noteProps
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- ./src/local.js
- fill
- ai-time.mjs
- restore.mjs
- GitHubError
- package.json
- NavWidget
- csv.js
- realFile
- checkInboxDot
- puppeteer-core
- local.test.js
- wait
- createEditor
- icons.js
- contentsUrl
- export-pdf.mjs
- sw.js
- log
- ai-time.js
- renderPreview
- README.md
- printNote

## God Nodes (most connected - your core abstractions)
1. `h()` - 91 edges
2. `icon()` - 52 edges
3. `renderPreview()` - 51 edges
4. `Mirror` - 45 edges
5. `start()` - 43 edges
6. `toast()` - 42 edges
7. `showSettings()` - 41 edges
8. `shownName()` - 38 edges
9. `fill()` - 35 edges
10. `route()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Working on it` --references--> `modal()`  [INFERRED]
  CLAUDE.md → src/app.js
- `Working on it` --references--> `icon()`  [INFERRED]
  CLAUDE.md → src/icons.js
- `Rules` --references--> `toLf()`  [INFERRED]
  CLAUDE.md → src/vault.js
- `Version switch check` --references--> `main()`  [INFERRED]
  tests/e2e/README.md → tools/task-commits/task_commits.py
- `Rules` --references--> `main()`  [INFERRED]
  CLAUDE.md → tools/task-commits/task_commits.py

## Import Cycles
- None detected.

## Communities (51 total, 6 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.15
Nodes (7): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, newTokenUrl(), ownerOfPath()

### Community 1 - "Mirror"
Cohesion: 0.07
Nodes (31): blobSha(), BrowserFiles, db(), fileKey(), filesAndMeta(), folderOf(), folderPermission(), forgetFolder() (+23 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+40 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (69): addPackedExample(), amount(), app, assetLoads, ATTENTION_TITLES, baseCaches, baseLoads, baseTable() (+61 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.07
Nodes (56): loadBase(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues() (+48 more)

### Community 6 - "icon"
Cohesion: 0.12
Nodes (43): addRepo(), client(), closeFile(), connect(), copyField(), discoverVaults(), editTaskFields(), emptyState() (+35 more)

### Community 7 - "toLf"
Cohesion: 0.11
Nodes (34): asNewTask(), embeddedPart(), norm(), linkMarks(), addComment(), addNewTask(), blankOut(), commentHeader() (+26 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.18
Nodes (30): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewCaptures(), overviewContents(), overviewEach(), overviewOptions() (+22 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (12): EXAMPLE_VAULTS, html, esbuild, files, out, root, walk(), zipName (+4 more)

### Community 10 - "vault.js"
Cohesion: 0.05
Nodes (69): addDays(), assetConflicts(), assetList(), assetOptions(), assetsOverlap(), ASSIGNMENT_ID, blockContents(), captureAttachment() (+61 more)

### Community 11 - "markdown.js"
Cohesion: 0.07
Nodes (37): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS (+29 more)

### Community 12 - "addLocalVault"
Cohesion: 0.33
Nodes (9): addLocalVault(), sync(), cleanName(), formatSize(), fetchExample(), fromBase64(), nameFromZip(), restoredSettings() (+1 more)

### Community 13 - "task_commits.py"
Cohesion: 0.07
Nodes (24): Rules, Working on it, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check (+16 more)

### Community 14 - ".resolve"
Cohesion: 0.16
Nodes (28): loadSuggestions(), assigneeMatches(), assignmentTasks(), blank(), boardColumns(), byOrder(), claimedTasks(), foldName() (+20 more)

### Community 15 - ".has"
Cohesion: 0.24
Nodes (13): markInboxSeen(), assigneeOptions(), keptResolved(), LinkIndex, mentionKey(), resolveAllSeen(), seenList(), shownSeen() (+5 more)

### Community 16 - "toast"
Cohesion: 0.11
Nodes (45): addImage(), afterOutsideChange(), applyMode(), applyPreviewEdit(), canWrite(), checkDraft(), copyStatus(), downloadCopy() (+37 more)

### Community 18 - "startNextSprint"
Cohesion: 0.30
Nodes (14): addSubtask(), cleanDir(), dirName(), joinRepo(), loadTree(), modal(), newNote(), update() (+6 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.12
Nodes (8): errors, remote, errors, offsite, errors, remote, skills, vault

### Community 20 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.18
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 23 - "noteProps"
Cohesion: 0.11
Nodes (32): assigneeList(), assignmentEdits(), attentionBox(), changeTask(), checkInboxDot(), claimSuggested(), clearWaitingDate(), confirmDialog() (+24 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.13
Nodes (24): crc32(), done(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, inflateRaw() (+16 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.11
Nodes (12): errors, fill(), paste(), remote, action(), docs(), errors, field() (+4 more)

### Community 27 - "./src/local.js"
Cohesion: 0.15
Nodes (8): errors, remote, ./src/local.js, errors, fileText(), offsite, save(), until()

### Community 28 - "fill"
Cohesion: 0.21
Nodes (21): baseName(), blobUrl(), ensureSidebar(), fileRow(), fileView(), fill(), fillInboxOverview(), iconFor() (+13 more)

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "restore.mjs"
Cohesion: 0.12
Nodes (6): BROWSERS, DIR, errors, offsite, tmp, ./vendor/vendor.js

### Community 31 - "GitHubError"
Cohesion: 0.21
Nodes (3): GitHubError, FolderFiles, LocalError

### Community 32 - "package.json"
Cohesion: 0.25
Nodes (7): description, license, name, private, scripts, test, type

### Community 33 - "NavWidget"
Cohesion: 0.29
Nodes (4): navDecorations(), navField, navRange(), NavWidget

### Community 34 - "csv.js"
Cohesion: 0.52
Nodes (5): RFC-4180, detectDelimiter(), parseCsv(), serializeCsv(), roundTrip()

### Community 35 - "realFile"
Cohesion: 0.29
Nodes (7): encPath(), folderNotes(), ghGet(), gql(), json(), realFile(), realNotes()

### Community 36 - "checkInboxDot"
Cohesion: 0.32
Nodes (14): baseCache(), baseNotes(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates(), loadMentions() (+6 more)

### Community 37 - "puppeteer-core"
Cohesion: 0.17
Nodes (10): puppeteer-core, BIG, BIG_MB, errors, NOTES, offsite, devDependencies, puppeteer-core (+2 more)

### Community 38 - "local.test.js"
Cohesion: 0.47
Nodes (5): withLocal(), enc(), memoryFiles(), source(), vault

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.40
Nodes (5): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "export-pdf.mjs"
Cohesion: 0.33
Nodes (3): docs, errors, requests

### Community 47 - "ai-time.js"
Cohesion: 0.24
Nodes (15): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeSamples(), summary(), word(), blockedTasks(), fieldProp() (+7 more)

### Community 50 - "renderPreview"
Cohesion: 0.14
Nodes (48): aiTimeLabel(), addRelation(), aiEstimateField(), assetsBox(), baseCell(), claimWarning(), commitsBox(), fillAiTime() (+40 more)

### Community 51 - "README.md"
Cohesion: 0.17
Nodes (10): A look inside, For companies and bigger teams, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done (+2 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

## Knowledge Gaps
- **3 isolated node(s):** `RFC-4180`, `./src/github.js`, `./vendor/vendor.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 369 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `Mirror` to `app.js`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js`, `./vendor/vendor.js` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.07338935574229692 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `toLf` to `app.js`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `toast`, `renderPreview`, `noteProps`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `start()` (e.g. with `sync()` and `flushDraft()`) actually correct?**
  _`start()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._