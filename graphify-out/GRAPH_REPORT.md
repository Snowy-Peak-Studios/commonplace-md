# Graph Report - NotesApp  (2026-11-24)

## Corpus Check
- 57 files · ~148,876 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1234 nodes · 4008 edges · 57 communities (50 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `75b34035`
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
- isLocal
- inbox-overview.js
- build.mjs
- vault.js
- markdown.js
- toast
- task_commits.py
- loadSuggestions
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
- isImagePath
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
- renderTree
- sw.js
- log
- BrowserFiles
- local.test.js
- capture-attachments.mjs
- shownName
- README.md
- printNote
- answered-questions.mjs
- loadQuestions
- newtasks.mjs
- comment-reply.mjs

## God Nodes (most connected - your core abstractions)
1. `h()` - 93 edges
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
- `Working on it` --references--> `modal()`  [INFERRED]
  CLAUDE.md → src/app.js
- `Rules` --references--> `toLf()`  [INFERRED]
  CLAUDE.md → src/vault.js
- `Version switch check` --references--> `main()`  [INFERRED]
  tests/e2e/README.md → tools/task-commits/task_commits.py
- `Working on it` --references--> `fillAppBlocks()`  [INFERRED]
  CLAUDE.md → src/app.js
- `Working on it` --references--> `icon()`  [INFERRED]
  CLAUDE.md → src/icons.js

## Import Cycles
- None detected.

## Communities (57 total, 7 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.15
Nodes (7): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, newTokenUrl(), ownerOfPath()

### Community 1 - "Mirror"
Cohesion: 0.09
Nodes (26): blobSha(), folderOf(), folderPermission(), forgetFolder(), idb(), keepFolder(), BINARY, dec() (+18 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (48): sprintChoices(), claimedNotes, commitWrites, copyRepo, created, currentView, diff, doneTasks (+40 more)

### Community 3 - "app.js"
Cohesion: 0.04
Nodes (66): app, assetLoads, assigneeList(), ATTENTION_TITLES, baseCaches, baseLoads, BINARY, blobUrls (+58 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.07
Nodes (58): loadBase(), pageText(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths() (+50 more)

### Community 6 - "icon"
Cohesion: 0.21
Nodes (28): Working on it, addRepo(), closeFile(), discoverVaults(), emptyState(), fileView(), fillAppBlocks(), guestSteps() (+20 more)

### Community 7 - "isLocal"
Cohesion: 0.15
Nodes (28): checkDraft(), checkInboxDot(), copyStatus(), draftKey(), ensureSidebar(), fileAddresses(), fillInboxOverview(), findOwnInbox() (+20 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.13
Nodes (35): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewCaptures(), overviewContents(), overviewEach(), overviewOptions() (+27 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (11): html, esbuild, files, out, root, walk(), zipName, zipped (+3 more)

### Community 10 - "vault.js"
Cohesion: 0.06
Nodes (44): AGENT_HANDLED, AGENT_MENTION, ASSIGNMENT_ID, blankOut(), cleanFolder(), cleanValues(), CUSTOM_KINDS, dirOf() (+36 more)

### Community 11 - "markdown.js"
Cohesion: 0.07
Nodes (40): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS (+32 more)

### Community 12 - "toast"
Cohesion: 0.14
Nodes (30): addLocalVault(), sync(), addPackedExample(), cleanName(), client(), connect(), copyField(), downloadCopy() (+22 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+15 more)

### Community 14 - "loadSuggestions"
Cohesion: 0.26
Nodes (13): loadSuggestions(), assetConflicts(), assetsOverlap(), isEpic(), isTaskPath(), listProp(), occupiedAssets(), occupies() (+5 more)

### Community 15 - ".has"
Cohesion: 0.18
Nodes (18): attentionBox(), fillAttention(), loadAssignments(), loadReviews(), loadTaskSetup(), markInboxSeen(), resolveInboxSeen(), keptResolved() (+10 more)

### Community 16 - "canWrite"
Cohesion: 0.15
Nodes (25): afterOutsideChange(), applyMode(), applyPreviewEdit(), canWrite(), columnName(), fillComments(), flushDraft(), isWide() (+17 more)

### Community 18 - "h"
Cohesion: 0.13
Nodes (40): assetsBox(), baseCell(), baseTable(), baseView(), blobUrl(), cellText(), commitsBox(), decorate() (+32 more)

### Community 19 - "ref_node_assert"
Cohesion: 0.10
Nodes (12): docs, errors, requests, BIG, BIG_MB, errors, NOTES, offsite (+4 more)

### Community 20 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.18
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "puppeteer-core"
Cohesion: 0.18
Nodes (7): puppeteer-core, devDependencies, puppeteer-core, private, type, errors, remote

### Community 23 - "toLf"
Cohesion: 0.12
Nodes (35): asNewTask(), embeddedPart(), isSprintNote(), norm(), sprintField(), suggestSprints(), addComment(), addNewTask() (+27 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.11
Nodes (28): crc32(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, fetchExample(), fromBase64() (+20 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "./src/local.js"
Cohesion: 0.28
Nodes (6): ./src/local.js, errors, fileText(), offsite, save(), until()

### Community 28 - "isImagePath"
Cohesion: 0.24
Nodes (12): setupImageTools(), attachmentName(), captureAttachment(), extensionOf(), imageAttachment(), isImagePath(), isMediaFile(), isMediaPath() (+4 more)

### Community 29 - "ai-time.mjs"
Cohesion: 0.18
Nodes (5): docs, errors, marker, requests, writes

### Community 30 - "restore.mjs"
Cohesion: 0.12
Nodes (6): BROWSERS, DIR, errors, offsite, tmp, ./vendor/vendor.js

### Community 31 - "GitHubError"
Cohesion: 0.20
Nodes (4): GitHubError, db(), FolderFiles, LocalError

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
Cohesion: 0.31
Nodes (15): baseCache(), baseNotes(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates(), loadMentions() (+7 more)

### Community 37 - "vault.test.js"
Cohesion: 0.08
Nodes (30): lookWith(), startingText(), addDays(), assetList(), assetOptions(), blockContents(), defaultNote(), fillTemplate() (+22 more)

### Community 38 - ".resolve"
Cohesion: 0.14
Nodes (31): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+23 more)

### Community 39 - "wait"
Cohesion: 0.33
Nodes (6): answerLeave(), datesShown(), diagramsDrawn(), pickTab(), until(), wait()

### Community 40 - "createEditor"
Cohesion: 0.33
Nodes (6): baseExtensions(), createCommentEditor(), createEditor(), createMergeView(), linkMarks(), mentionPicker()

### Community 42 - "contentsUrl"
Cohesion: 0.40
Nodes (5): contentsUrl(), formPut, relPut, subPut, unrelPut

### Community 43 - "renderTree"
Cohesion: 0.39
Nodes (9): baseName(), fileRow(), iconFor(), kindOf(), markActive(), renderMatches(), renderTree(), searchText() (+1 more)

### Community 47 - "BrowserFiles"
Cohesion: 0.28
Nodes (4): BrowserFiles, fileKey(), filesAndMeta(), vaultRange()

### Community 48 - "local.test.js"
Cohesion: 0.38
Nodes (6): EXAMPLE_VAULTS, withLocal(), enc(), memoryFiles(), source(), vault

### Community 49 - "capture-attachments.mjs"
Cohesion: 0.25
Nodes (5): errors, fill(), paste(), remote, field()

### Community 50 - "shownName"
Cohesion: 0.11
Nodes (51): addImage(), addRelation(), addSubtask(), amount(), assignmentEdits(), changeTask(), claimSuggested(), claimWarning() (+43 more)

### Community 51 - "README.md"
Cohesion: 0.17
Nodes (10): A look inside, For companies and bigger teams, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done (+2 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 53 - "answered-questions.mjs"
Cohesion: 0.29
Nodes (3): errors, remote, ./src/vault.js

### Community 54 - "loadQuestions"
Cohesion: 0.48
Nodes (7): loadInboxNotes(), loadMentionable(), loadPeople(), loadQuestions(), inboxCandidates(), vaultAgents(), vaultPeople()

## Knowledge Gaps
- **4 isolated node(s):** `RFC-4180`, `./src/vault.js`, `./src/github.js`, `./vendor/vendor.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 378 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toLf()` connect `toLf` to `app.js`, `vault.test.js`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `canWrite`, `shownName`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/vault.js`, `./src/github.js` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.0903755868544601 - nodes in this community are weakly interconnected._
- **Why does `Rules` connect `task_commits.py` to `toLf`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `start()` (e.g. with `sync()` and `flushDraft()`) actually correct?**
  _`start()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._