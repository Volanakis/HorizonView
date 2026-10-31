import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from './utils/app.js';
import { db } from '../src/lib/server/db/index.js';
import { seed } from '../src/lib/server/db/seed.js';

import { extractLoginTokens } from './utils/seed.js';

let csrfToken = '';
let accessToken = '';
let refreshToken = '';

async function loginAs(username: string, password: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  const tokens = extractLoginTokens(res);
  csrfToken = tokens.csrfToken;
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  return res;
}

beforeAll(async () => {
  db.exec('DELETE FROM users; DELETE FROM refresh_tokens; DELETE FROM password_reset_tokens; DELETE FROM audit_log; DELETE FROM reservations; DELETE FROM seats; DELETE FROM flights;');
  await seed();
});

afterAll(() => {
  db.close();
});

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'Test123!@#',
          name: 'Test User',
          email: 'test@example.com',
          vat_number: 'TESTVAT01',
          identity_number: 'TESTID001',
          address: '123 Test Street, Athens'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('testuser');
    });

    it('should reject duplicate username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'Test123!@#',
          name: 'Test User 2',
          email: 'test2@example.com',
          vat_number: 'TESTVAT02',
          identity_number: 'TESTID002',
          address: '456 Test Street'
        });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          password: 'Test123!@#',
          name: 'Test User 2',
          email: 'test@example.com',
          vat_number: 'TESTVAT03',
          identity_number: 'TESTID003',
          address: '789 Test Street'
        });
      expect(res.status).toBe(409);
    });

    it('should reject duplicate identity_number', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser3',
          password: 'Test123!@#',
          name: 'Test User 3',
          email: 'test3@example.com',
          vat_number: 'TESTVAT04',
          identity_number: 'TESTID001',
          address: '321 Test Street'
        });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser4',
          password: 'weak',
          name: 'Test User',
          email: 'test4@example.com',
          vat_number: 'TESTVAT05',
          identity_number: 'TESTID004',
          address: '555 Test Street'
        });
      expect(res.status).toBe(422);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'incomplete' });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'Test123!@#' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('customer');
      expect(res.headers['set-cookie']).toBeDefined();
      const tokens = extractLoginTokens(res);
      csrfToken = tokens.csrfToken || csrfToken;
      accessToken = tokens.accessToken || accessToken;
      refreshToken = tokens.refreshToken || refreshToken;
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'SomePass123!@' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`access_token=${accessToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('testuser');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token and CSRF', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}; csrf_token=${csrfToken}`])
        .set('X-CSRF-Token', csrfToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
      const tokens = extractLoginTokens(res);
      csrfToken = tokens.csrfToken || csrfToken;
      accessToken = tokens.accessToken || accessToken;
      refreshToken = tokens.refreshToken || refreshToken;
    });

    it('should reject without CSRF token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`]);
      expect(res.status).toBe(403);
    });

    it('should reject with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refresh_token=invalidtoken123; csrf_token=${csrfToken}`])
        .set('X-CSRF-Token', csrfToken);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with valid auth and CSRF', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
        .set('X-CSRF-Token', csrfToken);
      expect(res.status).toBe(204);
    });

    it('should reject logout without CSRF', async () => {
      await loginAs('testuser', 'Test123!@#');
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`access_token=${accessToken}`]);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/auth/profile', () => {
    it('should update profile with valid data', async () => {
      await loginAs('testuser', 'Test123!@#');
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should update password with valid current password', async () => {
      await loginAs('testuser', 'Test123!@#');
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
        .set('X-CSRF-Token', csrfToken)
        .send({ currentPassword: 'Test123!@#', newPassword: 'NewPass123!@#' });
      expect(res.status).toBe(200);
    });

    it('should reject password change without current password', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
        .set('X-CSRF-Token', csrfToken)
        .send({ newPassword: 'NewPass123!@#' });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return success for existing email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 200 even for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });
      expect(res.status).toBe(200);
    });
  });
});

