import { test } from "node:test";
import assert from "node:assert/strict";
import { INSERTS, INSERT_GROUPS, filterInserts, insertSample, insertion } from "../src/inserts.js";
import { readFileSync } from "node:fs";
import { APP_BLOCKS, createMarkdown, renderNote } from "../src/markdown.js";
import { NOTE_SECTIONS, PAGE_LIST_BLOCKS } from "../src/vault.js";

const entry = (id) => INSERTS.find((e) => e.id === id);
/** The note after the change, and the selected text. */
function apply(text, from, to, e) {
  const c = insertion(text, from, to, e);
  const out = text.slice(0, c.from) + c.insert + text.slice(c.to);
  return { out, picked: out.slice(c.anchor, c.head), c };
}

test("every entry is complete, unique and in a known group", () => {
  const ids = new Set();
  for (const e of INSERTS) {
    assert.ok(e.id && e.label && e.about && e.text, e.id);
    assert.ok(INSERT_GROUPS.includes(e.group), e.id);
    assert.ok(!ids.has(e.id), `${e.id} twice`);
    ids.add(e.id);
    if (e.select) assert.ok(e.text.includes(e.select), `${e.id}: select is in its text`);
  }
});

test("the menu offers every block the app draws and the block reference lists", () => {
  const fences = new Set(INSERTS.map((e) => /^```([\w-]+)/.exec(e.text)?.[1]).filter(Boolean));
  const documented = [...readFileSync(new URL("../docs/blocks.md", import.meta.url), "utf8").matchAll(/^## ([\w-]+)$/gm)].map((m) => m[1]);
  assert.ok(documented.length > 10);
  for (const block of [...APP_BLOCKS, ...Object.keys(NOTE_SECTIONS), ...PAGE_LIST_BLOCKS, ...documented]) {
    assert.ok(fences.has(block), `${block} is offered`);
  }
});

test("every preview renders", () => {
  const md = createMarkdown();
  const env = { resolve: () => null, href: (p) => `#${p}`, fromPath: "Note.md", depth: 0 };
  for (const e of INSERTS) assert.ok(renderNote(md, insertSample(e), env).html.trim(), e.id);
});

test("search matches every word, in the name or the description", () => {
  assert.deepEqual(filterInserts("").length, INSERTS.length);
  assert.deepEqual(filterInserts("check").map((e) => e.id), ["checklist"]);
  assert.ok(filterInserts("TASK cards").some((e) => e.id === "board"));
  assert.deepEqual(filterInserts("no such thing"), []);
});

test("an inline item goes at the cursor and selects its placeholder", () => {
  const { out, picked } = apply("Hello world", 6, 6, entry("bold"));
  assert.equal(out, "Hello **bold text**world");
  assert.equal(picked, "bold text");
});

test("an inline item takes the selected text in place of its placeholder", () => {
  const { out, picked } = apply("See the guide here", 8, 13, entry("wikilink"));
  assert.equal(out, "See the [[guide]] here");
  assert.equal(picked, "guide");
  // A selection over lines is replaced, not wrapped.
  assert.equal(apply("a\nb", 0, 3, entry("italic")).out, "*italic text*");
});

test("a block goes after the cursor's line, with empty lines around it", () => {
  const { out, picked } = apply("First line\nSecond line\n", 3, 3, entry("heading"));
  assert.equal(out, "First line\n\n## Heading\n\nSecond line\n");
  assert.equal(picked, "Heading");
});

test("a block at the start of a line goes before it", () => {
  assert.equal(apply("One\n\nTwo\n", 5, 5, entry("quote")).out, "One\n\n> A quote\n\nTwo\n");
});

test("a block at the note's end ends with one line end", () => {
  assert.equal(apply("Text\n", 5, 5, entry("toc")).out, "Text\n\n```toc\n```\n");
  assert.equal(apply("Text", 4, 4, entry("toc")).out, "Text\n\n```toc\n```\n");
  assert.equal(apply("", 0, 0, entry("toc")).out, "```toc\n```\n");
  assert.equal(apply("Text\n\n\n", 7, 7, entry("toc")).out, "Text\n\n\n```toc\n```\n");
});

test("a block never goes inside the front matter", () => {
  const note = "---\ntitle: A\n---\nBody\n";
  assert.equal(apply(note, 5, 5, entry("sprint")).out, "---\ntitle: A\n---\n```sprint\n```\n\nBody\n");
});

test("a block with nothing to select puts the cursor after it", () => {
  const { c, out } = apply("", 0, 0, entry("comments"));
  assert.equal(c.anchor, c.head);
  assert.equal(out.slice(0, c.anchor), "```comments\n```");
});

test("a divider on the first line can't start front matter", () => {
  assert.equal(apply("", 0, 0, entry("divider")).out, "\n---\n");
  assert.equal(apply("Text", 0, 0, entry("divider")).out, "\n---\n\nText");
});
