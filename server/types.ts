import type { ObjectId } from "mongodb";

export type Role = "admin" | "teacher" | "student";
export type MarkStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "published"
  | "locked";

export interface TimedDocument {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolClass extends TimedDocument {
  name: string;
  grade: number;
  section: string;
  session: string;
  active: boolean;
}

export interface Subject extends TimedDocument {
  name: string;
  code: string;
  fullMarks: number;
  passMarks: number;
  active: boolean;
}

export interface ClassSubject extends TimedDocument {
  classId: ObjectId;
  subjectId: ObjectId;
  session: string;
  active: boolean;
}

export interface Student extends TimedDocument {
  name: string;
  roll: string;
  email: string;
  classId: ObjectId;
  section: string;
  session: string;
  active: boolean;
}

export interface Result extends TimedDocument {
  studentId: ObjectId;
  classId: ObjectId;
  exam: string;
  session: string;
  status: MarkStatus;
  active: boolean;
  publishedAt?: Date;
  createdBy: string;
}

export interface ResultItem extends TimedDocument {
  resultId: ObjectId;
  subjectId: ObjectId;
  marks: number;
  fullMarks: number;
  passMarks: number;
  grade: string;
}

export interface TeacherAssignment extends TimedDocument {
  teacherId: string;
  classId: ObjectId;
  subjectId: ObjectId;
  session: string;
  active: boolean;
}

export interface Notice extends TimedDocument {
  title: string;
  excerpt: string;
  category: string;
  published: boolean;
  active: boolean;
  publishedAt?: Date;
  createdBy: string;
}

export interface ActivityLog extends TimedDocument {
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: ObjectId;
  details: Record<string, unknown>;
}
