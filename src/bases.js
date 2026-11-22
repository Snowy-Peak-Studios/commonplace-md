// Bases (`.base` files): the YAML, a small expression language for filters and formulas, and the
// rows, columns and groups of a table view. No DOM and no network here, so tests can run it in Node.
// Only the part of the `.base` format the app's vaults use is covered;
// anything else is refused with a message the view shows instead of a wrong table.

import { yamlLoad } from "../vendor/vendor.js";
import { splitFrontMatter, noteTags } from "./vault.js";

// ================================================================
// The .base file
// ================================================================

/** `note.x` and `x` are the same property; the rest (`file.x`, `formula.x`) keep their prefix. */
export const propKey = (key) => String(key ?? "").trim().replace(/^note\./, "");

const upper = (d) => (String(d || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC");

/** The .base YAML, tidied into what the app needs. Throws on YAML it can't read. */
export function parseBase(text) {
  const data = yamlLoad(text) || {};
  if (typeof data !== "object" || Array.isArray(data)) throw new Error("This .base file isn't a set of settings.");
  const properties = {};
  for (const [key, value] of Object.entries(data.properties || {})) properties[propKey(key)] = { displayName: value?.displayName ?? null };
  const views = (Array.isArray(data.views) ? data.views : []).map((v, i) => {
    const columnSize = {};
    for (const [key, size] of Object.entries(v.columnSize || {})) if (Number(size) > 0) columnSize[propKey(key)] = Number(size);
    return {
      name: String(v.name ?? `View ${i + 1}`),
      type: String(v.type || "table"),
      filters: v.filters ?? null,
      groupBy: v.groupBy?.property ? { property: propKey(v.groupBy.property), direction: upper(v.groupBy.direction) } : null,
      order: (Array.isArray(v.order) && v.order.length ? v.order : ["file.name"]).map(propKey),
      sort: (Array.isArray(v.sort) ? v.sort : []).filter((s) => s?.property).map((s) => ({ property: propKey(s.property), direction: upper(s.direction) })),
      columnSize,
      limit: Number(v.limit) > 0 ? Number(v.limit) : null,
    };
  });
  return { filters: data.filters ?? null, formulas: { ...(data.formulas || {}) }, properties, views };
}

/** A note's front matter as an object; anything that isn't one (or bad YAML) is {}. */
export function noteProps(text) {
  const fm = splitFrontMatter(text);
  if (!fm) return {};
  try {
    const data = yamlLoad(fm.raw);
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

const ISO_TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;

/** Front matter kept as JSON comes back with its dates as strings; this turns them into dates again. */
export function reviveDates(v) {
  if (typeof v === "string") return ISO_TIME.test(v) ? new Date(v) : v;
  if (v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(reviveDates);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, reviveDates(x)]));
  return v;
}

// ================================================================
// Expressions: `status != "Done"`, `file.inFolder("Tasks")`, `if(priority == "High", 1, 2)`
// ================================================================

export class BaseError extends Error {}

const PUNCT = ["==", "!=", "<=", ">=", "&&", "||", "(", ")", "[", "]", ",", ".", "!", "-", "+", "*", "/", "%", "<", ">"];

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      let s = "";
      let j = i + 1;
      for (; j < src.length && src[j] !== c; j++) {
        if (src[j] === "\\" && j + 1 < src.length) j++;
        s += src[j];
      }
      if (j >= src.length) throw new BaseError(`A text in “${src}” has no closing quote.`);
      out.push({ t: "lit", v: s, at: i });
      i = j + 1;
      continue;
    }
    const num = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (num) { out.push({ t: "lit", v: Number(num[0]), at: i }); i += num[0].length; continue; }
    const word = /^[\p{L}_$][\p{L}\p{N}_$]*/u.exec(src.slice(i));
    if (word) {
      const w = word[0];
      if (w === "true" || w === "false") out.push({ t: "lit", v: w === "true", at: i });
      else if (w === "null") out.push({ t: "lit", v: null, at: i });
      else out.push({ t: "id", v: w, at: i });
      i += w.length;
      continue;
    }
    const p = PUNCT.find((x) => src.startsWith(x, i));
    if (!p) throw new BaseError(`“${c}” in “${src}” isn't something the app understands.`);
    out.push({ t: "op", v: p, at: i });
    i += p.length;
  }
  out.push({ t: "end", at: src.length });
  return out;
}

