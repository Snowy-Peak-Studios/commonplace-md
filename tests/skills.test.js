import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

// The example vault's agent skills: one real copy in .agents/skills/, a pointer in .claude/skills/,
// and a line for each in AGENTS.md and the README.
const vault = new URL("../example-vault/", import.meta.url);
const read = (path) => readFileSync(new URL(path, vault), "utf8");
const skills = readdirSync(new URL(".agents/skills/", vault));

const frontMatter = (text) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(m, "the file starts with front matter");
  return Object.fromEntries(m[1].split("\n").map((line) => {
    const i = line.indexOf(":");
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }));
};

test("the example vault has skills", () => {
  assert.ok(skills.length >= 4, `found ${skills.join(", ")}`);
});

test("every skill has its folder's name and a description", () => {
  for (const name of skills) {
    const fm = frontMatter(read(`.agents/skills/${name}/SKILL.md`));
    assert.equal(fm.name, name);
    assert.ok(fm.description.length > 40, `${name} has a description`);
  }
});

test("every skill has a Claude Code pointer with the same name and description, and nothing else does", () => {
  for (const name of skills) {
    const real = frontMatter(read(`.agents/skills/${name}/SKILL.md`));
    const text = read(`.claude/skills/${name}/SKILL.md`);
    assert.deepEqual(frontMatter(text), real, `${name}: the pointer's front matter matches`);
    assert.ok(text.includes(`.agents/skills/${name}/SKILL.md`), `${name}: the pointer points at the skill`);
  }
  for (const name of readdirSync(new URL(".claude/skills/", vault))) {
    assert.ok(existsSync(new URL(`.agents/skills/${name}/SKILL.md`, vault)), `${name}: a pointer with no skill`);
  }
});

test("AGENTS.md and the README list every skill", () => {
  const agents = read("AGENTS.md");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const name of skills) {
    assert.ok(agents.includes(`\`${name}\``), `AGENTS.md lists ${name}`);
    assert.ok(readme.includes(`(example-vault/.agents/skills/${name}/SKILL.md)`), `the README links ${name}`);
  }
});

test("skills and pointers are LF", () => {
  for (const name of skills) {
    for (const path of [`.agents/skills/${name}/SKILL.md`, `.claude/skills/${name}/SKILL.md`]) {
      const text = read(path);
      assert.ok(!text.includes("\r"), `${path} is LF`);
    }
  }
});
