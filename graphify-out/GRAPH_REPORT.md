# Graph Report - NotesApp  (2026-11-23)

## Corpus Check
- 57 files · ~143,311 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1204 nodes · 3870 edges · 54 communities (48 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `219ce1fb`
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
- setTaskField
- inbox-overview.js
- build.mjs
- vault.js
- markdown.js
- start
- task_commits.py
- loadSuggestions
- .has
- toast
- LocalSource
- shownName
- ref_node_assert
- languageFor
- version-switch.mjs
- puppeteer-core
- addLocalVault
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- ./src/local.js
- isLocal
- ai-time.mjs
- restore.mjs
- GitHubError
- package.json
- NavWidget
- ref_node_test
- realFile
- checkInboxDot
- answered-questions.mjs
- local.test.js
- wait
- createEditor
- icons.js
- contentsUrl
- openFile
- sw.js
- log
- fieldProp
- sprintBox
- export-pdf.mjs
- h
- README.md
- printNote
- taskSetup

## God Nodes (most connected - your core abstractions)
1. `h()` - 92 edges
2. `icon()` - 52 edges
3. `renderPreview()` - 51 edges
4. `Mirror` - 45 edges
5. `start()` - 43 edges
6. `toast()` - 42 edges
7. `showSettings()` - 41 edges
8. `shownName()` - 38 edges
9. `toLf()` - 36 edges
10. `fill()` - 35 edges

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

## Communities (54 total, 6 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.16
Nodes (6): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, ownerOfPath()

### Community 1 - "Mirror"
Cohesion: 0.07
Nodes (31): blobSha(), BrowserFiles, db(), fileKey(), filesAndMeta(), folderOf(), folderPermission(), forgetFolder() (+23 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): fillTemplate(), sprintChoices(), claimedNotes, commitWrites, copyRepo, created, currentView, diff (+40 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (43): app, assetLoads, assigneeList(), ATTENTION_TITLES, baseCaches, baseLoads, BINARY, blobUrls (+35 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.07
Nodes (57): loadBase(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues() (+49 more)

### Community 6 - "icon"
Cohesion: 0.15
Nodes (28): Working on it, addRepo(), closeFile(), discoverVaults(), editTaskFields(), emptyState(), guestSteps(), join() (+20 more)

### Community 7 - "setTaskField"
Cohesion: 0.13
Nodes (31): addRelation(), loadAssignments(), loadReviews(), loadTaskSetup(), otherTaskBox(), parentList(), relationsBox(), saidValue() (+23 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.17
Nodes (32): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewCaptures(), overviewContents(), overviewEach(), overviewOptions() (+24 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (12): EXAMPLE_VAULTS, html, esbuild, files, out, root, walk(), zipName (+4 more)

### Community 10 - "vault.js"
Cohesion: 0.05
Nodes (84): asNewTask(), embeddedPart(), norm(), shareRepoSettings(), wikilinkRule(), addDays(), addNewTask(), AGENT_HANDLED (+76 more)

### Community 11 - "markdown.js"
Cohesion: 0.08
Nodes (38): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS (+30 more)

### Community 12 - "start"
Cohesion: 0.13
Nodes (31): addPackedExample(), client(), closeSideOnPhone(), connect(), debounce(), ensureSidebar(), fill(), fitWide() (+23 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+15 more)

### Community 14 - "loadSuggestions"
Cohesion: 0.22
Nodes (15): loadSuggestions(), blank(), byOrder(), isEpic(), isoDay(), isTaskPath(), isWaiting(), listProp() (+7 more)

### Community 15 - ".has"
Cohesion: 0.16
Nodes (20): loadInboxNotes(), loadMentionable(), loadPeople(), markInboxSeen(), resolveInboxSeen(), writeInboxProps(), inboxCandidates(), keptResolved() (+12 more)

### Community 16 - "toast"
Cohesion: 0.15
Nodes (19): applyMode(), baseName(), columnName(), copyField(), downloadCopy(), insertEntry(), isWide(), noFolderText() (+11 more)

### Community 18 - "shownName"
Cohesion: 0.12
Nodes (35): addSubtask(), assetsBox(), assignmentEdits(), changeTask(), claimSuggested(), claimWarning(), cleanDir(), clearWaitingDate() (+27 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.12
Nodes (8): errors, remote, errors, offsite, errors, remote, skills, vault

### Community 20 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.18
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "puppeteer-core"
Cohesion: 0.17
Nodes (10): puppeteer-core, BIG, BIG_MB, errors, NOTES, offsite, devDependencies, puppeteer-core (+2 more)

### Community 23 - "addLocalVault"
Cohesion: 0.29
Nodes (10): addLocalVault(), sync(), cleanName(), formatSize(), fetchExample(), fromBase64(), nameFromZip(), restoredSettings() (+2 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.13
Nodes (24): crc32(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, inflateRaw(), mb() (+16 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.11
Nodes (12): errors, fill(), paste(), remote, action(), docs(), errors, field() (+4 more)

### Community 27 - "./src/local.js"
Cohesion: 0.15
Nodes (8): errors, remote, ./src/local.js, errors, fileText(), offsite, save(), until()

### Community 28 - "isLocal"
Cohesion: 0.17
Nodes (30): addImage(), afterOutsideChange(), checkDraft(), checkInboxDot(), copyStatus(), draftKey(), fileAddresses(), findOwnInbox() (+22 more)

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "restore.mjs"
Cohesion: 0.12
Nodes (6): BROWSERS, DIR, errors, offsite, tmp, ./vendor/vendor.js

### Community 31 - "GitHubError"
Cohesion: 0.21
Nodes (3): GitHubError, FolderFiles, LocalError

### Community 32 - "package.json"
Cohesion: 0.25
Nodes (7): description, license, name, private, scripts, test, type

### Community 33 - "NavWidget"
Cohesion: 0.25
Nodes (5): navDecorations(), navField, navRange(), NavWidget, findNavBlock()

### Community 34 - "ref_node_test"
Cohesion: 0.18
Nodes (10): RFC-4180, detectDelimiter(), parseCsv(), serializeCsv(), migrateInboxOverview(), migratePrefix(), store, upgradeInboxOverview() (+2 more)

### Community 35 - "realFile"
Cohesion: 0.29
Nodes (7): encPath(), folderNotes(), ghGet(), gql(), json(), realFile(), realNotes()

### Community 36 - "checkInboxDot"
Cohesion: 0.30
Nodes (15): baseCache(), baseNotes(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates(), loadMentions() (+7 more)

### Community 38 - "local.test.js"
Cohesion: 0.47
Nodes (5): withLocal(), enc(), memoryFiles(), source(), vault

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.33
Nodes (6): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), linkMarks(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "openFile"
Cohesion: 0.17
Nodes (17): blobUrl(), dirName(), fileRow(), fileView(), fillImages(), iconFor(), kindOf(), markActive() (+9 more)

### Community 47 - "fieldProp"
Cohesion: 0.20
Nodes (23): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+15 more)

### Community 48 - "sprintBox"
Cohesion: 0.36
Nodes (12): amount(), fillBoards(), isSprintNote(), otherSprintBox(), shortDay(), sprintBox(), sprintField(), sprintList() (+4 more)

### Community 49 - "export-pdf.mjs"
Cohesion: 0.33
Nodes (3): docs, errors, requests

### Community 50 - "h"
Cohesion: 0.12
Nodes (41): applyPreviewEdit(), attentionBox(), baseCell(), baseTable(), baseView(), canWrite(), cellText(), commitsBox() (+33 more)

### Community 51 - "README.md"
Cohesion: 0.17
Nodes (10): A look inside, For companies and bigger teams, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done (+2 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 53 - "taskSetup"
Cohesion: 0.50
Nodes (4): cleanFolder(), cleanValues(), taskSetup(), whole()

## Knowledge Gaps
- **3 isolated node(s):** `RFC-4180`, `./src/github.js`, `./vendor/vendor.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 372 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toLf()` connect `vault.js` to `run.mjs`, `app.js`, `setTaskField`, `inbox-overview.js`, `markdown.js`, `task_commits.py`, `shownName`, `isLocal`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js`, `./vendor/vendor.js` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.07338935574229692 - nodes in this community are weakly interconnected._
- **Why does `Mirror` connect `Mirror` to `app.js`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `start()` (e.g. with `sync()` and `flushDraft()`) actually correct?**
  _`start()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._