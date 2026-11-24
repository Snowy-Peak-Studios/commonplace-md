# Graph Report - NotesApp  (2026-11-24)

## Corpus Check
- 57 files · ~149,653 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .css 2, .base 2)

## Summary
- 1236 nodes · 4012 edges · 54 communities (47 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `62f9b80f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GitHub
- Mirror
- run.mjs
- app.js
- editor.js
- bases.js
- h
- isLocal
- inbox-overview.js
- build.mjs
- vault.js
- markdown.js
- addLocalVault
- task_commits.py
- loadSuggestions
- .has
- canWrite
- LocalSource
- fullPath
- puppeteer-core
- languageFor
- version-switch.mjs
- foldName
- export-pdf.mjs
- inbox-overview.mjs
- local.js
- inbox-overview-bindings.mjs
- ./src/local.js
- ai-time.mjs
- restore.mjs
- GitHubError
- package.json
- NavWidget
- csv.js
- realFile
- vault.test.js
- .resolve
- wait
- createEditor
- icons.js
- contentsUrl
- renderTree
- sw.js
- log
- local.test.js
- capture-attachments.mjs
- shownName
- README.md
- printNote
- ref_node_assert
- loadQuestions
- newtasks.mjs
- comment-reply.mjs

## God Nodes (most connected - your core abstractions)
1. `h()` - 93 edges
2. `icon()` - 54 edges
3. `renderPreview()` - 53 edges
4. `Mirror` - 45 edges
5. `start()` - 43 edges
6. `toast()` - 42 edges
7. `showSettings()` - 41 edges
8. `shownName()` - 39 edges
9. `toLf()` - 39 edges
10. `join()` - 37 edges

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

## Communities (54 total, 7 thin omitted)

### Community 0 - "GitHub"
Cohesion: 0.13
Nodes (9): tokenSteps(), decodeBase64(), encodeBase64(), encodeBytes(), encodePath(), GitHub, GitHubError, newTokenUrl() (+1 more)

### Community 1 - "Mirror"
Cohesion: 0.07
Nodes (31): blobSha(), BrowserFiles, db(), fileKey(), filesAndMeta(), folderOf(), folderPermission(), forgetFolder() (+23 more)

### Community 2 - "run.mjs"
Cohesion: 0.03
Nodes (50): fillTemplate(), claimedNotes, commitWrites, copied(), copyRepo, created, currentView, diff (+42 more)

### Community 3 - "app.js"
Cohesion: 0.04
Nodes (75): app, assetLoads, ATTENTION_TITLES, baseCaches, baseCell(), baseLoads, baseTable(), baseView() (+67 more)

### Community 4 - "editor.js"
Cohesion: 0.03
Nodes (7): highlight, LANGUAGE_NAMES, LANGUAGES, navGuard, protectNavBox, streamLanguages, theme

### Community 5 - "bases.js"
Cohesion: 0.08
Nodes (54): arithmetic(), asTime(), BaseError, baseNameOf(), BINARY, candidatePaths(), compareValues(), context() (+46 more)

### Community 6 - "h"
Cohesion: 0.14
Nodes (53): addPackedExample(), addRepo(), checkDraft(), client(), closeFile(), connect(), copyField(), discoverVaults() (+45 more)

### Community 7 - "isLocal"
Cohesion: 0.11
Nodes (42): assigneeList(), attentionBox(), baseCache(), baseNotes(), checkInboxDot(), chunks(), ensureSidebar(), fillAttention() (+34 more)

### Community 8 - "inbox-overview.js"
Cohesion: 0.07
Nodes (65): asNewTask(), embeddedPart(), norm(), allowed(), list(), OVERVIEW_KINDS, overviewBlock(), overviewCaptures() (+57 more)

### Community 9 - "build.mjs"
Cohesion: 0.17
Nodes (11): html, esbuild, files, out, root, walk(), zipName, zipped (+3 more)

### Community 10 - "vault.js"
Cohesion: 0.06
Nodes (52): setupImageTools(), AGENT_HANDLED, AGENT_MENTION, ASSIGNMENT_ID, attachmentName(), blankOut(), captureAttachment(), cleanFolder() (+44 more)

### Community 11 - "markdown.js"
Cohesion: 0.06
Nodes (43): filterInserts(), INSERT_GROUPS, insertion(), INSERTS, insertSample(), APP_BLOCKS, appBlockOptions(), ATTENTION_SHOWS (+35 more)

### Community 12 - "addLocalVault"
Cohesion: 0.27
Nodes (10): addLocalVault(), sync(), cleanName(), formatSize(), decode(), fetchExample(), fromBase64(), nameFromZip() (+2 more)

### Community 13 - "task_commits.py"
Cohesion: 0.08
Nodes (23): Rules, AI work history, Answered questions check, Browser check, Comment reply check, Expanded settings scrolling check, Inbox identity setup check, Isolated inbox overview check (+15 more)

### Community 14 - "loadSuggestions"
Cohesion: 0.29
Nodes (13): loadSuggestions(), byOrder(), claimedTasks(), isEpic(), isTaskPath(), isWaiting(), listProp(), rank() (+5 more)

### Community 15 - ".has"
Cohesion: 0.19
Nodes (16): lookWith(), markInboxSeen(), assigneeOptions(), keptResolved(), LinkIndex, mentionKey(), repoKey(), reposToCheck() (+8 more)

### Community 16 - "canWrite"
Cohesion: 0.14
Nodes (29): Working on it, addImage(), afterOutsideChange(), applyMode(), applyPreviewEdit(), canWrite(), columnName(), fillAppBlocks() (+21 more)

### Community 17 - "LocalSource"
Cohesion: 0.20
Nodes (4): emptyVault(), encode(), LocalSource, standInSha()

### Community 18 - "fullPath"
Cohesion: 0.22
Nodes (14): copyStatus(), draftKey(), flushDraft(), fullPath(), hasCaptureDraft(), mayLeave(), parseHash(), resolveConflict() (+6 more)

### Community 19 - "puppeteer-core"
Cohesion: 0.17
Nodes (10): puppeteer-core, BIG, BIG_MB, errors, NOTES, offsite, devDependencies, puppeteer-core (+2 more)

### Community 20 - "languageFor"
Cohesion: 0.50
Nodes (4): hasLanguage(), languageFor(), languageMaker(), own()

### Community 21 - "version-switch.mjs"
Cohesion: 0.18
Nodes (8): errors, offsite, PORT, ROOT, server, tag(), tagShots(), TYPES

### Community 22 - "foldName"
Cohesion: 0.35
Nodes (10): aiMinutes(), aiTimeEstimate(), aiTimeGroups(), aiTimeLabel(), aiTimeSamples(), summary(), word(), aiEstimateField() (+2 more)

### Community 23 - "export-pdf.mjs"
Cohesion: 0.33
Nodes (3): docs, errors, requests

### Community 24 - "inbox-overview.mjs"
Cohesion: 0.16
Nodes (9): errors, refresh(), remoteNotes(), requests, settled(), task(), writes, ./src/github.js (+1 more)

### Community 25 - "local.js"
Cohesion: 0.13
Nodes (22): crc32(), done(), dosTime(), EXAMPLE_FILES, EXAMPLE_SETTINGS, inflateRaw(), mb(), MIRRORED (+14 more)

### Community 26 - "inbox-overview-bindings.mjs"
Cohesion: 0.18
Nodes (7): action(), docs(), errors, requests, row(), task(), writes

### Community 27 - "./src/local.js"
Cohesion: 0.28
Nodes (6): ./src/local.js, errors, fileText(), offsite, save(), until()

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
Cohesion: 0.25
Nodes (5): navDecorations(), navField, navRange(), NavWidget, findNavBlock()

### Community 34 - "csv.js"
Cohesion: 0.52
Nodes (5): RFC-4180, detectDelimiter(), parseCsv(), serializeCsv(), roundTrip()

### Community 35 - "realFile"
Cohesion: 0.29
Nodes (7): encPath(), folderNotes(), ghGet(), gql(), json(), realFile(), realNotes()

### Community 37 - "vault.test.js"
Cohesion: 0.07
Nodes (35): addDays(), assetConflicts(), assetList(), assetOptions(), assetsOverlap(), blockContents(), editNewTask(), isoDay() (+27 more)

### Community 38 - ".resolve"
Cohesion: 0.23
Nodes (20): assigneeMatches(), assignmentTasks(), blank(), blockedTasks(), boardColumns(), fieldProp(), idNum(), isDoneStatus() (+12 more)

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
Cohesion: 0.46
Nodes (8): baseName(), fileRow(), iconFor(), kindOf(), markActive(), renderMatches(), renderTree(), searchText()

### Community 48 - "local.test.js"
Cohesion: 0.38
Nodes (6): EXAMPLE_VAULTS, withLocal(), enc(), memoryFiles(), source(), vault

### Community 49 - "capture-attachments.mjs"
Cohesion: 0.25
Nodes (5): errors, fill(), paste(), remote, field()

### Community 50 - "shownName"
Cohesion: 0.08
Nodes (70): addRelation(), addSubtask(), amount(), assetsBox(), assignmentEdits(), changeTask(), claimSuggested(), claimWarning() (+62 more)

### Community 51 - "README.md"
Cohesion: 0.17
Nodes (10): A look inside, For companies and bigger teams, Guides, License, Quick start, What it is, 🔭 Exploring, ✅ Recently done (+2 more)

### Community 52 - "printNote"
Cohesion: 0.73
Nodes (5): clearPrintView(), createPrintView(), isolateSvgIds(), printNote(), ready()

### Community 53 - "ref_node_assert"
Cohesion: 0.13
Nodes (7): errors, remote, errors, offsite, errors, remote, ./src/vault.js

### Community 54 - "loadQuestions"
Cohesion: 0.33
Nodes (9): loadInboxNotes(), loadMentionable(), loadPeople(), loadQuestions(), inboxCandidates(), questionOf(), questionTasks(), vaultAgents() (+1 more)

## Knowledge Gaps
- **4 isolated node(s):** `RFC-4180`, `./src/vault.js`, `./src/github.js`, `./vendor/vendor.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 379 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toLf()` connect `inbox-overview.js` to `run.mjs`, `app.js`, `vault.test.js`, `vault.js`, `markdown.js`, `task_commits.py`, `fullPath`, `shownName`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `icon()` (e.g. with `Working on it` and `fillInboxOverview()`) actually correct?**
  _`icon()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `./src/vault.js`, `./src/github.js` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GitHub` be split into smaller, more focused modules?**
  _Cohesion score 0.13306451612903225 - nodes in this community are weakly interconnected._
- **Why does `Rules` connect `task_commits.py` to `inbox-overview.js`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `start()` (e.g. with `sync()` and `flushDraft()`) actually correct?**
  _`start()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `Mirror` be split into smaller, more focused modules?**
  _Cohesion score 0.07338935574229692 - nodes in this community are weakly interconnected._