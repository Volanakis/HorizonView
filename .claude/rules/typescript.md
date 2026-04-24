# TypeScript Coding Rules

## TypeScript Configuration
- `module: NodeNext` / `moduleResolution: NodeNext`
- **All local imports MUST use `.js` extension** in .ts files
- `strict: true` — no implicit any, strict null checks

## Imports
```typescript
// ✅ Correct
import { authService } from './services/auth.service.js';
import { db } from '../db/index.js';
import { UserRole } from '../types/index.js';

// ❌ Wrong — will cause runtime errors with NodeNext
import { authService } from './services/auth.service';
```

## Error Handling
```typescript
// Return standardized error response
res.status(422).json({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid email format'
  }
});
```

## Response Envelopes
```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: { code: '...', message: '...' } }

// Paginated list
{ success: true, data: [...], pagination: { page, limit, total, pages } }

// No content (204) — no body
```

## Naming
- Files: kebab-case (e.g., `auth.service.ts`, `flight.routes.ts`)
- Classes: PascalCase (e.g., `DatabaseWrapper`)
- Functions/methods: camelCase
- Types/interfaces: PascalCase (e.g., `User`, `JwtPayload` — no `I` prefix)
- Constants: UPPER_SNAKE_CASE for magic values (e.g., `DUMMY_HASH`, `COOKIE_CLEAR_OPTS`)

## Async/Await
- Always use try/catch around async service calls in controllers
- Never let unhandled promise rejections propagate
- `save()` on the DatabaseWrapper is fire-and-queued — errors log to console, not thrown

## Type Safety
- Use `(string | number | null)[]` for sql.js query params — not `unknown[]`
- Use non-null assertion `req.user!.userId` only after `authenticate` middleware has run
- Define DB row interfaces (e.g., `DbUser`, `DbFlight`) locally in each service file
- All shared public types live in `src/types/index.ts`
