# Graph Report - NotesApp  (2026-11-21)

## Corpus Check
- 47 files · ~126,952 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1096 nodes · 3525 edges · 52 communities (46 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f87c96a`
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
- vault.js
- inbox-overview.js
- vault.test.js
- startNextSprint
- markdown.js
- icon
- task_commits.py
- suggestBox
- .has
- checkInboxDot
- LocalSource
- toast
- ref_node_assert
- languageFor
- version-switch.mjs
- ./src/local.js
- fieldProp
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- puppeteer-core
- sprintBox
- ai-time.mjs
- fill
- capture-attachments.mjs
- package.json
- NavWidget
- csv.js
- realFile
- export-pdf.mjs
- local-load.mjs
- newtasks.mjs
- wait
- createEditor
- icons.js
- contentsUrl
- applyMode
- sw.js
- log
- answered-questions.mjs
- mirror.js
- mirror.js
- README.md
- vault.js

## God Nodes (most connected - your core abstractions)
1. `h()` - 86 edges
2. `renderPreview()` - 50 edges
3. `icon()` - 47 edges
4. `Mirror` - 43 edges
5. `showSettings()` - 41 edges
6. `toast()` - 40 edges
7. `start()` - 39 edges
8. `shownName()` - 37 edges
9. `join()` - 35 edges
10. `route()` - 34 edges

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

## Communities (52 total, 6 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.13
Nodes (9): tokenSteps(), decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, GitHubError, newTokenUrl() (+1 more)

### Community 1 - ".state"
Cohesion: 0.18
Nodes (7): blobSha(), dec(), enc(), hidden(), Mirror, prefixOf(), unreachable()

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+40 more)

### Community 3 - "app.js"
Cohesion: 0.04
Nodes (71): app, assetLoads, ATTENTION_TITLES, baseCaches, baseLoads, BINARY, blobUrls, cellText() (+63 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.08
Nodes (52): baseView(), fillBases(), loadBase(), pageText(), arithmetic(), asTime(), BaseError, baseNameOf() (+44 more)

### Community 6 - "h"
Cohesion: 0.11
Nodes (56): aiTimeLabel(), addRelation(), aiEstimateField(), assetsBox(), assignmentEdits(), attentionBox(), baseCell(), baseTable() (+48 more)

### Community 7 - "vault.js"
Cohesion: 0.12
Nodes (30): asNewTask(), embeddedPart(), addComment(), addNewTask(), captureAttachmentText(), claimTask(), commentHeader(), commentReply() (+22 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.10
Nodes (34): loadOverviewModule(), allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewContents(), overviewEach(), overviewOptions() (+26 more)

### Community 9 - "vault.test.js"
Cohesion: 0.08
Nodes (27): addDays(), assetList(), assetOptions(), blockContents(), MARKER, markerText(), mergeMarker(), nextSprint() (+19 more)

### Community 10 - "startNextSprint"
Cohesion: 0.29
Nodes (15): addSubtask(), cleanDir(), dirName(), joinRepo(), loadTree(), modal(), newNote(), update() (+7 more)

### Community 11 - "markdown.js"
Cohesion: 0.10
Nodes (27): APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS, attentionOptions(), boardOptions(), CALLOUT_ICONS, calloutRule(), createMarkdown() (+19 more)

### Community 12 - "icon"
Cohesion: 0.17
Nodes (31): addRepo(), client(), closeFile(), connect(), discoverVaults(), editTaskFields(), emptyState(), formatSize() (+23 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, Working on it, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check (+15 more)

### Community 14 - "suggestBox"
Cohesion: 0.14
Nodes (27): fillTopTasks(), loadSuggestions(), returnFromWaiting(), suggestBox(), blank(), byOrder(), fieldValue(), isoDay() (+19 more)

### Community 15 - ".has"
Cohesion: 0.29
Nodes (12): markInboxSeen(), assigneeOptions(), keptResolved(), mentionKey(), resolveAllSeen(), seenList(), shownSeen(), sortAssignments() (+4 more)

### Community 16 - "checkInboxDot"
Cohesion: 0.21
Nodes (20): baseCache(), baseNotes(), checkInboxDot(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates() (+12 more)

### Community 17 - "LocalSource"
Cohesion: 0.15
Nodes (4): decode(), FolderFiles, LocalError, LocalSource

### Community 18 - "toast"
Cohesion: 0.10
Nodes (44): afterOutsideChange(), applyPreviewEdit(), checkDraft(), confirmDialog(), copyStatus(), copyText(), downloadCopy(), draftKey() (+36 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.22
Nodes (4): errors, offsite, errors, remote

### Community 20 - "languageFor"
Cohesion: 0.33
Nodes (6): iconFor(), kindOf(), hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.15
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "./src/local.js"
Cohesion: 0.33
Nodes (3): errors, remote, ./src/local.js

### Community 23 - "fieldProp"
Cohesion: 0.16
Nodes (28): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeSamples(), summary(), word(), overviewCaptures(), overviewRows() (+20 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.13
Nodes (24): addLocalVault(), sync(), cleanName(), canPickFolder(), crc32(), dosTime(), emptyVault(), encode() (+16 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "puppeteer-core"
Cohesion: 0.33
Nodes (5): puppeteer-core, devDependencies, puppeteer-core, private, type

### Community 28 - "sprintBox"
Cohesion: 0.32
Nodes (13): amount(), fillBoards(), isSprintNote(), otherSprintBox(), shortDay(), sprintBox(), sprintField(), sprintList() (+5 more)

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "fill"
Cohesion: 0.26
Nodes (17): baseName(), blobUrl(), ensureSidebar(), fileRow(), fileView(), fill(), markActive(), openFile() (+9 more)

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

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.40
Nodes (5): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "applyMode"
Cohesion: 0.18
Nodes (16): addImage(), applyMode(), assigneeList(), canWrite(), columnName(), isWide(), loadCollaborators(), loadPeople() (+8 more)

### Community 48 - "mirror.js"
Cohesion: 0.14
Nodes (12): BrowserFiles, db(), done(), fileKey(), folderOf(), forgetFolder(), idb(), keepFolder() (+4 more)

### Community 49 - "mirror.js"
Cohesion: 0.33
Nodes (7): keptAtOnce(), enc(), fakeGitHub(), memoryFiles(), mirrorWith(), repo, synced()

### Community 51 - "README.md"
Cohesion: 0.18
Nodes (9): A look inside, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done, 🗺️ Roadmap (+1 more)

### Community 52 - "vault.js"
Cohesion: 0.10
Nodes (31): linkMarks(), assetConflicts(), assetsOverlap(), blankOut(), captureAttachment(), cleanFolder(), cleanValues(), dirOf() (+23 more)

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./src/github.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 337 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `.state` to `mirror.js`, `mirror.js`, `app.js`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitHub` be split into smaller, more focused modules?**
  _Cohesion score 0.13306451612903225 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `vault.js` to `app.js`, `h`, `inbox-overview.js`, `vault.test.js`, `task_commits.py`, `toast`, `vault.js`, `fieldProp`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `showSettings()` (e.g. with `goBack()` and `.folderName()`) actually correct?**
  _`showSettings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._