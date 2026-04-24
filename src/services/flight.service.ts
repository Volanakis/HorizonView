import { getDb } from '../db/index.js';
import { Flight, FlightState, Seat, TicketType } from '../types/index.js';

const PRICES: Record<TicketType, number> = {
  economy: 150,
  normal: 250,
  business: 450
};

interface DbFlight {
  id: number;
  flight_number: string;
  departure: string;
  arrival: string;
  scheduled_time: string;
  state: FlightState;
  total_seats: number;
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
    available_seats: f.available_seats !== undefined ? Number(f.available_seats) : undefined,
    created_by: f.created_by,
    created_at: f.created_at,
    updated_at: f.updated_at
  };
}

export const flightService = {
  getAll(filters: {
    from?: string;
    to?: string;
    date?: string;
    states?: FlightState[];  // undefined = all states; array = restrict to listed states
    page?: number;
    limit?: number;
  }): { flights: Flight[]; total: number } {
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

  getById(id: number): Flight | null {
    const database = getDb();
    const flight = database.get<DbFlight & { available_seats: number }>(
      `SELECT *, ${AVAILABLE_SEATS_SQL} FROM flights WHERE id = ?`, [id]
    );
    if (!flight) return null;
    return mapFlight(flight);
  },

  create(data: {
    flight_number: string;
    departure: string;
    arrival: string;
    scheduled_time: string;
    total_seats: number;
    created_by: number;
  }): Flight {
    const database = getDb();

    // Flight insert + seat generation + audit log are all one atomic unit.
    const flight = database.transaction(() => {
      database.run(
        `INSERT INTO flights (flight_number, departure, arrival, scheduled_time, total_seats, created_by, state) VALUES (?, ?, ?, ?, ?, ?, 'created')`,
        [data.flight_number.toUpperCase(), data.departure.toUpperCase(), data.arrival.toUpperCase(), data.scheduled_time, data.total_seats, data.created_by]
      );

      const created = database.get<DbFlight>('SELECT * FROM flights WHERE flight_number = ?', [data.flight_number.toUpperCase()]);
      if (!created) throw new Error('Failed to create flight');

      this.createSeats(created.id, data.total_seats);

      database.run(
        `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'FLIGHT_CREATE', 'flight', ?)`,
        [data.created_by, created.id]
      );

      return created;
    });

    database.save();
    return this.getById(flight.id)!;
  },

  createSeats(flightId: number, totalSeats: number): void {
    const database = getDb();
    const seats: { flight_id: number; seat_number: string; class: TicketType; price: number }[] = [];

    const businessRows = 5;
    const normalRows = 10;

    let seatNum = 1;
    for (let row = 1; row <= Math.ceil(totalSeats / 30); row++) {
      for (let col = 1; col <= 30; col++) {
        if (seatNum > totalSeats) break;

        let classType: TicketType;
        let price: number;

        if (row <= businessRows) {
          classType = 'business';
          price = PRICES.business;
        } else if (row <= businessRows + normalRows) {
          classType = 'normal';
          price = PRICES.normal;
        } else {
          classType = 'economy';
          price = PRICES.economy;
        }

        seats.push({
          flight_id: flightId,
          seat_number: `${row}${String.fromCharCode(64 + col)}`,
          class: classType,
          price
        });

        seatNum++;
      }
    }

    if (seats.length === 0) return;

    const placeholders = seats.map(() => '(?, ?, ?, ?, 1)').join(', ');
    const values = seats.flatMap(s => [s.flight_id, s.seat_number, s.class, s.price]);

    database.run(
      `INSERT INTO seats (flight_id, seat_number, class, price, is_available) VALUES ${placeholders}`,
      values
    );
  },

  updateState(
    id: number,
    newState: FlightState,
    userId: number
  ): { success: boolean; error?: string } {
    const database = getDb();
    const flight = this.getById(id);
    if (!flight) {
      return { success: false, error: 'Flight not found' };
    }

    const validTransitions: Record<FlightState, FlightState[]> = {
      created: ['staffed', 'cancelled'],
      staffed: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[flight.state].includes(newState)) {
      return {
        success: false,
        error: `Invalid state transition from ${flight.state} to ${newState}`
      };
    }

    database.run(`UPDATE flights SET state = ?, updated_at = datetime('now') WHERE id = ?`, [newState, id]);
    database.run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'FLIGHT_STATE_CHANGE', 'flight', ?)`,
      [userId, id]
    );
    database.save();

    return { success: true };
  },

  delete(id: number, userId: number): { success: boolean; error?: string } {
    const database = getDb();
    const flight = this.getById(id);
    if (!flight) {
      return { success: false, error: 'Flight not found' };
    }

    if (flight.state !== 'created') {
      return { success: false, error: 'Can only delete flights in created state' };
    }

    database.run(`DELETE FROM seats WHERE flight_id = ?`, [id]);
    database.run(`DELETE FROM flights WHERE id = ?`, [id]);
    database.run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'FLIGHT_DELETE', 'flight', ?)`,
      [userId, id]
    );
    database.save();

    return { success: true };
  },

  getSeats(flightId: number): Seat[] {
    const database = getDb();
    const seats = database.all<DbSeat>(
      `SELECT id, flight_id, seat_number, class, price, is_available FROM seats WHERE flight_id = ? ORDER BY seat_number`,
      [flightId]
    );

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