describe('Flight Endpoints', () => {
  beforeAll(async () => {
    await loginAs('manager', 'Manager123!');
  });

  it('GET /api/flights should return public flights list', async () => {
    const res = await request(app).get('/api/flights');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('GET /api/flights should filter by route', async () => {
    const res = await request(app).get('/api/flights?from=ATH&to=LHR');
    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      expect(res.body.data[0].departure).toBe('ATH');
      expect(res.body.data[0].arrival).toBe('LHR');
    }
  });

  it('GET /api/flights/:id should return a single flight', async () => {
    const list = await request(app).get('/api/flights');
    if (list.body.data.length > 0) {
      const flightId = list.body.data[0].id;
      const res = await request(app).get(`/api/flights/${flightId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(flightId);
    }
  });

  it('GET /api/flights/:id with invalid id should return 404', async () => {
    const res = await request(app).get('/api/flights/99999');
    expect(res.status).toBe(404);
  });

  it('GET /api/flights/:id/seats should return seats', async () => {
    const list = await request(app).get('/api/flights');
    if (list.body.data.length > 0) {
      const flightId = list.body.data[0].id;
      const res = await request(app).get(`/api/flights/${flightId}/seats`);
      expect(res.status).toBe(200);
      expect(res.body.data.seats).toBeDefined();
    }
  });

  it('POST /api/flights should create flight for manager', async () => {
    await loginAs('manager', 'Manager123!');
    const res = await request(app)
      .post('/api/flights')
      .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        flight_number: 'HV-TEST',
        departure: 'ATH',
        arrival: 'CDG',
        scheduled_time: new Date('2026-12-25T10:00:00Z').toISOString(),
        total_seats: 150,
        airplane: 'Boeing 737-800',
        num_rows: 25,
        seats_per_row: 6,
        business_rows: 5
      });
    expect(res.status).toBe(201);
    expect(res.body.data.flight_number).toBe('HV-TEST');
  });

  it('POST /api/flights should reject for customer role', async () => {
    await loginAs('customer', 'Customer123!');
    const res = await request(app)
      .post('/api/flights')
      .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        flight_number: 'HV-UNAUTH',
        departure: 'ATH',
        arrival: 'FRA',
        scheduled_time: new Date().toISOString(),
        total_seats: 150,
        airplane: 'Boeing 737',
        num_rows: 25,
        seats_per_row: 6,
        business_rows: 5
      });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/flights/:id/state should transition state', async () => {
    await loginAs('manager', 'Manager123!');
    const list = await request(app)
      .get('/api/flights')
      .set('Cookie', [`access_token=${accessToken}`]);
    const created = list.body.data.find((f: any) => f.state === 'created');
    if (!created) return;
    const res = await request(app)
      .patch(`/api/flights/${created.id}/state`)
      .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ state: 'staffed' });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('staffed');
  });

  it('PATCH /api/flights/:id/state should reject invalid transition', async () => {
    await loginAs('manager', 'Manager123!');
    const list = await request(app)
      .get('/api/flights')
      .set('Cookie', [`access_token=${accessToken}`]);
    const created = list.body.data.find((f: any) => f.state === 'created');
    if (!created) return;
    const res = await request(app)
      .patch(`/api/flights/${created.id}/state`)
      .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ state: 'completed' });
    expect(res.status).toBe(422);
  });

  it('DELETE /api/flights/:id should only delete created flights', async () => {
    await loginAs('manager', 'Manager123!');
    const list = await request(app)
      .get('/api/flights')
      .set('Cookie', [`access_token=${accessToken}`]);
    const created = list.body.data.find((f: any) => f.state === 'created');
    if (!created) return;
    const res = await request(app)
      .delete(`/api/flights/${created.id}`)
      .set('Cookie', [`access_token=${accessToken}; csrf_token=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(204);
  });
});

describe('Reservation Endpoints', () => {
  let customerCsrf = '';
  let customerAccess = '';
  let testFlightId: number;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'Customer123!' });
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const all = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      const c = all.match(/csrf_token=([^;]+)/);
      const a = all.match(/access_token=([^;]+)/);
      if (c) customerCsrf = decodeURIComponent(c[1]);
      if (a) customerAccess = a[1];
    }
    const flights = await request(app).get('/api/flights?limit=100');
    const created = flights.body.data.find((f: any) => f.state === 'created' && f.available_seats > 0);
    if (created) testFlightId = created.id;
  });

  it('GET /api/reservations should return list for authenticated user', async () => {
    const res = await request(app)
      .get('/api/reservations')
      .set('Cookie', [`access_token=${customerAccess}`]);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('POST /api/reservations should create a reservation', async () => {
    if (!testFlightId) return;
    const seatsRes = await request(app).get(`/api/flights/${testFlightId}/seats`);
    const avail = seatsRes.body.data.seats.find((s: any) => s.status === 'available');
    if (!avail) return;
    const res = await request(app)
      .post('/api/reservations')
      .set('Cookie', [`access_token=${customerAccess}; csrf_token=${customerCsrf}`])
      .set('X-CSRF-Token', customerCsrf)
      .send({ flight_id: testFlightId, seat_number: avail.number, ticket_type: avail.class });
    expect(res.status).toBe(201);
    expect(res.body.data.reservation).toBeDefined();
  });

  it('POST /api/reservations should reject duplicate seat', async () => {
    if (!testFlightId) return;
    const seatsRes = await request(app).get(`/api/flights/${testFlightId}/seats`);
    // Economy seats are auto-assigned (seat_number ignored), so only a chosen seat can conflict.
    const taken = seatsRes.body.data.seats.find((s: any) => s.status === 'reserved' && s.class !== 'economy');
    if (!taken) return;
    const res = await request(app)
      .post('/api/reservations')
      .set('Cookie', [`access_token=${customerAccess}; csrf_token=${customerCsrf}`])
      .set('X-CSRF-Token', customerCsrf)
      .send({ flight_id: testFlightId, seat_number: taken.number, ticket_type: taken.class });
    expect(res.status).toBe(409);
  });

  it('POST /api/reservations should reject without CSRF', async () => {
    if (!testFlightId) return;
    const res = await request(app)
      .post('/api/reservations')
      .set('Cookie', [`access_token=${customerAccess}`])
      .send({ flight_id: testFlightId, seat_number: '1A', ticket_type: 'business' });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/reservations/:id should cancel own reservation', async () => {
    const listRes = await request(app)
      .get('/api/reservations')
      .set('Cookie', [`access_token=${customerAccess}`]);
    const confirmed = listRes.body.data.find((r: any) => r.status === 'confirmed');
    if (!confirmed) return;
    const res = await request(app)
      .delete(`/api/reservations/${confirmed.id}`)
      .set('Cookie', [`access_token=${customerAccess}; csrf_token=${customerCsrf}`])
      .set('X-CSRF-Token', customerCsrf);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/reservations/:id should reject unauthorised cancellation', async () => {
    const otherRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'visitor', password: 'Visitor123!' });
    const c = otherRes.headers['set-cookie'];
    const otherAll = Array.isArray(c) ? c.join('; ') : c;
    const otherAccess = otherAll?.match(/access_token=([^;]+)/)?.[1] || '';
    const otherCsrfMatch = otherAll?.match(/csrf_token=([^;]+)/);
    const otherCsrf = otherCsrfMatch ? decodeURIComponent(otherCsrfMatch[1]) : '';

    const listRes = await request(app)
      .get('/api/reservations')
      .set('Cookie', [`access_token=${customerAccess}`]);
    const confirmed = listRes.body.data.find((r: any) => r.status === 'confirmed');
    if (!confirmed) return;
    const res = await request(app)
      .delete(`/api/reservations/${confirmed.id}`)
      .set('Cookie', [`access_token=${otherAccess}; csrf_token=${otherCsrf}`])
      .set('X-CSRF-Token', otherCsrf);
    expect(res.status).toBe(403);
  });
});

