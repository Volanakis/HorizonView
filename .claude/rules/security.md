# Security Rules

## Authentication
- JWT access token: 15 min TTL, stored in `httpOnly + Secure + SameSite=Strict` cookie
- Refresh token: 7 days TTL, opaque, SHA-256 hash stored in DB (`refresh_tokens.token_hash`)
- Token rotation on every `/api/auth/refresh` call — old token revoked, new pair issued
- Reuse of a revoked refresh token revokes ALL tokens for that user (breach detection)

## CSRF Protection
- Double-submit cookie pattern implemented in `src/middleware/csrf.ts`
- `csrfInit` — runs on every request (app.use), sets non-httpOnly `csrf_token` cookie if absent
- `csrfProtect` — validates that `X-CSRF-Token` request header matches `csrf_token` cookie value
- Applied to: POST /auth/logout, POST /auth/refresh, POST/PATCH/DELETE /flights, POST/DELETE /reservations, PATCH/POST /users
- Frontend reads cookie via JS and sends it as `X-CSRF-Token` header

## Input Validation
- All request bodies: `validate(zodSchema)` middleware — returns 422 on failure
- Query params: `validateQuery(zodSchema)` middleware — returns 400 on failure
- Route params with `:id`: `validateParam` middleware — returns 400 if not positive integer
- Applied before any controller/service code runs

## Rate Limiting (express-rate-limit)
- `POST /api/auth/login`: 5 requests / 15 min per IP (`loginLimiter`)
- `POST /api/auth/register`: 3 requests / hour per IP (`registerLimiter`)
- `POST /api/auth/refresh`: 10 requests / 15 min per IP (`refreshLimiter`)
- All other endpoints: 100 requests / 15 min (`apiLimiter`, applied globally in index.ts)

## Helmet.js Headers (configured in index.ts)
- `Content-Security-Policy`: `script-src 'self' https://unpkg.com 'unsafe-eval'` (Alpine.js requires unsafe-eval)
- `Strict-Transport-Security`: max-age=31536000 (default)
- `X-Frame-Options`: SAMEORIGIN (default)
- `X-Content-Type-Options`: nosniff (default)

## Error Handling
- Never expose stack traces in production
- Never expose DB error messages to client (catch SQLITE_CONSTRAINT and return generic 409)
- Never expose internal file paths
- Error format: `{ success: false, error: { code: "...", message: "..." } }`

## Database Security
- Parameterized queries only — `database.run(sql, [params])` and `database.get/all`
- Multi-step writes (create reservation, cancel reservation, create flight+seats) wrapped in `database.transaction()`
- Store refresh token hash (SHA-256 via `generateTokenHash()`), never raw token
- sql.js does NOT support `SELECT ... FOR UPDATE` — use transactions instead

## IDOR Prevention
- Never use `user_id` from request body — always use `req.user!.userId` from verified JWT
- Reservation ownership check: `reservation.user_id !== userId` → 403 Unauthorized
- Admin-only routes use `requireRole('admin')` middleware

## Audit Logging
Log to `audit_log` table for:
- `REGISTER`, `LOGIN`, `LOGIN_FAILED` (auth events)
- `FLIGHT_CREATE`, `FLIGHT_STATE_CHANGE`, `FLIGHT_DELETE`
- `RESERVATION_CREATE`, `RESERVATION_CANCEL`
- `ROLE_CHANGE`, `USER_IMPORT`

Append-only — never UPDATE or DELETE audit records.
