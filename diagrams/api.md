# API Endpoints

## REST API Structure

```
/api
├── /auth
│   ├── POST   /register        → Register new user
│   ├── POST   /login           → Login (sets httpOnly cookies)
│   ├── POST   /logout          → Clear cookies + revoke refresh token
│   ├── POST   /refresh         → Rotate access + refresh tokens
│   └── GET    /me              → Get current user (from cookie)
│
├── /flights
│   ├── GET    /                → List flights (paginated)
│   ├── GET    /:id             → Get flight details
│   ├── GET    /:id/seats       → Get seat map for flight
│   ├── POST   /                → Create flight (Manager)
│   ├── PATCH  /:id             → Partial update (Manager)
│   ├── PATCH  /:id/state       → Transition flight state (Manager)
│   └── DELETE /:id             → Delete flight (Manager, CREATED only)
│
├── /reservations
│   ├── GET    /                → User's own reservations
│   ├── POST   /                → Create reservation (Customer)
│   └── DELETE /:id             → Cancel reservation (Customer)
│
└── /users                      (Admin only)
    ├── GET    /                → List all users (paginated)
    ├── PATCH  /:id/role        → Change user role
    └── POST   /import          → Bulk import CSV
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/login                              [Rate: 5/15m] │
├─────────────────────────────────────────────────────────────────┤
│ Body:    { username, password }                                 │
│ Success: 200 — Sets two httpOnly cookies:                       │
│            access_token(JWT, 15 min, Secure, SameSite=Strict)   │
│            refresh_token(opaque, 7days, Secure, SameSite=Strict)│
│          Body: { user: { id, username, name, role } }           │
│                NO token in response body                        │
│ Failure: 401 — Generic "Invalid credentials" (no detail leak)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/register                           [Rate: 3/hr]  │
├─────────────────────────────────────────────────────────────────┤
│ Body:    { username, password, name, email, vat_number? }       │
│ Validation (Zod):                                               │
│   - password: min 8 chars, 1 upper, 1 number, 1 symbol          │
│   - email: valid format                                         │
│   - vat_number: 9-digit Greek format (if provided)              │
│ Success: 201 — { user: { id, username, name, role } }           │
│ Failure: 422 — { errors: [{ field, message }] }                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/refresh                           [Rate: 10/15m] │
├─────────────────────────────────────────────────────────────────┤
│ Cookie:  refresh_token (httpOnly)                               │
│ Header:  X-CSRF-Token: <csrf-token>                             │
│ Success: 200 — Rotates BOTH cookies (old refresh token revoked) │
│ Failure: 401 — If token invalid, expired, or already used       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/logout                                           │
├─────────────────────────────────────────────────────────────────┤
│ Cookie:  refresh_token (httpOnly)                               │
│ Header:  X-CSRF-Token: <csrf-token>                             │
│ Success: 204 — Revokes token in DB, clears both cookies         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GET /api/auth/me                                                │
├─────────────────────────────────────────────────────────────────┤
│ Cookie:  access_token (httpOnly, read automatically by browser) │
│ Response: { id, username, name, email, role }                   │
│ Access:  Protected (valid access token required)                │
└─────────────────────────────────────────────────────────────────┘
```

