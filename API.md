# Meridian Academy API

The API is a separate Express 5 process (`server/`) and uses MongoDB's native driver. It does not use Mongoose. The API listens on `http://localhost:4000`; set `NEXT_PUBLIC_API_URL`, `APP_ORIGIN`, and `BETTER_AUTH_URL` to the deployed frontend and API origins before deployment. When the frontend and API use sibling subdomains, set `BETTER_AUTH_COOKIE_DOMAIN` to their shared parent domain so the HttpOnly session is sent to both hosts. Keep both origins HTTPS and in the same site; do not set a broad cookie domain for unrelated sites.

## Start locally

1. Install MongoDB Community Edition locally or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env.local` and `.env`, then set a MongoDB URI and a random, private `BETTER_AUTH_SECRET` of at least 32 characters in both app environments as needed. The API loads `.env`; Next.js loads `.env.local`.
3. Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` with a password of at least 12 characters. The seed command creates this account with Better Auth and promotes it to administrator; public registration is disabled.
4. Run `npm run seed` once, then `npm run dev:full`. Alternatively, use `npm run dev` and `npm run dev:api` in separate terminals.
5. Sign in at `/login`. The initial demo account is the email/password explicitly supplied in your local environment; no shared default password is shipped.

Set `MONGODB_TRANSACTIONS=true` only when your database supports transactions (for example, a replica set). Result records and their normalized items are otherwise written with application-level input validation. Configure backups for any production database.

## Authentication and permissions

Better Auth's email/password sessions use MongoDB. The Express API reads the session from the request cookie and checks the current user's persisted role and active status on every admin request. Public self-registration is rejected. The first administrator is provisioned by `npm run seed` and subsequent role changes must be performed by a trusted operator directly against the user collection. `ADMIN_EMAILS` is an optional bootstrap allowlist, not a substitute for session authentication.

Unpublished results and notices are not returned by public endpoints. Student lookup requires an exact roll number, academic session, and exam type, and is rate limited to 30 requests per IP per 15 minutes. CORS accepts only the configured `APP_ORIGIN`. The API uses Helmet, a 64 KB JSON request limit, Zod validation, text sanitization, unique indexes, and explicit authorization checks.

## Routes

All success responses are JSON `{ "data": ... }`. Errors use `{ "error": "..." }`; validation errors may also contain Zod field details. Object IDs are MongoDB ObjectIds encoded as 24-character hexadecimal strings.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API health |
| POST | `/api/auth/sign-in/email` | Public | Better Auth email/password sign in |
| POST | `/api/auth/sign-out` | Session | Better Auth sign out |
| GET | `/api/auth/get-session` | Session | Current Better Auth session |
| GET | `/api/public/results?roll=&session=&exam=` | Public, rate limited | Exact lookup of a published result |
| GET | `/api/public/results/:id` | Public, rate limited | Published result sheet only |
| GET | `/api/public/notices` | Public | Active, published notices only |
| GET | `/api/admin/activity` | Admin | Recent activity log |
| GET/POST | `/api/admin/classes` | Admin | List/create classes |
| GET/POST | `/api/admin/subjects` | Admin | List/create subjects |
| GET/POST | `/api/admin/students` | Admin | List/create students |
| GET/POST | `/api/admin/results` | Admin | List/create result drafts with validated subject marks |
| GET/POST | `/api/admin/notices` | Admin | List/create notice drafts |
| GET/POST | `/api/admin/class-subjects` | Admin | List/create class-subject-session combinations |
| PATCH/DELETE | `/api/admin/:resource/:id` | Admin | Edit, activate/deactivate, publish/unpublish, or delete supported records |

Valid resource names for update/delete are `classes`, `subjects`, `students`, `results`, `notices`, and `class-subjects`. Result status changes are administrator-only. Newly created results always start as drafts, and newly created notices are unpublished. A result cannot be published unless it exists with valid subject marks. Referenced classes, subjects, and students cannot be deleted; deactivate them instead.

### Request examples

Create a result after creating its student, class, subject, and class-subject records:

```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "classId": "507f1f77bcf86cd799439012",
  "exam": "Mid-term Examination",
  "session": "2025–26",
  "items": [
    { "subjectId": "507f1f77bcf86cd799439013", "marks": 86 }
  ]
}
```

`marks` may be zero through the configured subject full marks. The server checks that the student, class, academic session, and active class-subject assignments match, rejects duplicate subjects, and derives each grade from the subject's full and pass marks. Results start in `draft` status.

Publish a validated result with `PATCH /api/admin/results/:id` and `{"published":true}`. Unpublish it with `{"published":false}`. To activate or deactivate a class, subject, student, or combination, use `{"active":false}` or `{"active":true}`. Publish or unpublish a notice with the corresponding `published` boolean. Every successful result creation, edit, publication, and deletion is written to `activityLog` with the administrator identity.

## Normalized collections

| Collection | Purpose |
| --- | --- |
| `user`, `account`, `session` | Better Auth identity, credential/provider, and session data |
| `class` | Grade, section, academic session, active status |
| `subject` | Unique subject code, full marks, pass marks, active status |
| `classSubject` | Class/subject/session join with an active flag |
| `student` | Student identity, unique roll/session, class reference, active status |
| `result` | Student/class/exam/session, draft/review/published status |
| `resultItem` | One validated subject mark per result; indexed independently |
| `teacherAssignment` | Future assignment scope: teacher/class/subject/session |
| `notice` | Sanitized notice content, publication and active flags |
| `activityLog` | Actor, action, affected entity, timestamp, and safe detail fields |

MongoDB indexes enforce unique class/section/session, subject code, student roll/session, class-subject/session, result/student/class/session/exam, and result-item/subject combinations. Result marks must be between zero and the subject full marks; pass marks cannot exceed full marks. Grades are derived server-side.

## Demo vs. implemented

- The public UI initially uses clearly labelled sample records so it can be viewed without a database connection. Start the API and seed MongoDB to use persisted records. Public API responses always come from published MongoDB records.
- With `NEXT_PUBLIC_DEMO_MODE=true` (the starter default), admin lists show clearly marked sample rows. Set it to `false` to load MongoDB-backed lists and form options. In live mode, create/edit/activate/deactivate/publish/unpublish/delete operations call the authenticated API and show API errors instead of claiming success.
- Teacher route shells, assignment collection/index, and result statuses reserve the future teacher workflow. Teacher login/role administration, assignment management, teacher mark drafts/submissions, approval/rejection/reopen/lock UI, and teacher audit events are **not implemented**. No teacher API permits writing marks.
- Email delivery/password-reset provider and bulk per-student result-sheet/PDF generation are **not implemented**. Admin tables can export the currently filtered rows to CSV or print the filtered table. Individual public result sheets can be printed or saved as PDF through the browser print dialog.
