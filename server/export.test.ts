import assert from "node:assert/strict";
import test from "node:test";
import { toCsv } from "../src/lib/export.js";

test("CSV output quotes fields and escapes embedded quotes and newlines", () => {
  const csv = toCsv(["Student", "Notice"], [["Aarav Sharma", 'Exam "A"\nRoom 2']]);
  assert.equal(csv, '"Student","Notice"\r\n"Aarav Sharma","Exam ""A""\nRoom 2"');
});

test("CSV export prefixes formula-like user content", () => {
  const csv = toCsv(["Name"], [["=HYPERLINK(\"https://example.com\")"]]);
  assert.equal(csv.includes('\r\n"\'=HYPERLINK('), true);
});
