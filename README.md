# LifeDrop — Blood Donation Admin API (Backend)

Production-ready RESTful API for the LifeDrop Blood Donation Management platform.
Node.js + Express + TypeScript + MongoDB (Mongoose), with JWT auth (access + refresh)
and full Role-Based Access Control. Built to match the shipped Next.js frontend's
service layer (`lib/services/*.ts`, `types/index.ts`) exactly.

## Stack

- Node.js 18+, Express 4, TypeScript 5
- MongoDB + Mongoose 8
- JWT (`jsonwebtoken`) — short-lived access token + longer-lived refresh token
- `bcryptjs` password hashing
- `zod` request validation
- `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `hpp` for security hardening

## Getting Started

```bash
npm install
cp .env.example .env      # then edit values, especially JWT secrets and MONGODB_URI
npm run dev                # ts-node + nodemon, http://localhost:5000/api/v1

# bootstrap the first Super Admin account (reads SEED_SUPER_ADMIN_* from .env)
npm run seed

# production
npm run build
npm start
```

The frontend's `.env.local` should point `NEXT_PUBLIC_API_URL` at
`http://localhost:5000/api/v1` (or wherever this API is deployed).

## Folder Structure

```
src/
  config/        env.ts (validated env vars), db.ts (Mongo connection)
  constants/     roles.ts (Role/Status/BloodGroup enums, eligibility rules)
  models/        user.model.ts, donor.model.ts, medicalRecord.model.ts
  middlewares/   auth (JWT), rbac (role gate), validate (zod), error, notFound
  utils/         ApiError, jwt, eligibility (120-day rule engine), pagination,
                 serializers (DTOs matching the frontend's types/index.ts exactly)
  validators/    zod schemas per resource
  controllers/   auth, donor, admin
  routes/        auth, donor, admin, index
  app.ts         Express app wiring (security middleware, routes, error handler)
  server.ts      boots Mongo connection + HTTP server, graceful shutdown
scripts/
  seed.ts        creates the first SUPER_ADMIN account
```

## Authentication

- `identifier` is either an email or a phone number — one unified field, matching
  the frontend's single login input.
- **Access token**: short-lived (default 15m), sent as `Authorization: Bearer <token>`.
- **Refresh token**: longer-lived (default 7d), exchanged via `POST /auth/refresh`.
  Refresh tokens are **not** rotated on use (only invalidated via `tokenVersion`,
  bumped on logout or when a Super Admin disables an account) — this matches the
  frontend's axios interceptor, which only ever reads back a new `accessToken`.

### `POST /auth/register-staff` has two behaviors

This mirrors how the frontend actually calls it:

- **Unauthenticated** (public "Sign Up" tab on the login page): always creates a
  `MEMBER` (read-only) account, regardless of what `role` is sent.
- **Authenticated as `SUPER_ADMIN`** (Role Management → "Add Admin or Member"):
  may create `ADMIN` or `MEMBER` accounts. Creating another `SUPER_ADMIN` is blocked.
- Any other caller receives `403`.

## Role-Based Access Control

| Action                                | SUPER_ADMIN | ADMIN | MEMBER |
|----------------------------------------|:-----------:|:-----:|:------:|
| View dashboard stats                   | ✅          | ✅    | ✅     |
| View donor list / detail               | ✅          | ✅    | ✅     |
| Create / edit donor                    | ✅          | ✅    | ❌     |
| Delete donor                           | ✅          | ❌    | ❌     |
| Create / edit medical record           | ✅          | ✅    | ❌     |
| Manage staff (roles/status)            | ✅          | ❌    | ❌     |

Enforced server-side in `middlewares/rbac.middleware.ts` on every route — the
frontend's `usePermissions()` hook is a UX convenience only, never the source of truth.

## Eligibility Auto-Calculation

`utils/eligibility.ts` recomputes `eligibilityStatus` every time a medical record
is created or updated (`PUT /donors/:id/medical-record`):

1. HIV or Hepatitis flagged → `INELIGIBLE` (hard disqualifier)
2. Weight under 45kg → `INELIGIBLE`
3. Hemoglobin under 13.0 g/dL (male) / 12.5 g/dL (female/other) → `INELIGIBLE`
4. Last donation within the last 120 days → `INELIGIBLE` (donation interval rule)
5. Diabetes, heart disease, recent surgery, or recent tattoo (last 6 months) → `PENDING_REVIEW`
6. Otherwise → `ELIGIBLE`

## API Reference

Base URL: `{API_PREFIX}` (default `/api/v1`)

| Method | Path                              | Auth              | Description                                  |
|--------|------------------------------------|-------------------|-----------------------------------------------|
| GET    | `/health`                          | Public            | Liveness check                                |
| POST   | `/auth/login`                      | Public            | Login with email/phone + password             |
| POST   | `/auth/register-staff`             | Public / SUPER_ADMIN | See dual-behavior note above                |
| POST   | `/auth/refresh`                    | Public (needs refresh token) | Exchange refresh token for new access token |
| GET    | `/auth/me`                         | Any authenticated | Current user profile                          |
| POST   | `/auth/logout`                     | Any authenticated | Invalidates outstanding refresh tokens        |
| GET    | `/donors`                          | Any staff role    | Paginated + filtered donor list               |
| GET    | `/donors/:id`                      | Any staff role    | Donor detail (with medical record)            |
| POST   | `/donors`                          | ADMIN, SUPER_ADMIN | Create donor                                  |
| PUT    | `/donors/:id`                      | ADMIN, SUPER_ADMIN | Update donor                                  |
| DELETE | `/donors/:id`                      | SUPER_ADMIN        | Delete donor + medical record                 |
| PUT    | `/donors/:id/medical-record`       | ADMIN, SUPER_ADMIN | Upsert medical record, recompute eligibility  |
| GET    | `/admin/stats`                     | Any staff role    | Dashboard counters                            |
| GET    | `/admin/staff`                     | SUPER_ADMIN        | List all staff accounts                       |
| PUT    | `/admin/staff/:id/role`            | SUPER_ADMIN        | Change an ADMIN/MEMBER's role                 |
| PUT    | `/admin/staff/:id/status`          | SUPER_ADMIN        | Activate/disable an ADMIN/MEMBER              |

`GET /donors` query params: `search`, `bloodGroup`, `division`, `district`,
`upazila`, `availability` (`ALL`/`AVAILABLE`/`UNAVAILABLE`), `eligibility`
(`ALL`/`ELIGIBLE`/`INELIGIBLE`/`PENDING_REVIEW`), `page`, `limit`.

### Error shape

Every error response matches the frontend's `ApiError` type exactly:

```json
{ "message": "Validation failed", "statusCode": 400, "errors": { "identifier": "Required" } }
```

## Notes / Next Steps

- `emergencyRequests` in `GET /admin/stats` currently returns `0` — the
  frontend's `app/(dashboard)/requests` page is scaffolded but not wired to
  any API yet (per its own README), so there's no backing model to count.
  Wire up an `EmergencyRequest` model + routes here when that feature is built.
- Donor `address.coordinates` is stored internally as a GeoJSON `Point` with a
  `2dsphere` index (ready for "nearest available donor" geo-queries) and is
  exposed to the frontend as the simpler `{ lat, lng }` shape it expects.
- Consider adding an email/SMS OTP verification step before enabling public
  self sign-up in production.
