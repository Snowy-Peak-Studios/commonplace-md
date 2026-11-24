# Graph Report - NotesApp  (2026-11-24)

## Corpus Check
- 57 files · ~147,374 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .log 5, (none) 5, .css 2)

## Summary
- 1232 nodes · 3991 edges · 56 communities (52 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d9ff046c`
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
- isImagePath
- inbox-overview.js
- build.mjs
- vault.js
- markdown.js
- toast
- task_commits.py
- foldName
- .has
- canWrite
- LocalSource
- h
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
- vault.test.js
- .resolve
- wait
- createEditor
- icons.js
- contentsUrl
- openFile
- sw.js
- log
- BrowserFiles
- local.test.js
- capture-attachments.mjs
- suggestBox
- README.md
- printNote
- answered-questions.mjs
- export-pdf.mjs
- loadQuestions

## God Nodes (most connected - your core abstractions)
1. `h()` - 94 edges
2. `icon()` - 54 edges
3. `renderPreview()` - 52 edges
4. `Mirror` - 45 edges
5. `start()` - 43 edges
6. `toast()` - 42 edges
7. `showSettings()` - 41 edges
8. `shownName()` - 39 edges
9. `toLf()` - 39 edges
10. `fill()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Working on it` --references--> `icon()`  [INFERRED]
  CLAUDE.md → src/icons.js
- `Rules` --references--> `toLf()`  [INFERRED]
  CLAUDE.md → src/vault.js
- `Version switch check` --references--> `main()`  [INFERRED]
  tests/e2e/README.md → tools/task-commits/task_commits.py
- `Working on it` --references--> `modal()`  [INFERRED]
  CLAUDE.md → src/app.js
- `Working on it` --references--> `fillAppBlocks()`  [INFERRED]
  CLAUDE.md → src/app.js

## Import Cycles
- None detected.

## Communities (56 total, 4 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.15
Nodes (7): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, newTokenUrl(), ownerOfPath()

### Community 1 - "Mirror"
Cohesion: 0.09
Nodes (26): blobSha(), folderOf(), folderPermission(), forgetFolder(), idb(), keepFolder(), BINARY, dec() (+18 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff, doneTasks (+40 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (71): amount(), app, assetLoads, ATTENTION_TITLES, baseCaches, baseLoads, baseTable(), baseView() (+63 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.07
Nodes (57): loadBase(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues() (+49 more)

### Community 6 - "icon"
Cohesion: 0.19
Nodes (27): addRepo(), closeFile(), discoverVaults(), emptyState(), guestSteps(), join(), loadAccess(), lookForVaults() (+19 more)

### Community 7 - "isImagePath"
Cohesion: 0.17
Nodes (16): lookWith(), setupImageTools(), attachmentName(), captureAttachment(), extensionOf(), imageAttachment(), isImagePath(), isMediaFile() (+8 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.13
Nodes (36): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewCaptures(), overviewContents(), overviewEach(), overviewOptions() (+28 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (12): EXAMPLE_VAULTS, html, esbuild, files, out, root, walk(), zipName (+4 more)

### Community 10 - "vault.js"
Cohesion: 0.06
Nodes (46): linkMarks(), AGENT_HANDLED, AGENT_MENTION, ASSIGNMENT_ID, blankOut(), cleanFolder(), cleanValues(), CUSTOM_KINDS (+38 more)

### Community 11 - "markdown.js"
Cohesion: 0.07
Nodes (37): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS (+29 more)

### Community 12 - "toast"
Cohesion: 0.17
Nodes (25): addLocalVault(), sync(), addPackedExample(), cleanName(), client(), connect(), copyField(), ensureSidebar() (+17 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+15 more)

### Community 14 - "foldName"
Cohesion: 0.21
Nodes (17): fillTopTasks(), loadSuggestions(), blank(), byOrder(), isEpic(), isTaskPath(), isWaiting(), listProp() (+9 more)

### Community 15 - ".has"
Cohesion: 0.17
Nodes (20): attentionBox(), fillAttention(), loadAssignments(), loadReviews(), loadTaskSetup(), markInboxSeen(), resolveInboxSeen(), noteProps() (+12 more)

### Community 16 - "canWrite"
Cohesion: 0.19
Nodes (22): afterOutsideChange(), applyMode(), applyPreviewEdit(), canWrite(), columnName(), fillComments(), fillNewTasks(), isWide() (+14 more)

### Community 17 - "LocalSource"
Cohesion: 0.17
Nodes (3): decode(), FolderFiles, LocalSource

### Community 18 - "h"
Cohesion: 0.15
Nodes (46): addRelation(), assetsBox(), assignmentEdits(), baseCell(), claimWarning(), commitsBox(), downloadCopy(), editBoardCard() (+38 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.11
Nodes (11): errors, remote, BIG, BIG_MB, errors, NOTES, offsite, errors (+3 more)

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
Cohesion: 0.15
Nodes (30): asNewTask(), embeddedPart(), isSprintNote(), sprintField(), suggestSprints(), addComment(), commentHeader(), commentReply() (+22 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.12
Nodes (25): crc32(), done(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, inflateRaw() (+17 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "./src/local.js"
Cohesion: 0.28
Nodes (6): ./src/local.js, errors, fileText(), offsite, save(), until()

### Community 28 - "isLocal"
Cohesion: 0.13
Nodes (35): addImage(), assigneeList(), checkInboxDot(), copyStatus(), editTaskFields(), fileAddresses(), fillInboxOverview(), findOwnInbox() (+27 more)

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "restore.mjs"
Cohesion: 0.12
Nodes (6): BROWSERS, DIR, errors, offsite, tmp, ./vendor/vendor.js

### Community 31 - "GitHubError"
Cohesion: 0.33
Nodes (3): GitHubError, db(), LocalError

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
Cohesion: 0.31
Nodes (15): baseCache(), baseNotes(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates(), loadMentions() (+7 more)

### Community 37 - "vault.test.js"
Cohesion: 0.06
Nodes (40): addDays(), addNewTask(), assetConflicts(), assetList(), assetOptions(), assetsOverlap(), blockContents(), captureAttachmentText() (+32 more)

### Community 38 - ".resolve"
Cohesion: 0.15
Nodes (30): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+22 more)

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.40
Nodes (5): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "openFile"
Cohesion: 0.21
Nodes (17): baseName(), blobUrl(), dirName(), fileRow(), fileView(), fillImages(), iconFor(), kindOf() (+9 more)

### Community 47 - "BrowserFiles"
Cohesion: 0.26
Nodes (4): BrowserFiles, fileKey(), filesAndMeta(), vaultRange()

### Community 48 - "local.test.js"
Cohesion: 0.32
Nodes (7): fetchExample(), fromBase64(), withLocal(), enc(), memoryFiles(), source(), vault

### Community 49 - "capture-attachments.mjs"
Cohesion: 0.25
Nodes (5): errors, fill(), paste(), remote, field()

### Community 50 - "suggestBox"
Cohesion: 0.18
Nodes (23): Working on it, addSubtask(), changeTask(), claimSuggested(), cleanDir(), clearWaitingDate(), confirmDialog(), fillAppBlocks() (+15 more)

### Community 51 - "README.md"
Cohesion: 0.17
Nodes (10): A look inside, For companies and bigger teams, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done (+2 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 53 - "answered-questions.mjs"
Cohesion: 0.29
Nodes (3): errors, remote, ./src/vault.js

### Community 54 - "export-pdf.mjs"
Cohesion: 0.33
Nodes (3): docs, errors, requests

### Community 55 - "loadQuestions"
Cohesion: 0.48
Nodes (7): loadInboxNotes(), loadMentionable(), loadPeople(), loadQuestions(), inboxCandidates(), vaultAgents(), vaultPeople()

## Knowledge Gaps
- **4 isolated node(s):** `RFC-4180`, `./src/vault.js`, `./src/github.js`, `./vendor/vendor.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 378 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toLf()` connect `toLf` to `app.js`, `vault.test.js`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `h`, `suggestBox`, `isLocal`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/vault.js`, `./src/github.js` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.0903755868544601 - nodes in this community are weakly interconnected._
- **Why does `Rules` connect `task_commits.py` to `toLf`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `start()` (e.g. with `sync()` and `flushDraft()`) actually correct?**
  _`start()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._