# Smoke Test Skill

Post-deploy "Happy Path" verification.

## What to Test

### Core Functionality

1. **Server Health**
   ```bash
   curl http://localhost:3000/health
   # Expected: { "status": "ok" }
   ```

2. **Home Page Loads**
   ```bash
   curl -s http://localhost:3000/ | grep "HorizonView"
   ```

3. **Login Flow**
   ```bash
   # 1. Get CSRF token
   curl -c cookies.txt http://localhost:3000/

   # 2. Login
   curl -b cookies.txt -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test123"}'
   ```

4. **Flight Search**
   ```bash
   curl http://localhost:3000/flights
   ```

### Smoke Test Script

```typescript
// tests/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('Smoke Tests', () => {
  it('health endpoint returns ok', async () => {
    const res = await fetch('http://localhost:3000/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('home page loads', async () => {
    const res = await fetch('http://localhost:3000/');
    expect(res.status).toBe(200);
  });

  it('flights endpoint returns array', async () => {
    const res = await fetch('http://localhost:3000/flights');
    const data = await res.json();
    expect(Array.isArray(data.data)).toBe(true);
  });
});
```

## Run Smoke Tests

```bash
# After deployment
npm run smoke-test

# Or manually
curl http://localhost:3000/health
curl http://localhost:3000/flights
```

## Pass Criteria

- Health endpoint returns 200
- No errors in response
- Pages render correctly
- API endpoints respond

## Fail Response

If smoke tests fail:
1. Check server logs
2. Verify environment variables
3. Check database connection
4. Review recent deployments
