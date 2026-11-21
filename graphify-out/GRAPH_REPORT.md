# Graph Report - NotesApp  (2026-11-21)

## Corpus Check
- 47 files · ~123,334 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1075 nodes · 3418 edges · 51 communities (46 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `69b6b22f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub
- .state
- run.mjs
- app.js
- editor.js
- bases.js
- shownName
- toLf
- inbox-overview.js
- vault.test.js
- vault.js
- renderLocalNote
- icon
- task_commits.py
- showSettings
- h
- Mirror
- checkInboxDot
- renderHeader
- ref_node_assert
- LocalSource
- version-switch.mjs
- linkName
- fieldProp
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- puppeteer-core
- ./src/local.js
- ai-time.mjs
- renderTree
- capture-attachments.mjs
- package.json
- NavWidget
- csv.js
- realFile
- local-load.mjs
- newtasks.mjs
- wait
- createEditor
- icons.js
- contentsUrl
- languageFor
- sw.js
- log
- ai-time.js
- asNewTask
- idb
- mirror.js
- README.md

## God Nodes (most connected - your core abstractions)
1. `h()` - 84 edges
2. `renderPreview()` - 48 edges
3. `icon()` - 45 edges
4. `Mirror` - 43 edges
5. `showSettings()` - 41 edges
6. `toast()` - 40 edges
7. `start()` - 39 edges
8. `shownName()` - 34 edges
9. `route()` - 34 edges
10. `join()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Working on it` --references--> `icon()`  [INFERRED]
  CLAUDE.md → src/icons.js
- `Rules` --references--> `toLf()`  [INFERRED]
  CLAUDE.md → src/vault.js
- `Version switch check` --references--> `main()`  [INFERRED]
  tests/e2e/README.md → tools/task-commits/task_commits.py
- `Working on it` --references--> `modal()`  [INFERRED]
  CLAUDE.md → src/app.js
- `Rules` --references--> `main()`  [INFERRED]
  CLAUDE.md → tools/task-commits/task_commits.py

## Import Cycles
- None detected.

## Communities (51 total, 5 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.14
Nodes (8): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, GitHubError, newTokenUrl(), ownerOfPath()

### Community 1 - ".state"
Cohesion: 0.18
Nodes (6): blobSha(), dec(), enc(), hidden(), prefixOf(), unreachable()

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (47): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+39 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (63): amount(), app, ATTENTION_TITLES, baseCaches, baseLoads, BINARY, blobUrls, checkForNewer() (+55 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.08
Nodes (51): loadBase(), pageText(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths() (+43 more)

### Community 6 - "shownName"
Cohesion: 0.15
Nodes (35): Working on it, addImage(), addSubtask(), assignmentEdits(), changeTask(), claimSuggested(), cleanDir(), clearWaitingDate() (+27 more)

### Community 7 - "toLf"
Cohesion: 0.13
Nodes (26): addComment(), addNewTask(), blockContents(), captureAttachmentText(), claimTask(), commentHeader(), commentReply(), editNewTask() (+18 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.06
Nodes (63): embeddedPart(), norm(), allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewCaptures(), overviewContents() (+55 more)

### Community 9 - "vault.test.js"
Cohesion: 0.09
Nodes (24): addDays(), inboxCandidates(), isoDay(), isWaiting(), MARKER, markerText(), mergeMarker(), nextSprint() (+16 more)

### Community 10 - "vault.js"
Cohesion: 0.09
Nodes (37): lookWith(), linkMarks(), assigneeOptions(), blankOut(), captureAttachment(), cleanFolder(), cleanValues(), findNavBlock() (+29 more)

### Community 11 - "renderLocalNote"
Cohesion: 0.25
Nodes (11): afterOutsideChange(), checkDraft(), draftKey(), hasCaptureDraft(), mayLeave(), parseHash(), reloadFromGitHub(), renderLocalNote() (+3 more)

### Community 12 - "icon"
Cohesion: 0.26
Nodes (20): addRepo(), closeFile(), discoverVaults(), editTaskFields(), emptyState(), guestSteps(), join(), loadAccess() (+12 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (22): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+14 more)

### Community 14 - "showSettings"
Cohesion: 0.12
Nodes (41): addLocalVault(), sync(), cleanName(), client(), connect(), copyField(), downloadCopy(), ensureSidebar() (+33 more)

### Community 15 - "h"
Cohesion: 0.16
Nodes (33): baseCell(), baseTable(), baseView(), cellText(), commitsBox(), decorate(), fillAppBlocks(), fillBases() (+25 more)

### Community 16 - "Mirror"
Cohesion: 0.26
Nodes (3): folderOf(), Mirror, mirrorId()

### Community 17 - "checkInboxDot"
Cohesion: 0.20
Nodes (21): attentionBox(), baseCache(), baseNotes(), checkInboxDot(), chunks(), fillAttention(), inboxAttention(), inParallel() (+13 more)

### Community 18 - "renderHeader"
Cohesion: 0.12
Nodes (31): applyMode(), applyPreviewEdit(), assigneeList(), canWrite(), columnName(), copyStatus(), fillComments(), flushDraft() (+23 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.14
Nodes (6): errors, offsite, errors, remote, skills, vault

### Community 20 - "LocalSource"
Cohesion: 0.14
Nodes (4): decode(), FolderFiles, LocalError, LocalSource

### Community 21 - "version-switch.mjs"
Cohesion: 0.15
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "linkName"
Cohesion: 0.40
Nodes (6): addRelation(), dirOf(), fieldValue(), findTask(), linkName(), pick()

### Community 23 - "fieldProp"
Cohesion: 0.15
Nodes (34): loadSuggestions(), assigneeMatches(), assignmentTasks(), blank(), blockedTasks(), boardColumns(), byOrder(), claimedTasks() (+26 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.15
Nodes (20): crc32(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, EXAMPLE_VAULTS, fetchExample() (+12 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "puppeteer-core"
Cohesion: 0.17
Nodes (8): puppeteer-core, docs, errors, requests, devDependencies, puppeteer-core, private, type

### Community 28 - "./src/local.js"
Cohesion: 0.17
Nodes (5): errors, remote, errors, remote, ./src/local.js

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "renderTree"
Cohesion: 0.23
Nodes (15): baseName(), blobUrl(), dirName(), fileRow(), fileView(), iconFor(), kindOf(), markActive() (+7 more)

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

### Community 43 - "languageFor"
Cohesion: 0.67
Nodes (3): languageFor(), languageMaker(), own()

### Community 47 - "ai-time.js"
Cohesion: 0.33
Nodes (10): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+2 more)

### Community 48 - "asNewTask"
Cohesion: 0.22
Nodes (18): asNewTask(), fillBoards(), isSprintNote(), loadTaskSetup(), otherSprintBox(), shortDay(), sprintBox(), sprintField() (+10 more)

### Community 49 - "idb"
Cohesion: 0.18
Nodes (10): BrowserFiles, db(), done(), fileKey(), forgetFolder(), idb(), keepFolder(), vaultRange() (+2 more)

### Community 50 - "mirror.js"
Cohesion: 0.33
Nodes (7): keptAtOnce(), enc(), fakeGitHub(), memoryFiles(), mirrorWith(), repo, synced()

### Community 51 - "README.md"
Cohesion: 0.18
Nodes (9): A look inside, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done, 🗺️ Roadmap (+1 more)

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./src/github.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 336 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `Mirror` to `idb`, `mirror.js`, `app.js`, `.state`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitHub` be split into smaller, more focused modules?**
  _Cohesion score 0.13978494623655913 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `toLf` to `app.js`, `shownName`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `renderHeader`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `showSettings()` (e.g. with `goBack()` and `.folderName()`) actually correct?**
  _`showSettings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.028985507246376812 - nodes in this community are weakly interconnected._