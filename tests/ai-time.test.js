import { test } from "node:test";
import assert from "node:assert/strict";
import { taskSetup } from "../src/vault.js";
import { aiMinutes, aiTimeSamples, aiTimeGroups, aiTimeEstimate, aiTimeLabel } from "../src/ai-time.js";

const setup = taskSetup({ folder: "Work", fields: { area: { prop: "category" }, type: { prop: "kind" }, status: { prop: "stage", values: ["Open", "Testing", "Cancelled", "Shipped"] } } });
const note = (id, props = {}, folder = "Work") => ({ path: `${folder}/${id}.md`, props: { category: "Setup", kind: "Task", stage: "Shipped", work_time: 10, ...props } });

test("AI minute records reject blank, malformed, fractional and unsafe values but keep zero", () => {
  for (const x of [undefined, null, "", " ", false, true, [], {}, -1, 1.5, Infinity, NaN, "1.5", "1e2", "0x10", Number.MAX_SAFE_INTEGER + 1]) assert.equal(aiMinutes(x), null, String(x));
  for (const [x, wanted] of [[0, 0], [12, 12], [" 12 ", 12], ["0", 0]]) assert.equal(aiMinutes(x), wanted);
});

test("only completed AI records in the configured task folder contribute, respecting custom properties", () => {
  const notes = [note("yes"), note("zero", { work_time: "0" }), note("reviewed", { assignee: "Reviewer", work_time: 20 }),
    note("testing", { stage: "Testing" }), note("cancelled", { stage: "Cancelled" }), note("won't", { stage: "Won’t do" }),
    note("epic", { kind: "Epic" }), note("bad", { work_time: false }), note("elsewhere", {}, "Other"), note("old-properties", { stage: "", status: "Done" })];
  assert.deepEqual(aiTimeSamples(notes, setup).map((x) => x.path), ["Work/yes.md", "Work/zero.md", "Work/reviewed.md"]);
});

test("group means, counts and observed ranges include outliers and zero, without grouping people", () => {
  const samples = aiTimeSamples([note("a", { work_time: 0, assignee: "One" }), note("b", { category: "sétup", kind: "task", work_time: 30, assignee: "Two" }), note("c", { category: "Other", work_time: 5 })], setup);
  const groups = aiTimeGroups(samples);
  assert.deepEqual(groups, [{ label: "Setup · Task", count: 2, mean: 15, min: 0, max: 30 }, { label: "Other · Task", count: 1, mean: 5, min: 5, max: 5 }]);
  assert.equal(aiTimeGroups(samples, "type")[0].count, 3);
  assert.equal(aiTimeGroups(samples, "area").length, 2);
});

test("incomplete grouping fields cannot silently mix kinds", () => {
  const samples = aiTimeSamples([note("no-type", { kind: "" }), note("no-area", { category: "" })], setup);
  assert.deepEqual(aiTimeGroups(samples), []);
  assert.equal(aiTimeGroups(samples, "area").length, 1);
  assert.equal(aiTimeGroups(samples, "type").length, 1);
});

test("unfinished estimates require both matching area and type and never mutate manual estimates", () => {
  const samples = aiTimeSamples([note("a", { work_time: 10 }), note("b", { work_time: 30 }), note("other-area", { category: "Other", work_time: 900 }), note("other-type", { kind: "Bug", work_time: 900 })], setup);
  const props = { category: "sétup", kind: "TASK", stage: "Open", estimate: 7 };
  const before = structuredClone(props);
  assert.deepEqual(aiTimeEstimate(samples, props, setup, "Work/open.md"), { area: "sétup", type: "TASK", count: 2, mean: 20, min: 10, max: 30 });
  assert.deepEqual(props, before);
  assert.equal(aiTimeEstimate(samples, { ...props, category: "Unknown" }, setup, "Work/open.md").reason, "No completed AI tasks with this Area and Type yet.");
  assert.match(aiTimeEstimate(samples, { ...props, kind: "" }, setup, "Work/open.md").reason, /Set Area and Type/);
});

test("a reopened task excludes its old record; completed tasks and epics get no forecast", () => {
  const samples = aiTimeSamples([note("self", { work_time: 50 }), note("other", { work_time: 10 })], setup);
  const props = { category: "Setup", kind: "Task", stage: "Open" };
  assert.equal(aiTimeEstimate(samples, props, setup, "Work/self.md").mean, 10);
  assert.equal(aiTimeEstimate(samples, props, setup, "Work/self.md").count, 1);
  assert.equal(aiTimeEstimate(samples, { ...props, stage: "Shipped" }, setup, "Work/self.md"), null);
  assert.equal(aiTimeEstimate(samples, { ...props, kind: "Epic" }, setup, "Work/self.md"), null);
});

test("labels do not promise instant work for sub-minute records", () => {
  assert.equal(aiTimeLabel(0), "<1 min");
  assert.equal(aiTimeLabel(0.5), "<1 min");
  assert.equal(aiTimeLabel(12.345), "12.3 min");
});