const BINARY = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
const FUNCTIONS = new Set(["if", "today", "date"]);

/**
 * Today's date as YAML reads a date property (`2026-11-14` is midnight UTC that day), so `end >= today()`
 * compares days, not times. `now` is for the tests.
 */
export function todayDate(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
const METHODS = new Set(["inFolder", "hasTag", "contains", "startsWith", "endsWith", "lower", "isEmpty"]);

/** Parses an expression into a tree of { t, ... } nodes (precedence climbing). */
export function parseExpr(src) {
  const toks = tokenize(String(src));
  let pos = 0;
  const peek = () => toks[pos];
  const fail = (tok, what) => {
    throw new BaseError(`Can't read “${src}”: ${what} at character ${tok.at + 1}.`);
  };
  const expect = (v) => {
    const tok = toks[pos];
    if (tok.t !== "op" || tok.v !== v) fail(tok, tok.t === "end" ? `“${v}” missing` : `“${v}” expected`);
    pos++;
  };
  const args = () => {
    const list = [];
    const isOp = (v) => peek().t === "op" && peek().v === v;
    if (!isOp(")")) {
      list.push(expr(0));
      while (isOp(",")) { pos++; list.push(expr(0)); }
    }
    expect(")");
    return list;
  };
  function primary() {
    const tok = toks[pos++];
    if (tok.t === "lit") return { t: "lit", v: tok.v };
    if (tok.t === "id") {
      if (peek().t === "op" && peek().v === "(") {
        if (!FUNCTIONS.has(tok.v)) throw new BaseError(`The function “${tok.v}()” in “${src}” isn't supported here.`);
        pos++;
        return { t: "fn", name: tok.v, args: args() };
      }
      return { t: "id", name: tok.v };
    }
    if (tok.t === "op" && tok.v === "(") {
      const e = expr(0);
      expect(")");
      return e;
    }
    if (tok.t === "op" && (tok.v === "!" || tok.v === "-")) return { t: "un", op: tok.v, a: postfix(primary()) };
    return fail(tok, tok.t === "end" ? "it ends too early" : `unexpected “${tok.v}”`);
  }
  function postfix(node) {
    for (;;) {
      const tok = peek();
      if (tok.t === "op" && tok.v === ".") {
        pos++;
        const name = toks[pos++];
        if (name.t !== "id") fail(name, "a name expected after “.”");
        if (peek().t === "op" && peek().v === "(") {
          if (!METHODS.has(name.v)) throw new BaseError(`The function “.${name.v}()” in “${src}” isn't supported here.`);
          pos++;
          node = { t: "method", obj: node, name: name.v, args: args() };
        } else node = { t: "member", obj: node, name: name.v };
      } else if (tok.t === "op" && tok.v === "[") {
        pos++;
        const index = expr(0);
        expect("]");
        node = { t: "index", obj: node, index };
      } else return node;
    }
  }
  function expr(minPrec) {
    let left = postfix(primary());
    for (;;) {
      const tok = peek();
      const prec = tok.t === "op" ? BINARY[tok.v] : undefined;
      if (!prec || prec <= minPrec) return left;
      pos++;
      left = { t: "bin", op: tok.v, a: left, b: expr(prec) };
    }
  }
  const tree = expr(0);
  if (peek().t !== "end") fail(peek(), `unexpected “${peek().v}”`);
  return tree;
}

const parsed = new Map();
const parseCached = (src) => {
  if (!parsed.has(src)) {
    try { parsed.set(src, parseExpr(src)); } catch (e) { parsed.set(src, e); }
  }
  const tree = parsed.get(src);
  if (tree instanceof Error) throw tree;
  return tree;
};

// ---- values ----

const isEmptyValue = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "number" && Number.isNaN(v));
const truthy = (v) => !isEmptyValue(v) && v !== false && v !== 0;
const asTime = (v) => (v instanceof Date ? v.getTime() : null);

