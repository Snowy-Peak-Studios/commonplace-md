import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LinkIndex, parseWikilink, findNavBlock, prepareForPreview, findWikilinks, imageAttachment, imageInsertion, defaultNote, fillTemplate, isoDate, titleProblem, splitFrontMatter,
  inboxCandidates, ownInboxPath, MARKER, parseMarker, markerText, reposToCheck, repoKey,
  TASK_FIELDS, taskSetup, taskSetupJson, taskSetupProblem, isFieldProp, mergeMarker,
  isSetupTask, withProps, linkName, fieldValue, newTaskProps, withReviewer,
  fieldProp, linkTarget, isDoneStatus, subtasksOf, parentProblem, findTask,
  isoDay, addDays, sprints, sprintChoices, nextSprint, sprintTasks, sprintSuggestions, taskCommitLinks,
  linkList, relationFields, taskRelations, blockedTasks, setProps, suggestTasks,
  pageListDepth, tocTree, subpagesOf,
  hasBlock, withBlocks, withTaskLayout, addComment, commentReply, blockContents, TASK_BLOCKS, SPRINT_BLOCKS, taskOrder, relativeLink, boardColumns, assigneeOptions, assigneeMatches, assignmentTasks, reviewTasks, sortAssignments, withSeenAssignments,
} from "../src/vault.js";

const NOTE = [
  "---",
  'parent: "[[Task Board]]"',
  "status: Done",
  "---",
  "",
  "# Bigger cover images",
  "",
  "%% nav: made by a script, don't edit it by hand %%",
  "> [!abstract]+ 🧭 [[Home]] › [[Task Board]] › Bigger cover images",
  ">",
  "> **On this page**",
  "> - [[#Notes|Notes]]",
  "%% /nav %%",
  "",
  "Some text with [[Missing page]] and `[[in code]]`.",
  "",
  "- [ ] a task",
  "",
].join("\n");

test("wikilinks split into target, heading and alias", () => {
  assert.deepEqual(parseWikilink("Page"), { target: "Page", heading: null, alias: null });
  assert.deepEqual(parseWikilink("Page#Heading|shown"), { target: "Page", heading: "Heading", alias: "shown" });
  assert.deepEqual(parseWikilink("#Notes|Notes"), { target: "", heading: "Notes", alias: "Notes" });
  assert.deepEqual(parseWikilink("folder/Page\\|alias"), { target: "folder/Page", heading: null, alias: "alias" });
});

test("a bare name finds the page anywhere", () => {
  const idx = new LinkIndex(["Home.md", "Notes/Inbox.md", "Guides/Setup.md", "Attachments/a b.png", "Bases/Task Board.base", "Notes/Old/Setup.md"]);
  assert.equal(idx.resolve("Inbox"), "Notes/Inbox.md");
  assert.equal(idx.resolve("inbox"), "Notes/Inbox.md");
  assert.equal(idx.resolve("Notes/Inbox"), "Notes/Inbox.md");
  assert.equal(idx.resolve("Notes/Inbox.md"), "Notes/Inbox.md");
  assert.equal(idx.resolve("a b.png"), "Attachments/a b.png");
  assert.equal(idx.resolve("Task Board.base"), "Bases/Task Board.base");
  assert.equal(idx.resolve("Nowhere"), null);
  assert.equal(idx.resolve("", "Home.md"), "Home.md");
  // Two pages with one name: the one in the linking page's folder wins, else the shallowest.
  assert.equal(idx.resolve("Setup", "Notes/Old/Ideas.md"), "Notes/Old/Setup.md");
  assert.equal(idx.resolve("Setup", "Home.md"), "Guides/Setup.md");
});

test("the navigation box is found from its first to its last line", () => {
  const nav = findNavBlock(NOTE);
  const block = NOTE.slice(nav.from, nav.to);
  assert.ok(block.startsWith("%% nav:"));
  assert.ok(block.endsWith("%% /nav %%"));
  assert.equal(findNavBlock("# no nav\n"), null);
});

test("the preview keeps every line number and folds the nav box", () => {
  const { source, frontMatter } = prepareForPreview(NOTE);
  assert.equal(source.split("\n").length, NOTE.split("\n").length);
  assert.equal(frontMatter, 'parent: "[[Task Board]]"\nstatus: Done');
  assert.ok(source.includes("> [!nav]- 🧭 [[Home]]"));
  assert.ok(!source.includes("%%"));
  const taskLine = NOTE.split("\n").findIndex((l) => l.startsWith("- [ ]"));
  assert.equal(source.split("\n")[taskLine], "- [ ] a task");
});

test("links outside code are listed", () => {
  const targets = findWikilinks(NOTE).map((l) => l.target);
  assert.deepEqual(targets, ["Home", "Task Board", "", "Missing page"]);
});

test("a new note starts from the repo's template, or with its title", () => {
  assert.equal(defaultNote(" Idea "), "# Idea\n\n");
  const template = '---\r\nparent: "[[Notes]]"\r\ncreated: {{date}}\r\n---\r\n\r\n# {{title}}\r\n\r\n{{ Title }} on {{DATE}}, {{other}} stays\r\n';
  assert.equal(fillTemplate(template, { title: " Idea ", date: "2026-01-02" }),
    '---\nparent: "[[Notes]]"\ncreated: 2026-01-02\n---\n\n# Idea\n\nIdea on 2026-01-02, {{other}} stays\n', "LF, every {{title}} and {{date}}, any case");
  assert.equal(fillTemplate("no placeholders\n", { title: "x", date: "y" }), "no placeholders\n");
  assert.equal(fillTemplate("# {{title}} $& $1", { title: "A $1 b", date: "" }), "# A $1 b $& $1", "no replacement patterns");
  assert.equal(isoDate(new Date(2026, 0, 2, 23, 59)), "2026-01-02", "local date, zero-padded");
  assert.equal(titleProblem("Fine title"), null);
  assert.ok(titleProblem("a/b"));
  assert.ok(titleProblem("what?"));
  assert.ok(titleProblem("  "));
});

test("front matter is found only at the very top", () => {
  assert.equal(splitFrontMatter(NOTE).raw, 'parent: "[[Task Board]]"\nstatus: Done');
  assert.equal(splitFrontMatter("# Title\n---\na: 1\n---\n"), null);
});

test("the inboxes: the Inbox page and the notes directly in the inboxes folder", () => {
  const paths = ["Notes/Inbox.md", "Notes/Idea.md", "Notes/Inboxes/Ben Example.md", "Notes/Inboxes/Local/Cat.md",
    "Notes/Inboxes/picture.png", "Notes/InboxesOld/Bob.md", "Home.md"];
  assert.deepEqual(inboxCandidates(paths, "Notes/Inbox.md", "Notes/Inboxes"), ["Notes/Inbox.md", "Notes/Inboxes/Ben Example.md"]);
  assert.deepEqual(inboxCandidates(paths, "Notes/Inbox.md", "/Notes/Inboxes/"), ["Notes/Inbox.md", "Notes/Inboxes/Ben Example.md"]);
  assert.deepEqual(inboxCandidates(paths, "Notes/Inbox.md", ""), ["Notes/Inbox.md"], "no inboxes folder: only the Inbox page");
  assert.deepEqual(inboxCandidates(paths, "", ""), []);
});

test("the Inbox button opens the inbox whose github property is the signed-in login", () => {
  const notes = [
    { path: "Notes/Inbox.md", props: { owner: "Ann Example", github: "ann-example" } },
    { path: "Notes/Inboxes/Ben Example.md", props: { owner: "Ben Example", github: "Ben-Example" } },
    { path: "Notes/Inboxes/Empty.md", props: { owner: "Nobody", github: "" } },
    { path: "Notes/Inboxes/None.md", props: {} },
  ];
  assert.equal(ownInboxPath(notes, "ben-example", "Notes/Inbox.md"), "Notes/Inboxes/Ben Example.md", "any case");
  assert.equal(ownInboxPath(notes, "ann-example", "Notes/Inbox.md"), "Notes/Inbox.md");
  assert.equal(ownInboxPath(notes, "someone-else", "Notes/Inbox.md"), "Notes/Inbox.md", "no match: the repo's Inbox page");
  assert.equal(ownInboxPath(notes, "", "Notes/Inbox.md"), "Notes/Inbox.md", "not signed in: the repo's Inbox page");
  assert.equal(ownInboxPath([{ path: "Notes/Inboxes/N.md", props: { github: 1234 } }], "1234", ""), "Notes/Inboxes/N.md", "a login YAML reads as a number");
});

test("suggested tasks: free ones in a Tasks folder, highest priority, then newest", async () => {
  const { suggestTasks, isTaskPath } = await import("../src/vault.js");
  const t = (path, props) => ({ path, props });
  const notes = [
    t("Tasks/Old high.md", { id: "T-02", priority: "High", status: "To Do", assignee: "", area: "Docs" }),
    t("Tasks/New high.md", { id: "T-10", priority: "High", status: "To Do", assignee: "", area: "Features" }),
    t("Tasks/Taken.md", { id: "T-11", priority: "High", status: "To Do", assignee: "Bo Example", area: "Features" }),
    t("Tasks/Done.md", { id: "T-12", priority: "High", status: "Done", assignee: "", area: "Features" }),
    t("Tasks/Started.md", { id: "T-13", priority: "High", status: "In Progress", assignee: null, area: "Features" }),
    t("Tasks/Medium.md", { id: "T-20", priority: "Medium", status: "To Do", assignee: "", area: "Art" }),
    t("Tasks/Low.md", { id: "T-30", priority: "Low", area: "Features" }),
    t("Notes/Not a task.md", { priority: "High", status: "To Do" }),
    t("Tasks/Epic.md", { id: "T-40", priority: "High", status: "To Do", assignee: "", area: "Features", type: "Epic" }),
  ];
  assert.deepEqual(suggestTasks(notes).map((n) => n.path), ["Tasks/New high.md", "Tasks/Old high.md", "Tasks/Medium.md"], "an epic is never suggested");
  assert.deepEqual(suggestTasks(notes, { areas: ["features", "Docs"] }).map((n) => n.path),
    ["Tasks/New high.md", "Tasks/Old high.md", "Tasks/Low.md"]);
  assert.deepEqual(suggestTasks(notes, { areas: "Art" }).map((n) => n.path), ["Tasks/Medium.md"]);
  assert.equal(suggestTasks(notes, { count: 1 }).length, 1);
  const inOrder = (order) => suggestTasks(notes, { order }).map((n) => n.path);
  assert.deepEqual(inOrder("priority-newest"), ["Tasks/New high.md", "Tasks/Old high.md", "Tasks/Medium.md"]);
  assert.deepEqual(inOrder("priority-oldest"), ["Tasks/Old high.md", "Tasks/New high.md", "Tasks/Medium.md"]);
  assert.deepEqual(inOrder("newest"), ["Tasks/Low.md", "Tasks/Medium.md", "Tasks/New high.md"], "priority isn't counted");
  assert.deepEqual(inOrder("oldest"), ["Tasks/Old high.md", "Tasks/New high.md", "Tasks/Medium.md"]);
  assert.ok(isTaskPath("Wiki/Tasks/A.md") && isTaskPath("tasks/a.md"));
  assert.ok(!isTaskPath("Tasks/Deeper/A.md") && !isTaskPath("MyTasks/A.md") && !isTaskPath("Tasks/a.csv"));
});

