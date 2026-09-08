# LifeDrop Backend

Node.js + Express + TypeScript + MongoDB REST API for the LifeDrop blood donation admin frontend (Next.js).

All imports in this project use **relative paths** (`../../foo`) — no `@` path aliases anywhere, on purpose, since alias resolution was causing build failures on Vercel.

## Stack

- Express 4 + TypeScript
- MongoDB via Mongoose 8
- JWT auth (access + refresh) with `tokenVersion`-based session invalidation
- Zod request validation
- Deployable as a traditional long-running server **or** as Vercel serverless functions

## Getting started (local)

```bash
cd backend
cp .env.example .env      # then fill in real secrets / a real MONGODB_URI
npm install
npm run seed               # creates a SUPER_ADMIN + sample staff/donors/donation
npm run dev                 # http://localhost:5000/api/v1
```

Seeded SUPER_ADMIN login is whatever you set in `.env` as `SEED_SUPER_ADMIN_IDENTIFIER` /
`SEED_SUPER_ADMIN_PASSWORD` (defaults: `admin@lifedrop.app` / `ChangeMe123!`).

Point the frontend's `NEXT_PUBLIC_API_URL` at `http://localhost:5000/api/v1`.

## Deploying to Vercel

This repo includes `vercel.json` + `api/index.ts`, which rewrite every request to a single
serverless function that wraps the same Express app used locally.

