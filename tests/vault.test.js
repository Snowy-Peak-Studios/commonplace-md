import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LinkIndex, parseWikilink, findNavBlock, prepareForPreview, findWikilinks, defaultNote, fillTemplate, isoDate, titleProblem, splitFrontMatter,
  inboxCandidates, ownInboxPath, MARKER, parseMarker, markerText, reposToCheck, repoKey,
  TASK_FIELDS, taskSetup, taskSetupJson, taskSetupProblem, isFieldProp, mergeMarker,
  isSetupTask, withProps, linkName, fieldValue, newTaskProps,
  fieldProp, linkTarget, isDoneStatus, subtasksOf, parentProblem, findTask,
  isoDay, addDays, sprints, sprintChoices, nextSprint, sprintTasks, commitRepos, commitIsFor, taskCommits,
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
  assert.ok(isTaskPath("Wiki/Tasks/A.md") && isTaskPath("tasks/a.md"));
  assert.ok(!isTaskPath("Tasks/Deeper/A.md") && !isTaskPath("MyTasks/A.md") && !isTaskPath("Tasks/a.csv"));
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


test("a vault's marker file round-trips its settings", () => {
  assert.equal(MARKER, ".commonplace.json");
  const r = { owner: "Org", repo: "Game", label: "The game", branch: "dev", folder: "Wiki", home: "Home.md",
    inbox: "Notes/Inbox.md", inboxes: "Notes/Inboxes", notes: "Notes", template: "Templates/Note.md", vault: true };
  const back = parseMarker(markerText(r), "Org", "Game");
  assert.deepEqual(back, r);
});

test("a marker keeps only what an invite link can set, with defaults", () => {
  const r = parseMarker('{"folder": "/Wiki/", "token": "x", "vault": "yes", "home": 3}', "o", "notes");
  assert.deepEqual(r, { owner: "o", repo: "notes", label: "notes", branch: "", folder: "Wiki", home: "README.md",
    inbox: "", inboxes: "", notes: "", template: "", vault: false });
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
  assert.deepEqual(s.fields.find((f) => f.key === "status").values, ["To Do", "In Progress", "Waiting", "Done"]);
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
  assert.equal(s.fields.filter((x) => x.custom).length, 2, "a field named like a built-in one, or with no name, is left out");
  assert.equal(taskSetup({ fields: { sprint: { length_days: 0 } } }).fields.find((x) => x.key === "sprint").length_days, 14);
});

test("a task setup round-trips through its JSON, and problems are named", () => {
  const s = taskSetup({ fields: { part_of: { prop: "epic" }, due: { on: false } }, custom: [{ name: "Component", kind: "choice", values: ["App", "Docs"] }] });
  const json = taskSetupJson(s);
  assert.deepEqual(json.fields.part_of, { on: true, prop: "epic" });
  assert.deepEqual(json.fields.sprint, { on: true, folder: "Sprints", length_days: 14 });
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
  assert.equal(TASK_FIELDS.length, 10);
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
    { path: "Tasks/E.md", props: { id: "T-5", sprint: "[[Sprint 1]]", status: "Blocked", estimate: 1 } },
  ];
  const idx = new LinkIndex([...notes.map((n) => n.path), ...SPRINTS.map((n) => n.path)]);
  const setup = taskSetup({});
  const s = sprintTasks(notes, "Sprints/Sprint 1.md", { setup, resolve: (t) => idx.resolve(t) });
  assert.deepEqual(s.groups.map((g) => `${g.status}: ${g.tasks.map((t) => t.id).join(" ")}`), ["To Do: T-3", "In Progress: T-1", "Done: T-2", "Blocked: T-5"]);
  assert.deepEqual([s.done, s.total], [1, 4]);
  assert.deepEqual(s.points, { done: 3, total: 9, unit: "points" });
  assert.deepEqual(s.open.map((t) => t.id), ["T-1", "T-3", "T-5"]);
  assert.equal(sprintTasks(notes.slice(2, 3), "Sprints/Sprint 1.md", { setup, resolve: (t) => idx.resolve(t) }).points, null);
});

test("a task's commits: the repos to search, and the messages that start with its ID", () => {
  assert.deepEqual(commitRepos("Me/Vault", undefined), ["me/vault"]);
  assert.deepEqual(commitRepos("me/vault", ["Me/App", "https://github.com/me/site.git", "me/vault", "not a repo", ""]),
    ["me/vault", "me/app", "me/site"]);
  assert.deepEqual(commitRepos("me/vault", "me/app, me/docs"), ["me/vault", "me/app", "me/docs"]);
  assert.equal(commitIsFor("C-12: the README folds", "C-12"), true);
  assert.equal(commitIsFor("c-12: lower case", "C-12"), true);
  assert.equal(commitIsFor("C-11, C-12: two new tasks", "C-12"), true);
  assert.equal(commitIsFor("C-11 and C-12: two", "C-12"), true);
  assert.equal(commitIsFor("C-12: another task", "C-1"), false);
  assert.equal(commitIsFor("C-12x: not an ID", "C-12"), false);
  assert.equal(commitIsFor("Fix C-12 later", "C-12"), false);
  assert.equal(commitIsFor("Merge\n\nC-12: in the body", "C-12"), false);
  assert.equal(commitIsFor("C-12: anything", ""), false);
  const items = [
    { sha: "a".repeat(40), html_url: "u1", commit: { message: "C-5: older\n\nbody", committer: { date: "2026-11-13T10:00:00.000+01:00" } }, repository: { full_name: "Me/Vault" } },
    { sha: "b".repeat(40), html_url: "u2", commit: { message: "C-5: newer", committer: { date: "2026-11-14T08:30:00.000+00:00" } }, repository: { full_name: "me/app" } },
    { sha: "a".repeat(40), html_url: "u1", commit: { message: "C-5: older", committer: { date: "2026-11-13T10:00:00.000+01:00" } } },
    { sha: "c".repeat(40), html_url: "u3", commit: { message: "C-50: another task", committer: { date: "2026-11-15T00:00:00Z" } } },
  ];
  assert.deepEqual(taskCommits(items, "C-5"), [
    { sha: "b".repeat(40), short: "bbbbbbb", title: "C-5: newer", date: "2026-11-14T08:30:00.000+00:00", url: "u2", repo: "me/app" },
    { sha: "a".repeat(40), short: "aaaaaaa", title: "C-5: older", date: "2026-11-13T10:00:00.000+01:00", url: "u1", repo: "me/vault" },
  ]);
  assert.deepEqual(taskCommits(undefined, "C-5"), []);
});
