import { z } from "zod";

export const cleanText = (minimum = 1, maximum = 160) =>
  z.string().trim().min(minimum).max(maximum).transform((value) =>
    value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, ""),
  );

export const classSchema = z.object({
  name: cleanText(2, 80),
  grade: z.coerce.number().int().min(1).max(13),
  section: cleanText(1, 24),
  session: z.string().regex(/^\d{4}[-–]\d{2}$/),
  active: z.boolean().optional(),
});

const subjectBaseSchema = z.object({
  name: cleanText(2, 100),
  code: z.string().trim().min(2).max(24).regex(/^[A-Za-z0-9_-]+$/),
  fullMarks: z.coerce.number().positive().max(1000),
  passMarks: z.coerce.number().min(0).max(1000),
  active: z.boolean().optional(),
});

export const subjectSchema = subjectBaseSchema.refine((subject) => subject.passMarks <= subject.fullMarks, {
  message: "Pass marks must not exceed full marks.",
  path: ["passMarks"],
});
export const subjectPatchSchema = subjectBaseSchema.partial();

export const studentSchema = z.object({
  name: cleanText(2, 120),
  roll: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  classId: z.string().regex(/^[a-f\d]{24}$/i),
  section: cleanText(1, 24),
  session: z.string().regex(/^\d{4}[-–]\d{2}$/),
  active: z.boolean().optional(),
});

const resultItemSchema = z.object({
  subjectId: z.string().regex(/^[a-f\d]{24}$/i),
  marks: z.coerce.number().min(0).max(1000),
});

export const resultSchema = z.object({
  studentId: z.string().regex(/^[a-f\d]{24}$/i),
  classId: z.string().regex(/^[a-f\d]{24}$/i),
  exam: cleanText(2, 80),
  session: z.string().regex(/^\d{4}[-–]\d{2}$/),
  items: z.array(resultItemSchema).min(1).max(50),
});

export const noticeSchema = z.object({
  title: cleanText(3, 180),
  excerpt: cleanText(5, 3000),
  category: cleanText(2, 60),
  published: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const classSubjectSchema = z.object({
  classId: z.string().regex(/^[a-f\d]{24}$/i),
  subjectId: z.string().regex(/^[a-f\d]{24}$/i),
  session: z.string().regex(/^\d{4}[-–]\d{2}$/),
  active: z.boolean().optional(),
});

export const publicSearchSchema = z.object({
  roll: z.string().trim().min(1).max(40),
  session: z.string().regex(/^\d{4}[-–]\d{2}$/),
  exam: z.string().trim().min(2).max(80),
});

export const statusSchema = z.object({
  active: z.boolean().optional(),
  published: z.boolean().optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected", "published", "locked"]).optional(),
}).refine((input) => Object.keys(input).length > 0);

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
