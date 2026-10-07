@AGENTS.md


You are a senior full-stack engineer and product designer. Build a professional, secure, responsive Student Results Management System using Next.js, TypeScript, Tailwind CSS, shadcn/ui, Better Auth, a separate Express.js backend, and MongoDB with the native MongoDB driver. Do not use Mongoose.

The system must allow admins to manage classes, subjects, class-subject combinations, students, results, notices, and print/download workflows. Students must be able to search by roll number, academic session, and exam type, but they must see only published results and published notices.

Use reusable components, reusable functions, typed API contracts, realistic demo data, and a clean architecture so demo data can later be replaced with real backend data.

Implement secure server-side authentication and authorization. Admins can create, edit, activate/deactivate, and delete classes and subjects; manage class-subject combinations; register and edit students; create, edit, publish/unpublish, and delete results; manage notices; and print or download individual or filtered bulk results.

Prepare the architecture for a future teacher role. In the future, admins will assign teachers to specific classes, academic sessions, and subjects. A teacher will be allowed to enter and edit marks only for assigned subjects and classes, save drafts, and submit marks for review. Teachers must not see or modify unrelated subjects, must not publish final results, and must not bypass backend permission checks. Admins will review, approve, reject, reopen, or lock teacher-submitted marks. Keep an audit log of who entered, edited, submitted, approved, or published marks.

Use a normalized MongoDB model for User, Account, Session, Class, Subject, ClassSubject, Student, Result, ResultItem, TeacherAssignment, Notice, and ActivityLog. Add timestamps, active/published/status fields, indexes, unique constraints or equivalent safeguards, and validation for marks against full marks and pass marks.

Create these routes:
Public: /, /results/search, /results/[id], /notices.
Auth: /login, /forgot-password.
Admin: /admin, /admin/classes, /admin/subjects, /admin/students, /admin/results, /admin/notices, /admin/settings.
Future teacher: /teacher, /teacher/marks, /teacher/submissions, /teacher/profile.

Build a polished academic SaaS UI with a responsive sidebar, top bar, breadcrumbs, user menu, theme toggle, accessible forms, searchable tables, filters, pagination, dialogs, confirmation prompts, toasts, loading states, error states, empty states, and a print-friendly result sheet.

Enforce all permissions on the Express backend and never rely only on client-side guards. Validate requests with Zod, sanitize user content, protect unpublished results, add basic rate limiting to public searches, keep secrets in environment variables, and provide .env.example, seed data, database setup instructions, API documentation, and README documentation.

Implement in this order: project setup and database/authentication; admin dashboard shell; class and subject management; student management; result entry and publishing; public result search and print/download; notices; then future teacher permissions and subject-wise marks entry. After each milestone, run type-check, lint, tests, and production build, and fix all errors before continuing. Clearly label anything not implemented instead of pretending it is complete.