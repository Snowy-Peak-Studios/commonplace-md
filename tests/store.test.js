import { test } from "node:test";
import assert from "node:assert/strict";
import { migratePrefix, upgradeRepo, retireDevelopmentPreference } from "../src/store.js";

/** A Storage-like object over a Map, as localStorage behaves. */
function fakeStorage(entries = {}) {
  const m = new Map(Object.entries(entries));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

test("old storage keys move to the new prefix once, and the new ones win", () => {
  const s = fakeStorage({
    "notes-app:token": '"github_pat_x"',
    "notes-app:repos": "[]",
    "notes-app:draft:notes:Home.md": '{"text":"draft"}',
    "notes-app:mode": '"edit"',
    "commonplace:mode": '"read"',
    "other-app:thing": "1",
  });
  assert.equal(migratePrefix(s, "notes-app:", "commonplace:"), 3);
  assert.deepEqual(s.dump(), {
    "commonplace:token": '"github_pat_x"',
    "commonplace:repos": "[]",
    "commonplace:draft:notes:Home.md": '{"text":"draft"}',
    "commonplace:mode": '"read"',
    "other-app:thing": "1",
  });
  assert.equal(migratePrefix(s, "notes-app:", "commonplace:"), 0, "a second run does nothing");
});

test("storage that throws doesn't stop the app", () => {
  const broken = { get length() { throw new Error("blocked"); } };
  assert.equal(migratePrefix(broken, "notes-app:", "commonplace:"), 0);
  const full = fakeStorage({ "notes-app:a": "1", "notes-app:b": "2" });
  const setItem = full.setItem;
  full.setItem = (k, v) => { if (k.endsWith(":a")) throw new Error("full"); setItem(k, v); };
  assert.equal(migratePrefix(full, "notes-app:", "commonplace:"), 1, "one key failing doesn't stop the rest");
  assert.equal(full.getItem("commonplace:b"), "2");
});

test("older vault settings get the New notes folder and template they used to imply", () => {
  const old = { id: "v", owner: "ann-example", repo: "notes", vault: true };
  assert.deepEqual(upgradeRepo(old), { ...old, notes: "Notes", template: "Templates/Note.md" });
  const plain = { id: "p", owner: "ann-example", repo: "notes", vault: false };
  assert.equal(upgradeRepo(plain), plain, "not a vault: unchanged");
  const chosen = { id: "c", vault: true, notes: "", template: "" };
  assert.equal(upgradeRepo(chosen), chosen, "already set (even empty): unchanged");
});

test("retiring public dev clears only version preferences and tolerates blocked storage", () => {
  const original = { "commonplace:version": '"dev"', "commonplace:to-dev": "1", "commonplace:token": '"keep"', "commonplace:repos": "[]", "commonplace:draft:demo:Home.md": "draft", "other:version": "keep" };
  const storage = fakeStorage(original);
  retireDevelopmentPreference(storage);
  const { "commonplace:version": version, "commonplace:to-dev": sent, ...kept } = original;
  assert.deepEqual(storage.dump(), kept);
  retireDevelopmentPreference(storage);
  assert.deepEqual(storage.dump(), kept);
  assert.doesNotThrow(() => retireDevelopmentPreference({ removeItem() { throw Error("blocked"); } }));
});
