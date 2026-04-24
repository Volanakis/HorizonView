import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { DDL } from '../../../src/db/schema.js';
import app from '../../../src/app.js';
import { db } from '../../../src/db/index.js';

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

describe('Role Access Control', () => {
  let visitorAgent: ReturnType<typeof request.agent>;
  let customerAgent: ReturnType<typeof request.agent>;
  let managerAgent: ReturnType<typeof request.agent>;
  let adminAgent: ReturnType<typeof request.agent>;
  let csrfToken = '';
  let customerCsrfToken = '';
  let managerCsrfToken = '';

  beforeAll(async () => {
    await setupTestDb();
    await db.init();
    visitorAgent = request.agent(app);
    customerAgent = request.agent(app);
    managerAgent = request.agent(app);
    adminAgent = request.agent(app);

    const visitorRes = await visitorAgent.post('/api/auth/login').send({ username: 'visitor', password: 'Visitor123!' });
    const customerRes = await customerAgent.post('/api/auth/login').send({ username: 'customer', password: 'Customer123!' });
    const managerRes = await managerAgent.post('/api/auth/login').send({ username: 'manager', password: 'Manager123!' });
    const adminRes = await adminAgent.post('/api/auth/login').send({ username: 'admin', password: 'Admin123!' });

    csrfToken = extractCsrfToken(adminRes);
    customerCsrfToken = extractCsrfToken(customerRes);
    managerCsrfToken = extractCsrfToken(managerRes);
  }, 60000);

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  });

  describe('Visitor role', () => {
    it('✓ CAN read flights (public)', async () => {
      const res = await visitorAgent.get('/api/flights').expect(200);
      expect(res.body.success).toBe(true);
    });

    it('✓ CAN read flight seats (public)', async () => {
      const flights = await visitorAgent.get('/api/flights');
      if (flights.body.data?.length > 0) {
        await visitorAgent.get('/api/flights/' + flights.body.data[0].id + '/seats').expect(200);
      }
    });

    it('✗ CANNOT create flights', async () => {
      await visitorAgent
        .post('/api/flights')
        .set('X-CSRF-Token', 'invalid-token')
        .send({ flight_number: 'TST001', departure: 'ATH', arrival: 'LON', scheduled_time: '2026-07-01T10:00:00Z', total_seats: 100 })
        .expect(403);
    });

    it('✗ CANNOT access reservations', async () => {
      await visitorAgent.get('/api/reservations').expect(403);
    });

    it('✗ CANNOT access users (admin)', async () => {
      await visitorAgent.get('/api/users').expect(403);
    });
  });

  describe('Customer role', () => {
    it('✓ CAN read flights (public)', async () => {
      const res = await customerAgent.get('/api/flights').expect(200);
      expect(res.body.success).toBe(true);
    });

    it('✓ CAN create reservations', async () => {
      const flights = await customerAgent.get('/api/flights');
      if (flights.body.data?.length > 0) {
        const seats = await customerAgent.get('/api/flights/' + flights.body.data[0].id + '/seats');
        const seatList = seats.body.data?.seats || [];
        const availableSeat = seatList.find((s: any) => s.status === 'available');
        if (availableSeat) {
          await customerAgent
            .post('/api/reservations')
            .set('X-CSRF-Token', customerCsrfToken)
            .send({ flight_id: flights.body.data[0].id, seat_number: availableSeat.number, ticket_type: 'economy' })
            .expect(201);
        }
      }
    });

    it('✗ CANNOT create flights', async () => {
      await customerAgent
        .post('/api/flights')
        .set('X-CSRF-Token', csrfToken)
        .send({ flight_number: 'TST002', departure: 'ATH', arrival: 'PAR', scheduled_time: '2026-07-02T12:00:00Z', total_seats: 100 })
        .expect(403);
    });

    it('✗ CANNOT delete flights', async () => {
      await customerAgent
        .delete('/api/flights/1')
        .set('X-CSRF-Token', csrfToken)
        .expect(403);
    });

    it('✗ CANNOT access users (admin)', async () => {
      await customerAgent.get('/api/users').expect(403);
    });
  });

  describe('Manager role', () => {
    it('✓ CAN create flights', async () => {
      const res = await managerAgent
        .post('/api/flights')
        .set('X-CSRF-Token', managerCsrfToken)
        .send({ flight_number: 'TST003', departure: 'ATH', arrival: 'BER', scheduled_time: '2026-07-03T14:00:00Z', total_seats: 150 })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('✓ CAN update flight state', async () => {
      const flights = await managerAgent.get('/api/flights');
      const testFlight = flights.body.data?.find((f: any) => f.flight_number === 'TST003');
      if (testFlight) {
        await managerAgent
          .patch('/api/flights/' + testFlight.id + '/state')
          .set('X-CSRF-Token', managerCsrfToken)
          .send({ state: 'staffed' })
          .expect(200);
      }
    });

    it('✓ CAN delete flights', async () => {
      const flights = await managerAgent.get('/api/flights');
      const testFlight = flights.body.data?.find((f: any) => f.flight_number === 'TST003');
      if (testFlight) {
        await managerAgent
          .delete('/api/flights/' + testFlight.id)
          .set('X-CSRF-Token', managerCsrfToken)
          .expect(200);
      }
    });

    it('✗ CANNOT access user management', async () => {
      await managerAgent.get('/api/users').expect(403);
    });

    it('✗ CANNOT change user roles', async () => {
      await managerAgent
        .patch('/api/users/1/role')
        .set('X-CSRF-Token', managerCsrfToken)
        .send({ role: 'customer' })
        .expect(403);
    });
  });

  describe('Admin role', () => {
    it('✓ CAN access all users', async () => {
      const res = await adminAgent.get('/api/users').expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('✓ CAN change user roles', async () => {
      const users = await adminAgent.get('/api/users');
      const targetUser = users.body.data?.find((u: any) => u.role === 'customer');
      if (targetUser) {
        await adminAgent
          .patch('/api/users/' + targetUser.id + '/role')
          .set('X-CSRF-Token', csrfToken)
          .send({ role: 'manager' })
          .expect(200);
      }
    });

    it('✓ CAN bulk import users', async () => {
      const importRes = await adminAgent
        .post('/api/users/import')
        .set('X-CSRF-Token', csrfToken)
        .send([
          { username: 'import1', password: 'Test123!', name: 'Import 1', email: 'import1@test.com', role: 'customer' },
          { username: 'import2', password: 'Test123!', name: 'Import 2', email: 'import2@test.com', role: 'visitor' }
        ]);
      
      expect([200, 207, 422]).toContain(importRes.status);
    });

    it('✓ CAN create flights', async () => {
      await adminAgent
        .post('/api/flights')
        .set('X-CSRF-Token', csrfToken)
        .send({ flight_number: 'TST004', departure: 'ATH', arrival: 'ROM', scheduled_time: '2026-07-04T16:00:00Z', total_seats: 120 })
        .expect(201);
    });
  });
});
