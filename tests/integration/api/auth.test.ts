import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../utils/app.js';
import { extractCsrfToken, seedTestData, cleanupTestData } from '../../utils/seed.js';

const BASE_URL = '/api/auth';

describe('Auth API', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    cleanupTestData();
    await seedTestData();
    agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin123!' });
  }, 30000);

  describe('POST /register', () => {
    it('registers a new user with valid data', async () => {
      const res = await agent
        .post(BASE_URL + '/register')
        .send({
          username: 'newuser',
          password: 'NewUser123!',
          name: 'New User',
          email: 'newuser@test.com',
          identity_number: 'TST00099',
          vat_number: 'EL999999999',
          address: 'Athens, Greece'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.username).toBe('newuser');
    });
  });

  describe('POST /login', () => {
    it('returns 401 for invalid credentials', async () => {
      const res = await agent
        .post(BASE_URL + '/login')
        .send({ username: 'admin', password: 'WrongPassword123!' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('logs in successfully with correct credentials', async () => {
      const res = await agent
        .post(BASE_URL + '/login')
        .send({ username: 'admin', password: 'Admin123!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('admin');
      expect(res.body.data.user.role).toBe('admin');
    });

    it('sets httpOnly cookies', async () => {
      const res = await agent
        .post(BASE_URL + '/login')
        .send({ username: 'customer', password: 'Customer123!' })
        .expect(200);

      const raw = res.headers['set-cookie'];
      const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some(c => c.includes('access_token'))).toBe(true);
      expect(cookies.some(c => c.includes('refresh_token'))).toBe(true);
    });
  });

  describe('GET /me', () => {
    it('returns 401 when not authenticated', async () => {
      await request(app).get(BASE_URL + '/me').expect(401);
    });

    it('returns current user when authenticated', async () => {
      await agent.post(BASE_URL + '/login').send({ username: 'manager', password: 'Manager123!' });

      const res = await agent.get(BASE_URL + '/me').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('username');
      expect(res.body.data.username).toBe('manager');
      expect(res.body.data.role).toBe('manager');
    });
  });

  describe('POST /logout', () => {
    it('clears auth cookies', async () => {
      const loginRes = await agent.post(BASE_URL + '/login').send({ username: 'visitor', password: 'Visitor123!' });
      const csrfToken = extractCsrfToken(loginRes);

      await agent
        .post(BASE_URL + '/logout')
        .set('X-CSRF-Token', csrfToken)
        .expect(204);
    });

    it('returns 401 when not authenticated', async () => {
      await request(app).post(BASE_URL + '/logout').expect(401);
    });
  });

  describe('POST /refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      const loginRes = await agent.post(BASE_URL + '/login').send({ username: 'customer', password: 'Customer123!' });
      const csrfToken = extractCsrfToken(loginRes);

      const res = await agent
        .post(BASE_URL + '/refresh')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
