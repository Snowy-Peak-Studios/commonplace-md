# Graph Report - NotesApp  (2026-11-21)

## Corpus Check
- 47 files · ~124,785 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1084 nodes · 3462 edges · 47 communities (42 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ff9f7e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- local.js
- Mirror
- run.mjs
- app.js
- editor.js
- bases.js
- renderPreview
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
- applyMode
- toast
- settings-scroll.mjs
- languageFor
- version-switch.mjs
- ./src/local.js
- fieldProp
- inbox-overview.mjs
- inbox-overview-bindings.mjs
- puppeteer-core
- ai-time.mjs
- openOverviewSetup
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
- h
- sw.js
- log
- ai-time.js
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
- `Rules` --references--> `toLf()`  [INFERRED]
  CLAUDE.md → src/vault.js
- `Version switch check` --references--> `main()`  [INFERRED]
  tests/e2e/README.md → tools/task-commits/task_commits.py
- `Working on it` --references--> `modal()`  [INFERRED]
  CLAUDE.md → src/app.js
- `Working on it` --references--> `icon()`  [INFERRED]
  CLAUDE.md → src/icons.js
- `Rules` --references--> `main()`  [INFERRED]
  CLAUDE.md → tools/task-commits/task_commits.py

## Import Cycles
- None detected.

## Communities (47 total, 5 thin omitted)

### Community 0 - "local.js"
Cohesion: 0.05
Nodes (35): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, GitHubError, newTokenUrl(), ownerOfPath() (+27 more)

### Community 1 - "Mirror"
Cohesion: 0.09
Nodes (25): blobSha(), BrowserFiles, fileKey(), folderOf(), forgetFolder(), idb(), keepFolder(), vaultRange() (+17 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+40 more)

### Community 3 - "app.js"
Cohesion: 0.04
Nodes (70): amount(), app, ATTENTION_TITLES, baseCaches, baseLoads, baseTable(), baseView(), BINARY (+62 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.08
Nodes (50): loadBase(), pageText(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths() (+42 more)

### Community 6 - "renderPreview"
Cohesion: 0.07
Nodes (89): addRelation(), addSubtask(), assignmentEdits(), attentionBox(), baseCache(), baseCell(), baseNotes(), changeTask() (+81 more)

### Community 7 - "toLf"
Cohesion: 0.16
Nodes (24): asNewTask(), embeddedPart(), overviewCaptures(), addComment(), addNewTask(), blockContents(), claimTask(), editNewTask() (+16 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.19
Nodes (28): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewContents(), overviewEach(), overviewOptions(), overviewOwnerProblem() (+20 more)

### Community 9 - "vault.js"
Cohesion: 0.06
Nodes (60): loadPeople(), lookWith(), linkMarks(), addDays(), blankOut(), captureAttachment(), captureAttachmentText(), cleanFolder() (+52 more)

### Community 10 - "addLocalVault"
Cohesion: 0.33
Nodes (9): addLocalVault(), sync(), cleanName(), copyField(), noFolderText(), pickCopyFolder(), pickFolder(), canPickFolder() (+1 more)

### Community 11 - "markdown.js"
Cohesion: 0.11
Nodes (26): APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS, attentionOptions(), boardOptions(), CALLOUT_ICONS, calloutRule(), createMarkdown() (+18 more)

### Community 12 - "icon"
Cohesion: 0.16
Nodes (29): Working on it, addRepo(), assetsBox(), closeFile(), discoverVaults(), editTaskFields(), emptyState(), guestSteps() (+21 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (22): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+14 more)

### Community 14 - "showSettings"
Cohesion: 0.25
Nodes (16): client(), columnName(), confirmDialog(), connect(), fill(), formatSize(), inviteLink(), ownerTokens() (+8 more)

### Community 15 - ".has"
Cohesion: 0.24
Nodes (13): markInboxSeen(), assetList(), assigneeOptions(), keptResolved(), LinkIndex, mentionKey(), resolveAllSeen(), seenList() (+5 more)

### Community 16 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 17 - "applyMode"
Cohesion: 0.47
Nodes (6): applyMode(), isWide(), onTextChanged(), previewLater, updateLinkWarning(), warnLater

### Community 18 - "toast"
Cohesion: 0.16
Nodes (32): addImage(), afterOutsideChange(), applyPreviewEdit(), canWrite(), checkDraft(), copyStatus(), downloadCopy(), draftKey() (+24 more)

### Community 20 - "languageFor"
Cohesion: 0.67
Nodes (3): languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.15
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "./src/local.js"
Cohesion: 0.33
Nodes (3): errors, remote, ./src/local.js

### Community 23 - "fieldProp"
Cohesion: 0.13
Nodes (38): loadSuggestions(), assigneeMatches(), assignmentTasks(), blank(), blockedTasks(), boardColumns(), byOrder(), claimedTasks() (+30 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "puppeteer-core"
Cohesion: 0.17
Nodes (7): puppeteer-core, errors, remote, devDependencies, puppeteer-core, private, type

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "openOverviewSetup"
Cohesion: 0.31
Nodes (13): ensureSidebar(), fillInboxOverview(), findOwnInbox(), loadOverviewModule(), loadTree(), loginFor(), openOverviewSetup(), overviewPrefs() (+5 more)

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

### Community 43 - "h"
Cohesion: 0.17
Nodes (22): assigneeList(), baseName(), blobUrl(), copyText(), fileRow(), fileView(), fillImages(), h() (+14 more)

### Community 47 - "ai-time.js"
Cohesion: 0.15
Nodes (15): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+7 more)

### Community 51 - "README.md"
Cohesion: 0.18
Nodes (9): A look inside, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done, 🗺️ Roadmap (+1 more)

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./src/github.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 336 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Mirror` connect `Mirror` to `app.js`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `local.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05034199726402189 - nodes in this community are weakly interconnected._
- **Why does `toLf()` connect `toLf` to `app.js`, `renderPreview`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `.has`, `toast`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `showSettings()` (e.g. with `goBack()` and `.folderName()`) actually correct?**
  _`showSettings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.08700481303221029 - nodes in this community are weakly interconnected._