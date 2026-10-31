import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../utils/app.js';
import { extractCsrfToken, seedTestData } from '../../utils/seed.js';

const BASE_URL = '/api/flights';

describe('Flights API', () => {
  let adminAgent: ReturnType<typeof request.agent>;
  let managerAgent: ReturnType<typeof request.agent>;
  let visitorAgent: ReturnType<typeof request.agent>;
  let csrfToken = '';
  let managerCsrfToken = '';
  let testFlightId: number;

  beforeAll(async () => {
    await seedTestData();
    adminAgent = request.agent(app);
    managerAgent = request.agent(app);
    visitorAgent = request.agent(app);

    const adminLoginRes = await adminAgent.post('/api/auth/login').send({ username: 'admin', password: 'Admin123!' });
    const managerLoginRes = await managerAgent.post('/api/auth/login').send({ username: 'manager', password: 'Manager123!' });
    await visitorAgent.post('/api/auth/login').send({ username: 'visitor', password: 'Visitor123!' });

    csrfToken = extractCsrfToken(adminLoginRes);
    managerCsrfToken = extractCsrfToken(managerLoginRes);
  }, 30000);

  describe('GET /', () => {
    it('returns all flights (public access)', async () => {
      const res = await visitorAgent.get(BASE_URL).expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters flights by departure', async () => {
      const res = await visitorAgent.get(BASE_URL + '?from=ATH').expect(200);
      expect(res.body.success).toBe(true);
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
          total_seats: 180,
          airplane: 'Boeing 737',
          num_rows: 30,
          seats_per_row: 6,
          business_rows: 5
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
          total_seats: 180,
          airplane: 'Boeing 737',
          num_rows: 30,
          seats_per_row: 6,
          business_rows: 5
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('returns 401 without auth', async () => {
      await request(app)
        .post(BASE_URL)
        .send({ flight_number: 'HV003', departure: 'ATH', arrival: 'BER', scheduled_time: '2026-06-03T14:00:00Z', total_seats: 180, airplane: 'Boeing 737', num_rows: 30, seats_per_row: 6, business_rows: 5 })
        .expect(401);
    });
  });

  describe('GET /:id', () => {
    it('returns flight details (public access)', async () => {
      if (!testFlightId) return;
      const res = await visitorAgent.get(BASE_URL + '/' + testFlightId).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('flight_number');
    });
  });

  describe('GET /:id/seats', () => {
    it('returns seat map (public access)', async () => {
      if (!testFlightId) return;
      const res = await visitorAgent.get(BASE_URL + '/' + testFlightId + '/seats').expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /:id/state', () => {
    it('updates flight state as manager', async () => {
      if (!testFlightId) return;
      const res = await managerAgent
        .patch(BASE_URL + '/' + testFlightId + '/state')
        .set('X-CSRF-Token', managerCsrfToken)
        .send({ state: 'staffed' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.state).toBe('staffed');
    });

    it('rejects invalid state transition', async () => {
      if (!testFlightId) return;
      await managerAgent
        .patch(BASE_URL + '/' + testFlightId + '/state')
        .set('X-CSRF-Token', managerCsrfToken)
        .send({ state: 'invalid' })
        .expect(422);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes a created flight as manager', async () => {
      const createRes = await managerAgent
        .post(BASE_URL)
        .set('X-CSRF-Token', managerCsrfToken)
        .send({ flight_number: 'HV-DEL', departure: 'ATH', arrival: 'SKG', scheduled_time: '2026-07-01T08:00:00Z', total_seats: 60, airplane: 'Boeing 737', num_rows: 10, seats_per_row: 6, business_rows: 2 })
        .expect(201);

      await managerAgent
        .delete(BASE_URL + '/' + createRes.body.data.id)
        .set('X-CSRF-Token', managerCsrfToken)
        .expect(204);
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
