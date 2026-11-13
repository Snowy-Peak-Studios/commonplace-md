import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LinkIndex, parseWikilink, findNavBlock, prepareForPreview, findWikilinks, defaultNote, fillTemplate, isoDate, titleProblem, splitFrontMatter,
  inboxCandidates, ownInboxPath,
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
  ];
  assert.deepEqual(suggestTasks(notes).map((n) => n.path), ["Tasks/New high.md", "Tasks/Old high.md", "Tasks/Medium.md"]);
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
