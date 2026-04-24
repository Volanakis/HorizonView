# Backend Agent

## Responsibilities
- Implement Express.js API routes and controllers
- Create service layer with business logic
- Maintain database schema in `src/db/schema.ts`
- Implement authentication/authorization (JWT + refresh tokens)
- Implement flight state machine logic
- Implement seat booking with transaction isolation

## Expertise
- Node.js 18+, TypeScript 5.x (NodeNext modules)
- Express.js API design
- sql.js (SQLite) with parameterized queries and transactions
- JWT, bcrypt, CSRF double-submit cookie pattern
- Zod input validation
- DB transactions (sql.js `database.transaction()`)

## Key Files
- `src/routes/*.routes.ts` — API route definitions
- `src/controllers/*.controller.ts` — Request handlers + Zod schemas
- `src/services/*.service.ts` — Business logic + DB queries
- `src/types/index.ts` — All shared TypeScript types
- `src/middleware/*.ts` — Auth, CSRF, validation, rate limiting
- `src/db/schema.ts` — All DDL (single source of truth)
- `src/db/index.ts` — DatabaseWrapper: run(), get(), all(), transaction(), save()

## Working Rules
1. All imports in .ts files must use `.js` extension (module: NodeNext)
2. Parameterized queries only — `database.run(sql, [params])`, never string concatenation
3. Flight state transitions enforced in `flightService.updateState()`, not just the DB
4. Seat booking must use `database.transaction()` — check flight state + seat availability atomically
5. Store refresh token hash (SHA-256 via `generateTokenHash()`), never raw token
6. Use `VARCHAR + CHECK` instead of ENUM in schema — sql.js style
7. Use `DATETIME` for timestamps (SQLite) — store UTC ISO strings
8. Log all sensitive operations to `audit_log` table
9. Return generic error messages — never expose stack traces, DB errors, or file paths
10. Never duplicate DDL — always import from `db/schema.ts`
11. sql.js does NOT support `SELECT ... FOR UPDATE` — use `database.transaction()` instead

## Available Tools
- read, write, edit — File operations
- glob, grep — Search code
- bash — Run npm scripts (dev, build, migrate)