describe('User Admin Endpoints', () => {
  let adminCsrf = '';
  let adminAccess = '';
  let adminId = 0;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' });
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const all = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      const c = all.match(/csrf_token=([^;]+)/);
      const a = all.match(/access_token=([^;]+)/);
      if (c) adminCsrf = decodeURIComponent(c[1]);
      if (a) adminAccess = a[1];
    }
    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`access_token=${adminAccess}`]);
    if (me.body.data) adminId = me.body.data.id;
  });

  it('GET /api/users should return user list for admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', [`access_token=${adminAccess}`]);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('GET /api/users should reject for non-admin', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'Customer123!' });
    const c = loginRes.headers['set-cookie'];
    const all = Array.isArray(c) ? c.join('; ') : c;
    const access = all?.match(/access_token=([^;]+)/)?.[1] || '';
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', [`access_token=${access}`]);
    expect(res.status).toBe(403);
  });

  it('GET /api/users/stats should return user stats for admin', async () => {
    const res = await request(app)
      .get('/api/users/stats')
      .set('Cookie', [`access_token=${adminAccess}`]);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(res.body.data.byRole).toBeDefined();
  });

  it('PATCH /api/users/:id/role should update user role', async () => {
    const listRes = await request(app)
      .get('/api/users')
      .set('Cookie', [`access_token=${adminAccess}`]);
    const target = listRes.body.data.find((u: any) => u.id !== adminId);
    if (!target) return;
    const res = await request(app)
      .patch(`/api/users/${target.id}/role`)
      .set('Cookie', [`access_token=${adminAccess}; csrf_token=${adminCsrf}`])
      .set('X-CSRF-Token', adminCsrf)
      .send({ role: 'manager' });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/users/:id/role should prevent self-demotion', async () => {
    const res = await request(app)
      .patch(`/api/users/${adminId}/role`)
      .set('Cookie', [`access_token=${adminAccess}; csrf_token=${adminCsrf}`])
      .set('X-CSRF-Token', adminCsrf)
      .send({ role: 'customer' });
    expect(res.status).toBe(400);
  });

  it('GET /api/users/audit should return audit log for admin', async () => {
    const res = await request(app)
      .get('/api/users/audit')
      .set('Cookie', [`access_token=${adminAccess}`]);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/users/import should import users for admin', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', [`access_token=${adminAccess}; csrf_token=${adminCsrf}`])
      .set('X-CSRF-Token', adminCsrf)
      .send({ users: [{ username: 'imported_user', password: 'Imported1!@', name: 'Imported User', email: 'imported@example.com', identity_number: 'IMP001', vat_number: 'IMPVAT01' }] });
    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(1);
  });
});

describe('Security & Edge Cases', () => {
  it('should return 404 JSON for unknown API routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should reject mutating requests without CSRF', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'Customer123!' });
    const c = loginRes.headers['set-cookie'];
    const all = Array.isArray(c) ? c.join('; ') : c;
    const access = all?.match(/access_token=([^;]+)/)?.[1] || '';
    const res = await request(app)
      .post('/api/reservations')
      .set('Cookie', [`access_token=${access}`])
      .send({ flight_id: 1, seat_number: '1A', ticket_type: 'business' });
    expect(res.status).toBe(403);
  });

  it('should reject invalid/expired JWT', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['access_token=invalid.jwt.token']);
    expect(res.status).toBe(401);
  });

  it('should validate flight query parameters', async () => {
    const res = await request(app).get('/api/flights?page=-1');
    expect(res.status).toBe(400);
  });

  it('should validate id parameters are positive integers', async () => {
    const res = await request(app).get('/api/flights/abc');
    expect(res.status).toBe(400);
  });
});
