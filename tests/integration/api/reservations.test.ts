import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../utils/app.js';
import { extractCsrfToken, seedTestData, cleanupTestData } from '../../utils/seed.js';

const BASE_URL = '/api/reservations';

describe('Reservations API', () => {
  let customerAgent: ReturnType<typeof request.agent>;
  let csrfToken = '';
  let testFlightId: number;

  beforeAll(async () => {
    cleanupTestData();
    await seedTestData();
    customerAgent = request.agent(app);

    const loginRes = await customerAgent.post('/api/auth/login').send({ username: 'customer', password: 'Customer123!' });
    csrfToken = extractCsrfToken(loginRes);

    const managerAgent = request.agent(app);
    const managerLoginRes = await managerAgent.post('/api/auth/login').send({ username: 'manager', password: 'Manager123!' });
    const managerCsrfToken = extractCsrfToken(managerLoginRes);

    const createFlightRes = await managerAgent
      .post('/api/flights')
      .set('X-CSRF-Token', managerCsrfToken)
      .send({
        flight_number: 'HV-RES',
        departure: 'ATH',
        arrival: 'LON',
        scheduled_time: '2026-12-01T10:00:00Z',
        total_seats: 30,
        airplane: 'Boeing 737',
        num_rows: 5,
        seats_per_row: 6,
        business_rows: 1
      });

    testFlightId = createFlightRes.body.data.id;
  }, 30000);

  describe('GET /', () => {
    it('lists current user reservations', async () => {
      const res = await customerAgent.get(BASE_URL).expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 401 when not authenticated', async () => {
      await request(app).get(BASE_URL).expect(401);
    });
  });

  describe('POST /', () => {
    it('creates reservation for available seat', async () => {
      const seatsRes = await customerAgent.get('/api/flights/' + testFlightId + '/seats');
      const seats = seatsRes.body.data?.seats || [];
      const availableSeat = seats.find((s: any) => s.status === 'available' && s.class === 'normal');

      expect(availableSeat).toBeDefined();

      const res = await customerAgent
        .post(BASE_URL)
        .set('X-CSRF-Token', csrfToken)
        .send({
          flight_id: testFlightId,
          seat_number: availableSeat.number,
          ticket_type: 'normal'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data?.reservation).toHaveProperty('id');
    });

    it('returns 409 for already booked seat', async () => {
      const seatsRes = await customerAgent.get('/api/flights/' + testFlightId + '/seats');
      const seats = seatsRes.body.data?.seats || [];
      const bookedSeat = seats.find((s: any) => s.status === 'reserved');

      if (bookedSeat) {
        await customerAgent
          .post(BASE_URL)
          .set('X-CSRF-Token', csrfToken)
          .send({
            flight_id: testFlightId,
            seat_number: bookedSeat.number,
          ticket_type: 'normal'
        })
        .expect(409);
      }
    });

    it('books economy without a seat number (seat assigned by the server)', async () => {
      const res = await customerAgent
        .post(BASE_URL)
        .set('X-CSRF-Token', csrfToken)
        .send({ flight_id: testFlightId, ticket_type: 'economy' })
        .expect(201);
      expect(res.body.data.reservation.ticket_type).toBe('economy');
    });

    it('returns 401 without auth', async () => {
      await request(app)
        .post(BASE_URL)
        .send({ flight_id: testFlightId, seat_number: '1A', ticket_type: 'normal' })
        .expect(401);
    });
  });

  describe('DELETE /:id', () => {
    it('cancels own reservation', async () => {
      const reservations = await customerAgent.get(BASE_URL);
      const ownRes = reservations.body.data?.[0];

      if (ownRes) {
        const res = await customerAgent
          .delete(BASE_URL + '/' + ownRes.id)
          .set('X-CSRF-Token', csrfToken)
          .expect(204);

        expect(res.text).toBe('');
      }
    });

    it('returns 404 for non-existent reservation', async () => {
      await customerAgent
        .delete(BASE_URL + '/99999')
        .set('X-CSRF-Token', csrfToken)
        .expect(404);
    });
  });
});
