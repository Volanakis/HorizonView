# Project Structure Rule

## Source Code Organization

```
src/
├── index.ts                  # App entry: middleware, routes, server start
├── db/
│   ├── index.ts              # DatabaseWrapper class (sql.js), transaction(), save()
│   ├── migrate.ts            # CLI migration — runs DDL, writes horizonview.db
│   └── schema.ts             # ALL DDL here — import from this, never duplicate
├── middleware/
│   ├── auth.ts               # authenticate, requireRole, generateTokens, verifyToken
│   ├── csrf.ts               # csrfInit (sets cookie on every req), csrfProtect (validates header)
│   ├── rate-limit.ts         # loginLimiter, registerLimiter, refreshLimiter, apiLimiter
│   └── validate.ts           # validate(schema), validateQuery(schema), validateParam
├── routes/
│   ├── auth.routes.ts
│   ├── flight.routes.ts
│   ├── reservation.routes.ts
│   └── user.routes.ts
├── controllers/
│   ├── auth.controller.ts    # Also exports Zod schemas (registerSchema, loginSchema, …)
│   ├── flight.controller.ts
│   ├── reservation.controller.ts
│   └── user.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── flight.service.ts
│   ├── reservation.service.ts
│   └── user.service.ts
├── types/
│   └── index.ts              # All shared types: User, Flight, Seat, Reservation, JwtPayload, …
└── utils/
    └── crypto.ts             # generateTokenHash(token), generateRandomToken()
```

## Key Principles

- **Routes**: thin — only middleware chain + delegate to controller. No business logic.
- **Controllers**: parse request body/params, call service, shape response. No DB calls.
- **Services**: all business logic and DB queries. Use `database.transaction()` for multi-step writes.
- **Types**: all types in `types/index.ts`. No separate model files.
- **Schema**: DDL lives only in `db/schema.ts`. Never duplicate table definitions.

## Naming Conventions

- Route files: `{domain}.routes.ts`
- Controller files: `{domain}.controller.ts`
- Service files: `{domain}.service.ts`
- Zod schemas: defined in controller file, exported for use in route file
