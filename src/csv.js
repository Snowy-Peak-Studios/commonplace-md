// CSV read and write (RFC 4180 quoting). The delimiter and line ending are kept as found.

export function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, "");
  let best = ",", bestCount = 0;
  for (const d of [",", ";", "\t"]) {
    const n = firstLine.split(d).length - 1;
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

export function parseCsv(text) {
  const delimiter = detectDelimiter(text);
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
  return { rows, delimiter, eol, trailingNewline };
}

export function serializeCsv(rows, { delimiter = ",", eol = "\n", trailingNewline = true } = {}) {
  const needsQuotes = (s) => s.includes(delimiter) || s.includes('"') || s.includes("\n") || s.includes("\r");
  const cell = (v) => {
    const s = v == null ? "" : String(v);
    return needsQuotes(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => r.map(cell).join(delimiter)).join(eol);
  return rows.length && trailingNewline ? body + eol : body;
}
