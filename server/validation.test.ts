import assert from "node:assert/strict";
import test from "node:test";
import { classSchema, noticeSchema, resultSchema, subjectPatchSchema, subjectSchema } from "./validation.js";

test("subject marks require a passing threshold no greater than full marks", () => {
  assert.equal(subjectSchema.safeParse({
    name: "Mathematics",
    code: "MAT-01",
    fullMarks: 100,
    passMarks: 40,
  }).success, true);
  assert.equal(subjectSchema.safeParse({
    name: "Mathematics",
    code: "MAT-01",
    fullMarks: 40,
    passMarks: 41,
  }).success, false);
  assert.equal(subjectPatchSchema.safeParse({ name: "Advanced Mathematics" }).success, true);
});

test("result input validates object identifiers and refuses empty marks", () => {
  const valid = {
    studentId: "507f1f77bcf86cd799439011",
    classId: "507f1f77bcf86cd799439012",
    exam: "Mid-term Examination",
    session: "2025–26",
    items: [{ subjectId: "507f1f77bcf86cd799439013", marks: 80 }],
  };
  assert.equal(resultSchema.safeParse(valid).success, true);
  assert.equal(resultSchema.safeParse({ ...valid, items: [] }).success, false);
  assert.equal(resultSchema.safeParse({ ...valid, items: [{ ...valid.items[0], subjectId: "not-an-id" }] }).success, false);
});

test("class input constrains academic session and grade", () => {
  const valid = { name: "Grade 10", grade: 10, section: "A", session: "2025-26" };
  assert.equal(classSchema.safeParse(valid).success, true);
  assert.equal(classSchema.safeParse({ ...valid, grade: 25 }).success, false);
  assert.equal(classSchema.safeParse({ ...valid, session: "current" }).success, false);
});

test("notice content is stripped of HTML before persistence", () => {
  const parsed = noticeSchema.parse({
    title: "<script>alert(1)</script>Exam notice",
    excerpt: "Exam details <img src=x onerror=alert(1)> are available.",
    category: "Examinations",
  });
  assert.equal(parsed.title.includes("<"), false);
  assert.equal(parsed.excerpt.includes("<"), false);
});
