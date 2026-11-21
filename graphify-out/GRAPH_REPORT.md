# Graph Report - NotesApp  (2026-11-21)

## Corpus Check
- 47 files · ~122,203 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1068 nodes · 3390 edges · 53 communities (47 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f2702ff`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub
- .state
- run.mjs
- app.js
- editor.js
- bases.js
- renderPreview
- toLf
- inbox-overview.js
- vault.test.js
- vault.js
- renderHeader
- icon
- task_commits.py
- h
- start
- markdown.js
- fill
- .resolve
- ref_node_assert
- LocalSource
- version-switch.mjs
- checkInboxDot
- fieldProp
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- puppeteer-core
- answered-questions.mjs
- ai-time.mjs
- h
- capture-attachments.mjs
- package.json
- NavWidget
- csv.js
- realFile
- printNote
- local-load.mjs
- newtasks.mjs
- wait
- createEditor
- icons.js
- contentsUrl
- languageFor
- sw.js
- log
- ./src/local.js
- addLocalVault
- idb
- mirror.js
- README.md
- export-pdf.mjs

## God Nodes (most connected - your core abstractions)
1. `h()` - 81 edges
2. `renderPreview()` - 48 edges
3. `icon()` - 44 edges
4. `Mirror` - 43 edges
5. `showSettings()` - 41 edges
6. `toast()` - 39 edges
7. `start()` - 37 edges
8. `route()` - 34 edges
9. `join()` - 34 edges
10. `shownName()` - 33 edges

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

## Communities (53 total, 6 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.16
Nodes (6): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, ownerOfPath()

### Community 1 - ".state"
Cohesion: 0.19
Nodes (6): dec(), enc(), hidden(), Mirror, prefixOf(), unreachable()

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): sprintChoices(), claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff (+40 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (59): app, ATTENTION_TITLES, baseCaches, baseCell(), baseLoads, baseTable(), BINARY, blobUrls (+51 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.09
Nodes (49): arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues(), context() (+41 more)

### Community 6 - "renderPreview"
Cohesion: 0.10
Nodes (55): addRelation(), amount(), assignmentEdits(), changeTask(), claimSuggested(), clearWaitingDate(), commitsBox(), editBoardCard() (+47 more)

### Community 7 - "toLf"
Cohesion: 0.12
Nodes (32): asNewTask(), embeddedPart(), startingText(), overviewCaptures(), addComment(), addNewTask(), captureAttachmentText(), commentHeader() (+24 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.11
Nodes (34): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewContents(), overviewEach(), overviewOptions(), overviewOwnerProblem() (+26 more)

### Community 9 - "vault.test.js"
Cohesion: 0.10
Nodes (25): lookWith(), assigneeOptions(), LinkIndex, mentionKey(), ownInboxPath(), pageListDepth(), relativeLink(), repoKey() (+17 more)

### Community 10 - "vault.js"
Cohesion: 0.09
Nodes (31): addDays(), ASSIGNMENT_ID, captureAttachment(), cleanFolder(), cleanValues(), CUSTOM_KINDS, dirOf(), ESTIMATE_UNITS (+23 more)

### Community 11 - "renderHeader"
Cohesion: 0.12
Nodes (34): afterOutsideChange(), applyPreviewEdit(), checkDraft(), confirmDialog(), copyStatus(), downloadCopy(), draftKey(), fillComments() (+26 more)

### Community 12 - "icon"
Cohesion: 0.28
Nodes (21): addRepo(), attentionBox(), closeFile(), discoverVaults(), editTaskFields(), emptyState(), guestSteps(), hrefFor() (+13 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (22): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+14 more)

### Community 14 - "h"
Cohesion: 0.25
Nodes (14): client(), connect(), formatSize(), goBack(), inviteLink(), ownerTokens(), refreshUser(), removeOwnerToken() (+6 more)

### Community 15 - "start"
Cohesion: 0.19
Nodes (19): applyMode(), baseView(), canWrite(), closeSideOnPhone(), columnName(), debounce(), fill(), fillBases() (+11 more)

### Community 16 - "markdown.js"
Cohesion: 0.08
Nodes (34): APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS, attentionOptions(), boardOptions(), CALLOUT_ICONS, calloutRule(), createMarkdown() (+26 more)

### Community 17 - "fill"
Cohesion: 0.25
Nodes (17): assigneeList(), ensureSidebar(), fillInboxOverview(), findOwnInbox(), loadCollaborators(), loadOverviewModule(), loadTree(), loginFor() (+9 more)

### Community 18 - ".resolve"
Cohesion: 0.15
Nodes (23): fillTopTasks(), loadSuggestions(), blank(), blockedTasks(), byOrder(), isEpic(), isTaskPath(), isWaiting() (+15 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.22
Nodes (4): errors, offsite, errors, remote

### Community 20 - "LocalSource"
Cohesion: 0.13
Nodes (6): GitHubError, db(), decode(), FolderFiles, LocalError, LocalSource

### Community 21 - "version-switch.mjs"
Cohesion: 0.15
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "checkInboxDot"
Cohesion: 0.30
Nodes (15): baseCache(), baseNotes(), checkInboxDot(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates() (+7 more)

### Community 23 - "fieldProp"
Cohesion: 0.19
Nodes (24): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+16 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.14
Nodes (21): crc32(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, EXAMPLE_VAULTS, fetchExample() (+13 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "puppeteer-core"
Cohesion: 0.33
Nodes (5): puppeteer-core, devDependencies, puppeteer-core, private, type

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "h"
Cohesion: 0.18
Nodes (28): Working on it, addImage(), addSubtask(), baseName(), blobUrl(), dirName(), fileRow(), fileView() (+20 more)

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

### Community 36 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 37 - "local-load.mjs"
Cohesion: 0.33
Nodes (5): BIG, BIG_MB, errors, NOTES, offsite

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.33
Nodes (6): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), linkMarks(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 47 - "./src/local.js"
Cohesion: 0.33
Nodes (3): errors, remote, ./src/local.js

### Community 48 - "addLocalVault"
Cohesion: 0.33
Nodes (9): addLocalVault(), sync(), cleanName(), copyField(), noFolderText(), pickCopyFolder(), pickFolder(), canPickFolder() (+1 more)

### Community 49 - "idb"
Cohesion: 0.15
Nodes (9): BrowserFiles, done(), fileKey(), folderOf(), forgetFolder(), idb(), keepFolder(), vaultRange() (+1 more)

### Community 50 - "mirror.js"
Cohesion: 0.24
Nodes (11): blobSha(), BINARY, keptAtOnce(), persist(), plan(), enc(), fakeGitHub(), memoryFiles() (+3 more)

### Community 51 - "README.md"
Cohesion: 0.18
Nodes (9): A look inside, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done, 🗺️ Roadmap (+1 more)

### Community 52 - "export-pdf.mjs"
Cohesion: 0.33
Nodes (3): docs, errors, requests

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./src/github.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 335 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `.state` to `idb`, `mirror.js`, `app.js`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._
- **Why does `LocalSource` connect `LocalSource` to `local.js`, `app.js`, `idb`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `showSettings()` (e.g. with `goBack()` and `.folderName()`) actually correct?**
  _`showSettings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.047540983606557376 - nodes in this community are weakly interconnected._