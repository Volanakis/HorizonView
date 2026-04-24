# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Status

The application is **fully implemented**. The complete feature set is in place:
- Express API with auth, flights, reservations, and user management
- JWT in httpOnly cookies with refresh token rotation
- CSRF double-submit cookie protection
- Role-based access control (visitor / customer / manager / admin)
- Interactive seat map frontend (Alpine.js)
- sql.js SQLite database (in-memory, persisted to `horizonview.db`)

## Commands

```bash
npm run dev        # Start dev server with hot reload (tsx watch)
npm run build      # Compile TypeScript → dist/
npm start          # Run compiled output (requires build first)
npm run migrate    # Re-create database from schema (wipes existing file)
```

`migrate:undo` and `test` scripts are stubs — not yet implemented.

## Environment

Copy `.env.example` to `.env`. Required variables:
```
PORT=3000
DATABASE_URL="sqlite://./horizonview.db"
JWT_SECRET="your-secret-key"
```

## TypeScript Configuration

- `module: NodeNext` / `moduleResolution: NodeNext` — **all local imports must use `.js` extensions** in `.ts` source files (e.g. `import { x } from './services/auth.js'`)
- `strict: true` — no implicit any, strict null checks
- Output goes to `dist/`, source root is `src/`

## Actual Source Structure

```
src/
├── index.ts                  # App entry: mounts middleware, routes, starts server
├── db/
│   ├── index.ts              # DatabaseWrapper (sql.js), save() queue, transaction()
│   ├── migrate.ts            # CLI migration script — runs DDL from schema.ts
│   └── schema.ts             # Single source of truth for all DDL (tables + indexes)
├── middleware/
│   ├── auth.ts               # authenticate, requireRole, generateTokens, verifyToken
│   ├── csrf.ts               # csrfInit (sets cookie), csrfProtect (validates header)
│   ├── rate-limit.ts         # loginLimiter, registerLimiter, refreshLimiter, apiLimiter
│   └── validate.ts           # validate(), validateQuery(), validateParam()
├── routes/
│   ├── auth.routes.ts
│   ├── flight.routes.ts
│   ├── reservation.routes.ts
│   └── user.routes.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── flight.controller.ts
│   ├── reservation.controller.ts
│   └── user.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── flight.service.ts
│   ├── reservation.service.ts
│   └── user.service.ts
├── types/
│   └── index.ts              # All shared types (User, Flight, Seat, Reservation, …)
└── utils/
    └── crypto.ts             # generateTokenHash, generateRandomToken
```

## Key Design Rules

- **Auth:** JWT in `httpOnly + Secure` cookies, never in response body. 15-min access token + 7-day opaque refresh token (SHA-256 hash stored in DB). Rotation on every `/api/auth/refresh`; reused revoked token revokes all tokens for that user.
- **CSRF:** `csrfInit` sets a non-httpOnly `csrf_token` cookie on every request. Mutating routes enforce `csrfProtect`, which compares the cookie to the `X-CSRF-Token` header (double-submit pattern).
- **Input validation:** Zod schemas + `validate()` / `validateQuery()` / `validateParam()` middleware, applied before any business logic runs.
- **Seat booking:** Wrapped in `database.transaction()` — checks flight state, seat availability, inserts reservation, and marks seat unavailable atomically.
- **State machine:** Flight states (`created → staffed → completed/cancelled`) enforced in `flightService.updateState()`. Invalid transitions return 422.
- **Roles:** `visitor`, `customer`, `manager`, `admin`. Role checks in `requireRole` middleware; ownership checks (IDOR) in service layer.
- **Errors:** Never expose stack traces, DB error messages, or internal paths to the client. Generic `{ success: false, error: { code, message } }` envelope.
- **Audit log:** Append-only `audit_log` table. Logs: `REGISTER`, `LOGIN`, `LOGIN_FAILED`, `FLIGHT_CREATE`, `FLIGHT_STATE_CHANGE`, `FLIGHT_DELETE`, `RESERVATION_CREATE`, `RESERVATION_CANCEL`, `ROLE_CHANGE`, `USER_IMPORT`.

## Database

Schema is defined in `src/db/schema.ts` (the only authoritative DDL file — `db/index.ts` and `migrate.ts` both import from it).

Notable points:
- Uses `VARCHAR + CHECK` constraints instead of ENUM
- Uses `DATETIME` (SQLite — always stored as UTC ISO strings)
- Separate `seats` table enables row-level transaction isolation
- `refresh_tokens` stores token hash (SHA-256), never raw token
- Indexes exist on: `users(username, email, role)`, `flights(flight_number, state, scheduled_time)`, `seats(flight_id)`, `reservations(user_id, flight_id)`, `refresh_tokens(user_id, token_hash)`, `audit_log(user_id)`

## API

Rate limits enforced with `express-rate-limit`:
- `POST /api/auth/login` — 5 req / 15 min per IP
- `POST /api/auth/register` — 3 req / hour per IP
- `POST /api/auth/refresh` — 10 req / 15 min per IP
- Everything else — 100 req / 15 min per IP

Endpoints (all return `{ success, data?, error?, pagination? }`):

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | /api/auth/register | Public | registerLimiter |
| POST | /api/auth/login | Public | loginLimiter |
| POST | /api/auth/logout | Auth + CSRF | |
| POST | /api/auth/refresh | refreshLimiter + CSRF | |
| GET | /api/auth/me | Auth | |
| GET | /api/flights | Public | query: from, to, date, page, limit |
| GET | /api/flights/:id | Public | |
| GET | /api/flights/:id/seats | Public | |
| POST | /api/flights | Manager/Admin + CSRF | |
| PATCH | /api/flights/:id/state | Manager/Admin + CSRF | body: { state } |
| DELETE | /api/flights/:id | Manager/Admin + CSRF | only 'created' state |
| GET | /api/reservations | Auth | current user's reservations |
| POST | /api/reservations | Auth + CSRF | |
| DELETE | /api/reservations/:id | Auth + CSRF | |
| GET | /api/users | Admin | query: role, page, limit |
| PATCH | /api/users/:id/role | Admin + CSRF | |
| POST | /api/users/import | Admin + CSRF | body: { users: [...] } |
