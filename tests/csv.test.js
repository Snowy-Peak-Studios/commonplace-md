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
