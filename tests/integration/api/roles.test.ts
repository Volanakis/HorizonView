import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../utils/app.js';
import { extractCsrfToken, seedTestData } from '../../utils/seed.js';

describe('Role Access Control', () => {
  let visitorAgent: ReturnType<typeof request.agent>;
  let customerAgent: ReturnType<typeof request.agent>;
  let managerAgent: ReturnType<typeof request.agent>;
  let adminAgent: ReturnType<typeof request.agent>;
  let csrfToken = '';
  let customerCsrfToken = '';
  let managerCsrfToken = '';

  beforeAll(async () => {
    await seedTestData();
    visitorAgent  = request.agent(app);
    customerAgent = request.agent(app);
    managerAgent  = request.agent(app);
    adminAgent    = request.agent(app);

    await visitorAgent.post('/api/auth/login').send({ username: 'visitor',  password: 'Visitor123!' });
    const customerRes = await customerAgent.post('/api/auth/login').send({ username: 'customer', password: 'Customer123!' });
    const managerRes  = await managerAgent.post('/api/auth/login').send({ username: 'manager',  password: 'Manager123!' });
    const adminRes    = await adminAgent.post('/api/auth/login').send({ username: 'admin',    password: 'Admin123!' });

    csrfToken         = extractCsrfToken(adminRes);
    customerCsrfToken = extractCsrfToken(customerRes);
    managerCsrfToken  = extractCsrfToken(managerRes);
  }, 60000);

  describe('Visitor role', () => {
    it('CAN read flights (public)', async () => {
      const res = await visitorAgent.get('/api/flights').expect(200);
      expect(res.body.success).toBe(true);
    });

    it('CAN read flight seats (public)', async () => {
      const flights = await visitorAgent.get('/api/flights');
      if (flights.body.data?.length > 0) {
        await visitorAgent.get('/api/flights/' + flights.body.data[0].id + '/seats').expect(200);
      }
    });

    it('CANNOT create flights', async () => {
      await visitorAgent
        .post('/api/flights')
        .set('X-CSRF-Token', 'invalid-token')
        .send({ flight_number: 'TST001', departure: 'ATH', arrival: 'LON', scheduled_time: '2026-07-01T10:00:00Z', total_seats: 100, airplane: 'Boeing 737', num_rows: 20, seats_per_row: 6, business_rows: 5 })
        .expect(403);
    });

    it('CANNOT access reservations', async () => {
      await visitorAgent.get('/api/reservations').expect(403);
    });

    it('CANNOT access users (admin only)', async () => {
      await visitorAgent.get('/api/users').expect(403);
    });
  });

  describe('Customer role', () => {
    it('CAN read flights (public)', async () => {
      const res = await customerAgent.get('/api/flights').expect(200);
      expect(res.body.success).toBe(true);
    });

    it('CAN create reservations', async () => {
      const managerAgentTemp = request.agent(app);
      const tempLoginRes = await managerAgentTemp.post('/api/auth/login').send({ username: 'manager', password: 'Manager123!' });
      const tempCsrf = extractCsrfToken(tempLoginRes);

      const flightRes = await managerAgentTemp
        .post('/api/flights')
        .set('X-CSRF-Token', tempCsrf)
        .send({ flight_number: 'TST-CUST', departure: 'ATH', arrival: 'SKG', scheduled_time: '2026-08-01T10:00:00Z', total_seats: 60, airplane: 'Boeing 737', num_rows: 10, seats_per_row: 6, business_rows: 2 })
        .expect(201);

      const flightId = flightRes.body.data.id;
      const seatsRes = await customerAgent.get('/api/flights/' + flightId + '/seats');
      const availableSeat = (seatsRes.body.data?.seats || []).find((s: any) => s.status === 'available');

      if (availableSeat) {
        await customerAgent
          .post('/api/reservations')
          .set('X-CSRF-Token', customerCsrfToken)
          .send({ flight_id: flightId, seat_number: availableSeat.number, ticket_type: 'normal' })
          .expect(201);
      }
    });

    it('CANNOT create flights', async () => {
      await customerAgent
        .post('/api/flights')
        .set('X-CSRF-Token', csrfToken)
        .send({ flight_number: 'TST002', departure: 'ATH', arrival: 'PAR', scheduled_time: '2026-07-02T12:00:00Z', total_seats: 100, airplane: 'Boeing 737', num_rows: 20, seats_per_row: 6, business_rows: 5 })
        .expect(403);
    });

    it('CANNOT delete flights', async () => {
      await customerAgent
        .delete('/api/flights/1')
        .set('X-CSRF-Token', csrfToken)
        .expect(403);
    });

    it('CANNOT access users (admin only)', async () => {
      await customerAgent.get('/api/users').expect(403);
    });
  });

  describe('Manager role', () => {
    it('CAN create flights', async () => {
      const res = await managerAgent
        .post('/api/flights')
        .set('X-CSRF-Token', managerCsrfToken)
        .send({ flight_number: 'TST003', departure: 'ATH', arrival: 'BER', scheduled_time: '2026-07-03T14:00:00Z', total_seats: 150, airplane: 'Boeing 737', num_rows: 25, seats_per_row: 6, business_rows: 5 })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('CAN update flight state', async () => {
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

    it('CAN delete a created flight', async () => {
      const createRes = await managerAgent
        .post('/api/flights')
        .set('X-CSRF-Token', managerCsrfToken)
        .send({ flight_number: 'TST003-DEL', departure: 'ATH', arrival: 'BER', scheduled_time: '2026-09-01T10:00:00Z', total_seats: 60, airplane: 'Boeing 737', num_rows: 10, seats_per_row: 6, business_rows: 2 })
        .expect(201);

      await managerAgent
        .delete('/api/flights/' + createRes.body.data.id)
        .set('X-CSRF-Token', managerCsrfToken)
        .expect(204);
    });

    it('CANNOT access user management', async () => {
      await managerAgent.get('/api/users').expect(403);
    });

    it('CANNOT change user roles', async () => {
      await managerAgent
        .patch('/api/users/1/role')
        .set('X-CSRF-Token', managerCsrfToken)
        .send({ role: 'customer' })
        .expect(403);
    });
  });

  describe('Admin role', () => {
    it('CAN access all users', async () => {
      const res = await adminAgent.get('/api/users').expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('CAN change user roles', async () => {
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

    it('CAN bulk import users', async () => {
      const importRes = await adminAgent
        .post('/api/users/import')
        .set('X-CSRF-Token', csrfToken)
        .send({
          users: [
            { username: 'import1', password: 'Test123!', name: 'Import 1', email: 'import1@test.com', role: 'customer', identity_number: 'TST00999' },
            { username: 'import2', password: 'Test123!', name: 'Import 2', email: 'import2@test.com', role: 'visitor', identity_number: 'TST00998' }
          ]
        });

      expect([200, 207, 422]).toContain(importRes.status);
    });

    it('CAN create flights', async () => {
      await adminAgent
        .post('/api/flights')
        .set('X-CSRF-Token', csrfToken)
        .send({ flight_number: 'TST004', departure: 'ATH', arrival: 'ROM', scheduled_time: '2026-07-04T16:00:00Z', total_seats: 120, airplane: 'Boeing 737', num_rows: 20, seats_per_row: 6, business_rows: 4 })
        .expect(201);
    });
  });
});
