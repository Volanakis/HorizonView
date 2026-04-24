import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { DDL } from '../../../src/db/schema.js';
import app from '../../../src/app.js';
import { db } from '../../../src/db/index.js';

const BASE_URL = '/api/auth';
const TEST_DB = './horizonview-test.db';

function extractCsrfToken(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const csrfCookie = Array.isArray(setCookie) 
    ? setCookie.find(c => c.includes('csrf_token'))
    : setCookie;
  if (!csrfCookie) return '';
  return csrfCookie.split(';')[0].split('=')[1];
}

async function setupTestDb() {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  const SQL = await initSqlJs();
  const database = new SQL.Database();
  database.exec(DDL);

  const users = [
    { username: 'admin', password: 'Admin123!', name: 'Admin User', email: 'admin@test.com', role: 'admin' },
    { username: 'manager', password: 'Manager123!', name: 'Flight Manager', email: 'manager@test.com', role: 'manager' },
    { username: 'customer', password: 'Customer123!', name: 'Customer User', email: 'customer@test.com', role: 'customer' },
    { username: 'visitor', password: 'Visitor123!', name: 'Visitor User', email: 'visitor@test.com', role: 'visitor' },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 12);
    database.run(
      `INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)`,
      [user.username, hash, user.name, user.email, user.role]
    );
  }

  const data = database.export();
  fs.writeFileSync(TEST_DB, Buffer.from(data));
  database.close();
}

describe('Auth API', () => {
  let agent: ReturnType<typeof request.agent>;
  let adminCsrfToken = '';
  let visitorCsrfToken = '';

  beforeAll(async () => {
    await setupTestDb();
    await db.init();
    agent = request.agent(app);
    
    const loginRes = await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin123!' });
    adminCsrfToken = extractCsrfToken(loginRes);
  }, 30000);

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  describe('POST /register', () => {
    it('registers a new user with valid data', async () => {
      const res = await agent
        .post(BASE_URL + '/register')
        .send({
          username: 'newuser',
          password: 'NewUser123!',
          name: 'New User',
          email: 'newuser@test.com'
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
        .send({
          username: 'admin',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('logs in successfully with correct credentials', async () => {
      const res = await agent
        .post(BASE_URL + '/login')
        .send({
          username: 'admin',
          password: 'Admin123!'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('admin');
      expect(res.body.data.user.role).toBe('admin');
    });

    it('sets httpOnly cookies', async () => {
      const res = await agent
        .post(BASE_URL + '/login')
        .send({
          username: 'customer',
          password: 'Customer123!'
        })
        .expect(200);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('access_token'))).toBe(true);
      expect(cookies.some(c => c.includes('refresh_token'))).toBe(true);
    });
  });

  describe('GET /me', () => {
    it('returns 401 when not authenticated', async () => {
      await request(app)
        .get(BASE_URL + '/me')
        .expect(401);
    });

    it('returns current user when authenticated', async () => {
      await agent
        .post(BASE_URL + '/login')
        .send({ username: 'manager', password: 'Manager123!' });

      const res = await agent
        .get(BASE_URL + '/me')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('username');
      expect(res.body.data.username).toBe('manager');
      expect(res.body.data.role).toBe('manager');
    });
  });

  describe('POST /logout', () => {
    it('clears auth cookies', async () => {
      await agent
        .post(BASE_URL + '/login')
        .send({ username: 'visitor', password: 'Visitor123!' });

      await agent
        .post(BASE_URL + '/logout')
        .set('X-CSRF-Token', adminCsrfToken)
        .expect(204);
    });

    it('returns 401 when not authenticated', async () => {
      await request(app)
        .post(BASE_URL + '/logout')
        .expect(401);
    });
  });

  describe('POST /refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      await agent
        .post(BASE_URL + '/login')
        .send({ username: 'customer', password: 'Customer123!' });

      const res = await agent
        .post(BASE_URL + '/refresh')
        .set('X-CSRF-Token', adminCsrfToken)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
