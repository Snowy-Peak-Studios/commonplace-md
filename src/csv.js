// CSV read and write (RFC 4180 quoting). The delimiter, line ending, a byte order mark and Excel's
// `sep=` line are kept as found.

/** The delimiter used on the first line, quoted fields left out (they may hold any of them, and line breaks). */
export function detectDelimiter(text) {
  const firstLine = text.replace(/"(?:[^"]|"")*"/g, "").split(/\r?\n/, 1)[0];
  let best = ",", bestCount = 0;
  for (const d of [",", ";", "\t"]) {
    const n = firstLine.split(d).length - 1;
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

/** `delimiter` is taken as given when set (a `.tsv` file is always tabs); otherwise it's guessed. */
export function parseCsv(text, delimiter = null) {
  const bom = text.startsWith("﻿");
  if (bom) text = text.slice(1);
  // Excel may start a file with a line naming its delimiter: `sep=;`
  const sep = /^sep=(.)(\r?\n|$)/i.exec(text);
  const sepLine = sep ? sep[0] : "";
  if (sep) text = text.slice(sepLine.length);
  delimiter = sep ? sep[1] : delimiter || detectDelimiter(text);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const trailingNewline = /\r?\n$/.test(text);
  const rows = [];
  let row = [], field = "", quoted = false, i = 0;
  const endField = () => { row.push(field); field = ""; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"' && field === "") { quoted = true; i++; continue; }
    if (c === delimiter) { endField(); i++; continue; }
    if (c === "\r" && text[i + 1] === "\n") { endRow(); i += 2; continue; }
    if (c === "\n") { endRow(); i++; continue; }
    field += c; i++;
  }
  if (field !== "" || row.length || (!trailingNewline && text.length)) endRow();
  return { rows, delimiter, eol, trailingNewline, bom, sepLine };
}

export function serializeCsv(rows, { delimiter = ",", eol = "\n", trailingNewline = true, bom = false, sepLine = "" } = {}) {
  const needsQuotes = (s) => s.includes(delimiter) || s.includes('"') || s.includes("\n") || s.includes("\r");
  const cell = (v) => {
    const s = v == null ? "" : String(v);
    return needsQuotes(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => r.map(cell).join(delimiter)).join(eol);
  return (bom ? "﻿" : "") + sepLine + (rows.length && trailingNewline ? body + eol : body);
}