function equal(a, b) {
  if (a == null || b == null) return a == null && b == null;
  if (a instanceof Date || b instanceof Date) return asTime(a) !== null && asTime(a) === asTime(b);
  if (typeof a === "number" && typeof b === "string" && b.trim() !== "") return a === Number(b);
  if (typeof b === "number" && typeof a === "string" && a.trim() !== "") return b === Number(a);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => equal(x, b[i]));
  return a === b;
}

/** Orders two non-empty values: numbers by size, dates by time, booleans false first, the rest as text (T-2 before T-10). */
export function compareValues(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  const text = (v) => (Array.isArray(v) ? v.map(text).join(", ") : v instanceof Date ? v.toISOString() : String(v));
  return text(a).localeCompare(text(b), undefined, { numeric: true, sensitivity: "base" });
}

const textOf = (v) => (v == null ? "" : String(v));

// ---- one note's context ----

const FILE = Symbol("file");
const NOTE = Symbol("note");
const FORMULA = Symbol("formula");

const baseNameOf = (path) => path.slice(path.lastIndexOf("/") + 1);

/** The same tags the Find page reads (`noteTags` in vault.js). */
const fileTags = (props) => noteTags(props);

function fileField(ctx, name) {
  const { path } = ctx.note;
  const file = baseNameOf(path);
  const dot = file.lastIndexOf(".");
  switch (name) {
    case "name": return file;
    case "basename": return dot > 0 ? file.slice(0, dot) : file;
    case "path": return path;
    case "folder": return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    case "ext": return dot > 0 ? file.slice(dot + 1) : "";
    case "mtime": return ctx.dates?.get(path) ?? null;
    case "tags": return fileTags(ctx.note.props);
    default: return null; // ctime, size, links...: not known here
  }
}

/** A value `key` (as written in `order`, `sort`, `groupBy`) has for one note. */
function valueOf(ctx, key) {
  if (key.startsWith("file.")) return fileField(ctx, key.slice(5));
  if (key.startsWith("formula.")) return formula(ctx, key.slice(8));
  return ctx.note.props[key] ?? null;
}

function formula(ctx, name) {
  if (ctx.formulas.has(name)) return ctx.formulas.get(name);
  const src = ctx.base.formulas[name];
  if (src == null) return null;
  if (ctx.evaluating.has(name)) throw new BaseError(`The formula “${name}” depends on itself.`);
  ctx.evaluating.add(name);
  try {
    const v = evaluate(parseCached(String(src)), ctx);
    ctx.formulas.set(name, v);
    return v;
  } finally {
    ctx.evaluating.delete(name);
  }
}

function member(obj, name, ctx) {
  if (obj === FILE) return fileField(ctx, name);
  if (obj === NOTE) return ctx.note.props[name] ?? null;
  if (obj === FORMULA) return formula(ctx, name);
  if (name === "length" && (typeof obj === "string" || Array.isArray(obj))) return obj.length;
  if (obj && typeof obj === "object" && !Array.isArray(obj) && !(obj instanceof Date)) return obj[name] ?? null;
  return null;
}

/** `file.inFolder("Tasks")` holds for Tasks/x.md and Tasks/sub/y.md, not for TasksOld/z.md. */
export function inFolder(path, folder) {
  const f = textOf(folder).replace(/^\/+|\/+$/g, "");
  return !f || path.startsWith(f + "/");
}

