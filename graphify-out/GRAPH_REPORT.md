# Graph Report - NotesApp  (2026-11-22)

## Corpus Check
- 49 files · ~131,083 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1116 nodes · 3603 edges · 54 communities (49 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5cdd4f76`
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
- vault.js
- markdown.js
- icon
- task_commits.py
- suggestBox
- .has
- attentionBox
- LocalSource
- toast
- ref_node_assert
- languageFor
- version-switch.mjs
- ./src/local.js
- showSettings
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- puppeteer-core
- BrowserFiles
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
- loadSuggestions
- sw.js
- log
- ai-time.js
- mirror.js
- mirror.js
- noteProps
- README.md
- printNote
- answered-questions.mjs

## God Nodes (most connected - your core abstractions)
1. `h()` - 87 edges
2. `renderPreview()` - 50 edges
3. `icon()` - 47 edges
4. `Mirror` - 45 edges
5. `toast()` - 41 edges
6. `showSettings()` - 41 edges
7. `start()` - 39 edges
8. `shownName()` - 37 edges
9. `join()` - 35 edges
10. `fill()` - 34 edges

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

## Communities (54 total, 5 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.16
Nodes (6): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, ownerOfPath()

### Community 1 - ".state"
Cohesion: 0.19
Nodes (6): dec(), enc(), hidden(), Mirror, prefixOf(), unreachable()

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+40 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (58): app, assetLoads, ATTENTION_TITLES, baseCaches, baseLoads, BINARY, blobUrls, checkForNewer() (+50 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.07
Nodes (66): baseCache(), baseNotes(), baseView(), chunks(), fillBases(), inboxAttention(), inParallel(), keepBaseCache() (+58 more)

### Community 6 - "h"
Cohesion: 0.14
Nodes (42): addImage(), assetsBox(), baseCell(), baseTable(), canWrite(), cellText(), claimWarning(), commitsBox() (+34 more)

### Community 7 - "vault.js"
Cohesion: 0.10
Nodes (38): asNewTask(), embeddedPart(), norm(), linkMarks(), overviewCaptures(), addComment(), addNewTask(), blankOut() (+30 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.13
Nodes (33): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewContents(), overviewEach(), overviewOptions(), overviewOwnerProblem() (+25 more)

### Community 9 - "vault.test.js"
Cohesion: 0.08
Nodes (26): addDays(), assetList(), assetOptions(), blockContents(), defaultNote(), githubFileUrl(), inboxCandidates(), MARKER (+18 more)

### Community 10 - "vault.js"
Cohesion: 0.12
Nodes (25): lookWith(), captureAttachment(), cleanFolder(), cleanValues(), dirOf(), IMAGE_TYPES, imageAttachment(), isFieldProp() (+17 more)

### Community 11 - "markdown.js"
Cohesion: 0.07
Nodes (37): insertEntry(), filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions() (+29 more)

### Community 12 - "icon"
Cohesion: 0.17
Nodes (27): addLocalVault(), sync(), addRepo(), cleanName(), closeFile(), copyField(), discoverVaults(), emptyState() (+19 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (22): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+14 more)

### Community 14 - "suggestBox"
Cohesion: 0.18
Nodes (25): assigneeMatches(), assignmentTasks(), blockedTasks(), boardColumns(), byOrder(), claimedTasks(), fieldProp(), foldName() (+17 more)

### Community 15 - ".has"
Cohesion: 0.25
Nodes (12): markInboxSeen(), assigneeOptions(), keptResolved(), LinkIndex, mentionKey(), resolveAllSeen(), seenList(), shownSeen() (+4 more)

### Community 16 - "attentionBox"
Cohesion: 0.20
Nodes (20): amount(), attentionBox(), fillAttention(), fillBoards(), isSprintNote(), loadAssignments(), loadReviews(), loadTaskSetup() (+12 more)

### Community 17 - "LocalSource"
Cohesion: 0.12
Nodes (7): GitHubError, db(), decode(), fetchExample(), FolderFiles, LocalError, LocalSource

### Community 18 - "toast"
Cohesion: 0.10
Nodes (41): afterOutsideChange(), applyMode(), applyPreviewEdit(), checkDraft(), columnName(), copyStatus(), downloadCopy(), draftKey() (+33 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.22
Nodes (4): errors, offsite, errors, remote

### Community 20 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.15
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "./src/local.js"
Cohesion: 0.33
Nodes (3): errors, remote, ./src/local.js

### Community 23 - "showSettings"
Cohesion: 0.13
Nodes (36): checkInboxDot(), client(), connect(), editTaskFields(), ensureSidebar(), fill(), fillInboxOverview(), findOwnInbox() (+28 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.16
Nodes (19): crc32(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, EXAMPLE_VAULTS, folderPermission() (+11 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "puppeteer-core"
Cohesion: 0.33
Nodes (5): puppeteer-core, devDependencies, puppeteer-core, private, type

### Community 28 - "BrowserFiles"
Cohesion: 0.28
Nodes (4): BrowserFiles, fileKey(), filesAndMeta(), vaultRange()

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "fill"
Cohesion: 0.28
Nodes (13): baseName(), blobUrl(), dirName(), fileRow(), fileView(), iconFor(), kindOf(), markActive() (+5 more)

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

### Community 41 - "icons.js"
Cohesion: 0.33
Nodes (3): build(), cache, fillIcons()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "loadSuggestions"
Cohesion: 0.18
Nodes (19): loadSuggestions(), returnFromWaiting(), assetConflicts(), assetsOverlap(), blank(), isEpic(), isoDay(), isTaskPath() (+11 more)

### Community 47 - "ai-time.js"
Cohesion: 0.31
Nodes (11): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+3 more)

### Community 48 - "mirror.js"
Cohesion: 0.20
Nodes (6): done(), folderOf(), forgetFolder(), idb(), keepFolder(), mirrorId()

### Community 49 - "mirror.js"
Cohesion: 0.21
Nodes (14): blobSha(), BINARY, eachAtMost(), HASH_AT_ONCE, keptAtOnce(), keptShas(), persist(), plan() (+6 more)

### Community 50 - "noteProps"
Cohesion: 0.15
Nodes (32): Working on it, addRelation(), addSubtask(), assigneeList(), assignmentEdits(), changeTask(), claimSuggested(), cleanDir() (+24 more)

### Community 51 - "README.md"
Cohesion: 0.18
Nodes (9): A look inside, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done, 🗺️ Roadmap (+1 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./src/github.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 338 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `.state` to `mirror.js`, `mirror.js`, `app.js`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `vault.js` to `app.js`, `inbox-overview.js`, `vault.test.js`, `vault.js`, `task_commits.py`, `toast`, `noteProps`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04632768361581921 - nodes in this community are weakly interconnected._
- **Why does `Rules` connect `task_commits.py` to `vault.js`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._