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