test("blocked and testing tasks are never suggested, with or without sprints", async () => {
  const { suggestTasks, sprintSuggestions } = await import("../src/vault.js");
  const t = (path, status) => ({ path, props: { status, assignee: "", priority: "High", sprint: "[[Sprint 1]]" } });
  const notes = [t("Tasks/Blocked.md", "Blocked"), t("Tasks/Shouting.md", " BLOCKED "), t("Tasks/Testing.md", " Testing "), t("Tasks/Free.md", "To Do")];
  assert.deepEqual(suggestTasks(notes).map((n) => n.path), ["Tasks/Free.md"]);
  assert.deepEqual(sprintSuggestions(notes, { now: "Sprints/Sprint 1.md", resolve: (x) => `Sprints/${x}.md` }).map((n) => n.path), ["Tasks/Free.md"]);
});

test("claiming a task sets its status and assignee in place", async () => {
  const { claimTask } = await import("../src/vault.js");
  const text = '---\nid: T-18\nstatus: To Do\nassignee: ""\npriority: Medium\n---\n\n# Top three\n\nassignee: in the body stays\n';
  assert.equal(claimTask(text, "Ann Example"),
    "---\nid: T-18\nstatus: In Progress\nassignee: Ann Example\npriority: Medium\n---\n\n# Top three\n\nassignee: in the body stays\n");
  assert.equal(claimTask("---\nid: T-1\n---\nbody", "Bo: art"), '---\nid: T-1\nstatus: In Progress\nassignee: "Bo: art"\n---\nbody');
  assert.equal(claimTask("---\r\nstatus: To Do\r\n---\r\n", "Ann Example (Claude)"), "---\nstatus: In Progress\nassignee: Ann Example (Claude)\n---\n");
  assert.equal(claimTask("# no front matter", "x"), null);
});

test("the parent property gives the page above", async () => {
  const { parentTarget } = await import("../src/vault.js");
  assert.equal(parentTarget('---\nparent: "[[Task Board]]"\nstatus: To Do\n---\n# A'), "Task Board");
  assert.equal(parentTarget("---\nparent: '[[Notes/Home#Top|home]]'\n---\n"), "Notes/Home");
  assert.equal(parentTarget("---\nparent: [[Home]]\n---\n"), "Home");
  assert.equal(parentTarget("---\nstatus: To Do\n---\nparent: \"[[Home]]\" in the body"), null);
  assert.equal(parentTarget("---\nparent: Home\n---\n"), null);
  assert.equal(parentTarget("# no front matter"), null);
});

test("claimed tasks: the owner's own, waiting ones first, any spelling of the name", async () => {
  const { claimedTasks, splitAssignee, foldName } = await import("../src/vault.js");
  assert.deepEqual(splitAssignee("Ann Example (Claude)"), { name: "Ann Example", agent: "Claude" });
  assert.deepEqual(splitAssignee(" Ann Example "), { name: "Ann Example", agent: null });
  assert.deepEqual(splitAssignee(""), { name: "", agent: null });
  assert.equal(foldName("  Zoë  Łukasz-Ørsted "), foldName("zoe lukasz-orsted"));
  const t = (path, props) => ({ path, props });
  const notes = [
    t("Tasks/Agent on it.md", { id: "T-9", priority: "High", status: "In Progress", assignee: "Zoë Example (Claude)" }),
    t("Tasks/Waiting low.md", { id: "T-3", priority: "Low", status: "In Progress", assignee: "Zoe Example" }),
    t("Tasks/Waiting high.md", { id: "T-2", priority: "High", status: "In Progress", assignee: "zoe example" }),
    t("Tasks/Done.md", { id: "T-8", priority: "High", status: "Done", assignee: "Zoe Example" }),
    t("Tasks/Someone else.md", { id: "T-7", priority: "High", status: "In Progress", assignee: "Bo Example" }),
    t("Notes/Not a task.md", { status: "In Progress", assignee: "Zoe Example" }),
  ];
  assert.deepEqual(claimedTasks(notes, "Zoe Example").map((n) => [n.path, n.agent]),
    [["Tasks/Waiting high.md", null], ["Tasks/Waiting low.md", null], ["Tasks/Agent on it.md", "Claude"]]);
  assert.deepEqual(claimedTasks(notes, ""), []);
});

test("setting a task's properties changes only those lines", async () => {
  const { setProps, taskAreas } = await import("../src/vault.js");
  const text = "---\nid: T-5\nstatus: To Do\npriority: Medium\narea: Notes\n---\n\n# A\n\npriority: in the body stays\n";
  assert.equal(setProps(text, [["priority", "High"]]), text.replace("priority: Medium", "priority: High"));
  assert.equal(setProps(text, [["area", "Two words"]]), text.replace("area: Notes", "area: Two words"));
  assert.equal(setProps("---\nid: T-1\n---\n", [["area", "Docs: art"]]), '---\nid: T-1\narea: "Docs: art"\n---\n');
  assert.equal(setProps("no front matter", [["area", "x"]]), null);
  const t = (path, area) => ({ path, props: { area } });
  assert.deepEqual(taskAreas([t("Tasks/a.md", "Notes"), t("Tasks/b.md", "notes"), t("Tasks/c.md", " Art "), t("Tasks/d.md", ""), t("Notes/x.md", "Other")]), ["Art", "Notes"]);
});

test("only dated, unassigned deferrals return after the inbox's waiting period", async () => {
  const { waitingDays, waitingReady } = await import("../src/vault.js");
  const task = { status: "Waiting", assignee: "", waiting_since: new Date("2026-11-10T00:00:00Z") };
  assert.equal(waitingDays(undefined), 7);
  assert.equal(waitingDays("3"), 3);
  for (const value of [null, "", true, 0, -4, 1.5, "tomorrow"]) assert.equal(waitingDays(value), 7);
  assert.equal(waitingReady(task, 7, "2026-11-16"), false);
  assert.equal(waitingReady(task, 7, "2026-11-17"), true);
  assert.equal(waitingReady({ ...task, waiting_since: "2026-11-10" }, 3, "2026-11-13"), true);
  for (const waiting_since of [undefined, "", "soon", "2026-02-30", "2026-12-01"]) {
    assert.equal(waitingReady({ ...task, waiting_since }, 7, "2026-11-17"), false);
  }
  assert.equal(waitingReady({ ...task, assignee: "Ann Example" }, 7, "2026-11-17"), false);
  assert.equal(waitingReady({ ...task, status: "Blocked" }, 7, "2026-11-17"), false);
});

test("Not now: waiting tasks leave the suggestions and the claimed ones, and make the waiting list", async () => {
  const { suggestTasks, claimedTasks, waitingTasks } = await import("../src/vault.js");
  const t = (path, props) => ({ path, props });
  const notes = [
    t("Tasks/Free.md", { id: "T-1", priority: "Low", status: "To Do", assignee: "", area: "Docs" }),
    t("Tasks/Put off.md", { id: "T-2", priority: "High", status: "Waiting", assignee: "", area: "Docs" }),
    t("Tasks/Put off, other area.md", { id: "T-3", priority: "High", status: "waiting", assignee: "", area: "Art" }),
    t("Tasks/Mine, put off.md", { id: "T-4", priority: "Medium", status: "Waiting", assignee: "Ann Example", area: "Art" }),
    t("Tasks/Mine.md", { id: "T-5", priority: "Medium", status: "In Progress", assignee: "Ann Example", area: "Docs" }),
  ];
  assert.deepEqual(suggestTasks(notes).map((n) => n.path), ["Tasks/Free.md"]);
  assert.deepEqual(claimedTasks(notes, "Ann Example").map((n) => n.path), ["Tasks/Mine.md"]);
  assert.deepEqual(waitingTasks(notes).map((n) => n.path), ["Tasks/Put off, other area.md", "Tasks/Put off.md", "Tasks/Mine, put off.md"]);
  assert.deepEqual(waitingTasks(notes, { areas: ["Docs"], owner: "Ann Example" }).map((n) => n.path), ["Tasks/Put off.md", "Tasks/Mine, put off.md"]);
  assert.deepEqual(waitingTasks(notes, { order: "oldest" }).map((n) => n.path), ["Tasks/Put off.md", "Tasks/Put off, other area.md", "Tasks/Mine, put off.md"]);
});

test("a task's state: ready, needs a decision, or a placeholder", async () => {
  const { taskState } = await import("../src/vault.js");
  const note = (body, fm = "id: T-1") => `---\n${fm}\n---\n\n# A task\n\n${body}`;
  const story = "**As** a reader, **I want** a thing, **so that** it helps.\n\n## Acceptance criteria\n\n";
  assert.equal(taskState(note(story + "- [ ] It works\n- [x] Done bit\n")).state, "ready");
  const d = taskState(note(story + "- [ ] Decided with **Ann** which kinds matter first\n- [ ] Built\n"));
  assert.equal(d.state, "decision");
  assert.equal(d.reason, "Needs a decision first: Decided with Ann which kinds matter first");
  assert.equal(taskState(note(story + "- [x] Decided with Ann: yes\n- [ ] Built\n")).state, "ready");
  assert.equal(taskState(note(story + "- [ ] Built\n\nThe size is TBD.\n")).state, "decision");
  assert.equal(taskState(note(story + "- [ ] Built\n\nPlaceholder: to be written.\n")).state, "placeholder");
  assert.equal(taskState(note(story + "- [ ] Built\n", "id: T-1\ntags: [task, placeholder]")).state, "placeholder");
  assert.equal(taskState(`---\nid: T-1\n---\n\n# T-1 Placeholder for the shop\n\n${story}- [ ] Built\n`).state, "placeholder");
  assert.equal(taskState(`---\nid: T-1\n---\n\n# A shop - placeholder\n\n${story}- [ ] Built\n`).state, "placeholder");
  assert.equal(taskState(`---\nid: T-1\n---\n\n# Ready, needs a decision or placeholder - its state\n\n${story}- [ ] Built\n`).state, "ready");
  // Talk about the words isn't a marker: quoted, in code, or in the middle of a line.
  assert.equal(taskState(note(story + "- [ ] Built\n\n- From the inbox: \"(TBD, placeholder, or other)\" and `TBD`\n- Uses the placeholder logo\n")).state, "ready");
  assert.equal(taskState(note("**As** someone who ..., **I want** ...\n\n- [ ] ...\n")).state, "placeholder");
  assert.equal(taskState(note("Just an idea.")).state, "placeholder");
  assert.equal(taskState(note("Just an idea.", "id: T-1\nready: yes")).state, "ready");
  assert.equal(taskState(note(story + "- [ ] Built\n", "id: T-1\nready: decision")).state, "decision");
});


