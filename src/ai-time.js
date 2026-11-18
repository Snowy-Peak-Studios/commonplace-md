// Local arithmetic over recorded AI minutes. Never groups or measures people.
import { fieldProp, foldName, isDoneStatus, isSetupTask } from "./vault.js";

const word = (v) => typeof v === "string" ? v.trim() : "";
const cancelled = /^(cancelled|canceled|won['’]?t do)$/i;

/** Only explicit non-negative whole minutes, including zero (less than one recorded minute). */
export function aiMinutes(value) {
  if (typeof value === "string") {
    if (!/^\d+$/.test(value.trim())) return null;
    value = Number(value.trim());
  }
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** work_time is reserved for AI, even after a task is handed to a human reviewer. */
export function aiTimeSamples(notes, setup) {
  const prop = (key) => fieldProp(setup, key);
  return notes.flatMap(({ path, props = {} }) => {
    const minutes = aiMinutes(props.work_time), status = word(props[prop("status")]);
    const area = word(props[prop("area")]), type = word(props[prop("type")]);
    if (!isSetupTask(setup, path) || minutes == null || !isDoneStatus(status, setup)
      || cancelled.test(status) || foldName(type) === "epic") return [];
    return [{ path, area, type, minutes }];
  });
}

function summary(samples) {
  // Incremental mean avoids overflowing a sum of otherwise valid minute values.
  let mean = 0, min = Infinity, max = 0;
  samples.forEach(({ minutes }, i) => { mean += (minutes - mean) / (i + 1); min = Math.min(min, minutes); max = Math.max(max, minutes); });
  return { count: samples.length, mean, min: samples.length ? min : 0, max };
}

/** A chart is opt-in with an ai-work-time fence. Group by area-type (default), area or type. */
export function aiTimeGroups(samples, group = "area-type") {
  const keys = group === "area" ? ["area"] : group === "type" ? ["type"] : ["area", "type"];
  const groups = new Map();
  for (const sample of samples) {
    if (keys.some((key) => !sample[key])) continue;
    const key = JSON.stringify(keys.map((key) => foldName(sample[key])));
    if (!groups.has(key)) groups.set(key, { label: keys.map((key) => sample[key]).join(" · "), samples: [] });
    groups.get(key).samples.push(sample);
  }
  return [...groups.values()].map(({ label, samples }) => ({ label, ...summary(samples) }))
    .sort((a, b) => b.mean - a.mean || a.label.localeCompare(b.label));
}

/** Exact area AND type only: no fallback to unrelated tasks or changes to the manual estimate. */
export function aiTimeEstimate(samples, props, setup, path) {
  const area = word(props[fieldProp(setup, "area")]), type = word(props[fieldProp(setup, "type")]);
  if (isDoneStatus(props[fieldProp(setup, "status")], setup) || foldName(type) === "epic") return null;
  if (!area || !type) return { reason: "Set Area and Type to find similar completed AI tasks." };
  const matching = samples.filter((s) => s.path !== path && foldName(s.area) === foldName(area) && foldName(s.type) === foldName(type));
  return matching.length ? { area, type, ...summary(matching) } : { reason: "No completed AI tasks with this Area and Type yet." };
}

/** Whole-minute source records are approximate; a zero is not a promise of instant work. */
export const aiTimeLabel = (minutes) => minutes < 1 ? "<1 min" : `${Math.round(minutes * 10) / 10} min`;
