# Graph Report - NotesApp  (2026-11-21)

## Corpus Check
- 47 files · ~124,061 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1081 nodes · 3446 edges · 52 communities (47 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `45b9b45b`
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
- vault.test.js
- vault.js
- markdown.js
- icon
- task_commits.py
- hrefFor
- .has
- printNote
- checkInboxDot
- toast
- ref_node_assert
- LocalSource
- version-switch.mjs
- ./src/local.js
- fieldProp
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- puppeteer-core
- answered-questions.mjs
- ai-time.mjs
- renderTree
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
- iconFor
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

## Communities (52 total, 5 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.15
Nodes (8): tokenSteps(), decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, newTokenUrl(), ownerOfPath()

### Community 1 - ".state"
Cohesion: 0.18
Nodes (7): blobSha(), dec(), enc(), hidden(), Mirror, prefixOf(), unreachable()

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (49): sprintChoices(), claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff (+41 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (73): app, applyMode(), ATTENTION_TITLES, baseCaches, baseCell(), baseLoads, baseTable(), baseView() (+65 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.09
Nodes (50): loadBase(), pageText(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths() (+42 more)

### Community 6 - "h"
Cohesion: 0.15
Nodes (42): addRelation(), assigneeList(), assignmentEdits(), changeTask(), claimSuggested(), clearWaitingDate(), commitsBox(), confirmDialog() (+34 more)

### Community 7 - "toLf"
Cohesion: 0.12
Nodes (30): embeddedPart(), norm(), overviewCaptures(), addComment(), addNewTask(), blockContents(), captureAttachmentText(), claimTask() (+22 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.10
Nodes (35): loadOverviewModule(), allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewContents(), overviewEach(), overviewOptions() (+27 more)

### Community 9 - "vault.test.js"
Cohesion: 0.08
Nodes (27): shareRepoSettings(), addDays(), blankOut(), findWikilinks(), githubFileUrl(), inboxCandidates(), markerText(), mergeMarker() (+19 more)

### Community 10 - "vault.js"
Cohesion: 0.08
Nodes (35): lookWith(), ASSIGNMENT_ID, captureAttachment(), cleanFolder(), cleanValues(), CUSTOM_KINDS, dirOf(), ESTIMATE_UNITS (+27 more)

### Community 11 - "markdown.js"
Cohesion: 0.09
Nodes (29): APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS, attentionOptions(), boardOptions(), CALLOUT_ICONS, calloutRule(), createMarkdown() (+21 more)

### Community 12 - "icon"
Cohesion: 0.12
Nodes (43): addRepo(), blobUrl(), client(), closeFile(), columnName(), connect(), discoverVaults(), editTaskFields() (+35 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (22): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+14 more)

### Community 14 - "hrefFor"
Cohesion: 0.15
Nodes (24): Working on it, addSubtask(), attentionBox(), checkInboxDot(), clearInboxSeen(), fillAttention(), fillInboxOverview(), findOwnInbox() (+16 more)

### Community 15 - ".has"
Cohesion: 0.22
Nodes (14): markInboxSeen(), assigneeOptions(), clearAllSeen(), keptCleared(), LinkIndex, mentionKey(), parentProblem(), seenList() (+6 more)

### Community 16 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 17 - "checkInboxDot"
Cohesion: 0.33
Nodes (13): baseCache(), baseNotes(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates(), loadMentions() (+5 more)

### Community 18 - "toast"
Cohesion: 0.16
Nodes (34): addImage(), afterOutsideChange(), applyPreviewEdit(), canWrite(), checkDraft(), copyStatus(), downloadCopy(), draftKey() (+26 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.22
Nodes (4): errors, offsite, errors, remote

### Community 20 - "LocalSource"
Cohesion: 0.13
Nodes (6): GitHubError, decode(), fetchExample(), FolderFiles, LocalError, LocalSource

### Community 21 - "version-switch.mjs"
Cohesion: 0.15
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "./src/local.js"
Cohesion: 0.33
Nodes (3): errors, remote, ./src/local.js

### Community 23 - "fieldProp"
Cohesion: 0.18
Nodes (26): loadSuggestions(), assigneeMatches(), assignmentTasks(), blank(), boardColumns(), byOrder(), claimedTasks(), foldName() (+18 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.11
Nodes (27): addLocalVault(), sync(), cleanName(), copyField(), noFolderText(), canPickFolder(), crc32(), dosTime() (+19 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "puppeteer-core"
Cohesion: 0.33
Nodes (5): puppeteer-core, devDependencies, puppeteer-core, private, type

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "renderTree"
Cohesion: 0.26
Nodes (12): baseName(), cleanDir(), dirName(), fileRow(), joinRepo(), markActive(), pickCopyFolder(), pickFolder() (+4 more)

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
Cohesion: 0.33
Nodes (6): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), linkMarks(), mentionPicker()

### Community 41 - "icons.js"
Cohesion: 0.33
Nodes (3): build(), cache, fillIcons()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "iconFor"
Cohesion: 0.33
Nodes (6): iconFor(), kindOf(), hasLanguage(), languageFor(), languageMaker(), own()

### Community 47 - "ai-time.js"
Cohesion: 0.22
Nodes (17): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+9 more)

### Community 48 - "asNewTask"
Cohesion: 0.22
Nodes (19): amount(), asNewTask(), isSprintNote(), loadTaskSetup(), update(), otherSprintBox(), shortDay(), sprintBox() (+11 more)

### Community 49 - "idb"
Cohesion: 0.13
Nodes (11): removeLocalVault(), BrowserFiles, db(), done(), fileKey(), folderOf(), forgetFolder(), idb() (+3 more)

### Community 50 - "mirror.js"
Cohesion: 0.24
Nodes (10): BINARY, keptAtOnce(), persist(), plan(), enc(), fakeGitHub(), memoryFiles(), mirrorWith() (+2 more)

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
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitHub` be split into smaller, more focused modules?**
  _Cohesion score 0.14532019704433496 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `toLf` to `app.js`, `h`, `inbox-overview.js`, `vault.test.js`, `vault.js`, `task_commits.py`, `toast`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `showSettings()` (e.g. with `goBack()` and `.folderName()`) actually correct?**
  _`showSettings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.028169014084507043 - nodes in this community are weakly interconnected._