test("images get dated safe names that resolve from the note and avoid collisions across the vault", () => {
  const now = new Date("2026-11-17T12:03:04Z");
  const image = { name: "My |[screenshot].PNG", type: "image/png", size: 128 };
  const base = "My-screenshot-2026-11-17-12-03-04-deadbeef";
  const used = ["Elsewhere/" + base.toUpperCase() + ".PNG"];
  const upload = imageAttachment(image, "Notes/A note.md", "/Attachments/", used, now, "deadbeeff00d");
  assert.equal(upload.path, "Attachments/" + base + "-2.png");
  assert.equal(upload.link, `![[${base}-2.png]]`);
  assert.equal(new LinkIndex([...used, upload.path]).resolve(upload.name, "Notes/A note.md"), upload.path);
  assert.equal(imageAttachment({...image, name: ""}, "Notes/A note.md", "", [], now, "deadbeef").path,
    "Notes/image-2026-11-17-12-03-04-deadbeef.png");
  assert.equal(imageAttachment({...image, name: "Photo.JPEG", type: ""}, "Home.md", "", [], now, "deadbeef").path,
    "Photo-2026-11-17-12-03-04-deadbeef.jpeg");
  assert.throws(() => imageAttachment(image, "Home.md", "../elsewhere", []), /valid Attachments folder/);
  assert.throws(() => imageAttachment({...image, size: 10 * 1024 * 1024 + 1}, "Home.md", "", []), /10 MiB/);
  assert.throws(() => imageAttachment({...image, type: "text/plain"}, "Home.md", "", []), /Choose a PNG/);
});

test("an image inserts at the cursor or after the note's properties", () => {
  const link = "![[picture.png]]";
  const front = "---\nowner: Alex\n---";
  const note = front + "\n\n# Note\n";
  assert.deepEqual(imageInsertion(note, 5, link), { at: front.length + 1, insert: link + "\n" });
  assert.deepEqual(imageInsertion(front, front.length, link), { at: front.length, insert: "\n" + link + "\n" });
  assert.deepEqual(imageInsertion(note, note.length, link), { at: note.length, insert: link });
  assert.deepEqual(imageInsertion("# Title", 0, link), { at: 0, insert: link + "\n\n" });
});

test("a vault's marker file round-trips its settings", () => {
  assert.equal(MARKER, ".commonplace.json");
  const r = { owner: "Org", repo: "Game", label: "The game", branch: "dev", folder: "Wiki", home: "Home.md",
    inbox: "Notes/Inbox.md", inboxes: "Notes/Inboxes", notes: "Notes", template: "Templates/Note.md", attachments: "Attachments", vault: true };
  const back = parseMarker(markerText(r), "Org", "Game");
  assert.deepEqual(back, r);
});

test("a marker keeps only what an invite link can set, with defaults", () => {
  const r = parseMarker('{"folder": "/Wiki/", "token": "x", "vault": "yes", "home": 3}', "o", "notes");
  assert.deepEqual(r, { owner: "o", repo: "notes", label: "notes", branch: "", folder: "Wiki", home: "README.md",
    inbox: "", inboxes: "", notes: "", template: "", attachments: "", vault: false });
  assert.equal(parseMarker("not json", "o", "r"), null);
  assert.equal(parseMarker("[1]", "o", "r"), null);
  assert.equal(parseMarker("null", "o", "r"), null);
  assert.equal(markerText({ repo: "r", home: "README.md" }), '{\n  "label": "r",\n  "branch": "main"\n}\n');
});

test("only new or changed repos this person can save to are looked at", () => {
  const repo = (owner, name, pushed, push = true, extra = {}) => ({ owner: { login: owner }, name, pushed_at: pushed, permissions: { push }, ...extra });
  const listing = [
    repo("Org", "Known", "1"), repo("Org", "ReadOnly", "1", false), repo("Org", "Same", "1"), repo("Org", "Changed", "2"),
    repo("Org", "New", "1"), repo("Org", "Gone", "1"), repo("Org", "Old", "1", true, { archived: true }), null, { name: "x" },
  ];
  const got = reposToCheck(listing, { seen: { "org/same": "1", "org/changed": "1" }, known: ["org/known"], removed: ["ORG/gone"] });
  assert.deepEqual(got.map(repoKey), ["org/changed", "org/new"]);
  assert.deepEqual(got[1], { owner: "Org", repo: "New", branch: "main", pushed: "1" });
  assert.equal(reposToCheck([repo("o", "r", "1", true, { default_branch: "dev" })])[0].branch, "dev");
});

test("a repo with no task setup keeps the fields it always had", () => {
  const s = taskSetup(null);
  assert.equal(s.configured, false);
  assert.equal(s.folder, "Tasks");
  assert.deepEqual(s.fields.filter((f) => f.on).map((f) => f.key), ["status", "priority", "assignee", "area", "requested_by"]);
  assert.deepEqual(s.fields.find((f) => f.key === "status").values, ["To Do", "In Progress", "Testing", "Blocked", "Waiting", "Done"]);
});

test("a task setup starts from a new project's fields and changes what it names", () => {
  const s = taskSetup({ folder: "/Work/", fields: {
    type: { values: ["Feature", " Bug ", "Bug", 3, ""] }, area: { on: false }, part_of: { prop: "epic" },
    sprint: { folder: "Plan/Sprints/", length_days: 7 }, estimate: { unit: "hours" }, due: { prop: "parent" },
  }, custom: [{ name: "Component", kind: "choice", values: ["App"] }, { name: "status" }, { name: "" }, { name: "Notes", kind: "bogus", on: false }] });
  assert.equal(s.configured, true);
  assert.equal(s.folder, "Work");
  const f = Object.fromEntries(s.fields.map((x) => [x.key, x]));
  assert.equal(f.type.on, true);
  assert.deepEqual(f.type.values, ["Feature", "Bug"]);
  assert.equal(f.area.on, false);
  assert.equal(f.part_of.prop, "epic");
  assert.equal(f.due.prop, "due", "parent is never a field's property");
  assert.equal(f.sprint.folder, "Plan/Sprints");
  assert.equal(f.sprint.length_days, 7);
  assert.equal(f.estimate.unit, "hours");
  assert.deepEqual([f.component.label, f.component.kind, f.component.values, f.component.custom], ["Component", "choice", ["App"], true]);
  assert.deepEqual([f.notes.kind, f.notes.on], ["text", false]);
  assert.deepEqual([f.reviewer.kind, f.reviewer.on], ["person", false], "Reviewer starts off in a new setup");
  assert.equal(taskSetup({ fields: { reviewer: { on: true } } }).fields.find((x) => x.key === "reviewer").on, true);
  assert.equal(taskSetup(null).fields.find((x) => x.key === "reviewer").on, false);
  assert.equal(s.fields.filter((x) => x.custom).length, 2, "a field named like a built-in one, or with no name, is left out");
  assert.equal(taskSetup({ fields: { sprint: { length_days: 0 } } }).fields.find((x) => x.key === "sprint").length_days, 14);
});

test("a task setup round-trips through its JSON, and problems are named", () => {
  const s = taskSetup({ fields: { part_of: { prop: "epic" }, due: { on: false } }, custom: [{ name: "Component", kind: "choice", values: ["App", "Docs"] }] });
  const json = taskSetupJson(s);
  assert.deepEqual(json.fields.part_of, { on: true, prop: "epic" });
  assert.deepEqual(json.fields.sprint, { on: true, folder: "Sprints", length_days: 14 });
  assert.deepEqual(json.fields.reviewer, { on: false });
  assert.deepEqual(json.custom, [{ name: "Component", prop: "component", kind: "choice", values: ["App", "Docs"] }]);
  assert.deepEqual(taskSetup(JSON.parse(JSON.stringify(json))), s);
  assert.equal(taskSetupProblem(s), "");
  const clash = { ...s, fields: s.fields.map((f) => (f.key === "due" ? { ...f, prop: "Epic" } : f)) };
  assert.match(taskSetupProblem(clash), /Parent task and Due date both use the property Epic/);
  const parent = { ...s, fields: s.fields.map((f) => (f.key === "part_of" ? { ...f, prop: "parent" } : f)) };
  assert.match(taskSetupProblem(parent), /not parent/);
  const empty = { ...s, fields: s.fields.map((f) => (f.key === "type" ? { ...f, values: [] } : f)) };
  assert.match(taskSetupProblem(empty), /Type needs at least one value/);
  assert.equal(isFieldProp("part_of"), true);
  assert.equal(isFieldProp("2x"), false);
  assert.equal(TASK_FIELDS.length, 15);
});

test("the marker keeps the task setup when the repo settings are shared again, and the other way round", () => {
  const r = { owner: "o", repo: "notes", label: "Notes", branch: "main", folder: "Wiki", home: "Home.md", vault: true };
  const tasks = taskSetupJson(taskSetup({}));
  const first = mergeMarker(null, { repo: r });
  assert.deepEqual(JSON.parse(first), JSON.parse(markerText(r)));
  const withTasks = mergeMarker(first, { tasks });
  assert.deepEqual(JSON.parse(withTasks).tasks, tasks);
  assert.equal(JSON.parse(withTasks).folder, "Wiki");
  const shared = JSON.parse(mergeMarker(withTasks + "", { repo: { ...r, folder: "", label: "New" } }));
  assert.deepEqual(shared.tasks, tasks, "sharing the repo settings keeps the task setup");
  assert.equal(shared.label, "New");
  assert.equal("folder" in shared, false, "a setting cleared on the device is cleared in the file");
  assert.deepEqual(Object.keys(shared).slice(0, 2), ["label", "branch"]);
  assert.deepEqual(parseMarker(mergeMarker("{ broken", { tasks }), "o", "r").label, "r");
});

test("a task is a note in the setup's tasks folder, or in any Tasks folder with no setup", () => {
  const setup = taskSetup({ folder: "Work/Items" });
  assert.equal(isSetupTask(setup, "Work/Items/Fix it.md"), true);
  assert.equal(isSetupTask(setup, "work/items/Sub/Fix it.md"), true);
  assert.equal(isSetupTask(setup, "Work/Items/data.csv"), false);
  assert.equal(isSetupTask(setup, "Tasks/Fix it.md"), false);
  assert.equal(isSetupTask(taskSetup(null), "Notes/Tasks/Fix it.md"), true);
  assert.equal(isSetupTask(null, "Home.md"), false);
});

test("a field's value is written into the front matter, which is added when missing", () => {
  assert.equal(withProps("# Hi\n", [["status", "To Do"], ["due", ""]]), '---\nstatus: To Do\ndue: ""\n---\n# Hi\n');
  const note = "---\nstatus: To Do\n---\n# Hi\n";
  assert.equal(withProps(note, [["status", "Done"]]), "---\nstatus: Done\n---\n# Hi\n");
  assert.equal(withProps(note, [["status", "Done"], ["type", "Bug"]], { keep: true }), "---\nstatus: To Do\ntype: Bug\n---\n# Hi\n");
  assert.equal(withProps(note, [["status", "Done"]], { keep: true }), note);
  assert.equal(withProps(note, [["part_of", "[[Big one]]"]]), '---\nstatus: To Do\npart_of: "[[Big one]]"\n---\n# Hi\n');
});

