import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../utils/app.js';
import { extractCsrfToken, seedTestData, cleanupTestData } from '../../utils/seed.js';
import { db } from '../../../src/lib/server/db/index.js';

async function signIn(username: string, password: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username, password });
  return { agent, csrf: extractCsrfToken(res), status: res.status };
}

describe('Account, sign-up and re-booking', () => {
  let flightId: number;

  beforeAll(async () => {
    cleanupTestData();
    await seedTestData();
    const manager = await signIn('manager', 'Manager123!');
    const res = await manager.agent
      .post('/api/flights')
      .set('X-CSRF-Token', manager.csrf)
      .send({
        flight_number: 'HV-ACC',
        departure: 'ATH',
        arrival: 'SKG',
        scheduled_time: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        total_seats: 30,
        airplane: 'Boeing 737',
        num_rows: 5,
        seats_per_row: 6,
        business_rows: 1
      });
    flightId = res.body.data.id;
  }, 30000);

  it('re-books a seat freed by a cancellation', async () => {
    const { agent, csrf } = await signIn('customer', 'Customer123!');
    const booking = { flight_id: flightId, ticket_type: 'business', seat_number: '1A' };

    const first = await agent.post('/api/reservations').set('X-CSRF-Token', csrf).send(booking).expect(201);
    await agent.delete(`/api/reservations/${first.body.data.reservation.id}`).set('X-CSRF-Token', csrf).expect(204);
    await agent.post('/api/reservations').set('X-CSRF-Token', csrf).send(booking).expect(201);
    // Still only one active booking per seat.
    await agent.post('/api/reservations').set('X-CSRF-Token', csrf).send(booking).expect(409);
  });

  it('registers without the optional ID, VAT and address', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'minimal', password: 'Minimal123!', name: 'Min Imal', email: 'minimal@test.com', vat_number: '', address: '' })
      .expect(201);
    expect(res.body.data.user.username).toBe('minimal');
    const row = db.get<{ identity_number: string | null; vat_number: string | null }>(
      'SELECT identity_number, vat_number FROM users WHERE username = ?', ['minimal']
    );
    expect(row).toEqual({ identity_number: null, vat_number: null });
  });

  it('exports the signed-in user’s data as a download', async () => {
    const { agent } = await signIn('customer', 'Customer123!');
    const res = await agent.get('/api/auth/me/export').expect(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.profile.username).toBe('customer');
    expect(res.body.profile.password).toBeUndefined();
    expect(res.body.reservations.length).toBeGreaterThan(0);
  });

  it('refuses deletion with a wrong password, without ending the session', async () => {
    const { agent, csrf } = await signIn('customer', 'Customer123!');
    const res = await agent.delete('/api/auth/me').set('X-CSRF-Token', csrf).send({ password: 'wrong' }).expect(403);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    await agent.get('/api/auth/me').expect(200);
  });

  it('deletes by anonymising: upcoming bookings cancelled, sign-in impossible', async () => {
    const { agent, csrf } = await signIn('customer', 'Customer123!');
    const { body } = await agent.get('/api/auth/me').expect(200);

    await agent.delete('/api/auth/me').set('X-CSRF-Token', csrf).send({ password: 'Customer123!' }).expect(204);

    const user = db.get<{ username: string; email: string; is_active: number }>('SELECT username, email, is_active FROM users WHERE id = ?', [body.data.id]);
    expect(user).toEqual({ username: `deleted-${body.data.id}`, email: `deleted-${body.data.id}@invalid`, is_active: 0 });
    const active = db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM reservations WHERE user_id = ? AND status = 'confirmed'`, [body.data.id]);
    expect(active?.n).toBe(0);
    expect((await signIn('customer', 'Customer123!')).status).toBe(401);
  });

  it('keeps the last admin from deleting their account', async () => {
    const { agent, csrf } = await signIn('admin', 'Admin123!');
    const res = await agent.delete('/api/auth/me').set('X-CSRF-Token', csrf).send({ password: 'Admin123!' }).expect(409);
    expect(res.body.error.code).toBe('LAST_ADMIN');
  });
});