function method(obj, name, args, ctx) {
  if (obj === FILE) {
    if (name === "inFolder") return inFolder(ctx.note.path, args[0]);
    if (name === "hasTag") {
      const tags = fileTags(ctx.note.props).map((t) => t.toLowerCase());
      return args.some((a) => {
        const want = textOf(a).replace(/^#/, "").toLowerCase();
        return tags.some((t) => t === want || t.startsWith(want + "/"));
      });
    }
    throw new BaseError(`file.${name}() isn't supported here.`);
  }
  switch (name) {
    case "isEmpty": return isEmptyValue(obj);
    case "contains":
      if (Array.isArray(obj)) return obj.some((x) => equal(x, args[0]));
      return obj != null && textOf(obj).includes(textOf(args[0]));
    case "startsWith": return obj != null && textOf(obj).startsWith(textOf(args[0]));
    case "endsWith": return obj != null && textOf(obj).endsWith(textOf(args[0]));
    case "lower": return obj == null ? null : textOf(obj).toLowerCase();
    default: throw new BaseError(`.${name}() isn't supported here.`);
  }
}

function arithmetic(op, a, b) {
  if (op === "+" && (typeof a === "string" || typeof b === "string")) return textOf(a) + textOf(b);
  if (a == null || b == null) return null;
  const x = Number(a), y = Number(b);
  switch (op) {
    case "+": return x + y;
    case "-": return x - y;
    case "*": return x * y;
    case "/": return x / y;
    default: return x % y;
  }
}

function evaluate(node, ctx) {
  switch (node.t) {
    case "lit": return node.v;
    case "id":
      if (node.name === "file") return FILE;
      if (node.name === "note") return NOTE;
      if (node.name === "formula") return FORMULA;
      return ctx.note.props[node.name] ?? null;
    case "member": return member(evaluate(node.obj, ctx), node.name, ctx);
    case "index": {
      const obj = evaluate(node.obj, ctx);
      const i = evaluate(node.index, ctx);
      if (Array.isArray(obj) && typeof i === "number") return obj[i < 0 ? obj.length + i : i] ?? null;
      return member(obj, textOf(i), ctx);
    }
    case "method": return method(evaluate(node.obj, ctx), node.name, node.args.map((a) => evaluate(a, ctx)), ctx);
    case "fn": { // the names are checked when parsed
      if (node.name === "today") return todayDate(ctx.now);
      if (node.name === "date") {
        const v = evaluate(node.args[0] ?? { t: "lit", v: null }, ctx);
        if (v instanceof Date) return v;
        const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(textOf(v).trim());
        return m ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3])) : null;
      }
      if (node.args.length < 2 || node.args.length > 3) throw new BaseError("if() takes a condition, a value, and maybe a value for “else”.");
      if (truthy(evaluate(node.args[0], ctx))) return evaluate(node.args[1], ctx);
      return node.args[2] ? evaluate(node.args[2], ctx) : null;
    }
    case "un": {
      const v = evaluate(node.a, ctx);
      return node.op === "!" ? !truthy(v) : v == null ? null : -Number(v);
    }
    case "bin": {
      const { op } = node;
      if (op === "&&") return truthy(evaluate(node.a, ctx)) && truthy(evaluate(node.b, ctx));
      if (op === "||") return truthy(evaluate(node.a, ctx)) || truthy(evaluate(node.b, ctx));
      const a = evaluate(node.a, ctx), b = evaluate(node.b, ctx);
      if (op === "==") return equal(a, b);
      if (op === "!=") return !equal(a, b);
      if (op in { "<": 1, "<=": 1, ">": 1, ">=": 1 }) {
        if (isEmptyValue(a) || isEmptyValue(b)) return false;
        const c = compareValues(a, b);
        return op === "<" ? c < 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : c >= 0;
      }
      return arithmetic(op, a, b);
    }
    default: throw new BaseError("Unknown expression.");
  }
}

const context = (base, note, dates) => ({ base, note, dates, formulas: new Map(), evaluating: new Set() });

/** Evaluates one expression for one note ({ path, props }); for tests and formulas. */
export function evalExpr(src, note, { base = { formulas: {} }, dates = null, now = undefined } = {}) {
  return evaluate(parseCached(String(src)), { ...context(base, note, dates), now });
}

// ---- filters ----

/** A filter is an expression, or { and | or | not: [filters] } (not: none of them holds), nested. Empty means all. */
function passes(filter, ctx) {
  if (filter == null || filter === "") return true;
  if (typeof filter === "string") return truthy(evaluate(parseCached(filter), ctx));
  if (typeof filter !== "object" || Array.isArray(filter)) throw new BaseError("A filter must be an expression or and/or/not.");
  const list = (k) => (Array.isArray(filter[k]) ? filter[k] : [filter[k]]);
  if ("and" in filter) return list("and").every((f) => passes(f, ctx));
  if ("or" in filter) return list("or").some((f) => passes(f, ctx));
  if ("not" in filter) return !list("not").some((f) => passes(f, ctx));
  throw new BaseError(`A filter group must be and, or or not, not “${Object.keys(filter)[0]}”.`);
}