test("each kind of field saves its value its own way", () => {
  const f = (kind) => ({ kind });
  assert.equal(fieldValue(f("task"), "Big one"), "[[Big one]]");
  assert.equal(fieldValue(f("sprint"), "[[Sprint 3|now]]"), "[[Sprint 3]]");
  assert.equal(fieldValue(f("number"), " 5.0 "), "5");
  assert.equal(fieldValue(f("number"), "lots"), null);
  assert.equal(fieldValue(f("date"), "2026-12-01"), "2026-12-01");
  assert.equal(fieldValue(f("date"), "soon"), null);
  assert.equal(fieldValue(f("choice"), ""), "");
  assert.equal(linkName("[[Sprint 3#Goal]]"), "Sprint 3");
  assert.equal(linkName("plain"), "plain");
});

test("a new task starts with the fields that are on", () => {
  const props = newTaskProps(taskSetup({ fields: { due: { on: false } }, custom: [{ name: "Size", kind: "choice", values: ["S", "M"] }] }));
  assert.deepEqual(props, [["status", "To Do"], ["priority", "Medium"], ["assignee", ""], ["area", ""], ["requested_by", ""],
    ["type", "Task"], ["part_of", ""], ["sprint", ""], ["estimate", ""], ["size", "S"]]);
  const withRev = newTaskProps(taskSetup({ fields: { reviewer: { on: true } } }));
  assert.deepEqual(withRev.slice(4, 6), [["requested_by", ""], ["reviewer", ""]]);
});

test("a new task's reviewer is who asked for it, else who makes it, and only when Reviewer is on", () => {
  const on = taskSetup({ fields: { reviewer: { on: true } } });
  const note = (rev, asked) => `---\nrequested_by: ${asked}\nreviewer: ${rev}\n---\n# Hi\n`;
  assert.equal(withReviewer(on, note('""', "Ann Smith"), "bob"), note('Ann Smith', "Ann Smith"));
  assert.equal(withReviewer(on, note('""', '""'), "bob"), note("bob", '""'));
  assert.equal(withReviewer(on, note("Cy", "Ann"), "bob"), note("Cy", "Ann"), "a reviewer the template sets stays");
  assert.equal(withReviewer(on, note('""', '""'), ""), note('""', '""'));
  assert.equal(withReviewer(taskSetup({}), note('""', "Ann"), "bob"), note('""', "Ann"), "off: nothing changes");
  const renamed = taskSetup({ fields: { reviewer: { on: true, prop: "approver" }, requested_by: { prop: "asked_by" } } });
  assert.equal(withReviewer(renamed, "---\nasked_by: 'Zoë'\n---\n", ""), "---\nasked_by: 'Zoë'\napprover: Zoë\n---\n");
});

// ---- parent tasks and subtasks ----

const TASKS = [
  { path: "Tasks/Launch.md", props: { id: "T-1", type: "Epic", status: "In Progress" } },
  { path: "Tasks/Write the docs.md", props: { id: "T-10", status: "Done", part_of: "[[Launch]]" } },
  { path: "Tasks/Fix the build.md", props: { id: "T-2", status: "In Progress", part_of: "[[Launch|the launch]]" } },
  { path: "Tasks/Pick a name.md", props: { id: "T-3", status: "To Do", part_of: ["[[Launch]]"] } },
  { path: "Tasks/Name ideas.md", props: { id: "T-4", status: "Cancelled", part_of: "[[Pick a name]]" } },
  { path: "Tasks/Unrelated.md", props: { id: "T-5", status: "To Do", part_of: "" } },
];
const taskIndex = new LinkIndex(TASKS.map((n) => n.path));
const resolveTask = (t, from) => taskIndex.resolve(t, from);

test("a task's subtasks: the open ones first, by ID, and how many are done", () => {
  const s = subtasksOf(TASKS, "Tasks/Launch.md", { resolve: resolveTask });
  assert.deepEqual(s.tasks.map((t) => t.id), ["T-2", "T-3", "T-10"]);
  assert.deepEqual([s.done, s.total], [1, 3]);
  assert.equal(s.tasks[2].status, "Done");
  assert.deepEqual(subtasksOf(TASKS, "Tasks/Pick a name.md", { resolve: resolveTask }).done, 1);
  assert.equal(subtasksOf(TASKS, "Tasks/Unrelated.md", { resolve: resolveTask }).total, 0);
});

test("the setup's own names: a renamed parent property, and its last status counts as done", () => {
  const setup = taskSetup({ fields: { part_of: { prop: "epic" }, status: { values: ["Open", "Shipped"] } } });
  assert.equal(fieldProp(setup, "part_of"), "epic");
  assert.equal(fieldProp(null, "part_of"), "part_of");
  const notes = [{ path: "Tasks/A.md", props: { epic: "[[B]]", status: "Shipped" } }, { path: "Tasks/B.md", props: {} }];
  const s = subtasksOf(notes, "Tasks/B.md", { prop: "epic", resolve: (t) => new LinkIndex(notes.map((n) => n.path)).resolve(t), setup });
  assert.deepEqual([s.done, s.total], [1, 1]);
  assert.ok(isDoneStatus("won't do") && isDoneStatus("Done") && !isDoneStatus("Waiting") && !isDoneStatus(""));
  assert.equal(linkTarget(["", "[[X#h]]"]), "X");
});

test("a parent can't be the task itself, or one of its subtasks at any depth", () => {
  const opts = { resolve: resolveTask };
  assert.equal(parentProblem(TASKS, "Tasks/Launch.md", "Tasks/Launch.md", opts), "A task can't be its own parent.");
  assert.match(parentProblem(TASKS, "Tasks/Launch.md", "Tasks/Pick a name.md", opts), /Pick a name is already under Launch/);
  assert.match(parentProblem(TASKS, "Tasks/Launch.md", "Tasks/Name ideas.md", opts), /Name ideas is already under Launch/);
  assert.equal(parentProblem(TASKS, "Tasks/Pick a name.md", "Tasks/Unrelated.md", opts), "");
  assert.equal(parentProblem(TASKS, "Tasks/Name ideas.md", "Tasks/Launch.md", opts), "");
  assert.equal(parentProblem(TASKS, "Tasks/Launch.md", "", opts), "");
  // A loop already in the notes doesn't hang it.
  const loop = [{ path: "Tasks/A.md", props: { part_of: "[[B]]" } }, { path: "Tasks/B.md", props: { part_of: "[[A]]" } }, { path: "Tasks/C.md", props: {} }];
  const idx = new LinkIndex(loop.map((n) => n.path));
  assert.equal(parentProblem(loop, "Tasks/C.md", "Tasks/A.md", { resolve: (t) => idx.resolve(t) }), "");
});

test("the parent picker takes an ID, a name, or the ID and name its list shows", () => {
  assert.equal(findTask(TASKS, "t-3")?.path, "Tasks/Pick a name.md");
  assert.equal(findTask(TASKS, "Fix the build")?.path, "Tasks/Fix the build.md");
  assert.equal(findTask(TASKS, "[[Launch]]")?.path, "Tasks/Launch.md");
  assert.equal(findTask(TASKS, "T-10 Write the docs")?.path, "Tasks/Write the docs.md");
  assert.equal(findTask(TASKS, "Nothing like it"), null);
  assert.equal(findTask(TASKS, " "), null);
});

// ---- sprints ----

const SPRINTS = [
  { path: "Sprints/Sprint 1.md", props: { start: new Date("2026-11-02T00:00:00Z"), end: new Date("2026-11-15T00:00:00Z"), goal: "Get going" } },
  { path: "Sprints/Sprint 3.md", props: { start: "2026-11-30", end: "2026-12-13" } },
  { path: "Sprints/Sprint 2.md", props: { start: "2026-11-16", end: "2026-11-29" } },
  { path: "Sprints/Sprint 0.md", props: { start: "2026-10-19", end: "2026-11-01" } },
];

test("dates as days, whether YAML made them dates or JSON strings", () => {
  assert.equal(isoDay(new Date("2026-11-02T00:00:00Z")), "2026-11-02");
  assert.equal(isoDay("2026-11-02"), "2026-11-02");
  assert.equal(isoDay("soon"), "");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 14), "2027-01-14");
});

