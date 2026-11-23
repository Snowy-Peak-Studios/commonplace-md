# Graph Report - NotesApp  (2026-11-23)

## Corpus Check
- 57 files · ~146,246 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1228 nodes · 3968 edges · 54 communities (49 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8cd5d980`
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
- inserts.test.js
- inbox-overview.js
- build.mjs
- vault.js
- markdown.js
- toast
- task_commits.py
- setTaskField
- .has
- canWrite
- LocalSource
- shownName
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
- addImage
- wait
- createEditor
- icons.js
- contentsUrl
- openFile
- sw.js
- log
- BrowserFiles
- capture-attachments.mjs
- h
- README.md
- printNote
- local-load.mjs
- newtasks.mjs

## God Nodes (most connected - your core abstractions)
1. `h()` - 94 edges
2. `icon()` - 54 edges
3. `renderPreview()` - 52 edges
4. `Mirror` - 45 edges
5. `start()` - 43 edges
6. `toast()` - 42 edges
7. `showSettings()` - 41 edges
8. `shownName()` - 39 edges
9. `toLf()` - 37 edges
10. `fill()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Working on it` --references--> `modal()`  [INFERRED]
  CLAUDE.md → src/app.js
- `Working on it` --references--> `icon()`  [INFERRED]
  CLAUDE.md → src/icons.js
- `Rules` --references--> `toLf()`  [INFERRED]
  CLAUDE.md → src/vault.js
- `Version switch check` --references--> `main()`  [INFERRED]
  tests/e2e/README.md → tools/task-commits/task_commits.py
- `Working on it` --references--> `fillAppBlocks()`  [INFERRED]
  CLAUDE.md → src/app.js

## Import Cycles
- None detected.

## Communities (54 total, 5 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.16
Nodes (6): decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, ownerOfPath()

### Community 1 - "Mirror"
Cohesion: 0.09
Nodes (25): blobSha(), folderOf(), forgetFolder(), idb(), keepFolder(), BINARY, dec(), eachAtMost() (+17 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (50): fillTemplate(), sprintChoices(), claimedNotes, commitWrites, copied(), copyRepo, created, currentView (+42 more)

### Community 3 - "app.js"
Cohesion: 0.05
Nodes (54): app, assetLoads, ATTENTION_TITLES, baseCaches, baseLoads, BINARY, blobUrls, checkForNewer() (+46 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.07
Nodes (57): loadBase(), arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues() (+49 more)

### Community 6 - "icon"
Cohesion: 0.20
Nodes (26): addRepo(), closeFile(), discoverVaults(), editTaskFields(), emptyState(), guestSteps(), join(), joinRepo() (+18 more)

### Community 7 - "inserts.test.js"
Cohesion: 0.15
Nodes (11): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, NOTE_SECTIONS, PAGE_LIST_BLOCKS (+3 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.13
Nodes (33): allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewContents(), overviewEach(), overviewOptions(), overviewOwnerProblem() (+25 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (12): EXAMPLE_VAULTS, html, esbuild, files, out, root, walk(), zipName (+4 more)

### Community 10 - "vault.js"
Cohesion: 0.06
Nodes (46): lookWith(), AGENT_HANDLED, AGENT_MENTION, ASSIGNMENT_ID, attachmentName(), blankOut(), cleanFolder(), cleanValues() (+38 more)

### Community 11 - "markdown.js"
Cohesion: 0.08
Nodes (34): appBlockOptions(), ATTENTION_SHOWS, attentionOptions(), boardOptions(), CALLOUT_ICONS, calloutRule(), createMarkdown(), DEFAULT_ATTENTION (+26 more)

### Community 12 - "toast"
Cohesion: 0.11
Nodes (33): addLocalVault(), sync(), addPackedExample(), cleanName(), client(), connect(), copyField(), copyText() (+25 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+15 more)

### Community 14 - "setTaskField"
Cohesion: 0.07
Nodes (76): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), addRelation() (+68 more)

### Community 15 - ".has"
Cohesion: 0.18
Nodes (20): attentionBox(), loadInboxNotes(), loadMentionable(), loadPeople(), markInboxSeen(), resolveInboxSeen(), assigneeOptions(), inboxCandidates() (+12 more)

### Community 16 - "canWrite"
Cohesion: 0.11
Nodes (35): Working on it, applyMode(), applyPreviewEdit(), assigneeList(), baseView(), canWrite(), columnName(), fill() (+27 more)

### Community 17 - "LocalSource"
Cohesion: 0.16
Nodes (4): decode(), FolderFiles, folderPermission(), LocalSource

### Community 18 - "shownName"
Cohesion: 0.23
Nodes (18): assetsBox(), assignmentEdits(), changeTask(), claimSuggested(), claimWarning(), clearWaitingDate(), confirmDialog(), editBoardCard() (+10 more)

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
Cohesion: 0.22
Nodes (22): asNewTask(), embeddedPart(), overviewCaptures(), addComment(), commentReply(), fenceLanguage(), findMentions(), hasBlock() (+14 more)

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.10
Nodes (33): crc32(), done(), dosTime(), emptyVault(), encode(), EXAMPLE_FILES, EXAMPLE_SETTINGS, fetchExample() (+25 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "./src/local.js"
Cohesion: 0.24
Nodes (6): ./src/local.js, errors, fileText(), offsite, save(), until()

### Community 28 - "isLocal"
Cohesion: 0.15
Nodes (30): afterOutsideChange(), checkDraft(), copyStatus(), draftKey(), fileAddresses(), fillInboxOverview(), findOwnInbox(), flushDraft() (+22 more)

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
Cohesion: 0.27
Nodes (18): baseCache(), baseNotes(), checkInboxDot(), chunks(), inboxAttention(), inParallel(), keepBaseCache(), lastCommitDates() (+10 more)

### Community 37 - "vault.test.js"
Cohesion: 0.07
Nodes (34): addDays(), addNewTask(), assetConflicts(), assetList(), assetOptions(), assetsOverlap(), blockContents(), captureAttachmentText() (+26 more)

### Community 38 - "addImage"
Cohesion: 0.22
Nodes (14): addImage(), setupImageTools(), upper(), captureAttachment(), extensionOf(), findNavBlock(), imageAttachment(), imageInsertion() (+6 more)

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
Cohesion: 0.26
Nodes (15): baseName(), blobUrl(), dirName(), fileRow(), fileView(), fillImages(), iconFor(), kindOf() (+7 more)

### Community 47 - "BrowserFiles"
Cohesion: 0.26
Nodes (4): BrowserFiles, fileKey(), filesAndMeta(), vaultRange()

### Community 49 - "capture-attachments.mjs"
Cohesion: 0.25
Nodes (5): errors, fill(), paste(), remote, field()

### Community 50 - "h"
Cohesion: 0.14
Nodes (35): addSubtask(), baseCell(), baseTable(), cellText(), cleanDir(), commitsBox(), decorate(), fillDiagrams() (+27 more)

### Community 51 - "README.md"
Cohesion: 0.17
Nodes (10): A look inside, For companies and bigger teams, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done (+2 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 53 - "local-load.mjs"
Cohesion: 0.33
Nodes (5): BIG, BIG_MB, errors, NOTES, offsite

## Knowledge Gaps
- **3 isolated node(s):** `RFC-4180`, `./src/github.js`, `./vendor/vendor.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 377 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toLf()` connect `toLf` to `run.mjs`, `app.js`, `vault.test.js`, `inbox-overview.js`, `vault.js`, `task_commits.py`, `setTaskField`, `shownName`, `isLocal`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/github.js`, `./vendor/vendor.js` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.09215291750503019 - nodes in this community are weakly interconnected._
- **Why does `Rules` connect `task_commits.py` to `toLf`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `start()` (e.g. with `sync()` and `flushDraft()`) actually correct?**
  _`start()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `run.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.027777777777777776 - nodes in this community are weakly interconnected._