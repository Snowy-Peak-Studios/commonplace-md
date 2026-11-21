# Graph Report - NotesApp  (2026-11-21)

## Corpus Check
- 47 files · ~127,997 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1105 nodes · 3552 edges · 53 communities (48 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2b4f2047`
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
- checkInboxDot
- LocalSource
- toast
- settings-scroll.mjs
- languageFor
- version-switch.mjs
- ./src/local.js
- openOverviewSetup
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
- ref_node_assert
- wait
- createEditor
- icons.js
- contentsUrl
- renderPreview
- sw.js
- log
- imageAttachment
- mirror.js
- mirror.js
- noteProps
- README.md
- printNote

## God Nodes (most connected - your core abstractions)
1. `h()` - 86 edges
2. `renderPreview()` - 50 edges
3. `icon()` - 47 edges
4. `Mirror` - 45 edges
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

## Communities (53 total, 5 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.14
Nodes (8): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, GitHubError, newTokenUrl(), ownerOfPath()

### Community 1 - ".state"
Cohesion: 0.19
Nodes (6): dec(), enc(), hidden(), Mirror, prefixOf(), unreachable()

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+40 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (57): app, assetLoads, ATTENTION_TITLES, baseCaches, baseCell(), baseLoads, baseTable(), baseView() (+49 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.09
Nodes (49): loadBase(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues() (+41 more)

### Community 6 - "h"
Cohesion: 0.15
Nodes (40): addRelation(), amount(), assetsBox(), assignmentEdits(), claimWarning(), commitsBox(), editBoardCard(), fillBoards() (+32 more)

### Community 7 - "vault.js"
Cohesion: 0.10
Nodes (38): asNewTask(), embeddedPart(), norm(), linkMarks(), overviewCaptures(), addComment(), addNewTask(), blankOut() (+30 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.09
Nodes (43): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+35 more)

### Community 9 - "vault.test.js"
Cohesion: 0.07
Nodes (34): addDays(), assetList(), assetOptions(), blockContents(), defaultNote(), fieldValue(), findTask(), githubFileUrl() (+26 more)

### Community 10 - "vault.js"
Cohesion: 0.09
Nodes (33): returnFromWaiting(), assetConflicts(), assetsOverlap(), ASSIGNMENT_ID, cleanFolder(), cleanValues(), CUSTOM_KINDS, dirOf() (+25 more)

### Community 11 - "markdown.js"
Cohesion: 0.10
Nodes (28): APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS, attentionOptions(), boardOptions(), CALLOUT_ICONS, calloutRule(), createMarkdown() (+20 more)

### Community 12 - "icon"
Cohesion: 0.12
Nodes (44): addLocalVault(), sync(), addRepo(), cleanName(), client(), closeFile(), connect(), copyField() (+36 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, Working on it, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check (+15 more)

### Community 14 - "suggestBox"
Cohesion: 0.16
Nodes (33): loadSuggestions(), assigneeMatches(), assignmentTasks(), blank(), blockedTasks(), boardColumns(), byOrder(), claimedTasks() (+25 more)

### Community 15 - ".has"
Cohesion: 0.24
Nodes (13): markInboxSeen(), assigneeOptions(), keptResolved(), LinkIndex, mentionKey(), resolveAllSeen(), seenList(), shownSeen() (+5 more)

### Community 16 - "checkInboxDot"
Cohesion: 0.19
Nodes (22): baseCache(), baseNotes(), checkInboxDot(), chunks(), inboxAttention(), inParallel(), isSprintNote(), keepBaseCache() (+14 more)

### Community 17 - "LocalSource"
Cohesion: 0.15
Nodes (4): decode(), FolderFiles, LocalError, LocalSource

### Community 18 - "toast"
Cohesion: 0.16
Nodes (29): addImage(), afterOutsideChange(), checkDraft(), copyStatus(), copyText(), downloadCopy(), draftKey(), fileAddresses() (+21 more)

### Community 20 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.15
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "./src/local.js"
Cohesion: 0.33
Nodes (3): errors, remote, ./src/local.js

### Community 23 - "openOverviewSetup"
Cohesion: 0.21
Nodes (15): assigneeList(), fillInboxOverview(), findOwnInbox(), inboxOf(), loadCollaborators(), loadOverviewModule(), loginFor(), openOverviewSetup() (+7 more)

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
Nodes (7): puppeteer-core, errors, remote, devDependencies, puppeteer-core, private, type

### Community 28 - "BrowserFiles"
Cohesion: 0.24
Nodes (5): BrowserFiles, db(), fileKey(), filesAndMeta(), vaultRange()

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "fill"
Cohesion: 0.20
Nodes (17): baseName(), blobUrl(), dirName(), fileRow(), fileView(), iconFor(), kindOf(), markActive() (+9 more)

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

### Community 43 - "renderPreview"
Cohesion: 0.16
Nodes (23): applyMode(), applyPreviewEdit(), canWrite(), columnName(), fillAppBlocks(), fillComments(), fillEmbeds(), fillNewTasks() (+15 more)

### Community 47 - "imageAttachment"
Cohesion: 0.32
Nodes (8): lookWith(), captureAttachment(), imageAttachment(), isImagePath(), markerDir(), parseMarker(), repoKey(), reposToCheck()

### Community 48 - "mirror.js"
Cohesion: 0.20
Nodes (6): done(), folderOf(), forgetFolder(), idb(), keepFolder(), mirrorId()

### Community 49 - "mirror.js"
Cohesion: 0.21
Nodes (14): blobSha(), BINARY, eachAtMost(), HASH_AT_ONCE, keptAtOnce(), keptShas(), persist(), plan() (+6 more)

### Community 50 - "noteProps"
Cohesion: 0.18
Nodes (24): addSubtask(), attentionBox(), changeTask(), claimSuggested(), cleanDir(), clearWaitingDate(), confirmDialog(), fillAttention() (+16 more)

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
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitHub` be split into smaller, more focused modules?**
  _Cohesion score 0.13978494623655913 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `vault.js` to `app.js`, `h`, `inbox-overview.js`, `vault.test.js`, `vault.js`, `task_commits.py`, `toast`, `noteProps`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `showSettings()` (e.g. with `goBack()` and `.folderName()`) actually correct?**
  _`showSettings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._