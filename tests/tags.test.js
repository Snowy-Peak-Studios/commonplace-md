import { test } from "node:test";
import assert from "node:assert/strict";
import { noteTags, tagKey, noteRating, withRating, tagCounts, findNotes, findParams, findHref, splitFrontMatter } from "../src/vault.js";
import { parseBase, runView, noteProps } from "../src/bases.js";

test("tags come only from the tags property: a list or a text, with or without #", () => {
  assert.deepEqual(noteTags({ tags: ["vegan", "#quick", "", null] }), ["vegan", "quick"]);
  assert.deepEqual(noteTags({ tags: "#vegan, glutenfree quick" }), ["vegan", "glutenfree", "quick"]);
  assert.deepEqual(noteTags({ tag: "vegan" }), ["vegan"]);
  assert.deepEqual(noteTags({ tags: ["vegan", "vegan"] }), ["vegan"]);
  assert.deepEqual(noteTags({}), []);
  assert.equal(tagKey("#Vegan"), "vegan");
});

test("a rating is a whole number of stars from 0 to 5, else none", () => {
  assert.equal(noteRating({ rating: 4 }), 4);
  assert.equal(noteRating({ rating: "3" }), 3);
  assert.equal(noteRating({ rating: 0 }), 0);
  for (const bad of [6, -1, 2.5, "lots", "", null, undefined, [3]]) assert.equal(noteRating({ rating: bad }), null, String(bad));
  assert.equal(noteRating({}), null);
});

test("setting a rating changes only that line, or adds front matter", () => {
  assert.equal(withRating("---\ntitle: Soup\nrating: 2\n---\n# Soup\n", 5), "---\ntitle: Soup\nrating: 5\n---\n# Soup\n");
  assert.equal(withRating("---\ntitle: Soup\n---\n# Soup\n", 0), "---\ntitle: Soup\nrating: 0\n---\n# Soup\n");
  assert.equal(withRating("# Soup\n", 4), "---\nrating: 4\n---\n# Soup\n");
  assert.throws(() => withRating("# x", 6), /0 to 5/);
});

test("clearing a rating takes out only its line", () => {
  assert.equal(withRating("---\ntitle: Soup\nrating: 2\ntags: [a]\n---\nbody", null), "---\ntitle: Soup\ntags: [a]\n---\nbody");
  assert.equal(withRating("---\ntitle: Soup\nrating: 2\n---\nbody", null), "---\ntitle: Soup\n---\nbody");
  assert.equal(withRating("# no front matter\n", null), "# no front matter\n");
  assert.equal(withRating("---\ntitle: x\n---\nbody", null), "---\ntitle: x\n---\nbody");
  const only = withRating("---\nrating: 3\n---\nbody", null);
  assert.ok(splitFrontMatter(only) && !/rating/.test(only) && only.endsWith("body"), JSON.stringify(only));
});

const notes = [
  { path: "Recipes/Soup.md", props: { tags: ["vegan", "quick"], rating: 5 } },
  { path: "Recipes/Pasta.md", props: { tags: ["Vegetarian", "quick"], rating: 3 } },
  { path: "Recipes/Cake.md", props: { tags: ["vegetarian"] } },
  { path: "Notes/Plan.md", props: { rating: 4 } },
  { path: "Home.md", props: {} },
];

test("tag counts: the most used first, one entry whatever the case", () => {
  assert.deepEqual(tagCounts(notes), [{ tag: "quick", count: 2 }, { tag: "Vegetarian", count: 2 }, { tag: "vegan", count: 1 }]);
});

test("find: every picked tag, at least N stars or unrated, the best rated first", () => {
  const names = (list) => list.map((n) => n.path);
  assert.deepEqual(names(findNotes(notes)), ["Recipes/Soup.md", "Notes/Plan.md", "Recipes/Pasta.md", "Recipes/Cake.md", "Home.md"]);
  assert.deepEqual(names(findNotes(notes, { tags: ["quick"] })), ["Recipes/Soup.md", "Recipes/Pasta.md"]);
  assert.deepEqual(names(findNotes(notes, { tags: ["quick", "VEGAN"] })), ["Recipes/Soup.md"]);
  assert.deepEqual(names(findNotes(notes, { stars: 4 })), ["Recipes/Soup.md", "Notes/Plan.md"]);
  assert.deepEqual(names(findNotes(notes, { tags: ["vegetarian"], stars: "unrated" })), ["Recipes/Cake.md"]);
  assert.deepEqual(names(findNotes(notes, { tags: ["nothing"] })), []);
  assert.deepEqual(findNotes(notes, { tags: ["quick"] })[1].tags, ["Vegetarian", "quick"]);
});

test("the filter lives in the address, and reads back", () => {
  const href = findHref("local-recipes", { tags: ["vegan", "quick"], stars: 4 });
  assert.equal(href, "#/find?vault=local-recipes&tag=vegan&tag=quick&stars=4");
  assert.deepEqual(findParams(new URLSearchParams(href.split("?")[1])), { tags: ["vegan", "quick"], stars: 4 });
  assert.deepEqual(findParams(new URLSearchParams("stars=unrated&tag=%23vegan&tag=vegan")), { tags: ["vegan"], stars: "unrated" });
  assert.deepEqual(findParams(new URLSearchParams("stars=9")), { tags: [], stars: null });
  assert.equal(findHref(""), "#/find");
});

test("base views filter by the same tags, and by rating", () => {
  const base = parseBase(`views:\n  - type: table\n    name: Good vegan\n    filters:\n      and:\n        - 'file.hasTag("vegan")'\n        - 'rating >= 4'\n`);
  const rows = runView(base, 0, [
    { path: "a.md", props: noteProps("---\ntags: [\"#vegan\"]\nrating: 5\n---\n") },
    { path: "b.md", props: noteProps("---\ntags: [vegan]\nrating: 2\n---\n") },
    { path: "c.md", props: noteProps("---\ntags: [quick]\nrating: 5\n---\n") },
  ]).groups.flatMap((g) => g.rows);
  assert.deepEqual(rows.map((r) => r.path), ["a.md"]);
});