test("sprints: the latest first, and which is now and next", () => {
  const list = sprints(SPRINTS, "2026-11-14");
  assert.deepEqual(list.map((s) => `${s.name} ${s.when}`), ["Sprint 3 later", "Sprint 2 next", "Sprint 1 now", "Sprint 0 past"]);
  assert.equal(list[2].goal, "Get going");
  assert.equal(list[2].end, "2026-11-15");
  assert.deepEqual(sprintChoices(list).map((s) => s.name), ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 0"]);
  assert.equal(sprints(SPRINTS, "2026-11-15").find((s) => s.when === "now").name, "Sprint 1");
  assert.equal(sprints(SPRINTS, "2026-11-16").find((s) => s.when === "now").name, "Sprint 2");
});

test("a sprint block's sprint: current, next, a name or a link", async () => {
  const { pickSprint } = await import("../src/vault.js");
  const list = sprints(SPRINTS, "2026-11-14");
  const name = (said, resolve) => pickSprint(list, said, resolve)?.name ?? null;
  assert.equal(name("current"), "Sprint 1");
  assert.equal(name("Now"), "Sprint 1");
  assert.equal(name("next"), "Sprint 2");
  assert.equal(name("sprint 3"), "Sprint 3");
  assert.equal(name("[[Sprint 0]]"), "Sprint 0");
  assert.equal(name("[[S0]]", (t) => (t === "S0" ? list[3].path : null)), "Sprint 0", "a link is found by where it leads");
  assert.equal(name("Sprint 9"), null);
  assert.equal(name(""), null);
  assert.equal(pickSprint(sprints(SPRINTS, "2030-01-01"), "current"), null, "no sprint going on");
  assert.equal(pickSprint(sprints(SPRINTS, "2030-01-01"), "next"), null);
});

test("the next sprint counts on, starts after the last ends (or today), and lasts the setup's length", () => {
  const last = sprints(SPRINTS, "2026-11-14")[0];
  assert.deepEqual(nextSprint(last, 14, "2026-11-14"), { name: "Sprint 4", start: "2026-12-14", end: "2026-12-27" });
  assert.deepEqual(nextSprint(last, 7, "2027-01-05"), { name: "Sprint 4", start: "2027-01-05", end: "2027-01-11" });
  assert.deepEqual(nextSprint({ name: "Autumn", end: "" }, 14, "2026-11-14"), { name: "Autumn 2", start: "2026-11-14", end: "2026-11-27" });
  assert.equal(nextSprint(null, 14, "2026-11-14").name, "Sprint 1");
});

test("a sprint's tasks by status in the setup's order, with how many are done and how many points", () => {
  const notes = [
    { path: "Tasks/A.md", props: { id: "T-2", sprint: "[[Sprint 1]]", status: "Done", estimate: 3 } },
    { path: "Tasks/B.md", props: { id: "T-1", sprint: "[[Sprint 1]]", status: "In Progress", estimate: "5" } },
    { path: "Tasks/C.md", props: { id: "T-3", sprint: "[[Sprint 1]]", status: "To Do" } },
    { path: "Tasks/D.md", props: { id: "T-4", sprint: "[[Sprint 2]]", status: "To Do", estimate: 8 } },
    { path: "Tasks/E.md", props: { id: "T-5", sprint: "[[Sprint 1]]", status: "On hold", estimate: 1 } },
  ];
  const idx = new LinkIndex([...notes.map((n) => n.path), ...SPRINTS.map((n) => n.path)]);
  const setup = taskSetup({});
  const s = sprintTasks(notes, "Sprints/Sprint 1.md", { setup, resolve: (t) => idx.resolve(t) });
  assert.deepEqual(s.groups.map((g) => `${g.status}: ${g.tasks.map((t) => t.id).join(" ")}`), ["To Do: T-3", "In Progress: T-1", "Done: T-2", "On hold: T-5"]);
  assert.deepEqual([s.done, s.total], [1, 4]);
  assert.deepEqual(s.points, { done: 3, total: 9, unit: "points" });
  assert.deepEqual(s.open.map((t) => t.id), ["T-1", "T-3", "T-5"]);
  assert.equal(sprintTasks(notes.slice(2, 3), "Sprints/Sprint 1.md", { setup, resolve: (t) => idx.resolve(t) }).points, null);
});

test("top tasks with sprints: the current sprint's free ones, else the next sprint's, marked", () => {
  const t = (path, props) => ({ path, props: { status: "To Do", assignee: "", priority: "Medium", area: "Docs", ...props } });
  const notes = [
    t("Tasks/Now high.md", { id: "T-1", sprint: "[[Sprint 1]]", priority: "High" }),
    t("Tasks/Now taken.md", { id: "T-2", sprint: "[[Sprint 1]]", assignee: "Ann Example" }),
    t("Tasks/Now art.md", { id: "T-3", sprint: "[[Sprint 1]]", area: "Art" }),
    t("Tasks/Next.md", { id: "T-4", sprint: "[[Sprint 2]]" }),
    t("Tasks/No sprint.md", { id: "T-5", priority: "High" }),
  ];
  const idx = new LinkIndex([...notes.map((n) => n.path), ...SPRINTS.map((n) => n.path)]);
  const opts = { resolve: (x) => idx.resolve(x), now: "Sprints/Sprint 1.md", next: "Sprints/Sprint 2.md" };
  const paths = (list) => list.map((n) => `${n.path}${n.nextSprint ? " (next)" : ""}`);
  assert.deepEqual(paths(sprintSuggestions(notes, opts)), ["Tasks/Now high.md", "Tasks/Now art.md"]);
  assert.deepEqual(paths(sprintSuggestions(notes, { ...opts, areas: ["Docs"] })), ["Tasks/Now high.md"]);
  assert.deepEqual(paths(sprintSuggestions(notes, { ...opts, areas: ["Features"] })), [], "the next sprint has none in the area either");
  const used = notes.map((n) => (n.props.sprint === "[[Sprint 1]]" ? { ...n, props: { ...n.props, status: "In Progress" } } : n));
  assert.deepEqual(paths(sprintSuggestions(used, opts)), ["Tasks/Next.md (next)"], "none left now: the next sprint's");
  assert.deepEqual(paths(sprintSuggestions(used, { ...opts, now: null })), ["Tasks/Next.md (next)"], "no sprint running: the next one's");
  assert.deepEqual(sprintSuggestions(used, { ...opts, next: null }), [], "none left and no next sprint");
  assert.equal(sprintSuggestions(notes, { ...opts, now: null, next: null }), null, "no sprints: picked as before");
  const custom = notes.map((n) => ({ ...n, props: { ...n.props, iteration: n.props.sprint, sprint: "" } }));
  assert.deepEqual(paths(sprintSuggestions(custom, { ...opts, prop: "iteration" })), ["Tasks/Now high.md", "Tasks/Now art.md"]);
});

test("claiming a task from the next sprint moves it into the current one, in the same change", async () => {
  const { claimTask } = await import("../src/vault.js");
  assert.equal(claimTask('---\nid: T-4\nstatus: To Do\nassignee: ""\nsprint: "[[Sprint 2]]"\n---\n', "Ann Example", [["sprint", "[[Sprint 1]]"]]),
    '---\nid: T-4\nstatus: In Progress\nassignee: Ann Example\nsprint: "[[Sprint 1]]"\n---\n');
});

test("a task's commits, from its commits property, the newest first", () => {
  const a = "a".repeat(40);
  const b = "b".repeat(40);
  assert.deepEqual(taskCommitLinks([
    `[aaaaaaa](https://github.com/Me/Vault/commit/${a}) T-5: older`,
    `https://github.com/me/app/commit/${b}`,
    "not a commit",
    "[x](https://example.com/commit/abcdef1) elsewhere",
    null,
  ]), [
    { short: "bbbbbbb", url: `https://github.com/me/app/commit/${b}`, repo: "me/app", title: "" },
    { short: "aaaaaaa", url: `https://github.com/Me/Vault/commit/${a}`, repo: "me/vault", title: "T-5: older" },
  ]);
  assert.deepEqual(taskCommitLinks(`[aaaaaaa](https://github.com/me/vault/commit/${a}) one (with brackets) [and more]`).map((c) => c.title),
    ["one (with brackets) [and more]"]);
  assert.deepEqual(taskCommitLinks(undefined), []);
  assert.deepEqual(taskCommitLinks(""), []);
});

// ---- relations ----

const REL = [
  { path: "Tasks/A.md", props: { id: "T-1", status: "To Do", blocked_by: ["[[B]]"], related: "[[C]]" } },
  { path: "Tasks/B.md", props: { id: "T-2", status: "In Progress", after: [["C"]] } },
  { path: "Tasks/C.md", props: { id: "T-3", status: "Done", before: ["[[A]]", "[[Nowhere]]"] } },
  { path: "Tasks/D.md", props: { id: "T-4", status: "To Do", blocked_by: "[[C]]" } },
];
const relResolve = (t) => REL.find((n) => n.path === `Tasks/${t}.md`)?.path ?? null;

test("a relation property is a list of links, however it's written", () => {
  assert.deepEqual(linkList(["[[A]]", "[[B|the B]]", "[[A]]"]), ["A", "B"]);
  assert.deepEqual(linkList([["A"]]), ["A"], "[[A]] unquoted is a list in a list in YAML");
  assert.deepEqual(linkList("[[A]], [[B]]"), ["A", "B"]);
  assert.deepEqual(linkList("A"), ["A"]);
  assert.deepEqual(linkList(""), []);
  assert.deepEqual(linkList(undefined), []);
  assert.deepEqual(relationFields(null).map((f) => f.key), ["blocked_by", "related", "after", "before"]);
  assert.deepEqual(relationFields(taskSetup({})).map((f) => f.prop), ["blocked_by", "related", "after", "before"], "on in a new setup");
  assert.deepEqual(relationFields(taskSetup(null)), [], "off in a repo with no setup, like the other newer fields");
  assert.deepEqual(relationFields(taskSetup({ fields: { related: { on: false }, after: { prop: "follows" } } })).map((f) => f.prop), ["blocked_by", "follows", "before"]);
  assert.deepEqual(newTaskProps(taskSetup({})).map(([k]) => k).filter((k) => ["blocked_by", "related", "after", "before"].includes(k)), [],
    "a new task gets no empty relation lines");
  assert.deepEqual(fieldValue({ kind: "tasks" }, ["B", "[[C]]", "B", ""]), ["[[B]]", "[[C]]"]);
});

test("a list property is saved on one line, and replaces a list written one item per line", () => {
  const note = '---\nid: T-1\nblocked_by:\n  - "[[B]]"\n- "[[C]]"\nstatus: To Do\n---\nText\n';
  assert.equal(setProps(note, [["blocked_by", ["[[B]]", "[[D]]"]]]), '---\nid: T-1\nblocked_by: ["[[B]]", "[[D]]"]\nstatus: To Do\n---\nText\n');
  assert.equal(setProps(note, [["blocked_by", []]]), "---\nid: T-1\nblocked_by: []\nstatus: To Do\n---\nText\n");
  assert.equal(setProps("---\nid: T-1\n---\n", [["related", ["[[A]]"]]]), '---\nid: T-1\nrelated: ["[[A]]"]\n---\n');
});

test("a task shows its relations both ways", () => {
  const groups = (path) => Object.fromEntries(taskRelations(REL, path, REL.find((n) => n.path === path).props, { resolve: relResolve })
    .map((g) => [g.label, g.tasks.map((t) => `${t.path ?? t.name}${t.own ? "" : " (theirs)"}`)]));
  assert.deepEqual(groups("Tasks/A.md"), { "Blocked by": ["Tasks/B.md"], "Comes after": ["Tasks/C.md (theirs)"], Related: ["Tasks/C.md"] });
  assert.deepEqual(groups("Tasks/B.md"), { Blocks: ["Tasks/A.md (theirs)"], "Comes after": ["Tasks/C.md"] });
  assert.deepEqual(groups("Tasks/C.md"), { Blocks: ["Tasks/D.md (theirs)"], "Comes before": ["Tasks/A.md", "Tasks/B.md (theirs)", "Nowhere"], Related: ["Tasks/A.md (theirs)"] });
  const c = taskRelations(REL, "Tasks/A.md", REL[0].props, { resolve: relResolve });
  assert.deepEqual(c[0].tasks[0], { path: "Tasks/B.md", name: "B", id: "T-2", status: "In Progress", done: false, own: true, key: "blocked_by" });
  const off = taskSetup({ fields: { related: { on: false } } });
  assert.equal(taskRelations(REL, "Tasks/A.md", REL[0].props, { setup: off, resolve: relResolve }).some((g) => g.label === "Related"), false);
});

test("a task blocked by an open task isn't a top task", () => {
  const blocked = blockedTasks(REL, { resolve: relResolve });
  assert.deepEqual([...blocked], ["Tasks/A.md"], "D is blocked only by C, which is done");
  assert.deepEqual(suggestTasks(REL, { blocked }).map((n) => n.path), ["Tasks/D.md"]);
  assert.deepEqual([...blockedTasks(REL, { setup: taskSetup({ fields: { blocked_by: { on: false } } }), resolve: relResolve })], []);
});

test("a note's blocks: found on a line of their own, in ``` or ~~~ fences", () => {
  assert.equal(hasBlock("# A\n\n```subtasks\n```\n", "subtasks"), true);
  assert.equal(hasBlock("# A\r\n\r\n~~~ Commits \r\n~~~\r\n", "commits"), true);
  assert.equal(hasBlock("# A\n\n```subtasks-old\n```\n", "subtasks"), false);
  assert.equal(hasBlock("Write ```subtasks to show them.", "subtasks"), false);
});

test("a new task gets its blocks under its title, unless it already has any", () => {
  const blocks = "```subtasks\n```\n\n```relations\n```\n\n```commits\n```\n";
  assert.equal(withBlocks(defaultNote("Do it"), TASK_BLOCKS), `# Do it\n\n${blocks}`);
  assert.equal(withBlocks("---\nid: T-1\n---\n# Do it\n\n**As** me\n", TASK_BLOCKS), `---\nid: T-1\n---\n# Do it\n\n${blocks}\n**As** me\n`);
  assert.equal(withBlocks("---\nid: T-1\n---\nNo title\n", TASK_BLOCKS), `---\nid: T-1\n---\n${blocks}\nNo title\n`);
  assert.equal(withBlocks("", SPRINT_BLOCKS), "```sprint\n```\n");
  const own = "# Do it\n\nText\n\n```commits\n```\n";
  assert.equal(withBlocks(own, TASK_BLOCKS), own, "the template chose its own blocks");
  assert.equal(withBlocks("# A\r\nB\r\n", SPRINT_BLOCKS), "# A\n\n```sprint\n```\n\nB\n", "LF");
});

test("blank tasks put commits below comments and keep custom templates' layouts", () => {
  const base = "---\nid: T-1\n---\n\n# A task\n";
  const draft = withTaskLayout(base);
  assert.ok(draft.startsWith(base + "\n"));
  assert.deepEqual([...draft.matchAll(/^```([a-z-]+)$/gm)].map((m) => m[1]),
    ["subtasks", "relations", "description", "acceptance-criteria", "comments", "commits", "work-history"]);
  const custom = base + "\n## Purpose\n\nCustom text.\n";
  assert.equal(withTaskLayout(custom), withBlocks(custom, TASK_BLOCKS));
  assert.equal(withTaskLayout(custom + "\n```commits\n```\n"), custom + "\n```commits\n```\n");
  assert.equal(withTaskLayout(draft), draft);
});

test("a top tasks order: the four orders, a few other ways to say them, else none", () => {
  for (const o of ["priority-newest", "priority-oldest", "newest", "oldest"]) assert.equal(taskOrder(o), o);
  assert.equal(taskOrder("Priority"), "priority-newest");
  assert.equal(taskOrder("priority only"), "priority-newest");
  assert.equal(taskOrder("Newest first"), "newest");
  assert.equal(taskOrder("oldest_first"), "oldest");
  assert.equal(taskOrder("by due date"), "");
  assert.equal(taskOrder(undefined), "");
});

test("a plain Markdown link to another file in the repo, read as GitHub reads it", () => {
  assert.deepEqual(relativeLink("Add%20a%20vault.md", "How To/Start.md"), { path: "How To/Add a vault.md", heading: null });
  assert.deepEqual(relativeLink("../Guide.md#callouts", "How To/Start.md"), { path: "Guide.md", heading: "callouts" });
  assert.deepEqual(relativeLink("./Sub/Page.md#the-first-steps", "How To/Start.md"), { path: "How To/Sub/Page.md", heading: "the first steps" });
  assert.deepEqual(relativeLink("/Tasks/Get%20set%20up.md", "How To/Start.md"), { path: "Tasks/Get set up.md", heading: null }, "from the top");
  assert.deepEqual(relativeLink("Data/Reading list.csv", "Home.md"), { path: "Data/Reading list.csv", heading: null });
  for (const href of ["https://example.com/a.md", "mailto:a@example.com", "#/settings?fields", "#heading", "//cdn/x.md", "../../Out.md", "", null]) {
    assert.equal(relativeLink(href, "How To/Start.md"), null, String(href));
  }
});

test("the tasks with an open question, for their person: asked for, reviewing, or their agent has it; newest first", async () => {
  const { questionTasks, questionOf } = await import("../src/vault.js");
  const n = (path, props) => ({ path, props });
  const notes = [
    n("Tasks/A.md", { id: "T-1", question: "Books only?", requested_by: "Ann Lee" }),
    n("Tasks/B.md", { id: "T-2", question: "  ", requested_by: "Ann Lee" }),
    n("Tasks/C.md", { id: "T-3", question: "Which colour?", reviewer: "Bob" }),
    n("Tasks/D.md", { id: "T-4", question: "Done anyway?", requested_by: "Ann Lee", status: "Done" }),
    n("Tasks/E.md", { id: "T-5", question: "Where is it kept?", assignee: "Ánn Lee (Claude)" }),
    n("Notes/F.md", { id: "T-6", question: "Not a task", requested_by: "Ann Lee" }),
    n("Tasks/G.md", { id: "T-7", question: "Whose?", requested_by: ["Bob", "Ann Lee"] }),
  ];
  assert.deepEqual(questionTasks(notes, "ann lee").map((t) => [t.props.id, t.question]),
    [["T-7", "Whose?"], ["T-5", "Where is it kept?"], ["T-1", "Books only?"]]);
  assert.deepEqual(questionTasks(notes, "Bob").map((t) => t.props.id), ["T-7", "T-3"]);
  assert.deepEqual(questionTasks(notes).map((t) => t.props.id), ["T-7", "T-5", "T-3", "T-1"], "no owner: everyone's");
  assert.deepEqual(questionTasks(notes, "Nobody"), []);
  assert.equal(questionOf({ question: ["a", "b"] }), "a b");
  assert.equal(questionOf({}), "");
});

test("the answer written on a task: after its Answer line or heading, up to the next heading", async () => {
  const { taskAnswer } = await import("../src/vault.js");
  const task = (answer) => `---\nid: T-1\nquestion: "Books only?"\n---\n\n# Reading list\n\n## ❓ Question\n\n- **(a) Books only**\n\n${answer}\n## Acceptance criteria\n\n- [ ] Done\n`;
  assert.equal(taskAnswer(task("**Answer:**\n")), "");
  assert.equal(taskAnswer(task("**Answer:** a, books only\n")), "a, books only");
  assert.equal(taskAnswer(task("**Answer:**\n\nArticles too.\nAnd films.\n")), "Articles too.\nAnd films.");
  assert.equal(taskAnswer(task("### ✍️ Answer\n\nb\n")), "b");
  assert.equal(taskAnswer("---\nid: T-2\n---\n# No question\n"), "");
  const bare = (answer) => `---\nid: T-3\n---\n# Bare\n\n## ❓ Question\n\n- **(a)** this\n\n**Answer:**${answer}\n\n- [ ] Fill it in\n- [x] Started\n`;
  assert.equal(taskAnswer(bare("")), "", "no heading over the criteria: they aren't the answer");
  assert.equal(taskAnswer(bare(" (a)")), "(a)");
  assert.equal(taskAnswer("# T\n\n**Answer:**\n\n---\n\nMore notes\n"), "", "a --- line ends it too");
});

test("a task with an open question needs a decision until it's answered and cleared", async () => {
  const { taskState } = await import("../src/vault.js");
  const body = "\n# A task\n\n**As** a reader, **I want** a list, **so that** I pick.\n\n- [ ] It works\n";
  const s = taskState(`---\nid: T-1\nquestion: "Books only, or articles too?"\n---\n${body}`);
  assert.equal(s.state, "decision");
  assert.equal(s.reason, "Waiting for an answer: Books only, or articles too?");
  assert.equal(taskState(`---\nid: T-1\nquestion: ""\n---\n${body}`).state, "ready", "an empty question is no question");
  assert.equal(taskState(`---\nid: T-1\nquestion:\n---\n${body}`).state, "ready");
  assert.equal(taskState(`---\nid: T-1\nready: yes\nquestion: "Still?"\n---\n${body}`).state, "ready", "ready: yes wins");
});

test("mentions in a note: @login, not in code, an email or a path; with the heading above and the line", async () => {
  const { findMentions } = await import("../src/vault.js");
  const note = [
    "---", "owner: @Nobody", "---",
    "# Plan",
    "Ask @Ann-Lee and @bob, then @Ann-Lee again.",
    "Mail ann@example.com, see https://medium.com/@writer and `@code`.",
    "```", "@infence", "```",
    "## Next ##",
    "- [ ] @bob: check it (@bo-, @-x, @a--b)",
  ].join("\n");
  assert.deepEqual(findMentions(note).map((m) => [m.login, m.line, m.heading]),
    [["Ann-Lee", 5, "Plan"], ["bob", 5, "Plan"], ["bob", 11, "Next"]]);
  assert.equal(findMentions(note)[2].text, "- [ ] @bob: check it (@bo-, @-x, @a--b)");
  assert.deepEqual(findMentions("@start of the file").map((m) => m.login), ["start"]);
  assert.deepEqual(findMentions("~~~md\n@no\n~~~\n(@yes)").map((m) => m.login), ["yes"]);
  assert.equal(findMentions("x ".repeat(100) + "@long").at(0).text.length, 160);
});

test("section text contributes links and mentions while nested code stays code", async () => {
  const { findMentions } = await import("../src/vault.js");
  const note = [
    "---", "owner: @outside", "---", "# Note", "````comments",
    "@ann, check [[Home]] and `@inline`.", "- @bob, I replied.",
    "```js", "@example [[Missing example]]", "```",
    "@carol has more.", "````", "@after, too.",
    "~~~markdown", "```comments", "@another-example", "```", "~~~",
  ].join("\r\n");
  assert.deepEqual(findWikilinks(note).map((l) => l.target), ["Home"]);
  assert.deepEqual(findMentions(note).map((m) => [m.login, m.line, m.heading, m.answered]), [
    ["ann", 6, "Comments", true], ["bob", 7, "Comments", false], ["carol", 11, "Comments", false], ["after", 13, "Note", false],
  ]);
});

test("task decisions use the written criteria and leave comments and history out", async () => {
  const { taskState, taskAnswer } = await import("../src/vault.js");
  const note = "# A task\n\n**Answer:**\n\n```acceptance-criteria\n- [ ] Finished\n```\n\n```comments\nTBD in discussion.\n```\n\n```work-history\n- [ ] Decide on an old approach.\n```\n";
  assert.equal(taskState(note).state, "ready");
  assert.equal(taskState(note.replace("Finished", "Decide with the team")).state, "decision");
  assert.equal(taskState(note.replace("- [ ] Finished\n", "")).state, "placeholder");
  assert.equal(taskAnswer(note), "");
  assert.equal(taskAnswer(note.replace("**Answer:**", "**Answer:** Use the first one.")), "Use the first one.");
});

test("posting appends a Markdown comment to the selected fence and suggests the previous login", async () => {
  const { findMentions } = await import("../src/vault.js");
  const note = "# Plan\n\n```comments\nEarlier text.\n```\n\n~~~comments\n~~~\n";
  const now = new Date("2026-11-17T11:22:30Z");
  const posted = addComment(note, 2, 4, "@alice Please check.\n\nNext paragraph.", "Bob", now);
  assert.equal(posted, note.replace("Earlier text.\n", "Earlier text.\n\n- **Bob** · 2026-11-17 11:22 UTC\n\n    @alice Please check.\n\n    Next paragraph.\n"));
  const comment = blockContents(posted, "comments")[0];
  assert.equal(commentReply(comment, "alice"), "@Bob ");
  assert.equal(commentReply(comment, "bob"), "");
  assert.equal(commentReply("Earlier text. @alice", "bob"), "");
  assert.equal(commentReply("~~~md\n- **example** · 2026-11-17 11:22 UTC\n~~~", "bob"), "");
  assert.deepEqual(findMentions(posted).map(({ login, heading }) => [login, heading]), [["alice", "Comments"]]);
  assert.equal(addComment(note, 2, 7, "Wrong block", "bob", now), note);
  assert.equal(addComment(note, 6, 7, "  ", "bob", now), note);
});

test("code in a multiline comment stays in the fence and a local post has no reply login", async () => {
  const { findMentions } = await import("../src/vault.js");
  const source = "   ```comments\n   ```\n\nAfter.\n";
  const posted = addComment(source, 0, 1, "```js\n@not-a-mention\n```\n\n@alice Hello", "", new Date("2026-11-17T11:22Z"));
  assert.match(posted, /\*\*Unknown user\*\*.*UTC/);
  assert.match(posted, /^ {7}```js$/m);
  assert.deepEqual(findMentions(posted).map(({ login }) => login), ["alice"]);
  assert.equal(commentReply(posted, "bob"), "");
  assert.ok(posted.endsWith("   ```\n\nAfter.\n"));
});

test("a mention with a reply right under it is answered: the next line starts with someone else's @login", async () => {
  const { findMentions } = await import("../src/vault.js");
  const note = [
    "@ann what do you think?",
    "@bob Fine by me.",
    "@ann and this one?",
    "",
    "@bob no reply: a blank line comes first",
    "@bob the same person again is no reply",
    "- @ann in a list",
    "  - [x] @bob replied in the list",
    "> @ann quoted",
    "> @bob quoted reply",
    "@ann the last line",
  ].join("\n");
  assert.deepEqual(findMentions(note).map((m) => [m.login, m.line, m.answered]), [
    ["ann", 1, true], ["bob", 2, true], ["ann", 3, false], ["bob", 5, false], ["bob", 6, true],
    ["ann", 7, true], ["bob", 8, true], ["ann", 9, true], ["bob", 10, true], ["ann", 11, false],
  ], "a talk back and forth: each line answers the one above it");
});

test("mentions sort into open, seen and answered, and the seen list keeps only live mentions", async () => {
  const { mentionKey, sortMentions, withSeenMentions } = await import("../src/vault.js");
  const a = { path: "Tasks/One, two.md", login: "Ann", text: "@Ann look", answered: false };
  const b = { path: "Notes/B.md", login: "ann", text: "@ann and here", answered: false };
  const c = { path: "Notes/B.md", login: "ann", text: "@ann replied to", answered: true };
  assert.match(mentionKey(a.path, a), /^Tasks\/One, two\.md#[0-9a-f]{8}$/);
  assert.equal(mentionKey(a.path, a), mentionKey(a.path, { ...a, login: "ann" }), "the login's case doesn't count");
  assert.notEqual(mentionKey(a.path, a), mentionKey(a.path, { ...a, text: "@Ann look again" }), "a changed line shows again");
  const seen = [mentionKey(a.path, a)];
  assert.deepEqual(sortMentions([a, b, c], seen), { open: [b], seen: [a], answered: [c] });
  assert.deepEqual(sortMentions([a, b, c], mentionKey(a.path, a)).seen, [a], "one key written as text");
  assert.deepEqual(sortMentions([a, b], null).open, [a, b]);
  assert.deepEqual(withSeenMentions([...seen, "Gone.md#00000000"], [b, c], [a, b, c]),
    [mentionKey(a.path, a), mentionKey(b.path, b)], "gone and answered mentions drop out, each key once");
});

test("blockContents gives what each fenced block of a name holds", async () => {
  const { blockContents } = await import("../src/vault.js");
  const note = "# Inbox\n```needs-attention\nshow: mentions\nlogin: ann\n```\n\n~~~~ needs-attention\nowner: Ann\n```\nstill in\n~~~~\n```other\nx\n```";
  assert.deepEqual(blockContents(note, "needs-attention"), ["show: mentions\nlogin: ann", "owner: Ann\n```\nstill in"]);
  assert.deepEqual(blockContents("```needs-attention\nnever closed", "needs-attention"), []);
});

test("a vault's people come from its inboxes' github and owner, each login once", async () => {
  const { vaultPeople } = await import("../src/vault.js");
  const people = vaultPeople([
    { path: "Notes/Inbox.md", props: { owner: "Zed Q", github: "zedq" } },
    { path: "Notes/Inboxes/Ann.md", props: { owner: "Ann Lee", github: "@Ann-Lee" } },
    { path: "Notes/Inboxes/Copy.md", props: { owner: "Ann again", github: "ann-lee" } },
    { path: "Notes/Inboxes/Nobody.md", props: { owner: "No Login", github: "" } },
    { path: "Notes/Inboxes/Bad.md", props: { github: "not a login" } },
    { path: "Notes/Inboxes/Bob.md", props: { github: "bob" } },
  ]);
  assert.deepEqual(people, [
    { login: "Ann-Lee", name: "Ann Lee", path: "Notes/Inboxes/Ann.md" },
    { login: "bob", name: "bob", path: "Notes/Inboxes/Bob.md" },
    { login: "zedq", name: "Zed Q", path: "Notes/Inbox.md" },
  ]);
});

test("a new-tasks block: its owner and its items, list marks and checkboxes taken off", async () => {
  const { newTasksBlock } = await import("../src/vault.js");
  assert.deepEqual(newTasksBlock("owner: Ann Lee\n- Buy milk\n\n* [ ] Fix the [[Home]] page\n2. Call @bob\nPlain line: with a colon\n"),
    { owner: "Ann Lee", items: ["Buy milk", "Fix the [[Home]] page", "Call @bob", "Plain line: with a colon"], lines: [1, 3, 4, 5] });
  assert.deepEqual(newTasksBlock(""), { owner: "", items: [], lines: [] });
  assert.deepEqual(newTasksBlock("  Owner : 'Bo'\n-   \n"), { owner: "Bo", items: [], lines: [] });
});

test("a new-tasks item is changed on its line, keeping its mark, or taken out when empty", async () => {
  const { editNewTask } = await import("../src/vault.js");
  const note = "# Inbox\n\n```new-tasks\nowner: Ann\n- One\n* [ ] Two\nThree\n```\n";
  assert.equal(editNewTask(note, 4, "One", "  One, said\nbetter "), "# Inbox\n\n```new-tasks\nowner: Ann\n- One, said better\n* [ ] Two\nThree\n```\n");
  assert.equal(editNewTask(note, 5, "Two", "2"), "# Inbox\n\n```new-tasks\nowner: Ann\n- One\n* [ ] 2\nThree\n```\n");
  assert.equal(editNewTask(note, 6, "Three", "3"), "# Inbox\n\n```new-tasks\nowner: Ann\n- One\n* [ ] Two\n3\n```\n");
  assert.equal(editNewTask(note, 5, "Two", "  "), "# Inbox\n\n```new-tasks\nowner: Ann\n- One\nThree\n```\n", "empty: taken out");
  assert.equal(editNewTask(note.replace(/\n/g, "\r\n"), 4, "One", "1"), "# Inbox\n\n```new-tasks\nowner: Ann\n- 1\n* [ ] Two\nThree\n```\n", "CRLF");
  assert.equal(editNewTask(note, 4, "Something else", "1"), note, "the line changed since: nothing");
  assert.equal(editNewTask(note, 99, "One", "1"), note, "no such line");
});

test("an item added to a new-tasks block goes just above its closing fence, or last when it has none", async () => {
  const { addNewTask } = await import("../src/vault.js");
  const note = "# Inbox\n\n```new-tasks\nowner: Ann\n- One\n```\n\nAfter\n";
  assert.equal(addNewTask(note, 5, "  Two\nlines "), "# Inbox\n\n```new-tasks\nowner: Ann\n- One\n- Two lines\n```\n\nAfter\n");
  assert.equal(addNewTask("```new-tasks\n- One", 1, "Two"), "```new-tasks\n- One\n- Two", "no closing fence: last");
  assert.equal(addNewTask(note, 5, "   "), note, "nothing to add");
  assert.equal(addNewTask(note, 99, "Two"), note, "no such line");
});


test("board uses configured properties and filters cards without including epics", () => {
  const setup = taskSetup({ fields: { status: { prop: "stage", values: ["Ready", "Done"] } } });
  const props = { stage: "ready", area: ["UI", "Core"], assignee: "Zoë (Codex)", sprint: "[[S1]]", type: "Bug" };
  const notes = [
    { path: "Tasks/Match.md", props: { ...props, id: "T-1", priority: "High" } },
    { path: "Tasks/Epic.md", props: { ...props, type: "Epic" } },
    { path: "Tasks/Other.md", props: { ...props, stage: "Done", sprint: "[[S2]]" } },
  ];
  const options = { columns: [], areas: [], assignee: "", sprint: "", types: [] };
  assert.deepEqual(boardColumns(notes, options, setup).map(({ status, cards }) => [status, cards.length]),
    [["Ready", 1], ["Done", 1]]);
  const handle = { path: "Tasks/Handle.md", props: { stage: "Ready", assignee: "@zoe" } };
  const identity = { name: "Zoë", login: "zoe" };
  assert.deepEqual(boardColumns([...notes, handle], options, setup, { identity })[0].cards.map((card) => card.path),
    ["Tasks/Match.md", "Tasks/Handle.md"]);
  const filters = { columns: ["Done", "Ready"], areas: ["ui"], assignee: "Zoe", sprint: "current", types: ["bug"] };
  const columns = boardColumns(notes, filters, setup, { sprint: { path: "S1.md" }, resolve: (name) => name + ".md" });
  assert.deepEqual(columns[0], { status: "Done", cards: [] });
  assert.deepEqual(columns[1].cards, [{ path: "Tasks/Match.md", id: "T-1", status: "ready", priority: "High",
    area: ["UI", "Core"], assignee: "Zoë (Codex)" }]);
});


test("assignee suggestions merge vault users and GitHub collaborators without duplicates", () => {
  assert.deepEqual(assigneeOptions([{ name: "Zoë", login: "zoe" }], [{ login: "Zoe" }, { login: "pat" }], "pat"), [
    { label: "", value: "@pat" }, { label: "Zoë", value: "@zoe" },
  ]);
  assert.deepEqual(assigneeOptions([{ name: "Zoë", login: "zoe" }], []), [{ label: "Zoë", value: "@zoe" }]);
  assert.ok(assigneeMatches("Zoe (Codex)", { name: "Zoë", login: "zoe" }));
  assert.ok(assigneeMatches("@ZOE", { name: "Different name", login: "zoe" }));
  assert.ok(assigneeMatches("Zoe", { name: "Different name", login: "zoe" }));
  assert.equal(assigneeMatches("zoe@example.com", { name: "Zoë", login: "zoe" }), false);
  assert.match(setProps("---\nassignee: Old name\n---\n", [["assignee", "@zoe"]]), /assignee: "@zoe"/);
});


test("an open task matches the inbox identity and a reassignment surfaces after Seen", () => {
  const setup = taskSetup({ fields: { assignee: { prop: "person" }, status: { prop: "stage" } } });
  const zoe = { name: "Zoë", login: "zoe" };
  const pat = { name: "Pat", login: "pat" };
  const task = (person, rest = {}) => ({ path: "Tasks/One.md", props: { id: "T-1", person, stage: "To Do", ...rest } });
  assert.equal(assignmentTasks([task("Zoe (agent)")], setup, zoe).length, 1);
  assert.equal(assignmentTasks([task("@zoe", { stage: "Done" }), task("@zoe", { type: "Epic" })], setup, zoe).length, 0);
  assert.equal(assignmentTasks([task("zoe@example.com")], setup, { name: "zoe@example.com", login: "zoe" }).length, 0);
  const before = assignmentTasks([task("@Zoe", { assignment_id: "first" })], setup, zoe);
  const seen = withSeenAssignments([], before, before);
  assert.equal(sortAssignments(before, seen).open.length, 0);
  assert.equal(sortAssignments(before, seen).seen.length, 1);
  const elsewhere = task("@pat", { assignment_id: "second" });
  assert.equal(assignmentTasks([elsewhere], setup, zoe).length, 0);
  assert.equal(sortAssignments(assignmentTasks([elsewhere], setup, pat), seen).open.length, 1);
  const after = assignmentTasks([task("@Zoe", { assignment_id: "third" })], setup, zoe);
  assert.equal(sortAssignments(after, seen).open.length, 1);
});

test("reviews honour custom fields/statuses, explicit reviewer, assignee fallback and identity", () => {
  const setup = taskSetup({ fields: { status: { prop: "state", values: ["Open", "Verify", "Done"] }, reviewer: { prop: "check_by" }, assignee: { prop: "assigned" }, type: { prop: "kind" } } });
  const n = (id, props) => ({ path: `Tasks/${id}.md`, props: { id, state: "Verify", ...props } });
  const notes = [n("N-1", { check_by: "Ana Lee", assigned: "Other" }), n("N-2", { check_by: "Other", assigned: "Ana Lee" }),
    n("N-3", { check_by: "", assigned: "Ana Lee (Agent)" }), n("N-4", { check_by: ["Other", "@ana"] }),
    n("N-5", { check_by: "Ana Lee", state: "Done" }), n("N-6", { check_by: "Ana Lee", kind: "Epic" }),
    n("N-7", { check_by: "ana@example.test" }), n("N-8", { check_by: "Ana Lee", state: "Open" })];
  assert.deepEqual(reviewTasks(notes, setup, { name: "Ana Lee", login: "ana" }, ["Verify"]).map((t) => t.id), ["N-4", "N-3", "N-1"]);
  assert.deepEqual(reviewTasks(notes, setup, { name: "Ana Lee" }), [], "default Testing does not treat every open state as review");
  assert.deepEqual(reviewTasks(notes, setup, {} , ["Verify"]), [], "no implicit identity");
  assert.equal(reviewTasks([n("N-9", { assigned: "ANA LEE" })], setup, { name: "Ana Lee" }, ["verify"])[0].status, "Verify");
});

test("a task waiting for review is not a personal work claim", async () => {
  const { claimedTasks } = await import("../src/vault.js");
  const task = { path: "Tasks/Review.md", props: { assignee: "Ana Lee", status: "Testing" } };
  assert.deepEqual(claimedTasks([task], "Ana Lee"), []);
  assert.equal(claimedTasks([{ ...task, props: { ...task.props, status: "In Progress" } }], "Ana Lee").length, 1);
});

test("multiline captures edit one closed block, preserving owner, neighbours and literal option text", async () => {
  const { newTaskItems, replaceNewTasks } = await import("../src/vault.js");
  const note = "Before\n```new-tasks\nowner: Ann\n- One\n* [ ] Two\n```\nAfter\n```new-tasks\nowner: Ben\n- Other\n```\n";
  const expected = "owner: Ann\n- One\n* [ ] Two";
  const items = newTaskItems("- Changed\r\n\r\n2. Added\n- owner: A thought\n```");
  assert.deepEqual(items, ["Changed", "Added", "owner: A thought", "```"]);
  const result = replaceNewTasks(note, 1, 5, expected, items);
  assert.equal(result, "Before\n```new-tasks\nowner: Ann\n- Changed\n- Added\n- owner: A thought\n- ```\n```\nAfter\n```new-tasks\nowner: Ben\n- Other\n```\n");
  assert.equal(replaceNewTasks(note, 1, 5, expected, []), "Before\n```new-tasks\nowner: Ann\n```\nAfter\n```new-tasks\nowner: Ben\n- Other\n```\n", "deleting every item keeps the block and its owner");
  assert.equal(replaceNewTasks(note.replaceAll("\n", "\r\n"), 1, 5, expected, ["New"]), note.replace("- One\n* [ ] Two", "- New"));
  assert.equal(replaceNewTasks(note, 1, 5, "stale content", ["New"]), null, "stale captures cannot overwrite changes");
  assert.equal(replaceNewTasks(note, 1, 4, expected, ["New"]), null, "an unclosed block cannot consume following content");
  assert.equal(replaceNewTasks(note, 1, 10, expected, ["New"]), null, "cannot replace another block");
});

test("capture attachments support other files, safe names, collisions and moving between notes", async () => {
  const { captureAttachment, captureAttachmentText } = await import("../src/vault.js");
  const now = new Date("2026-11-18T12:00:00Z");
  const file = { name: "Report [final].PDF", type: "application/pdf", size: 64 };
  const used = ["Elsewhere/Report-final-2026-11-18-12-00-00-deadbeef.pdf"];
  const a = captureAttachment(file, "Notes/Inbox.md", "Attachments", used, now, "deadbeef");
  assert.equal(a.path, "Attachments/Report-final-2026-11-18-12-00-00-deadbeef-2.pdf");
  assert.match(a.link, /^\[\[[^|]+\|Report  final .PDF\]\]$/);
  assert.equal(new LinkIndex([...used, a.path]).resolve(a.name, "Tasks/A new task.md"), a.path);
  const picture = captureAttachment({ name: "paste.png", type: "image/png", size: 10 }, "Inbox.md", "Attachments", [], now, "imagekey");
  assert.match(picture.link, /^!\[\[/);
  assert.throws(() => captureAttachment({ ...file, size: 0 }, "Inbox.md", "", []), /empty/);
  assert.throws(() => captureAttachment({ ...file, size: 11 * 1024 * 1024 }, "Inbox.md", "", []), /10 MiB/);
  assert.throws(() => captureAttachment(file, "Inbox.md", "../outside", []), /valid Attachments/);
  assert.deepEqual(captureAttachmentText("- First\n- Second", 3, a.link), { text: "- First " + a.link + "\n- Second", cursor: 8 + a.link.length });
  assert.equal(captureAttachmentText("- First\n- Second", 13, a.link).text, "- First\n- Second " + a.link);
  assert.equal(captureAttachmentText("", 0, picture.link).text, picture.link);
});

test("a mention in Comments is answered by the next dated comment that starts with @ someone else", async () => {
  const { findMentions, sortMentions } = await import("../src/vault.js");
  const note = [
    "# Task", "", "```comments", "- @ann-lee please draw the set.", "",
    "- **ann-lee** · 2026-11-18 19:22 UTC", "", "    @bob-k the first picture is up for your review: does this style work?",
    "    Two square sizes, above.", "",
    "- **bob-k** · 2026-11-18 19:31 UTC", "", "    @ann-lee yup, 2nd iteration, and we will be golden", "",
    "- **ann-lee** · 2026-11-18 20:00 UTC", "", "    @bob-k the second one is up too.", "",
    "- **ann-lee** · 2026-11-18 20:05 UTC", "", "    @bob-k and a third, no reply yet.", "```", "",
    "@bob-k outside Comments, with a dated comment far below, stays open.",
  ].join("\n");
  const found = findMentions(note);
  const state = found.map((m) => [m.login, m.line, m.answered]);
  assert.deepEqual(state, [
    ["ann-lee", 4, true], // ann-lee answers in the next comment, to @bob-k
    ["bob-k", 8, true], // the saved reply format: header, blank line, indented "@ann-lee ..."
    ["ann-lee", 13, true],
    ["bob-k", 17, false], // the next comment starts with @bob-k again: a follow-up, not bob-k's reply
    ["bob-k", 21, false], // the last comment: nothing after it
    ["bob-k", 24, false], // outside Comments only the very next line counts
  ]);
  const ms = sortMentions(found.map((m) => ({ ...m, path: "Tasks/X.md" })));
  assert.deepEqual(ms.answered.map((m) => m.line), [4, 8, 13]);
  assert.deepEqual(ms.open.map((m) => m.line), [17, 21, 24]);
  // A comment of words with no @ isn't a reply; the plain format (the reply on the very next line) still counts.
  assert.equal(findMentions("```comments\n- **ann-lee** · 2026-11-18 19:22 UTC\n\n    @bob-k look\n\n- **bob-k** · 2026-11-18 19:31 UTC\n\n    Looks good.\n```")[0].answered, false);
  assert.equal(findMentions("```comments\n- @bob-k look\n- @ann-lee done\n```").find((m) => m.login === "bob-k").answered, true);
});

test("a page's contents nest its headings and its subpages follow their parent property", () => {
  assert.equal(pageListDepth("toc", {}), 3);
  assert.equal(pageListDepth("toc", { depth: 4 }), 4);
  assert.equal(pageListDepth("toc", { depth: 1 }), null);
  assert.equal(pageListDepth("subpages", null), 1);
  assert.equal(pageListDepth("subpages", { depth: "2" }), 2);
  assert.equal(pageListDepth("subpages", { depth: 4 }), null);
  const heads = [{ name: "Title", level: 1 }, { name: "A", level: 2 }, { name: "A1", level: 3 }, { name: "A1x", level: 4 }, { name: "B", level: 2 }, { name: "B0", level: 4 }];
  const names = (nodes) => nodes.map((n) => n.children.length ? [n.name, names(n.children)] : n.name);
  assert.deepEqual(names(tocTree(heads)), [["A", ["A1"]], "B"]);
  assert.deepEqual(names(tocTree(heads, 4)), [["A", [["A1", ["A1x"]]]], ["B", ["B0"]]]);
  const index = new LinkIndex(["Home.md", "Wiki/Guides.md", "Wiki/Setup.md", "Wiki/Deep.md", "Tasks/C-1.md", "Loop.md"]);
  const notes = [
    { path: "Wiki/Setup.md", props: { parent: "[[Home]]" } },
    { path: "Wiki/Guides.md", props: { parent: "[[Home]]" } },
    { path: "Wiki/Deep.md", props: { parent: "[[Guides]]" } },
    { path: "Tasks/C-1.md", props: { parent: "[[Home]]" } },
    { path: "Loop.md", props: { parent: "[[Loop]]" } },
    { path: "Home.md", props: { parent: "[[Deep]]" } },
  ];
  const opts = { resolve: (t, from) => index.resolve(t, from), skip: (p) => p.startsWith("Tasks/") };
  const paths = (nodes) => nodes.map((n) => n.children.length ? [n.path, paths(n.children)] : n.path);
  assert.deepEqual(paths(subpagesOf(notes, "Home.md", opts)), ["Wiki/Guides.md", "Wiki/Setup.md"]);
  // Deeper levels nest, and Home, looped back to from Deep, isn't shown again.
  assert.deepEqual(paths(subpagesOf(notes, "Home.md", { ...opts, depth: 3 })), [["Wiki/Guides.md", ["Wiki/Deep.md"]], "Wiki/Setup.md"]);
  assert.deepEqual(subpagesOf(notes, "Loop.md", opts), []);
  // An `order` number puts a page first; pages without one follow by name.
  const ordered = notes.map((n) => n.path === "Wiki/Setup.md" ? { ...n, props: { ...n.props, order: 1 } } : n);
  assert.deepEqual(paths(subpagesOf(ordered, "Home.md", opts)), ["Wiki/Setup.md", "Wiki/Guides.md"]);
});
