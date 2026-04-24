import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { DDL } from '../../../src/db/schema.js';
import app from '../../../src/app.js';
import { db } from '../../../src/db/index.js';

const BASE_URL = '/api/flights';
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

describe('Flights API', () => {
  let adminAgent: ReturnType<typeof request.agent>;
  let managerAgent: ReturnType<typeof request.agent>;
  let visitorAgent: ReturnType<typeof request.agent>;
  let csrfToken = '';
  let managerCsrfToken = '';
  let testFlightId: number;

  beforeAll(async () => {
    await setupTestDb();
    await db.init();
    adminAgent = request.agent(app);
    managerAgent = request.agent(app);
    visitorAgent = request.agent(app);

    const adminLoginRes = await adminAgent.post('/api/auth/login').send({ username: 'admin', password: 'Admin123!' });
    const managerLoginRes = await managerAgent.post('/api/auth/login').send({ username: 'manager', password: 'Manager123!' });
    await visitorAgent.post('/api/auth/login').send({ username: 'visitor', password: 'Visitor123!' });

    csrfToken = extractCsrfToken(adminLoginRes);
    managerCsrfToken = extractCsrfToken(managerLoginRes);
  }, 30000);

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  afterAll(() => {
    db.close();
  });

  describe('GET /', () => {
    it('returns all flights (public access)', async () => {
      const res = await visitorAgent.get(BASE_URL).expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters flights by departure', async () => {
      const res = await visitorAgent.get(BASE_URL + '?departure=ATH').expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /:id', () => {
    it('returns flight details (public access)', async () => {
      const flights = await visitorAgent.get(BASE_URL);
      if (flights.body.data.length > 0) {
        testFlightId = flights.body.data[0].id;
        const res = await visitorAgent.get(BASE_URL + '/' + testFlightId).expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('flight_number');
      }
    });
  });

  describe('GET /:id/seats', () => {
    it('returns seat map (public access)', async () => {
      const flights = await visitorAgent.get(BASE_URL);
      if (flights.body.data.length > 0) {
        const res = await visitorAgent.get(BASE_URL + '/' + flights.body.data[0].id + '/seats').expect(200);
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('POST /', () => {
    it('creates flight as manager', async () => {
      const res = await managerAgent
        .post(BASE_URL)
        .set('X-CSRF-Token', managerCsrfToken)
        .send({
          flight_number: 'HV001',
          departure: 'ATH',
          arrival: 'LON',
          scheduled_time: '2026-06-01T10:00:00Z',
          total_seats: 180
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      testFlightId = res.body.data.id;
    });

    it('denies access to customer', async () => {
      const customerAgent = request.agent(app);
      await customerAgent.post('/api/auth/login').send({ username: 'customer', password: 'Customer123!' });
      
      const res = await customerAgent
        .post(BASE_URL)
        .set('X-CSRF-Token', csrfToken)
        .send({
          flight_number: 'HV002',
          departure: 'ATH',
          arrival: 'PAR',
          scheduled_time: '2026-06-02T12:00:00Z',
          total_seats: 180
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('returns 401 without auth', async () => {
      await request(app)
        .post(BASE_URL)
        .send({ flight_number: 'HV003', departure: 'ATH', arrival: 'BER', scheduled_time: '2026-06-03T14:00:00Z', total_seats: 180 })
        .expect(401);
    });
  });

  describe('PATCH /:id/state', () => {
    it('updates flight state as manager', async () => {
      const flights = await managerAgent.get(BASE_URL);
      if (flights.body.data.length > 0) {
        const flightId = flights.body.data.find((f: any) => f.flight_number === 'HV001')?.id;
        if (flightId) {
          const res = await managerAgent
            .patch(BASE_URL + '/' + flightId + '/state')
            .set('X-CSRF-Token', managerCsrfToken)
            .send({ state: 'staffed' })
            .expect(200);

          expect(res.body.success).toBe(true);
          expect(res.body.data.state).toBe('staffed');
        }
      }
    });

    it('rejects invalid state', async () => {
      const flights = await managerAgent.get(BASE_URL);
      if (flights.body.data.length > 0) {
        const flightId = flights.body.data[0].id;
        await managerAgent
          .patch(BASE_URL + '/' + flightId + '/state')
          .set('X-CSRF-Token', managerCsrfToken)
          .send({ state: 'invalid' })
          .expect(400);
      }
    });
  });

  describe('DELETE /:id', () => {
    it('deletes flight as manager', async () => {
      const flights = await managerAgent.get(BASE_URL);
      if (flights.body.data.length > 0) {
        const flightToDelete = flights.body.data.find((f: any) => f.flight_number === 'HV001');
        if (flightToDelete) {
          const res = await managerAgent
            .delete(BASE_URL + '/' + flightToDelete.id)
            .set('X-CSRF-Token', managerCsrfToken)
            .expect(200);

          expect(res.body.success).toBe(true);
        }
      }
    });

    it('denies delete to non-manager', async () => {
      const customerAgent = request.agent(app);
      await customerAgent.post('/api/auth/login').send({ username: 'customer', password: 'Customer123!' });

      const res = await customerAgent
        .delete(BASE_URL + '/1')
        .set('X-CSRF-Token', csrfToken)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });
});
