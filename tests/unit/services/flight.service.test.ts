import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb } from '../../../src/lib/server/db/index.js';
import { flightService } from '../../../src/lib/server/services/flight.service.js';
import { FlightSchema } from '../../../src/lib/server/db/validation.js';

describe('flight.service Unit Tests', () => {
  let createdFlightId: number;

  beforeEach(() => {
    const db = getDb();
    db.run('DELETE FROM audit_log');
    db.run('DELETE FROM seats');
    db.run('DELETE FROM flights');
    db.run('DELETE FROM users');
    db.run('INSERT INTO users (id, username, password, name, email, role, identity_number, is_active, address, employee_code) VALUES (1, \'testuser\', \'hash\', \'Test\', \'test@test.com\', \'manager\', \'TST00001\', 1, NULL, NULL)');
  });

  afterEach(() => {
    const db = getDb();
    db.run('DELETE FROM audit_log');
    db.run('DELETE FROM seats');
    db.run('DELETE FROM flights');
    db.run('DELETE FROM users');
  });

  describe('create', () => {
    it('successfully creates a flight with seats', () => {
      const flight = flightService.create({
        flight_number: 'FL001',
        departure: 'ATH',
        arrival: 'LHR',
        scheduled_time: '2026-06-01T10:00:00Z',
        total_seats: 60,
        created_by: 1,
        airplane: 'Boeing 737',
        num_rows: 10,
        seats_per_row: 6,
        business_rows: 2
      });

      expect(flight).toBeDefined();
      expect(flight.flight_number).toBe('FL001');
      expect(flight.total_seats).toBe(60);

      // Verify seats were created
      const db = getDb();
      const seatCount = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM seats WHERE flight_id = ?', [flight.id]);
      expect(seatCount?.cnt).toBe(60);
    });

    it('returns a valid Flight object', () => {
      const flight = flightService.create({
        flight_number: 'FL002',
        departure: 'ATH',
        arrival: 'CDG',
        scheduled_time: '2026-06-02T12:00:00Z',
        total_seats: 30,
        created_by: 1,
        airplane: 'Boeing 737',
        num_rows: 5,
        seats_per_row: 6,
        business_rows: 1
      });

      // Validate with schema
      const validated = FlightSchema.parse(flight);
      expect(validated.id).toBeDefined();
      expect(validated.state).toBe('created');
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      // Create test flights
      flightService.create({
        flight_number: 'FL010',
        departure: 'ATH',
        arrival: 'LHR',
        scheduled_time: '2026-06-01T10:00:00Z',
        total_seats: 60,
        created_by: 1,
        airplane: 'Boeing 737',
        num_rows: 10,
        seats_per_row: 6,
        business_rows: 2
      });

      flightService.create({
        flight_number: 'FL011',
        departure: 'ATH',
        arrival: 'CDG',
        scheduled_time: '2026-06-02T12:00:00Z',
        total_seats: 60,
        created_by: 1,
        airplane: 'Boeing 737',
        num_rows: 10,
        seats_per_row: 6,
        business_rows: 2
      });
    });

    it('returns all flights when no filters applied', () => {
      const { flights, total } = flightService.getAll({});
      
      expect(total).toBeGreaterThanOrEqual(2);
      expect(flights.length).toBeGreaterThanOrEqual(2);
    });

    it('filters flights by departure', () => {
      const { flights } = flightService.getAll({ from: 'ATH' });
      
      expect(flights.every(f => f.departure === 'ATH')).toBe(true);
    });

    it('returns paginated results', () => {
      const { flights, total } = flightService.getAll({ page: 1, limit: 1 });
      
      expect(flights.length).toBe(1);
      expect(total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getById', () => {
    it('returns flight when found', () => {
      const created = flightService.create({
        flight_number: 'FL020',
        departure: 'LHR',
        arrival: 'CDG',
        scheduled_time: '2026-06-03T14:00:00Z',
        total_seats: 30,
        created_by: 1,
        airplane: 'Boeing 737',
        num_rows: 5,
        seats_per_row: 6,
        business_rows: 1
      });

      const flight = flightService.getById(created.id);
      
      expect(flight).toBeDefined();
      expect(flight?.flight_number).toBe('FL020');
    });

    it('returns null when flight not found', () => {
      const flight = flightService.getById(99999);
      
      expect(flight).toBeNull();
    });
  });

  describe('updateState', () => {
    it('successfully updates flight state', () => {
      const created = flightService.create({
        flight_number: 'FL030',
        departure: 'CDG',
        arrival: 'FCO',
        scheduled_time: '2026-06-04T16:00:00Z',
        total_seats: 30,
        created_by: 1,
        airplane: 'Boeing 737',
        num_rows: 5,
        seats_per_row: 6,
        business_rows: 1
      });

      const result = flightService.updateState(created.id, 'staffed', 1);
      
      expect(result.success).toBe(true);
      
      const updated = flightService.getById(created.id);
      expect(updated?.state).toBe('staffed');
    });

    it('rejects invalid state transitions', () => {
      const created = flightService.create({
        flight_number: 'FL031',
        departure: 'FCO',
        arrival: 'ATH',
        scheduled_time: '2026-06-05T18:00:00Z',
        total_seats: 30,
        created_by: 1,
        airplane: 'Boeing 737',
        num_rows: 5,
        seats_per_row: 6,
        business_rows: 1
      });

      const result = flightService.updateState(created.id, 'completed', 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid state transition');
    });
  });

  describe('getSeats', () => {
    it('returns seats for a flight', () => {
      const created = flightService.create({
        flight_number: 'FL040',
        departure: 'ATH',
        arrival: 'MAD',
        scheduled_time: '2026-06-06T20:00:00Z',
        total_seats: 30,
        created_by: 1,
        airplane: 'Boeing 737',
        num_rows: 5,
        seats_per_row: 6,
        business_rows: 1
      });

      const seats = flightService.getSeats(created.id);
      
      expect(seats.length).toBe(30);
      expect(seats[0]).toHaveProperty('seat_number');
      expect(seats[0]).toHaveProperty('class');
      expect(seats[0]).toHaveProperty('price');
    });
  });
});
