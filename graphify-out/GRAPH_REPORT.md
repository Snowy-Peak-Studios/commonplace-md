# Graph Report - NotesApp  (2026-11-23)

## Corpus Check
- 57 files · ~143,213 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1203 nodes · 3868 edges · 54 communities (48 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `33e2461d`
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
- .resolve
- .has
- toast
- LocalSource
- suggestBox
- ref_node_assert
- languageFor
- version-switch.mjs
- puppeteer-core
- toLf
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
- csv.js
- realFile
- checkInboxDot
- local-load.mjs
- local.test.js
- wait
- createEditor
- icons.js
- contentsUrl
- renderTree
- sw.js
- log
- ai-time.js
- sprintBox
- capture-attachments.mjs
- h
- README.md
- printNote
- newtasks.mjs

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

## Communities (54 total, 6 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.15
Nodes (7): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, newTokenUrl(), ownerOfPath()

### Community 1 - "Mirror"
Cohesion: 0.07
Nodes (31): blobSha(), BrowserFiles, db(), fileKey(), filesAndMeta(), folderOf(), folderPermission(), forgetFolder() (+23 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (47): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+39 more)

### Community 3 - "app.js"
Cohesion: 0.04
Nodes (68): addPackedExample(), app, assetLoads, ATTENTION_TITLES, baseCaches, baseLoads, BINARY, blobUrls (+60 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.07
Nodes (57): loadBase(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues() (+49 more)

### Community 6 - "icon"
Cohesion: 0.23
Nodes (27): addRepo(), blobUrl(), closeFile(), discoverVaults(), editTaskFields(), emptyState(), fileView(), guestSteps() (+19 more)

### Community 7 - "vault.test.js"
Cohesion: 0.07
Nodes (34): lookWith(), addDays(), addNewTask(), assetList(), assetOptions(), blockContents(), captureAttachmentText(), claimTask() (+26 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.14
Nodes (32): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewContents(), overviewEach(), overviewOptions(), overviewOwnerProblem() (+24 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (12): EXAMPLE_VAULTS, html, esbuild, files, out, root, walk(), zipName (+4 more)

### Community 10 - "vault.js"
Cohesion: 0.07
Nodes (41): linkMarks(), AGENT_HANDLED, AGENT_MENTION, assetConflicts(), assetsOverlap(), ASSIGNMENT_ID, blankOut(), captureAttachment() (+33 more)

### Community 11 - "markdown.js"
Cohesion: 0.07
Nodes (37): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS (+29 more)

### Community 12 - "showSettings"
Cohesion: 0.17
Nodes (25): addLocalVault(), sync(), cleanName(), client(), connect(), copyField(), downloadCopy(), ensureSidebar() (+17 more)

### Community 13 - "task_commits.py"
Cohesion: 0.07
Nodes (24): Rules, Working on it, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check (+16 more)

### Community 14 - ".resolve"
Cohesion: 0.13
Nodes (38): fillBoards(), fillTopTasks(), loadSuggestions(), assigneeMatches(), assignmentTasks(), blank(), blockedTasks(), boardColumns() (+30 more)

### Community 15 - ".has"
Cohesion: 0.16
Nodes (19): loadInboxNotes(), loadMentionable(), loadPeople(), markInboxSeen(), resolveInboxSeen(), assigneeOptions(), inboxCandidates(), keptResolved() (+11 more)

### Community 16 - "toast"
Cohesion: 0.15
Nodes (28): afterOutsideChange(), applyMode(), applyPreviewEdit(), canWrite(), columnName(), fillComments(), fillNewTasks(), flushDraft() (+20 more)

### Community 17 - "LocalSource"
Cohesion: 0.14
Nodes (4): decode(), FolderFiles, LocalSource, standInSha()

### Community 18 - "suggestBox"
Cohesion: 0.21
Nodes (20): addSubtask(), assignmentEdits(), changeTask(), claimSuggested(), clearWaitingDate(), confirmDialog(), loadTree(), modal() (+12 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.11
Nodes (9): errors, remote, docs, errors, requests, errors, offsite, errors (+1 more)

### Community 20 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.18
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "puppeteer-core"
Cohesion: 0.17
Nodes (7): puppeteer-core, errors, remote, devDependencies, puppeteer-core, private, type

### Community 23 - "toLf"
Cohesion: 0.16
Nodes (27): asNewTask(), embeddedPart(), overviewCaptures(), addComment(), commentHeader(), commentReply(), fenceLanguage(), findMentions() (+19 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.12
Nodes (26): crc32(), done(), dosTime(), EXAMPLE_FILES, EXAMPLE_SETTINGS, fetchExample(), fromBase64(), inflateRaw() (+18 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "./src/local.js"
Cohesion: 0.24
Nodes (6): ./src/local.js, errors, fileText(), offsite, save(), until()

### Community 28 - "isLocal"
Cohesion: 0.13
Nodes (28): addImage(), assigneeList(), checkDraft(), copyStatus(), draftKey(), fileAddresses(), fillInboxOverview(), findOwnInbox() (+20 more)

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "restore.mjs"
Cohesion: 0.12
Nodes (6): BROWSERS, DIR, errors, offsite, tmp, ./vendor/vendor.js

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
Cohesion: 0.22
Nodes (21): attentionBox(), baseCache(), baseNotes(), checkInboxDot(), chunks(), inboxAttention(), inParallel(), keepBaseCache() (+13 more)

### Community 37 - "local-load.mjs"
Cohesion: 0.33
Nodes (5): BIG, BIG_MB, errors, NOTES, offsite

### Community 38 - "local.test.js"
Cohesion: 0.32
Nodes (7): emptyVault(), encode(), withLocal(), enc(), memoryFiles(), source(), vault

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.40
Nodes (5): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "renderTree"
Cohesion: 0.42
Nodes (9): baseName(), dirName(), fileRow(), iconFor(), kindOf(), markActive(), renderMatches(), renderTree() (+1 more)

### Community 47 - "ai-time.js"
Cohesion: 0.31
Nodes (11): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+3 more)

### Community 48 - "sprintBox"
Cohesion: 0.20
Nodes (17): amount(), isSprintNote(), otherSprintBox(), shortDay(), sprintBox(), sprintField(), sprintList(), sprintNotes() (+9 more)

### Community 49 - "capture-attachments.mjs"
Cohesion: 0.25
Nodes (5): errors, fill(), paste(), remote, field()

### Community 50 - "h"
Cohesion: 0.13
Nodes (48): addRelation(), assetsBox(), baseCell(), baseTable(), baseView(), cellText(), claimWarning(), commitsBox() (+40 more)

### Community 51 - "README.md"
Cohesion: 0.17
Nodes (10): A look inside, For companies and bigger teams, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done (+2 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

## Knowledge Gaps
- **3 isolated node(s):** `RFC-4180`, `./src/github.js`, `./vendor/vendor.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 372 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toLf()` connect `toLf` to `app.js`, `vault.test.js`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `toast`, `sprintBox`, `suggestBox`, `h`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js`, `./vendor/vendor.js` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.07338935574229692 - nodes in this community are weakly interconnected._
- **Why does `Rules` connect `task_commits.py` to `toLf`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `start()` (e.g. with `sync()` and `flushDraft()`) actually correct?**
  _`start()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.028985507246376812 - nodes in this community are weakly interconnected._