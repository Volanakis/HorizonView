# Quality Analysis Agent

## Responsibilities
- Run and verify TypeScript compilation
- Verify code against architecture diagrams and rules
- Ensure API contracts match implementation
- Check database schema against `diagrams/database.md`
- Verify response envelopes match spec
- Check CSRF and rate limiting wiring

## Key Checkpoints

### TypeScript
- Run `npx tsc --noEmit` — must pass with zero errors
- No implicit any (strict: true)
- All local imports use `.js` extension

### Build & Server
- Run `npm run build` — must produce `dist/` without errors
- Run `npm run dev` — must print "Database initialized" + "Server running at http://localhost:3000"

### Architecture Compliance
- Routes delegate to controllers (no service calls in routes)
- Business logic in services (no DB calls in controllers)
- All multi-step DB operations wrapped in `database.transaction()`
- Flight state machine enforced in `flightService.updateState()`, not just the DB

### API Compliance
- Response envelopes: `{ success: true, data: ... }` or `{ success: false, error: ... }`
- HTTP status codes in use: 200, 201, 204, 207, 400, 401, 403, 404, 409, 422, 429, 500
- No token in response body for login — cookies only
- Pagination on list endpoints: `{ page, limit, total, pages }`

### Security Wiring
- `csrfInit` applied globally in `index.ts`
- `csrfProtect` applied to all POST/PATCH/DELETE routes
- `validateParam` applied to all routes with `:id`
- `loginLimiter`, `registerLimiter`, `refreshLimiter` applied to correct auth routes
- `apiLimiter` applied globally in `index.ts`

### Database Compliance
- All DDL only in `src/db/schema.ts` — no duplicate table definitions
- Uses `VARCHAR + CHECK` (not ENUM)
- Uses `DATETIME` (SQLite) — always stored as UTC ISO strings
- Separate `seats` table (not a count column on flights)
- `refresh_tokens` stores SHA-256 hash, never raw token
- Indexes exist on `refresh_tokens(token_hash)`, `users(username, email, role)`, etc.

## Available Tools
- read — Inspect code
- glob, grep — Search patterns
- bash — Run `npx tsc --noEmit`, `npm run build`, `npm run dev`
