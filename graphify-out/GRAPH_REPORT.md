# Graph Report - NotesApp  (2026-11-21)

## Corpus Check
- 47 files · ~124,778 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1084 nodes · 3462 edges · 52 communities (47 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b3d2ba80`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub
- .state
- run.mjs
- app.js
- editor.js
- bases.js
- h
- toLf
- inbox-overview.js
- vault.js
- addLocalVault
- markdown.js
- icon
- task_commits.py
- showSettings
- .has
- printNote
- checkInboxDot
- toast
- settings-scroll.mjs
- LocalSource
- version-switch.mjs
- ./src/local.js
- fieldProp
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- puppeteer-core
- assetsBox
- ai-time.mjs
- toast
- capture-attachments.mjs
- package.json
- NavWidget
- csv.js
- realFile
- export-pdf.mjs
- local-load.mjs
- ref_node_assert
- wait
- createEditor
- icons.js
- contentsUrl
- iconFor
- sw.js
- log
- ai-time.js
- asNewTask
- idb
- mirror.js
- README.md

## God Nodes (most connected - your core abstractions)
1. `h()` - 85 edges
2. `renderPreview()` - 49 edges
3. `icon()` - 46 edges
4. `Mirror` - 43 edges
5. `showSettings()` - 41 edges
6. `toast()` - 40 edges
7. `start()` - 39 edges
8. `shownName()` - 34 edges
9. `route()` - 34 edges
10. `join()` - 34 edges

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

## Communities (52 total, 5 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.13
Nodes (9): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, GitHubError, newTokenUrl(), ownerOfPath() (+1 more)

### Community 1 - ".state"
Cohesion: 0.19
Nodes (6): dec(), enc(), hidden(), Mirror, prefixOf(), unreachable()

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+40 more)

### Community 3 - "app.js"
Cohesion: 0.04
Nodes (76): app, applyMode(), ATTENTION_TITLES, baseCaches, baseLoads, baseView(), BINARY, blobUrls (+68 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.08
Nodes (50): loadBase(), pageText(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths() (+42 more)

### Community 6 - "h"
Cohesion: 0.12
Nodes (50): addRelation(), assigneeList(), assignmentEdits(), attentionBox(), baseCell(), baseTable(), cellText(), clearInboxSeen() (+42 more)

### Community 7 - "toLf"
Cohesion: 0.12
Nodes (28): asNewTask(), embeddedPart(), addComment(), addNewTask(), blockContents(), captureAttachmentText(), claimTask(), commentHeader() (+20 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.18
Nodes (31): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewCaptures(), overviewContents(), overviewEach(), overviewOptions() (+23 more)

### Community 9 - "vault.js"
Cohesion: 0.07
Nodes (55): lookWith(), linkMarks(), addDays(), blankOut(), captureAttachment(), cleanFolder(), cleanValues(), dirOf() (+47 more)

### Community 10 - "addLocalVault"
Cohesion: 0.33
Nodes (9): addLocalVault(), sync(), cleanName(), copyField(), noFolderText(), pickCopyFolder(), pickFolder(), canPickFolder() (+1 more)

### Community 11 - "markdown.js"
Cohesion: 0.11
Nodes (26): APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS, attentionOptions(), boardOptions(), CALLOUT_ICONS, calloutRule(), createMarkdown() (+18 more)

### Community 12 - "icon"
Cohesion: 0.18
Nodes (32): addRepo(), baseName(), blobUrl(), closeFile(), dirName(), discoverVaults(), editTaskFields(), emptyState() (+24 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, Working on it, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check (+15 more)

### Community 14 - "showSettings"
Cohesion: 0.16
Nodes (27): client(), confirmDialog(), connect(), ensureSidebar(), fill(), fillInboxOverview(), fillLinks(), findOwnInbox() (+19 more)

### Community 15 - ".has"
Cohesion: 0.22
Nodes (14): markInboxSeen(), assetList(), assigneeOptions(), clearAllSeen(), keptCleared(), LinkIndex, mentionKey(), seenList() (+6 more)

### Community 16 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 17 - "checkInboxDot"
Cohesion: 0.30
Nodes (15): baseCache(), baseNotes(), checkInboxDot(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates() (+7 more)

### Community 18 - "toast"
Cohesion: 0.14
Nodes (27): afterOutsideChange(), applyPreviewEdit(), checkDraft(), copyStatus(), draftKey(), fillComments(), flushDraft(), hasCaptureDraft() (+19 more)

### Community 20 - "LocalSource"
Cohesion: 0.15
Nodes (4): decode(), FolderFiles, LocalError, LocalSource

### Community 21 - "version-switch.mjs"
Cohesion: 0.15
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "./src/local.js"
Cohesion: 0.33
Nodes (3): errors, remote, ./src/local.js

### Community 23 - "fieldProp"
Cohesion: 0.13
Nodes (38): fillTopTasks(), loadSuggestions(), returnFromWaiting(), assigneeMatches(), assignmentTasks(), blank(), blockedTasks(), boardColumns() (+30 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.14
Nodes (22): crc32(), done(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, EXAMPLE_VAULTS (+14 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "puppeteer-core"
Cohesion: 0.17
Nodes (7): puppeteer-core, errors, remote, devDependencies, puppeteer-core, private, type

### Community 28 - "assetsBox"
Cohesion: 0.33
Nodes (6): assetsBox(), copyText(), fileAddresses(), titleMenu(), titleMenuEvents(), githubFileUrl()

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "toast"
Cohesion: 0.20
Nodes (24): addImage(), addSubtask(), changeTask(), claimSuggested(), cleanDir(), clearWaitingDate(), fullPath(), joinRepo() (+16 more)

### Community 31 - "capture-attachments.mjs"
Cohesion: 0.25
Nodes (5): errors, fill(), paste(), remote, field()

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

### Community 36 - "export-pdf.mjs"
Cohesion: 0.33
Nodes (3): docs, errors, requests

### Community 37 - "local-load.mjs"
Cohesion: 0.33
Nodes (5): BIG, BIG_MB, errors, NOTES, offsite

### Community 38 - "ref_node_assert"
Cohesion: 0.14
Nodes (6): errors, offsite, errors, remote, skills, vault

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.40
Nodes (5): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "iconFor"
Cohesion: 0.33
Nodes (6): iconFor(), kindOf(), hasLanguage(), languageFor(), languageMaker(), own()

### Community 47 - "ai-time.js"
Cohesion: 0.15
Nodes (15): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+7 more)

### Community 48 - "asNewTask"
Cohesion: 0.29
Nodes (14): amount(), downloadCopy(), fillBoards(), isSprintNote(), otherSprintBox(), shortDay(), sprintBox(), sprintField() (+6 more)

### Community 49 - "idb"
Cohesion: 0.16
Nodes (8): BrowserFiles, fileKey(), folderOf(), forgetFolder(), idb(), keepFolder(), vaultRange(), mirrorId()

### Community 50 - "mirror.js"
Cohesion: 0.24
Nodes (10): blobSha(), BINARY, keptAtOnce(), persist(), enc(), fakeGitHub(), memoryFiles(), mirrorWith() (+2 more)

### Community 51 - "README.md"
Cohesion: 0.18
Nodes (9): A look inside, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done, 🗺️ Roadmap (+1 more)

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./src/github.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 336 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `.state` to `idb`, `mirror.js`, `app.js`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitHub` be split into smaller, more focused modules?**
  _Cohesion score 0.13306451612903225 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `toLf` to `app.js`, `h`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `.has`, `toast`, `toast`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `showSettings()` (e.g. with `goBack()` and `.folderName()`) actually correct?**
  _`showSettings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._