1. Push this `backend/` folder as its own Vercel project (root directory = `backend`).
2. Set the environment variables from `.env.example` in the Vercel project settings
   (`MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, etc).
3. Deploy. No build step is required beyond Vercel's own `@vercel/node` TypeScript compilation —
   there's nothing to configure for path aliases because none are used.
4. Use a MongoDB Atlas (or similar hosted) connection string — Vercel functions can't reach a
   `localhost` database. The connection is cached across invocations (`src/config/db.ts`) to avoid
   exhausting your connection pool.

For local dev or any traditional Node host (Render, Railway, an EC2 box, etc.), `npm run build && npm start`
still works via `src/server.ts` — that entrypoint is untouched by the Vercel setup.

## ⚠️ Donation cooldown mismatch to resolve

The frontend's `lib/utils.ts` defines the donation cooldown as **90 days** (`MIN_DONATION_GAP_DAYS = 90`,
used to hide ineligible donors in the picker and disable the submit button). This backend defaults to
**120 days** (`MIN_DONATION_GAP_DAYS` in `.env`), matching the rule agreed on earlier for the donor
eligibility engine.

Because the frontend hint and the backend's authoritative check disagree, a donor between day 91–120
will look eligible in the UI (shown in the donor picker, submit button enabled) but the backend will
reject the donation with a 400 error. Pick one number and update the other side:

- To make the backend match the frontend: set `MIN_DONATION_GAP_DAYS=90` in `.env`.
- To make the frontend match the backend: change `MIN_DONATION_GAP_DAYS` in `lib/utils.ts` to `120`.

## Auth contract notes

- `POST /api/v1/auth/refresh` returns **only** `{ accessToken }` — never a rotated refresh token.
  This matches the frontend's axios interceptor (`lib/axios.ts`), which reads `data.accessToken`
  exclusively. Returning anything else here will silently break refresh on the client.
- `POST /api/v1/auth/register-staff` is dual-purpose:
  - No/invalid `Authorization` header → public self-registration, role is forced to `MEMBER`
    regardless of what's in the request body.
  - Authenticated as `SUPER_ADMIN` → creates a staff account with the requested role (`ADMIN` or
    `MEMBER`; `SUPER_ADMIN` cannot be created through this endpoint).
  - Authenticated as `ADMIN` or `MEMBER` → `403 Forbidden`.
- `logout` and disabling a staff account (`PUT /admin/staff/:id/status` with `DISABLED`) both bump
  `tokenVersion`, which immediately invalidates every access/refresh token already issued to that user.

## DTO shape notes

The same underlying `User` document is serialized two different ways depending on the endpoint,
matching the frontend's types exactly:

- `AuthUser` (from `/auth/login`, `/auth/me`, `/auth/register-staff`) uses `id`.
- `StaffMember` (from `/admin/staff`) uses `_id`.

See `src/utils/serializers.ts`.

## Donor create/update contract

The frontend submits a donor in **two separate calls** (see `donor-form-modal.tsx`):

1. `POST /donors` or `PUT /donors/:id` — personal info only (name, phone, email, bloodGroup, gender,
   dob, address, lastDonationDate, availability). An optional `password` field creates a linked donor
   login account (`User` with role `MEMBER`) if an `email` is also present.
2. `PUT /donors/:id/medical-record` — the nested medical record (`weightKg`, `bloodPressure`,
   `hemoglobin`, `conditions`, `currentMedications`). The backend recomputes `eligibilityStatus` from
   these values every time this endpoint is called (see `src/utils/eligibility.ts`).

## Donation log (new)

- `POST /donations` (ADMIN/SUPER_ADMIN only) records a donation. Before saving, it runs the full
  eligibility check (`canDonateNow` in `src/utils/eligibility.ts`): the date-based cooldown **and**
  the donor's current medical `eligibilityStatus` must both pass, or the request is rejected with a
  400 and a reason. On success, the donor's `lastDonationDate` is advanced if the new donation is more
  recent than what's stored.
- The donor's name and blood group are **snapshotted** onto the `Donation` document at creation time
  (`donorName`, `donorBloodGroup`), rather than joined live on every read. This keeps list queries fast
  and keeps historical records accurate even if the donor's details are edited later.
- `GET /donations` — paginated, filterable by `donorId` and free-text `search` (matches donor name,
  recipient name, or location). Available to any authenticated role.
- `GET /donors/:id/donations` — full donation history for one donor, newest first.

## Eligibility engine

`src/utils/eligibility.ts` combines two independent checks (both env-configurable):

1. **Medical eligibility** (`computeEligibilityStatus`) — recomputed whenever a medical record is
   saved. Hard blocks (`INELIGIBLE`): HIV, Hepatitis, heart disease, weight below `MIN_WEIGHT_KG`,
   hemoglobin below the gender-specific threshold, or age outside `MIN_DONOR_AGE`–`MAX_DONOR_AGE`.
   Temporary deferrals (`PENDING_REVIEW`): recent surgery, recent tattoo, or diabetes. Otherwise
   `ELIGIBLE`.
2. **Date-based cooldown** (`isDateEligible` / `daysUntilEligible`) — days since `lastDonationDate`
   vs. `MIN_DONATION_GAP_DAYS`.

`canDonateNow()` combines both and is the single source of truth enforced by `POST /donations`.

## Filtered donor listing

`GET /donors` uses an aggregation pipeline (`src/controllers/donor.controller.ts`) rather than a plain
`find()`, because the `eligibility=ELIGIBLE|INELIGIBLE` filter depends on a value (the date-based
cooldown) that isn't stored on the document — it has to be computed relative to "now" inside the
pipeline (`$addFields` + `$subtract`/`$divide` against `$$NOW`), then combined with the stored
`medicalRecord.eligibilityStatus` before pagination (`$facet`).

## Endpoints

| Method | Path                          | Access                  |
|--------|-------------------------------|--------------------------|
| POST   | /auth/login                   | Public                  |
| POST   | /auth/register-staff          | Public / SUPER_ADMIN    |
| GET    | /auth/me                      | Authenticated            |
| POST   | /auth/logout                  | Authenticated            |
| POST   | /auth/refresh                 | Public (valid refresh token) |
| GET    | /donors                       | Authenticated            |
| GET    | /donors/:id                   | Authenticated            |
| GET    | /donors/:id/donations         | Authenticated            |
| POST   | /donors                       | ADMIN, SUPER_ADMIN       |
| PUT    | /donors/:id                   | ADMIN, SUPER_ADMIN       |
| DELETE | /donors/:id                   | SUPER_ADMIN              |
| PUT    | /donors/:id/medical-record    | ADMIN, SUPER_ADMIN       |
| GET    | /donations                    | Authenticated            |
| POST   | /donations                    | ADMIN, SUPER_ADMIN       |
| GET    | /admin/stats                  | Authenticated            |
| GET    | /admin/staff                  | SUPER_ADMIN              |
| PUT    | /admin/staff/:id/role         | SUPER_ADMIN              |
| PUT    | /admin/staff/:id/status       | SUPER_ADMIN              |

All paths are relative to `API_PREFIX` (default `/api/v1`).

## Known gap: emergency requests

`GET /admin/stats` currently returns a hardcoded `emergencyRequests: 0`. The frontend's `/requests`
page is still a placeholder ("wire this up next alongside the notifications service" — its own words),
so there's no `Request` model yet. Build that model + endpoints together when that feature is ready.
