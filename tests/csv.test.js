import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, serializeCsv } from "../src/csv.js";

const roundTrip = (text) => {
  const parsed = parseCsv(text);
  return serializeCsv(parsed.rows, parsed);
};

test("plain CSV reads and writes back unchanged", () => {
  const text = "Name,Price,Note\nApples,3,\nPears,5,the best\n";
  assert.deepEqual(parseCsv(text).rows, [["Name", "Price", "Note"], ["Apples", "3", ""], ["Pears", "5", "the best"]]);
  assert.equal(roundTrip(text), text);
});

test("quotes, commas and line breaks inside fields survive", () => {
  const text = 'a,b\n"x, y","say ""hi""\nnext line"\n';
  assert.deepEqual(parseCsv(text).rows, [["a", "b"], ["x, y", 'say "hi"\nnext line']]);
  assert.equal(roundTrip(text), text);
});

test("semicolons, CRLF and a missing last newline are kept", () => {
  const text = "a;b\r\n1;2";
  const p = parseCsv(text);
  assert.equal(p.delimiter, ";");
  assert.equal(p.eol, "\r\n");
  assert.equal(p.trailingNewline, false);
  assert.equal(roundTrip(text), text);
});

test("empty files and empty fields", () => {
  assert.deepEqual(parseCsv("").rows, []);
  assert.deepEqual(parseCsv('a,""\n').rows, [["a", ""]]);
  assert.equal(serializeCsv([["a", null, 3]]), "a,,3\n");
});

test("a quoted header with a line break or another delimiter doesn't fool the guess", () => {
  assert.equal(parseCsv('"Name;\nfull",Age\nAnn,3\n').delimiter, ",");
  assert.deepEqual(parseCsv('"a,b";c\n1;2\n').rows, [["a,b", "c"], ["1", "2"]]);
});

test("a TSV file is always tabs, even with commas on its first line", () => {
  const text = "Title, long\tYear\nA, B\t2020\n";
  const p = parseCsv(text, "\t");
  assert.deepEqual(p.rows, [["Title, long", "Year"], ["A, B", "2020"]]);
  assert.equal(serializeCsv(p.rows, p), text);
});

test("a byte order mark stays out of the first cell and is written back", () => {
  const text = "﻿Name,Age\nAnn,3\n";
  const p = parseCsv(text);
  assert.equal(p.rows[0][0], "Name");
  assert.equal(serializeCsv(p.rows, p), text);
});

test("Excel's sep= line sets the delimiter and is kept", () => {
  const text = "sep=;\r\na;b,c\r\n1;2\r\n";
  const p = parseCsv(text);
  assert.equal(p.delimiter, ";");
  assert.deepEqual(p.rows, [["a", "b,c"], ["1", "2"]]);
  assert.equal(serializeCsv(p.rows, p), text);
});

test("a big file reads and writes back fast", () => {
  const line = 'one,"two, quoted",3,"line\nbreak"\n';
  const text = "a,b,c,d\n" + line.repeat(50000);
  const t0 = Date.now();
  const p = parseCsv(text);
  assert.equal(p.rows.length, 50001);
  assert.deepEqual(p.rows[50000], ["one", "two, quoted", "3", "line\nbreak"]);
  assert.equal(serializeCsv(p.rows, p), text);
  assert.ok(Date.now() - t0 < 2000);
});
