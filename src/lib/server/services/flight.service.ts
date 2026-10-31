import { getDb } from '../db/index.js';
import type { Flight, FlightState, Seat, TicketType } from '../../types.js';
import { generateSeats, insertSeats } from '../seats.js';
import { type ErrorCode, ErrorCodes, serviceError } from '../errors.js';

interface DbFlight {
  id: number;
  flight_number: string;
  departure: string;
  arrival: string;
  scheduled_time: string;
  state: FlightState;
  total_seats: number;
  airplane: string;
  num_rows: number;
  seats_per_row: number;
  business_rows: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

interface DbSeat {
  id: number;
  flight_id: number;
  seat_number: string;
  class: TicketType;
  price: number;
  is_available: number;
}

const AVAILABLE_SEATS_SQL =
  '(SELECT COUNT(*) FROM seats WHERE flight_id = flights.id AND is_available = 1) AS available_seats';

function mapFlight(f: DbFlight & { available_seats?: number }): Flight {
  return {
    id: f.id,
    flight_number: f.flight_number,
    departure: f.departure,
    arrival: f.arrival,
    scheduled_time: f.scheduled_time,
    state: f.state,
    total_seats: f.total_seats,
    airplane: f.airplane,
    num_rows: f.num_rows,
    seats_per_row: f.seats_per_row,
    business_rows: f.business_rows,
    available_seats: f.available_seats !== undefined ? Number(f.available_seats) : undefined,
    created_by: f.created_by,
    created_at: f.created_at,
    updated_at: f.updated_at
  };
}

export const flightService = {
  getAll: (filters: {
    from?: string;
    to?: string;
    date?: string;
    states?: FlightState[];  // undefined = all states; array = restrict to listed states
    page?: number;
    limit?: number;
  }): { flights: Flight[]; total: number } => {
    const database = getDb();

    // Build WHERE clause once, reuse for count + data queries
    const wheres: string[] = [];
    const filterParams: (string | number | null)[] = [];

    if (filters.from) { wheres.push('departure = ?');              filterParams.push(filters.from.toUpperCase()); }
    if (filters.to)   { wheres.push('arrival = ?');                filterParams.push(filters.to.toUpperCase()); }
    if (filters.date) { wheres.push("date(scheduled_time) = date(?)"); filterParams.push(filters.date); }
    if (filters.states && filters.states.length > 0) {
      wheres.push(`state IN (${filters.states.map(() => '?').join(', ')})`);
      filterParams.push(...filters.states);
    }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    const total = database.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM flights ${where}`, filterParams
    )?.total || 0;

    const page  = filters.page  || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const rows = database.all<DbFlight & { available_seats: number }>(
      `SELECT *, ${AVAILABLE_SEATS_SQL} FROM flights ${where} ORDER BY scheduled_time ASC LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    return { flights: rows.map(mapFlight), total };
  },

  getById: (id: number): Flight | null => {
    const database = getDb();
    const flight = database.get<DbFlight & { available_seats: number }>(
      `SELECT *, ${AVAILABLE_SEATS_SQL} FROM flights WHERE id = ?`, [id]
    );
    if (!flight) return null;
    return mapFlight(flight);
  },

  create: (data: {
    flight_number: string;
    departure: string;
    arrival: string;
    scheduled_time: string;
    total_seats: number;
    created_by: number;
    airplane: string;
    num_rows: number;
    seats_per_row: number;
    business_rows: number;
  }): Flight => {
    const database = getDb();

    // Flight insert + seat generation + audit log are all one atomic unit.
    const flight = database.transaction(() => {
      database.run(
        `INSERT INTO flights (flight_number, departure, arrival, scheduled_time, total_seats, created_by, state, airplane, num_rows, seats_per_row, business_rows) VALUES (?, ?, ?, ?, ?, ?, 'created', ?, ?, ?, ?)`,
        [data.flight_number.toUpperCase(), data.departure.toUpperCase(), data.arrival.toUpperCase(), data.scheduled_time, data.total_seats, data.created_by, data.airplane, data.num_rows, data.seats_per_row, data.business_rows]
      );

      const created = database.get<DbFlight>('SELECT * FROM flights WHERE flight_number = ?', [data.flight_number.toUpperCase()]);
      if (!created) throw new Error('Failed to create flight');

      flightService.createSeats(created.id, data.total_seats, data.business_rows, data.seats_per_row);

      database.run(
        `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'FLIGHT_CREATE', 'flight', ?)`,
        [data.created_by, created.id]
      );

      return created;
    });

    return flightService.getById(flight.id)!;
  },

  createSeats: (flightId: number, totalSeats: number, businessRows?: number, seatsPerRow?: number): void => {
    const seats = generateSeats(flightId, totalSeats, businessRows, seatsPerRow);
    insertSeats(seats);
  },

  updateState(
    id: number,
    newState: FlightState,
    userId: number
  ): { success: boolean; error?: string; code?: ErrorCode } {
    const database = getDb();
    const flight = flightService.getById(id);
    if (!flight) {
      return serviceError(ErrorCodes.FLIGHT_NOT_FOUND, 'Flight not found');
    }

    const validTransitions: Record<FlightState, FlightState[]> = {
      created: ['staffed', 'cancelled'],
      staffed: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[flight.state].includes(newState)) {
      return serviceError(ErrorCodes.INVALID_STATE, `Invalid state transition from ${flight.state} to ${newState}`);
    }

    database.transaction(() => {
      database.run(`UPDATE flights SET state = ?, updated_at = datetime('now') WHERE id = ?`, [newState, id]);

      if (newState === 'completed') {
        database.run(
          `UPDATE reservations SET status = 'completed', updated_at = datetime('now')
           WHERE flight_id = ? AND status = 'confirmed'`,
          [id]
        );
        database.run(
          `UPDATE seats SET is_available = 0 WHERE flight_id = ? AND is_available = 1`,
          [id]
        );
      }

      if (newState === 'cancelled') {
        database.run(
          `UPDATE reservations SET status = 'cancelled', cancelled_at = datetime('now') WHERE flight_id = ? AND status = 'confirmed'`,
          [id]
        );
        database.run(
          `UPDATE seats SET is_available = 1 WHERE flight_id = ?`,
          [id]
        );
      }

      database.run(
        `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'FLIGHT_STATE_CHANGE', 'flight', ?)`,
        [userId, id]
      );
    });

    return { success: true };
  },

  delete: (id: number, userId: number): { success: boolean; error?: string; code?: ErrorCode } => {
    const database = getDb();
    const flight = flightService.getById(id);
    if (!flight) {
      return serviceError(ErrorCodes.FLIGHT_NOT_FOUND, 'Flight not found');
    }

    if (flight.state !== 'created') {
      return serviceError(ErrorCodes.FLIGHT_CANNOT_DELETE, 'Can only delete flights in created state');
    }

    database.transaction(() => {
      database.run(`DELETE FROM reservations WHERE flight_id = ?`, [id]);
      database.run(`DELETE FROM seats WHERE flight_id = ?`, [id]);
      database.run(`DELETE FROM flights WHERE id = ?`, [id]);
      database.run(
        `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'FLIGHT_DELETE', 'flight', ?)`,
        [userId, id]
      );
    });

    return { success: true };
  },

  getSeats: (flightId: number, classFilter?: string): Seat[] => {
    const database = getDb();
    const params: (string | number)[] = [flightId];
    let sql = `SELECT id, flight_id, seat_number, class, price, is_available FROM seats WHERE flight_id = ?`;
    if (classFilter) {
      sql += ` AND class = ?`;
      params.push(classFilter);
    }
    sql += ` ORDER BY seat_number`;
    const seats = database.all<DbSeat>(sql, params);

    return seats.map(s => ({
      id: s.id,
      flight_id: s.flight_id,
      seat_number: s.seat_number,
      class: s.class,
      price: s.price,
      is_available: s.is_available === 1
    }));
  },

  getSeat(flightId: number, seatNumber: string): Seat | null {
    const database = getDb();
    const seat = database.get<DbSeat>(
      `SELECT id, flight_id, seat_number, class, price, is_available FROM seats WHERE flight_id = ? AND seat_number = ?`,
      [flightId, seatNumber]
    );

    if (!seat) return null;

    return {
      id: seat.id,
      flight_id: seat.flight_id,
      seat_number: seat.seat_number,
      class: seat.class,
      price: seat.price,
      is_available: seat.is_available === 1
    };
  }
};