export function matchesFilter(filter, note, { base = { formulas: {} }, dates = null } = {}) {
  return passes(filter, context(base, note, dates));
}

/**
 * The vault's notes a base can show: its `.md` files, narrowed by every `file.inFolder("X")` that must hold
 * for all of them (the top-level filter, or one item of its top-level `and`). That decides which notes to read.
 */
export function candidatePaths(base, paths) {
  const folders = [];
  const look = (f) => {
    if (typeof f !== "string") return;
    let tree;
    try { tree = parseCached(f); } catch { return; }
    if (tree.t === "method" && tree.name === "inFolder" && tree.obj.t === "id" && tree.obj.name === "file"
      && tree.args.length === 1 && tree.args[0].t === "lit") folders.push(tree.args[0].v);
  };
  const top = base.filters;
  if (typeof top === "string") look(top);
  else if (top && typeof top === "object" && "and" in top) (Array.isArray(top.and) ? top.and : [top.and]).forEach(look);
  return paths.filter((p) => /\.md$/i.test(p) && folders.every((f) => inFolder(p, f)));
}

/** Whether a view needs the notes' last-modified dates (they cost extra requests). */
export function usesFileMtime(base, viewIndex) {
  const v = base.views[viewIndex];
  if (!v) return false;
  const text = JSON.stringify([base.filters, base.formulas, v.filters, v.order, v.sort, v.groupBy]);
  return /file\.mtime/.test(text);
}

// ================================================================
// A table view
// ================================================================

const labelOf = (base, key) => base.properties[key]?.displayName || key.replace(/^(note|formula)\./, "");

/**
 * Runs one view over the notes ([{ path, props }]): its filters, sort and groups.
 * Returns { columns: [{ key, label, width }], groups: [{ value, label, rows: [{ path, values }] }], count }.
 * Without a groupBy there's one group with a null label. `dates` maps a path to its last-modified Date.
 */
export function runView(base, viewIndex, notes, dates = null) {
  const view = base.views[viewIndex];
  if (!view) throw new BaseError("This base has no such view.");
  const columns = view.order.map((key) => ({ key, label: labelOf(base, key), width: view.columnSize[key] || null }));
  let rows = [];
  for (const note of notes) {
    const ctx = context(base, note, dates);
    if (!passes(base.filters, ctx) || !passes(view.filters, ctx)) continue;
    const values = {};
    for (const c of columns) values[c.key] = valueOf(ctx, c.key);
    const sortKeys = view.sort.map((s) => valueOf(ctx, s.property));
    const group = view.groupBy ? valueOf(ctx, view.groupBy.property) : null;
    rows.push({ path: note.path, name: baseNameOf(note.path), values, sortKeys, group });
  }
  // Empty values go last whichever way a column sorts.
  const cmp = (a, b, dir) => {
    const ea = isEmptyValue(a), eb = isEmptyValue(b);
    if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1;
    const c = compareValues(a, b);
    return dir === "DESC" ? -c : c;
  };
  rows.sort((a, b) => {
    for (let i = 0; i < view.sort.length; i++) {
      const c = cmp(a.sortKeys[i], b.sortKeys[i], view.sort[i].direction);
      if (c) return c;
    }
    return compareValues(a.name, b.name) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  });
  if (view.limit) rows = rows.slice(0, view.limit);
  const strip = ({ path, values }) => ({ path, values });
  if (!view.groupBy) return { columns, groups: [{ value: null, label: null, rows: rows.map(strip) }], count: rows.length };
  const groups = [];
  for (const row of rows) {
    const empty = isEmptyValue(row.group);
    let g = groups.find((x) => (empty ? x.empty : !x.empty && equal(x.value, row.group)));
    if (!g) groups.push(g = { value: empty ? null : row.group, empty, rows: [] });
    g.rows.push(strip(row));
  }
  groups.sort((a, b) => cmp(a.value, b.value, view.groupBy.direction));
  const show = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : Array.isArray(v) ? v.join(", ") : String(v));
  return {
    columns,
    groups: groups.map((g) => ({ value: g.value, label: g.empty ? "(empty)" : show(g.value), rows: g.rows })),
    count: rows.length,
  };
}
