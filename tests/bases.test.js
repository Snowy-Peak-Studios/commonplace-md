import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseBase, parseExpr, evalExpr, matchesFilter, candidatePaths, runView, usesFileMtime, noteProps, reviveDates, compareValues,
} from "../src/bases.js";

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const note = (path, props = {}) => ({ path, props });
const ev = (src, props = {}, path = "Notes/x.md", opts) => evalExpr(src, note(path, props), opts);

test("expressions: precedence, brackets, not, and/or", () => {
  assert.equal(ev("1 + 2 * 3"), 7);
  assert.equal(ev("(1 + 2) * 3"), 9);
  assert.equal(ev("10 - 4 - 3"), 3);
  assert.equal(ev("7 % 4 + -1"), 2);
  assert.equal(ev("1 + 2 * 3 == 7 && 2 > 1"), true);
  assert.equal(ev("!false && true || false"), true);
  assert.equal(ev("!(true || false)"), false);
  assert.equal(ev("false || 1 < 2 && 3 < 2"), false);
});

test("expressions: text, comparisons and properties", () => {
  const props = { status: "To Do", priority: "High", cost: 3, elements: ["Fire", "Air"], tags: ["task", "area/cards"] };
  assert.equal(ev('status == "To Do"', props), true);
  assert.equal(ev("status != 'Done'", props), true);
  assert.equal(ev('note.priority == "High"', props), true);
  assert.equal(ev('missing != "Done"', props), true, "a missing property isn't Done");
  assert.equal(ev("missing == null", props), true);
  assert.equal(ev('"a" + "b" + cost', props), "ab3");
  assert.equal(ev("cost >= 3 && cost < 4", props), true);
  assert.equal(ev('cost == "3"', props), true, "a number equals the same number written as text");
  assert.equal(ev('"T-2" < "T-10"', props), true, "text compares numbers inside it by size");
  assert.equal(ev("missing > 1", props), false, "nothing is bigger or smaller than an empty value");
  assert.equal(ev('elements.contains("Air")', props), true);
  assert.equal(ev('elements.contains("Water")', props), false);
  assert.equal(ev('status.contains("Do")', props), true);
  assert.equal(ev('status.lower().startsWith("to") && status.endsWith("Do")', props), true);
  assert.equal(ev("missing.isEmpty() && !status.isEmpty()", props), true);
  assert.equal(ev("elements.length", props), 2);
  assert.equal(ev('note["priority"]', props), "High");
  assert.equal(ev('file.hasTag("area")', props), true, "a nested tag counts for its parent");
  assert.equal(ev('file.hasTag("#task", "other")', props), true);
  assert.equal(ev('file.hasTag("areas")', props), false);
});

test("expressions: if()", () => {
  const rank = 'if(priority == "High", 1, if(priority == "Medium", 2, 3))';
  assert.equal(ev(rank, { priority: "High" }), 1);
  assert.equal(ev(rank, { priority: "Medium" }), 2);
  assert.equal(ev(rank, {}), 3);
  assert.equal(ev("if(false, 1)"), null);
});

test("expressions: file fields and inFolder", () => {
  const path = "Tasks/sub/My task.md";
  assert.equal(ev("file.name", {}, path), "My task.md");
  assert.equal(ev("file.basename", {}, path), "My task");
  assert.equal(ev("file.path", {}, path), path);
  assert.equal(ev("file.folder", {}, path), "Tasks/sub");
  assert.equal(ev("file.ext", {}, path), "md");
  assert.equal(ev('file.inFolder("Tasks")', {}, "Tasks/x.md"), true);
  assert.equal(ev('file.inFolder("Tasks")', {}, path), true, "subfolders count");
  assert.equal(ev('file.inFolder("Tasks/")', {}, "Tasks/x.md"), true);
  assert.equal(ev('file.inFolder("Tasks")', {}, "TasksOld/x.md"), false);
  assert.equal(ev('file.inFolder("Tasks")', {}, "Tasks.md"), false);
  const dates = new Map([[path, new Date("2026-11-05T10:00:00Z")]]);
  assert.equal(ev("file.mtime", {}, path, { dates }).toISOString().slice(0, 10), "2026-11-05");
  assert.equal(ev("file.mtime", {}, "Tasks/x.md", { dates }), null);
});