## Flights Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│ GET /api/flights                                    [Public]    │
├─────────────────────────────────────────────────────────────────┤
│ Query: ?from=ATH&to=LHR&date=2025-06-01&page=1&limit=20         │
│   - All params validated/sanitized before use in query          │
│ Response: paginated flight list (no internal IDs leaked)        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GET /api/flights/:id/seats                          [Public]    │
├─────────────────────────────────────────────────────────────────┤
│ Response: { seats: [{ number, class, status }] }                │
│   status: "available" | "reserved" (no user_id exposed)         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POST /api/flights                         [Manager/Admin only]  │
├─────────────────────────────────────────────────────────────────┤
│ Header:  X-CSRF-Token: <csrf-token>                             │
│ Body:    { flight_number, departure, arrival,                   │
│            scheduled_time, total_seats, prices }                │
│ Validation: Zod schema — IATA codes, future datetime, etc.      │ 
│ Response: 201 — { flight }                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PATCH /api/flights/:id/state              [Manager/Admin only]  │
├─────────────────────────────────────────────────────────────────┤
│ Header:  X-CSRF-Token: <csrf-token>                             │
│ Body:    { state: "staffed" | "completed" | "cancelled" }       │
│ Rules:   State machine enforced server-side (not just DB)       │
│          Invalid transitions → 422                              │
└─────────────────────────────────────────────────────────────────┘
```

## Reservations Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/reservations                      [Customer only]     │
├─────────────────────────────────────────────────────────────────┤
│ Header:  X-CSRF-Token: <csrf-token>                             │
│ Body:    { flight_id, seat_number, ticket_type }                │
│ DB:      SELECT ... FOR UPDATE on seat row (prevents double-    │
│          booking under concurrent requests)                     │
│          Wrapped in a transaction                               │
│ Response: 201 — { reservation: { id, seat, type, price } }      │
│ Failure: 409 — Seat already taken                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DELETE /api/reservations/:id                [Customer only]     │
├─────────────────────────────────────────────────────────────────┤
│ Header:  X-CSRF-Token: <csrf-token>                             │
│ Check:   Reservation must belong to authenticated user          │
│          (IDOR prevention — never trust client-provided user_id)│
│ Response: 204 — Soft cancel (status → 'cancelled')              │
└─────────────────────────────────────────────────────────────────┘
```

## Standard Response Envelopes

```
┌─────────────────────────────────────────────────────────────────┐
│                       SUCCESS RESPONSE                          │
├─────────────────────────────────────────────────────────────────┤
│ {                                                               │
│   "success": true,                                              │
│   "data": { ... }                                               │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        ERROR RESPONSE                           │
├─────────────────────────────────────────────────────────────────┤
│ {                                                               │
│   "success": false,                                             │
│   "error": {                                                    │
│     "code": "VALIDATION_ERROR",                                 │
│     "message": "Invalid email format"                           │
│     // NO stack traces, NO internal paths, NO DB errors         │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     PAGINATION RESPONSE                         │
├─────────────────────────────────────────────────────────────────┤
│ {                                                               │
│   "success": true,                                              │
│   "data": [...],                                                │
│   "pagination": {                                               │
│     "page": 1,                                                  │
│     "limit": 20,                                                │
│     "total": 100,                                               │
│     "pages": 5                                                  │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## HTTP Status Codes

```
200  OK              - Request succeeded
201  CREATED         - Resource created
204  NO CONTENT      - Successful deletion / logout
400  BAD REQUEST     - Malformed request
401  UNAUTHORIZED    - Missing or invalid token
403  FORBIDDEN       - Valid token but insufficient role
404  NOT FOUND       - Resource doesn't exist
409  CONFLICT        - Seat already booked, duplicate username/email
422  UNPROCESSABLE   - Zod validation failed (field-level errors returned)
429  TOO MANY REQS   - Rate limit exceeded (Retry-After header set)
500  SERVER ERROR    - Internal error (generic message only, logged server-side)
```

## Security Checklist per Endpoint

```
┌────────────────────────────┬───────┬────────┬──────┬──────────┐
│ Concern                    │ Auth  │Flights │Reserv│ /users   │
├────────────────────────────┼───────┼────────┼──────┼──────────┤
│ Rate limiting               │  ✓   │   ✓   │  ✓  │    ✓    │
│ Zod input validation        │  ✓   │   ✓   │  ✓  │    ✓    │
│ CSRF token required         │  ✓   │   ✓   │  ✓  │    ✓    │
│ Role check middleware       │  —   │   ✓   │  ✓  │    ✓    │
│ Ownership check (IDOR)      │  —   │   —   │  ✓  │    —    │
│ DB transaction + FOR UPDATE │  —   │   —   │  ✓  │    —    │
│ Audit log written           │  ✓   │   ✓   │  ✓  │    ✓    │
└────────────────────────────┴───────┴────────┴──────┴──────────┘
```
