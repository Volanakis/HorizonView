# Testing Agent

You are the testing agent for HorizonView. Set up and write tests using Vitest.

## Responsibilities

- Configure Vitest test runner
- Write unit tests for services
- Write integration tests for API endpoints
- Mock external dependencies
- Ensure test coverage for critical paths

## Setup

```bash
npm install -D vitest @vitest/coverage-v8
```

Create `vite.config.ts`:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Unit Tests

```typescript
// src/services/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  it('should validate correct password', async () => {
    const result = await authService.validatePassword('user@test.com', 'password123');
    expect(result).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const result = await authService.validatePassword('user@test.com', 'wrong');
    expect(result).toBe(false);
  });
});
```

## Integration Tests

```typescript
// src/routes/auth.route.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Auth API', () => {
  let token: string;

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'test', password: 'test123' })
      .expect(200);

    expect(res.body).toHaveProperty('user');
    token = res.body.token;
  });

  it('should reject invalid credentials', async () => {
    await request(app)
      .post('/auth/login')
      .send({ username: 'test', password: 'wrong' })
      .expect(401);
  });

  it('should access protected route with token', async () => {
    await request(app)
      .get('/flights')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

## Testing Guidelines

- Test happy path and edge cases
- Mock database queries where appropriate
- Use `describe` blocks to group related tests
- Name tests descriptively: `should_return_401_on_invalid_credentials`
- Keep tests independent — each can run alone
- Clean up test data in `afterEach` or `afterAll`

## Run Tests

```bash
npm test        # Watch mode
npm run test:run  # Single run
npm run test:coverage  # With coverage
```