test("expressions: what isn't supported says so", () => {
  assert.throws(() => parseExpr("today()"), /function “today\(\)” .* isn't supported/);
  assert.throws(() => parseExpr("file.hasLink(x)"), /“.hasLink\(\)” .* isn't supported/);
  assert.throws(() => parseExpr("status == "), /ends too early/);
  assert.throws(() => parseExpr('status == "Done'), /no closing quote/);
  assert.throws(() => parseExpr("a ? b : c"), /isn't something the app understands/);
  assert.throws(() => parseExpr("(1 + 2"), /“\)” missing/);
  const base = { formulas: { a: "formula.b + 1", b: "formula.a" } };
  assert.throws(() => ev("formula.a", {}, "x.md", { base }), /depends on itself/);
});

test("filter groups: and, or, not, nested", () => {
  const n = note("Tasks/a.md", { status: "To Do", priority: "High" });
  assert.equal(matchesFilter(null, n), true);
  assert.equal(matchesFilter({ and: ['status == "To Do"', 'priority == "High"'] }, n), true);
  assert.equal(matchesFilter({ and: ['status == "To Do"', 'priority == "Low"'] }, n), false);
  assert.equal(matchesFilter({ or: ['status == "Done"', 'priority == "High"'] }, n), true);
  assert.equal(matchesFilter({ not: ['status == "Done"', 'priority == "Low"'] }, n), true);
  assert.equal(matchesFilter({ not: ['status == "Done"', 'priority == "High"'] }, n), false, "not: none of them may hold");
  assert.equal(matchesFilter({ and: ['file.inFolder("Tasks")', { or: ['status == "Done"', { not: ['priority == "Low"'] }] }] }, n), true);
  assert.throws(() => matchesFilter({ xor: ["true"] }, n), /must be and, or or not/);
});

test("candidatePaths narrows by the top-level inFolder", () => {
  const paths = ["Tasks/a.md", "Tasks/sub/b.md", "TasksOld/c.md", "Tasks/pic.png", "Home.md", "Notes/d.md"];
  assert.deepEqual(candidatePaths({ filters: { and: ['file.inFolder("Tasks")'] } }, paths), ["Tasks/a.md", "Tasks/sub/b.md"]);
  assert.deepEqual(candidatePaths({ filters: 'file.inFolder("Tasks")' }, paths), ["Tasks/a.md", "Tasks/sub/b.md"]);
  assert.deepEqual(candidatePaths({ filters: { and: ['file.inFolder("Tasks")', 'file.inFolder("Tasks/sub")'] } }, paths), ["Tasks/sub/b.md"]);
  // Inside an or, or with no folder at all, it can't narrow.
  const all = ["Tasks/a.md", "Tasks/sub/b.md", "TasksOld/c.md", "Home.md", "Notes/d.md"];
  assert.deepEqual(candidatePaths({ filters: { or: ['file.inFolder("Tasks")', 'file.inFolder("Notes")'] } }, paths), all);
  assert.deepEqual(candidatePaths({ filters: null }, paths), all);
});

test("sorting: empty values last both ways, numbers as numbers, text with numbers inside", () => {
  const base = parseBase(`views:
  - type: table
    name: Up
    order: [file.name, n]
    sort: [{ property: n, direction: ASC }]
  - type: table
    name: Down
    order: [file.name, n]
    sort: [{ property: note.n, direction: DESC }]
  - type: table
    name: Text
    order: [file.name]
    sort: [{ property: t, direction: ASC }]
`);
  const notes = [note("a.md", { n: 10, t: "T-10" }), note("b.md", { n: 2, t: "T-2" }), note("c.md", {}), note("d.md", { n: 1, t: "" }), note("e.md", { n: 2, t: "t-3" })];
  const order = (i) => runView(base, i, notes).groups[0].rows.map((r) => r.path);
  assert.deepEqual(order(0), ["d.md", "b.md", "e.md", "a.md", "c.md"], "ties fall back to the file name");
  assert.deepEqual(order(1), ["a.md", "b.md", "e.md", "d.md", "c.md"]);
  assert.deepEqual(order(2), ["b.md", "e.md", "a.md", "c.md", "d.md"]);
  assert.ok(compareValues(new Date("2026-01-02"), new Date("2026-01-10")) < 0);
  assert.ok(compareValues(false, true) < 0);
});

test("front matter: properties, bad YAML, dates kept through JSON", () => {
  assert.deepEqual(noteProps("---\nid: TASK-1\ntags: [task]\n---\n# x"), { id: "TASK-1", tags: ["task"] });
  assert.deepEqual(noteProps("---\nid: [oops\n---\n"), {});
  assert.deepEqual(noteProps("# no front matter"), {});
  const props = noteProps("---\nwhen: 2026-11-07\n---\n");
  const back = reviveDates(JSON.parse(JSON.stringify(props)));
  assert.ok(back.when instanceof Date && back.when.getTime() === props.when.getTime());
});

// ---- an example vault's bases, run over a few hand-made notes ----

const tasks = [
  note("Tasks/Alpha.md", { id: "TASK-1", status: "Done", priority: "High", area: "Docs" }),
  note("Tasks/Beta.md", { id: "TASK-2", status: "To Do", priority: "Low", area: "UI" }),
  note("Tasks/Gamma.md", { id: "TASK-3", status: "In Progress", priority: "Medium", area: "Docs", assignee: "Ann Example", requested_by: "Ben Example" }),
  note("Tasks/Delta.md", { id: "TASK-4", status: "To Do", priority: "High", area: "UI" }),
  note("Tasks/Epsilon.md", { id: "TASK-5", status: "To Do", priority: "High", area: "Docs" }),
  note("Tasks/Zeta.md", { id: "TASK-6", status: "Done", priority: "Medium", area: "UI" }),
  note("Tasks/sub/Eta.md", { id: "TASK-7", status: "To Do", area: "Ops" }),
  note("Tasks/Iota.md", { id: "TASK-8", priority: "Low", area: "Docs" }),
  note("TasksOld/Theta.md", { id: "TASK-9", status: "To Do", priority: "High", area: "UI" }),
  note("Notes/Inbox.md", { parent: "[[Home]]" }),
];
const taskDates = new Map([["Tasks/Alpha.md", new Date("2026-11-01T09:00:00Z")], ["Tasks/Zeta.md", new Date("2026-11-05T09:00:00Z")]]);
const names = (group) => group.rows.map((r) => r.path.replace(/^.*\//, "").replace(/\.md$/, ""));

test("Tasks.base: views, groups and row orders", () => {
  const base = parseBase(fixture("Tasks.base"));
  assert.deepEqual(base.views.map((v) => v.name), ["By status", "To Do", "In Progress", "Open", "Done"]);
  const paths = candidatePaths(base, tasks.map((t) => t.path));
  assert.deepEqual(paths, tasks.slice(0, 8).map((t) => t.path));
  const run = (i, dates = taskDates) => runView(base, i, tasks, dates);

  const byStatus = run(0);
  assert.deepEqual(byStatus.columns.map((c) => c.label), ["ID", "Task", "Area", "Priority", "Assignee", "Requested by", "Last modified", "Status"]);
  assert.deepEqual(byStatus.groups.map((g) => g.label), ["To Do", "In Progress", "Done", "(empty)"]);
  assert.deepEqual(byStatus.groups.map(names), [["Epsilon", "Delta", "Eta", "Beta"], ["Gamma"], ["Alpha", "Zeta"], ["Iota"]]);
  assert.equal(byStatus.count, 8);
  const zeta = byStatus.groups[2].rows[1].values;
  assert.equal(zeta["file.name"], "Zeta.md");
  assert.equal(zeta["file.mtime"].toISOString().slice(0, 10), "2026-11-05");

  assert.deepEqual(names(run(1).groups[0]), ["Epsilon", "Delta", "Eta", "Beta"]);
  assert.deepEqual(names(run(2).groups[0]), ["Gamma"]);
  assert.equal(run(2).groups[0].rows[0].values.requested_by, "Ben Example", "who asked for a task shows");
  assert.deepEqual(names(run(3).groups[0]), ["Gamma", "Epsilon", "Delta", "Eta", "Beta", "Iota"], "Open: In Progress, To Do, then no status");
  assert.deepEqual(run(3).columns.map((c) => c.key), ["id", "file.name", "status", "area", "priority", "assignee", "requested_by", "file.mtime"]);
  assert.deepEqual(names(run(4).groups[0]), ["Zeta", "Alpha"], "Done: newest first");
  assert.deepEqual(names(run(4, null).groups[0]), ["Alpha", "Zeta"], "without dates: by name");
  assert.ok([0, 1, 2, 3, 4].every((i) => usesFileMtime(base, i)));
});

const books = [
  note("Library/Books/Summer Rain.md", { genre: "Fiction", author: "C. Writer", tags: ["Classic"], pages: 320, year: 1901 }),
  note("Library/Books/Autumn Leaves.md", { genre: "Fiction", author: "D. Author", tags: ["Classic", "Romance"], pages: 280, year: 1910 }),
  note("Library/Books/Mountains.md", { genre: "History", author: "C. Writer", tags: ["Travel"], pages: 432, year: 1950 }),
  note("Library/Books/A Short History.md", { genre: "History", author: "C. Writer", tags: ["Science"], pages: 96, year: 1999 }),
  note("Library/Books/The Long War.md", { genre: "History", author: "C. Writer", tags: ["Science"], pages: 1104, year: 2001 }),
  note("Library/Books/Rivers.md", { genre: "History", author: "E. Scribe", tags: ["Travel"] }),
  note("Library/Books/Quiet Hours.md", { genre: "Essays", tags: ["Classic"], pages: 150 }),
  note("Library/Books/On Walking.md", { genre: "Essays", tags: ["Science", "Travel"], pages: 120 }),
  note("Library/Books.md", { parent: "[[Home]]" }),
];

test("Books.base: views, groups, a formula and row orders", () => {
  const base = parseBase(fixture("Books.base"));
  assert.deepEqual(base.views.map((v) => v.name), ["All Books", "Fiction", "History", "Essays"]);
  const paths = candidatePaths(base, books.map((c) => c.path));
  assert.equal(paths.length, 8, "the library page itself isn't a book");
  const run = (i) => runView(base, i, books);
  const all = run(0);
  assert.deepEqual(all.groups.map((g) => g.label), ["Essays", "Fiction", "History"]);
  assert.deepEqual(all.groups.map(names), [["Quiet Hours", "On Walking"], ["Summer Rain", "Autumn Leaves"], ["The Long War", "Rivers", "Mountains", "A Short History"]]);
  assert.equal(all.columns.find((c) => c.key === "tags").width, 160);
  assert.deepEqual(all.columns.slice(0, 3).map((c) => c.label), ["Title", "Author", "Tags"]);
  assert.deepEqual(all.groups[1].rows[1].values.tags, ["Classic", "Romance"]);
  assert.deepEqual(names(run(1).groups[0]), ["Autumn Leaves", "Summer Rain"]);
  const history = run(2);
  assert.deepEqual(names(history.groups[0]), ["A Short History", "Mountains", "The Long War", "Rivers"], "History: by pages as a number, no pages last");
  assert.equal(history.columns.find((c) => c.key === "formula.length").label, "Length");
  assert.deepEqual(history.groups[0].rows.map((r) => r.values["formula.length"]), ["Short", "Long", "Long", "Short"], "a formula per row");
  assert.deepEqual(names(run(3).groups[0]), ["On Walking", "Quiet Hours"]);
  assert.ok([0, 1, 2, 3].every((i) => !usesFileMtime(base, i)));
});

test("a view's own filters, limit and labels", () => {
  const base = parseBase(`filters: 'file.inFolder("Tasks")'
formulas:
  rank: 'if(priority == "High", 1, 2)'
properties:
  note.area:
    displayName: Area here
  formula.rank:
    displayName: Rank
views:
  - type: cards
    name: Cards
  - type: table
    name: Top two
    filters:
      not:
        - 'status == "Done"'
    order: [file.basename, note.area, formula.rank, priority]
    sort:
      - property: formula.rank
        direction: ASC
    limit: 2
`);
  assert.equal(base.views[0].type, "cards");
  const r = runView(base, 1, tasks);
  assert.deepEqual(r.columns.map((c) => c.label), ["file.basename", "Area here", "Rank", "priority"]);
  assert.deepEqual(names(r.groups[0]), ["Delta", "Epsilon"]);
  assert.equal(r.groups[0].rows[0].values["formula.rank"], 1);
  assert.equal(r.groups[0].rows[0].values["file.basename"], "Delta");
});
