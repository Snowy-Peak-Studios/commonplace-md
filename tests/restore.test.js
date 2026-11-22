import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { zipFiles, readZip, crc32, zipPathProblem, zipConflict, restoredSettings, nameFromZip, ZIP_LIMITS } from "../src/local.js";

const enc = (text) => new TextEncoder().encode(text);
const dec = (bytes) => new TextDecoder().decode(bytes);

/** A zip written by hand, for what the app's own zipFiles never makes: deflated files, folders, odd flags. */
function handZip(entries) {
  const parts = [], central = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc(e.path);
    const data = e.bytes ?? new Uint8Array();
    const packed = e.method === 8 ? new Uint8Array(deflateRawSync(data)) : data;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(6, (e.flags ?? 0) | 0x0800, true);
    local.setUint16(8, e.method ?? 0, true);
    local.setUint32(14, e.crc ?? crc32(data), true);
    local.setUint32(18, packed.length, true);
    local.setUint32(22, e.size ?? data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, packed);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(8, (e.flags ?? 0) | 0x0800, true);
    c.setUint16(10, e.method ?? 0, true);
    c.setUint32(16, e.crc ?? crc32(data), true);
    c.setUint32(20, packed.length, true);
    c.setUint32(24, e.size ?? data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + packed.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) { out.set(p, at); at += p.length; }
  return out;
}

test("a copy made by Download a copy reads back exactly: Markdown, attachments, empty files, Unicode names, settings", async () => {
  const png = new Uint8Array([137, 80, 78, 71, 0, 255, 13, 10]);
  const files = [
    { path: "Home.md", bytes: enc("# Home\n\nZażółć gęślą jaźń ✓\n") },
    { path: "Notes/Łódź – plan.md", bytes: enc("plan\n") },
    { path: "Notes/empty.md", bytes: new Uint8Array() },
    { path: "Attachments/picture.png", bytes: png },
    { path: ".commonplace.json", bytes: enc(JSON.stringify({ label: "Kitchen", home: "Home.md", inbox: "Notes/Inbox.md", vault: true })) },
  ];
  const back = await readZip(zipFiles(files));
  assert.deepEqual(back.map((f) => f.path), files.map((f) => f.path));
  for (const [i, f] of back.entries()) assert.deepEqual([...f.bytes], [...files[i].bytes], f.path);
  const settings = restoredSettings(back);
  assert.equal(settings.home, "Home.md");
  assert.equal(settings.inbox, "Notes/Inbox.md");
  assert.equal(settings.vault, true);
});

test("deflated files and folder entries are read too", async () => {
  const text = enc("# Notes\n\n" + "words ".repeat(500));
  const back = await readZip(handZip([{ path: "Notes/" }, { path: "Notes/a.md", bytes: text, method: 8 }]));
  assert.deepEqual(back.map((f) => f.path), ["Notes/a.md"]);
  assert.equal(dec(back[0].bytes), dec(text));
});

test("with no settings file, the start page is Home.md or README.md", () => {
  assert.equal(restoredSettings([{ path: "README.md", bytes: enc("x") }]).home, "README.md");
  assert.equal(restoredSettings([{ path: "a.md", bytes: enc("x") }]).home, "");
});

test("paths that leave the vault, or can't be files, are refused", async () => {
  for (const bad of ["../evil.md", "Notes/../../evil.md", "/etc/passwd", "C:/x.md", "a\\b.md", "a//b.md", "./a.md", "a\u0000.md"]) {
    assert.ok(zipPathProblem(bad), bad);
    await assert.rejects(readZip(zipFiles([{ path: "Home.md", bytes: enc("x") }, { path: bad, bytes: enc("x") }])), /can't be restored/, bad);
  }
  assert.equal(zipPathProblem("Notes/Łódź.md"), "");
});

test("files that would be the same file, or a file that is also a folder, are refused", async () => {
  assert.match(zipConflict(["a.md", "a.md"]), /twice/);
  assert.match(zipConflict(["Notes/A.md", "notes/a.md"]), /same file/);
  assert.match(zipConflict(["café.md", "cafe\u0301.md"]), /same file/);
  assert.match(zipConflict(["Notes", "Notes/a.md"]), /also a folder/);
  assert.equal(zipConflict(["Notes/a.md", "Notes/b.md"]), "");
  await assert.rejects(readZip(zipFiles([{ path: "A.md", bytes: enc("1") }, { path: "a.md", bytes: enc("2") }])), /same file/);
});

test("limits: the zip's size, its files' count and their unpacked size", async () => {
  const zip = zipFiles([{ path: "a.md", bytes: enc("12345") }, { path: "b.md", bytes: enc("12345") }]);
  await assert.rejects(readZip(zip, { ...ZIP_LIMITS, archive: 10 }), /MB can be restored/);
  await assert.rejects(readZip(zip, { ...ZIP_LIMITS, files: 1 }), /has 2 files/);
  await assert.rejects(readZip(zip, { ...ZIP_LIMITS, expanded: 8 }), /Unpacked/);
  assert.equal((await readZip(zip, { ...ZIP_LIMITS, expanded: 10, files: 2 })).length, 2);
});

test("damaged and unsupported zips get a plain message", async () => {
  await assert.rejects(readZip(enc("not a zip at all, just text")), /isn't a zip/);
  const good = zipFiles([{ path: "Home.md", bytes: enc("hello") }]);
  const flipped = good.slice();
  flipped[30 + "Home.md".length] ^= 0xff; // a byte of the file's data
  await assert.rejects(readZip(flipped), /checksum/);
  await assert.rejects(readZip(good.slice(0, good.length - 30)), /isn't a zip|damaged/);
  await assert.rejects(readZip(handZip([{ path: "x.md", bytes: enc("x"), flags: 1 }])), /password/);
  await assert.rejects(readZip(handZip([{ path: "x.md", bytes: enc("x"), method: 12 }])), /packed in a way/);
  await assert.rejects(readZip(handZip([{ path: "x.md", bytes: enc("hello"), method: 8, size: 3 }])), /bigger than it says|damaged/);
});

test("a vault's name comes from its copy's file name", () => {
  assert.equal(nameFromZip("My notes 2026-11-22.zip"), "My notes");
  assert.equal(nameFromZip("Kitchen Notebook 2026-11-01 (1).zip"), "Kitchen Notebook");
  assert.equal(nameFromZip("backup.ZIP"), "backup");
  assert.equal(nameFromZip(".zip"), "Restored notes");
});
