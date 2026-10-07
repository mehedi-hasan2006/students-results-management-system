import assert from "node:assert/strict";
import test from "node:test";
import { calculateGrade, isValidMarkRange } from "./marks.js";

test("marks must fit both the full-mark and pass-mark range", () => {
  assert.equal(isValidMarkRange(40, 100, 40), true);
  assert.equal(isValidMarkRange(0, 100, 40), true);
  assert.equal(isValidMarkRange(101, 100, 40), false);
  assert.equal(isValidMarkRange(5, 100, 101), false);
  assert.equal(isValidMarkRange(Number.NaN, 100, 40), false);
});

test("grades are derived on the server and below-pass marks fail", () => {
  assert.equal(calculateGrade(80, 100, 40), "A+");
  assert.equal(calculateGrade(70, 100, 40), "A");
  assert.equal(calculateGrade(39, 100, 40), "F");
});
