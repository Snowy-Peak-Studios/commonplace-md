# Graph Report - NotesApp  (2026-11-22)

## Corpus Check
- 55 files · ~137,982 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1167 nodes · 3728 edges · 52 communities (48 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b3e072ed`
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
- vault.test.js
- inbox-overview.js
- build.mjs
- vault.js
- markdown.js
- showSettings
- task_commits.py
- loadSuggestions
- .has
- renderHeader
- LocalSource
- isLocal
- ref_node_assert
- languageFor
- version-switch.mjs
- ./src/local.js
- renderTree
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- puppeteer-core
- h
- ai-time.mjs
- restore.mjs
- capture-attachments.mjs
- package.json
- NavWidget
- csv.js
- realFile
- checkInboxDot
- local-load.mjs
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
- start

## God Nodes (most connected - your core abstractions)
1. `h()` - 87 edges
2. `renderPreview()` - 50 edges
3. `icon()` - 48 edges
4. `Mirror` - 45 edges
5. `toast()` - 42 edges
6. `start()` - 42 edges
7. `showSettings()` - 41 edges
8. `shownName()` - 37 edges
9. `fill()` - 35 edges
10. `join()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Working on it` --references--> `modal()`  [INFERRED]
  CLAUDE.md → src/app.js
- `Rules` --references--> `toLf()`  [INFERRED]
  CLAUDE.md → src/vault.js
- `Version switch check` --references--> `main()`  [INFERRED]
  tests/e2e/README.md → tools/task-commits/task_commits.py
- `Working on it` --references--> `icon()`  [INFERRED]
  CLAUDE.md → src/icons.js
- `Rules` --references--> `main()`  [INFERRED]
  CLAUDE.md → tools/task-commits/task_commits.py

## Import Cycles
- None detected.

## Communities (52 total, 4 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.15
Nodes (7): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, newTokenUrl(), ownerOfPath()

### Community 1 - "Mirror"
Cohesion: 0.07
Nodes (31): blobSha(), BrowserFiles, db(), fileKey(), filesAndMeta(), folderOf(), folderPermission(), forgetFolder() (+23 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (49): sprintChoices(), claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff (+41 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (58): app, assetLoads, ATTENTION_TITLES, baseCaches, baseCell(), baseLoads, baseTable(), BINARY (+50 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.09
Nodes (48): arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues(), context() (+40 more)

### Community 6 - "icon"
Cohesion: 0.18
Nodes (27): Working on it, addRepo(), closeFile(), discoverVaults(), emptyState(), guestSteps(), hasCaptureDraft(), hrefFor() (+19 more)

### Community 7 - "vault.test.js"
Cohesion: 0.08
Nodes (48): addDays(), addNewTask(), assetConflicts(), assetList(), assetOptions(), assetsOverlap(), blockContents(), captureAttachmentText() (+40 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.13
Nodes (31): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewContents(), overviewEach(), overviewOptions(), overviewOwnerProblem() (+23 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (12): EXAMPLE_VAULTS, html, esbuild, files, out, root, walk(), zipName (+4 more)

### Community 10 - "vault.js"
Cohesion: 0.09
Nodes (31): lookWith(), ASSIGNMENT_ID, captureAttachment(), cleanFolder(), cleanValues(), CUSTOM_KINDS, dirOf(), ESTIMATE_UNITS (+23 more)

### Community 11 - "markdown.js"
Cohesion: 0.07
Nodes (44): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS (+36 more)

### Community 12 - "showSettings"
Cohesion: 0.14
Nodes (29): addLocalVault(), sync(), cleanName(), client(), confirmDialog(), connect(), copyField(), copyText() (+21 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+15 more)

### Community 14 - "loadSuggestions"
Cohesion: 0.31
Nodes (11): loadSuggestions(), byOrder(), isEpic(), isTaskPath(), isWaiting(), rank(), sprintSuggestions(), suggestTasks() (+3 more)

### Community 15 - ".has"
Cohesion: 0.22
Nodes (14): markInboxSeen(), resolveInboxSeen(), assigneeOptions(), keptResolved(), LinkIndex, mentionKey(), resolveAllSeen(), seenList() (+6 more)

### Community 16 - "renderHeader"
Cohesion: 0.13
Nodes (27): applyPreviewEdit(), assigneeList(), checkInboxDot(), copyStatus(), fillComments(), findOwnInbox(), flushDraft(), inboxOf() (+19 more)

### Community 17 - "LocalSource"
Cohesion: 0.13
Nodes (4): GitHubError, FolderFiles, LocalError, LocalSource

### Community 18 - "isLocal"
Cohesion: 0.18
Nodes (24): addImage(), addSubtask(), chunks(), cleanDir(), fileAddresses(), fillNewTasks(), fullPath(), inParallel() (+16 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.15
Nodes (6): errors, offsite, errors, remote, skills, vault

### Community 20 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.18
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "./src/local.js"
Cohesion: 0.17
Nodes (5): errors, remote, errors, remote, ./src/local.js

### Community 23 - "renderTree"
Cohesion: 0.42
Nodes (9): baseName(), dirName(), fileRow(), iconFor(), kindOf(), markActive(), renderMatches(), renderTree() (+1 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.18
Nodes (8): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js

### Community 25 - "local.js"
Cohesion: 0.11
Nodes (27): crc32(), decode(), done(), dosTime(), EXAMPLE_FILES, EXAMPLE_SETTINGS, fetchExample(), fromBase64() (+19 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.16
Nodes (8): action(), docs(), errors, requests, row(), task(), writes, ./src/inbox-overview.js

### Community 27 - "puppeteer-core"
Cohesion: 0.17
Nodes (7): puppeteer-core, errors, remote, devDependencies, puppeteer-core, private, type

### Community 28 - "h"
Cohesion: 0.24
Nodes (20): afterOutsideChange(), blobUrl(), checkDraft(), downloadCopy(), draftKey(), fileView(), fillImages(), fillInboxOverview() (+12 more)

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "restore.mjs"
Cohesion: 0.12
Nodes (6): BROWSERS, DIR, errors, offsite, tmp, ./vendor/vendor.js

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

### Community 36 - "checkInboxDot"
Cohesion: 0.47
Nodes (10): baseCache(), baseNotes(), inboxAttention(), keepBaseCache(), loadQuestions(), noteMentions(), readNotes(), readTaskAssets() (+2 more)

### Community 37 - "local-load.mjs"
Cohesion: 0.33
Nodes (5): BIG, BIG_MB, errors, NOTES, offsite

### Community 38 - "local.test.js"
Cohesion: 0.24
Nodes (8): emptyVault(), encode(), standInSha(), withLocal(), enc(), memoryFiles(), source(), vault

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.33
Nodes (6): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), linkMarks(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "export-pdf.mjs"
Cohesion: 0.33
Nodes (3): docs, errors, requests

### Community 47 - "ai-time.js"
Cohesion: 0.19
Nodes (24): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeSamples(), summary(), word(), overviewCaptures(), overviewRows() (+16 more)

### Community 50 - "renderPreview"
Cohesion: 0.07
Nodes (78): aiTimeLabel(), addRelation(), aiEstimateField(), amount(), asNewTask(), assetsBox(), assignmentEdits(), attentionBox() (+70 more)

### Community 51 - "README.md"
Cohesion: 0.18
Nodes (9): A look inside, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done, 🗺️ Roadmap (+1 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 54 - "start"
Cohesion: 0.14
Nodes (24): addPackedExample(), applyMode(), baseView(), canWrite(), closeSideOnPhone(), columnName(), debounce(), fillBases() (+16 more)

## Knowledge Gaps
- **3 isolated node(s):** `RFC-4180`, `./src/github.js`, `./vendor/vendor.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 363 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `Mirror` to `app.js`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js`, `./vendor/vendor.js` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.07429718875502007 - nodes in this community are weakly interconnected._
- **Why does `puppeteer-core` connect `puppeteer-core` to `run.mjs`, `local-load.mjs`, `export-pdf.mjs`, `ref_node_assert`, `version-switch.mjs`, `./src/local.js`, `inbox-overview.mjs`, `inbox-overview-bindings.mjs`, `ai-time.mjs`, `restore.mjs`, `capture-attachments.mjs`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.028169014084507043 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `vault.test.js` to `app.js`, `inbox-overview.js`, `vault.js`, `markdown.js`, `task_commits.py`, `ai-time.js`, `renderHeader`, `renderPreview`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._