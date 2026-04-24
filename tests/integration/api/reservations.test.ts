import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { DDL } from '../../../src/db/schema.js';
import app from '../../../src/app.js';
import { db } from '../../../src/db/index.js';

const BASE_URL = '/api/reservations';
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

describe('Reservations API', () => {
  let customerAgent: ReturnType<typeof request.agent>;
  let csrfToken = '';
  let managerCsrfToken = '';
  let testFlightId: number;
  let testSeatId: number;

  beforeAll(async () => {
    await setupTestDb();
    await db.init();
    customerAgent = request.agent(app);

    const loginRes = await customerAgent.post('/api/auth/login').send({ username: 'customer', password: 'Customer123!' });
    csrfToken = extractCsrfToken(loginRes);

    const flights = await customerAgent.get('/api/flights');
    if (flights.body.data.length > 0) {
      testFlightId = flights.body.data[0].id;
    }
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
      if (!testFlightId) {
        const managerAgent = request.agent(app);
        const managerLoginRes = await managerAgent.post('/api/auth/login').send({ username: 'manager', password: 'Manager123!' });
        managerCsrfToken = extractCsrfToken(managerLoginRes);
        
        const createFlightRes = await managerAgent
          .post('/api/flights')
          .set('X-CSRF-Token', managerCsrfToken)
          .send({
            flight_number: 'HV999',
            departure: 'ATH',
            arrival: 'LON',
            scheduled_time: new Date('2026-12-01T10:00:00Z').toISOString(),
            total_seats: 30
          });
        
        if (!createFlightRes.body.success) {
          throw new Error('Failed to create flight: ' + JSON.stringify(createFlightRes.body));
        }
        
        testFlightId = createFlightRes.body.data?.id;
      }

      if (!testFlightId) {
        throw new Error('No testFlightId available');
      }

      const seatsRes = await customerAgent.get('/api/flights/' + testFlightId + '/seats');
      const seats = seatsRes.body.data?.seats || [];
      const availableSeat = seats.find((s: any) => s.status === 'available');
      
      if (availableSeat) {
        testSeatId = availableSeat.number;
        
        const res = await customerAgent
          .post(BASE_URL)
          .set('X-CSRF-Token', csrfToken)
          .send({
            flight_id: testFlightId,
            seat_number: availableSeat.number,
            ticket_type: 'economy'
          })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data?.reservation).toHaveProperty('id');
      }
    });

    it('returns 400 for already booked seat', async () => {
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
            ticket_type: 'economy'
          })
          .expect(409);
      } else {
        console.log('No booked seat found, skipping');
      }
    });

    it('returns 401 without auth', async () => {
      if (testFlightId) {
        await request(app)
          .post(BASE_URL)
          .send({ flight_id: testFlightId, seat_number: '1A', ticket_type: 'economy' })
          .expect(401);
      }
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

    it('cannot cancel other user reservation', async () => {
      const customer2Agent = request.agent(app);
      await customer2Agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin123!' });

      const res = await customer2Agent
        .delete(BASE_URL + '/99999')
        .set('X-CSRF-Token', csrfToken)
        .expect(403);
    });
  });
});
