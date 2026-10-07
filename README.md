# Meridian Academy · Student Results Portal

A responsive student portal and school administration workspace built with Next.js 16, React, TypeScript, Tailwind CSS 4, shadcn/ui-compatible Radix components, a separate Express 5 API, Better Auth, and MongoDB's native Node.js driver. Mongoose is not used.

## Getting started

### Requirements

- Node.js 20 or later and npm.
- MongoDB Community Edition or a MongoDB Atlas database.

### Local setup

```powershell
npm install
Copy-Item .env.example .env
Copy-Item .env.example .env.local
```

Edit `.env` and `.env.local`: use your MongoDB URI and generate a private `BETTER_AUTH_SECRET` with at least 32 characters. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` of at least 12 characters before the first seed. `.env` configures the Express API and `.env.local` configures Next.js. Do not commit real environment values.

Seed the MongoDB database and create the first administrator account:

```powershell
npm run seed
```

Run the frontend and its separate API together:

```powershell
npm run dev:full
```

Open [http://localhost:3000](http://localhost:3000). Sign in to the admin workspace using the account configured before seeding. For separate terminals, use `npm run dev` and `npm run dev:api`. The API health endpoint is [http://localhost:4000/api/health](http://localhost:4000/api/health).

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Student portal welcome page |
| `/results/search` | Published student result search |
| `/results/[id]` | Print-friendly individual result sheet |
| `/notices` | Published school notices |
| `/login`, `/forgot-password` | Staff sign-in and password support |
| `/admin` | School administration dashboard |
| `/admin/classes`, `/admin/subjects` | Class and subject workspaces |
| `/admin/students`, `/admin/results`, `/admin/notices` | Student, result, and notice workspaces |
| `/admin/settings` | School and access settings |
| `/teacher` and `/teacher/*` | Explicitly marked, not-yet-enabled teacher workspace shells |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run dev:api` | Start the Express API with watch mode |
| `npm run dev:full` | Run both development servers |
| `npm run build` | Build the production Next.js app |
| `npm run start` | Start the production Next.js app |
| `npm run start:api` | Start the API process |
| `npm run seed` | Create realistic sample classes, subjects, students, results, notices, and an optional admin |
| `npm run typecheck` | Type-check frontend and server TypeScript |
| `npm run lint` | Run ESLint |
| `npm test` | Run request-schema validation tests |

## Architecture and security

`src/app` contains the public, admin, authentication, and clearly labeled future teacher routes. Shared interactive UI lives in `src/components`; typed sample records, API requests, and reusable domain validation are kept separate. `server/` is an independently started Express API, uses the MongoDB native driver, registers unique indexes, validates and sanitizes input with Zod, enforces database-backed admin authorization, and protects unpublished public content. Better Auth owns email/password sessions and identity collections.

Use administrator sign-in for all write routes. Public users can search only by exact roll number, academic session, and exam type. The API returns only published records and rate limits public result searches. Never expose MongoDB credentials, Better Auth secrets, or admin credentials to the browser. Configure TLS, strict origin values, backups, and a trusted proxy before production deployment. If the frontend/API use sibling subdomains, set `BETTER_AUTH_COOKIE_DOMAIN` to their shared parent domain so the HttpOnly session cookie reaches the server-rendered admin gate.

See [API.md](./API.md) for database setup, normalized collections, authentication, access checks, and the API route reference.

## Implementation status

The frontend is intentionally usable with sample records before a database is connected. Sample results/notices and admin table rows are labeled as demo data and are not an authoritative database. The Express API supports protected CRUD for classes, subjects, students, results, notices, and class-subject combinations; creating result drafts validates active class/session/subject links and marks against full/pass marks. Public APIs expose published records only.

Teacher permissions and workflows are future scope, not active features: teacher assignment UI, teacher-specific API authorization/mark writes, review queues, approval/rejection/reopen/lock actions, and teacher mark audit events have not been implemented. Also not implemented: password reset email delivery, live dashboard metrics, and bulk per-student result-sheet/PDF generation. Set `NEXT_PUBLIC_DEMO_MODE=false` in `.env.local` to use live admin lists; filtered admin records can be exported as CSV or printed, and individual result sheets can be printed or saved as PDF through the browser dialog.

The public demo search uses local sample result records by design; when a database is available, use the API as the source of truth. Do not treat demo content as school data.
