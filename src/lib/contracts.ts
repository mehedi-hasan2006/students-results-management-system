export type ResultStatus = "draft" | "submitted" | "approved" | "rejected" | "published" | "locked";
export type ResourceStatus = "active" | "inactive" | "published" | "draft";

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: Record<string, unknown>;
}

export interface ClassSubjectRecord {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  session: string;
  active: boolean;
  fullMarks: number;
  passMarks: number;
}

export interface PublishedResultRecord {
  id: string;
  status: ResultStatus;
  exam: string;
  session: string;
  publishedAt?: string;
  student: { name: string; roll: string };
  class: { name: string; section: string } | null;
  items: {
    subject: string;
    marks: number;
    fullMarks: number;
    passMarks: number;
    grade: string;
  }[];
}

export interface PublishedNoticeRecord {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt?: string;
}
