# Graph Report - NotesApp  (2026-11-22)

## Corpus Check
- 53 files · ~133,534 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1140 nodes · 3655 edges · 54 communities (50 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `00230945`
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
- build.mjs
- vault.js
- markdown.js
- icon
- task_commits.py
- .resolve
- .has
- attentionBox
- LocalSource
- toast
- ref_node_fs
- languageFor
- version-switch.mjs
- ref_node_assert
- openOverviewSetup
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- puppeteer-core
- BrowserFiles
- ai-time.mjs
- renderTree
- capture-attachments.mjs
- package.json
- NavWidget
- csv.js
- realFile
- checkInboxDot
- local-load.mjs
- addLocalVault
- wait
- createEditor
- icons.js
- contentsUrl
- store.js
- sw.js
- log
- ai-time.js
- mirror.js
- mirror.js
- noteProps
- README.md
- printNote
- start

## God Nodes (most connected - your core abstractions)
1. `h()` - 86 edges
2. `renderPreview()` - 50 edges
3. `icon()` - 47 edges
4. `Mirror` - 45 edges
5. `toast()` - 42 edges
6. `start()` - 42 edges
7. `showSettings()` - 41 edges
8. `shownName()` - 37 edges
9. `join()` - 35 edges
10. `fill()` - 34 edges

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

## Communities (54 total, 4 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.14
Nodes (9): blobSha(), decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, GitHubError, newTokenUrl() (+1 more)

### Community 1 - ".state"
Cohesion: 0.19
Nodes (6): dec(), enc(), hidden(), Mirror, prefixOf(), unreachable()

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (47): claimedNotes, commitWrites, copyRepo, created, currentView, diff, doneTasks, errors (+39 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (52): app, assetLoads, assigneeList(), ATTENTION_TITLES, attentionBox(), baseCaches, baseLoads, BINARY (+44 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.09
Nodes (49): loadBase(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues() (+41 more)

### Community 6 - "h"
Cohesion: 0.11
Nodes (40): assetsBox(), baseCell(), baseTable(), cellText(), claimWarning(), commitsBox(), copyText(), decorate() (+32 more)

### Community 7 - "vault.js"
Cohesion: 0.15
Nodes (23): asNewTask(), embeddedPart(), norm(), addComment(), addNewTask(), captureAttachmentText(), claimTask(), editNewTask() (+15 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.17
Nodes (33): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewCaptures(), overviewContents(), overviewEach(), overviewOptions() (+25 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (12): EXAMPLE_VAULTS, html, esbuild, files, out, root, walk(), zipName (+4 more)

### Community 10 - "vault.js"
Cohesion: 0.05
Nodes (73): loadPeople(), lookWith(), setupImageTools(), addDays(), assetConflicts(), assetList(), assetOptions(), assetsOverlap() (+65 more)

### Community 11 - "markdown.js"
Cohesion: 0.06
Nodes (40): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS (+32 more)

### Community 12 - "icon"
Cohesion: 0.14
Nodes (38): Working on it, addRepo(), blobUrl(), client(), closeFile(), connect(), discoverVaults(), editTaskFields() (+30 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (22): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+14 more)

### Community 14 - ".resolve"
Cohesion: 0.17
Nodes (27): loadSuggestions(), done(), assigneeMatches(), assignmentTasks(), blank(), boardColumns(), byOrder(), claimedTasks() (+19 more)

### Community 15 - ".has"
Cohesion: 0.29
Nodes (11): markInboxSeen(), keptResolved(), LinkIndex, mentionKey(), resolveAllSeen(), seenList(), shownSeen(), sortAssignments() (+3 more)

### Community 16 - "attentionBox"
Cohesion: 0.33
Nodes (13): amount(), fillBoards(), isSprintNote(), otherSprintBox(), shortDay(), sprintBox(), sprintField(), sprintList() (+5 more)

### Community 17 - "LocalSource"
Cohesion: 0.15
Nodes (4): decode(), FolderFiles, LocalError, LocalSource

### Community 18 - "toast"
Cohesion: 0.14
Nodes (39): addImage(), addSubtask(), afterOutsideChange(), applyPreviewEdit(), checkDraft(), copyStatus(), downloadCopy(), draftKey() (+31 more)

### Community 19 - "ref_node_fs"
Cohesion: 0.17
Nodes (4): errors, remote, errors, remote

### Community 20 - "languageFor"
Cohesion: 0.33
Nodes (6): iconFor(), kindOf(), hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.12
Nodes (10): BROWSERS, DIR, errors, offsite, PORT, ROOT, server, tag() (+2 more)

### Community 22 - "ref_node_assert"
Cohesion: 0.14
Nodes (8): errors, remote, docs, errors, requests, errors, offsite, ./src/local.js

### Community 23 - "openOverviewSetup"
Cohesion: 0.29
Nodes (13): ensureSidebar(), fillInboxOverview(), findOwnInbox(), inboxOf(), loadOverviewModule(), loadTree(), loginFor(), openOverviewSetup() (+5 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.13
Nodes (22): crc32(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, fetchExample(), folderPermission() (+14 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "puppeteer-core"
Cohesion: 0.17
Nodes (7): puppeteer-core, errors, remote, devDependencies, puppeteer-core, private, type

### Community 28 - "BrowserFiles"
Cohesion: 0.24
Nodes (5): BrowserFiles, db(), fileKey(), filesAndMeta(), vaultRange()

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "renderTree"
Cohesion: 0.46
Nodes (8): baseName(), dirName(), fileRow(), markActive(), renderMatches(), renderTree(), searchText(), build()

### Community 31 - "capture-attachments.mjs"
Cohesion: 0.25
Nodes (5): errors, fill(), paste(), remote, field()

### Community 32 - "package.json"
Cohesion: 0.25
Nodes (7): description, license, name, private, scripts, test, type

### Community 33 - "NavWidget"
Cohesion: 0.25
Nodes (5): navDecorations(), navField, navRange(), NavWidget, findNavBlock()

### Community 34 - "csv.js"
Cohesion: 0.52
Nodes (5): RFC-4180, detectDelimiter(), parseCsv(), serializeCsv(), roundTrip()

### Community 35 - "realFile"
Cohesion: 0.29
Nodes (7): encPath(), folderNotes(), ghGet(), gql(), json(), realFile(), realNotes()

### Community 36 - "checkInboxDot"
Cohesion: 0.28
Nodes (16): baseCache(), baseNotes(), checkInboxDot(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates() (+8 more)

### Community 37 - "local-load.mjs"
Cohesion: 0.33
Nodes (5): BIG, BIG_MB, errors, NOTES, offsite

### Community 38 - "addLocalVault"
Cohesion: 0.33
Nodes (9): addLocalVault(), sync(), cleanName(), copyField(), noFolderText(), pickCopyFolder(), pickFolder(), canPickFolder() (+1 more)

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.33
Nodes (6): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), linkMarks(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "store.js"
Cohesion: 0.31
Nodes (5): migrateInboxOverview(), migratePrefix(), store, upgradeInboxOverview(), upgradeRepo()

### Community 47 - "ai-time.js"
Cohesion: 0.23
Nodes (16): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+8 more)

### Community 48 - "mirror.js"
Cohesion: 0.22
Nodes (5): folderOf(), forgetFolder(), idb(), keepFolder(), mirrorId()

### Community 49 - "mirror.js"
Cohesion: 0.21
Nodes (13): BINARY, eachAtMost(), HASH_AT_ONCE, keptAtOnce(), keptShas(), persist(), plan(), enc() (+5 more)

### Community 50 - "noteProps"
Cohesion: 0.17
Nodes (30): addRelation(), assignmentEdits(), changeTask(), claimSuggested(), clearWaitingDate(), confirmDialog(), editBoardCard(), fillTopTasks() (+22 more)

### Community 51 - "README.md"
Cohesion: 0.18
Nodes (9): A look inside, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done, 🗺️ Roadmap (+1 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 54 - "start"
Cohesion: 0.15
Nodes (25): addPackedExample(), applyMode(), baseView(), canWrite(), closeSideOnPhone(), columnName(), debounce(), fill() (+17 more)

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./src/github.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 351 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `.state` to `mirror.js`, `mirror.js`, `app.js`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitHub` be split into smaller, more focused modules?**
  _Cohesion score 0.13709677419354838 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `vault.js` to `app.js`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `toast`, `noteProps`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.028985507246376812 - nodes in this community are weakly interconnected._
- **Why does `Rules` connect `task_commits.py` to `vault.js`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._