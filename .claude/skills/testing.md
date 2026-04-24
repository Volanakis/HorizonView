# Testing Skill

This skill covers writing tests for HorizonView.

## Current Status

`npm test` is a stub (`echo 'No tests yet'`). No test framework is installed.  
ESLint and a dedicated `typecheck` script are also not yet configured.

The only quality gate currently available:
```bash
npx tsc --noEmit   # Type-check without emitting — must pass clean
npm run build      # Full compile to dist/
npm run dev        # Server starts without errors
```

## Recommended Framework

**Vitest** (not Jest) — compatible with ESM/NodeNext, no transform config needed:
```bash
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

Then update `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

## Test Structure

```
tests/
├── unit/
│   └── services/
│       ├── auth.service.test.ts
│       ├── flight.service.test.ts
│       └── reservation.service.test.ts
└── integration/
    └── api/
        ├── auth.test.ts
        ├── flights.test.ts
        └── reservations.test.ts
```

## Unit Test Example

```typescript
// tests/unit/services/auth.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('authService.login', () => {
  it('returns null for wrong password', async () => {
    const result = await authService.login('user', 'wrongpass');
    expect(result).toBeNull();
  });

  it('returns user on valid credentials', async () => {
    const result = await authService.login('admin', 'CorrectPass1');
    expect(result).toHaveProperty('id');
    expect(result).not.toHaveProperty('password');
  });
});
```

## Integration Test Example

```typescript
// tests/integration/api/auth.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../../src/index.js';

describe('POST /api/auth/login', () => {
  it('sets access_token cookie on success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'Test123!' })
      .expect(200);

    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data).not.toHaveProperty('token'); // Never in body
  });

  it('returns 401 on wrong credentials', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'wrong' })
      .expect(401);
  });
});
```

## Testing Principles

1. **Unit tests**: Service methods with an in-memory DB (fresh `DatabaseWrapper` per test)
2. **Integration tests**: Full HTTP via supertest — verify status codes, cookies, and response envelopes
3. **CSRF**: For integration tests on mutating endpoints, fetch `csrf_token` cookie first, then include as header
4. **Coverage target**: >80% on services
5. **Never mock the DB** — use a real in-memory sql.js instance per test suite
