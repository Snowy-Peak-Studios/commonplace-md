// This browser's storage. Every access is guarded: storage can be blocked or full.

const PREFIX = "commonplace:";
const OLD_PREFIX = "notes-app:";

/**
 * Moves every key from one prefix to another in a Storage-like object (localStorage), once:
 * a key already under the new prefix wins, and the old key is removed either way. Returns how many moved.
 */
export function migratePrefix(storage, from, to) {
  let moved = 0;
  const keys = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k != null && k.startsWith(from)) keys.push(k);
    }
  } catch {
    return 0;
  }
  for (const k of keys) {
    try {
      const next = to + k.slice(from.length);
      if (storage.getItem(next) == null) {
        storage.setItem(next, storage.getItem(k));
        moved++;
      }
      storage.removeItem(k);
    } catch { /* storage full or blocked: try the next key */ }
  }
  return moved;
}

// Older versions of the app kept everything under "notes-app:". Same origin, so it moves over here.
try {
  if (typeof localStorage !== "undefined") migratePrefix(localStorage, OLD_PREFIX, PREFIX);
} catch { /* storage blocked */ }

export const store = {
  prefix: PREFIX,
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch { /* nothing to do */ }
  },
};

/**
 * Brings a saved repo up to date. Older settings had one `vault` switch that also put new notes in
 * Notes/, started from Templates/Note.md; now those are the repo's own `notes` and `template` fields.
 */
export function upgradeRepo(r) {
  if (r && r.vault && r.notes == null) return { ...r, notes: "Notes", template: r.template ?? "Templates/Note.md" };
  return r;
}

/** Missing, legacy or malformed overview preferences never enable cross-vault reading. */
export function upgradeInboxOverview(value) {
  const off = { version: 1, enabled: false, repo: "", path: "" };
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1) return off;
  const repo = typeof value.repo === "string" ? value.repo : "";
  const path = typeof value.path === "string" ? value.path : "";
  const valid = !!repo && !!path && !/[\\:\x00-\x1f]/.test(path) && !path.startsWith("/")
    && !path.split("/").some((s) => !s || s === "." || s === "..") && /\.md$/i.test(path);
  return { version: 1, enabled: value.enabled === true && valid, repo: valid ? repo : "", path: valid ? path : "" };
}

export function migrateInboxOverview(storage) {
  const key = PREFIX + "inboxOverview";
  try {
    const raw = storage.getItem(key);
    if (raw == null) return false;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { /* malformed preferences become off */ }
    const next = JSON.stringify(upgradeInboxOverview(parsed));
    if (raw === next) return false;
    storage.setItem(key, next);
    return true;
  } catch { return false; /* blocked storage leaves the overview off */ }
}

try { if (typeof localStorage !== "undefined") migrateInboxOverview(localStorage); } catch { /* no browser storage */ }

/** The public development site is retired; keep notes, credentials and drafts untouched. */
export function retireDevelopmentPreference(storage) {
  for (const key of ["version", "to-dev"]) {
    try { storage.removeItem(PREFIX + key); } catch { /* blocked storage must not stop startup */ }
  }
}
try { if (typeof localStorage !== "undefined") retireDevelopmentPreference(localStorage); } catch { /* blocked */ }
try { if (typeof sessionStorage !== "undefined") retireDevelopmentPreference(sessionStorage); } catch { /* blocked */ }
