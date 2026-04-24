import { getDb } from '../db/index.js';
import { Reservation, ReservationWithDetails, TicketType } from '../types/index.js';

interface DbReservation {
  id: number;
  user_id: number;
  flight_id: number;
  seat_id: number;
  ticket_type: TicketType;
  price: number;
  status: 'confirmed' | 'cancelled';
  cancelled_at: string | null;
  created_at: string;
}

interface FullReservation {
  id: number;
  user_id: number;
  flight_id: number;
  seat_id: number;
  ticket_type: TicketType;
  price: number;
  status: 'confirmed' | 'cancelled';
  cancelled_at: string | null;
  created_at: string;
  flight_number: string;
  departure: string;
  arrival: string;
  scheduled_time: string;
  seat_number: string;
}

export const reservationService = {
  getByUser(userId: number): ReservationWithDetails[] {
    const database = getDb();
    const reservations = database.all<FullReservation>(
      `SELECT r.*, f.flight_number, f.departure, f.arrival, f.scheduled_time, s.seat_number
       FROM reservations r
       JOIN flights f ON r.flight_id = f.id
       JOIN seats s ON r.seat_id = s.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return reservations.map(r => ({
      id: r.id,
      user_id: r.user_id,
      flight_id: r.flight_id,
      seat_id: r.seat_id,
      ticket_type: r.ticket_type,
      price: r.price,
      status: r.status,
      cancelled_at: r.cancelled_at,
      created_at: r.created_at,
      flight_number: r.flight_number,
      departure: r.departure,
      arrival: r.arrival,
      scheduled_time: r.scheduled_time,
      seat_number: r.seat_number
    }));
  },

  create(data: {
    user_id: number;
    flight_id: number;
    seat_number: string;
    ticket_type: TicketType;
  }): { success: boolean; reservation?: Reservation; error?: string } {
    const database = getDb();

    let reservation: DbReservation | undefined;

    try {
      database.transaction(() => {
        const flight = database.get<{ id: number; state: string; total_seats: number }>(
          'SELECT * FROM flights WHERE id = ?',
          [data.flight_id]
        );

        if (!flight) {
          throw new Error('Flight not found');
        }

        if (flight.state !== 'created') {
          throw new Error('Flight is not available for booking');
        }

        const seat = database.get<{ id: number; price: number; is_available: number }>(
          'SELECT * FROM seats WHERE flight_id = ? AND seat_number = ?',
          [data.flight_id, data.seat_number]
        );

        if (!seat) {
          throw new Error('Seat not found');
        }

        if (seat.is_available !== 1) {
          throw new Error('Seat is already taken');
        }

        database.run('UPDATE seats SET is_available = 0 WHERE id = ?', [seat.id]);

        database.run(
          `INSERT INTO reservations (user_id, flight_id, seat_id, ticket_type, price, status) VALUES (?, ?, ?, ?, ?, 'confirmed')`,
          [data.user_id, data.flight_id, seat.id, data.ticket_type, seat.price]
        );

        reservation = database.get<DbReservation>(
          'SELECT * FROM reservations WHERE seat_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1',
          [seat.id, data.user_id]
        );

        if (!reservation) {
          throw new Error('Failed to create reservation');
        }

        database.run(
          `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'RESERVATION_CREATE', 'reservation', ?)`,
          [data.user_id, reservation.id]
        );
      });

      database.save();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }

    if (!reservation) {
      return { success: false, error: 'Failed to create reservation' };
    }

    return { success: true, reservation };
  },

  cancel(id: number, userId: number): { success: boolean; error?: string } {
    const database = getDb();

    let seatId: number | null = null;

    try {
      database.transaction(() => {
        const reservation = database.get<{ id: number; user_id: number; seat_id: number; status: string }>(
          'SELECT * FROM reservations WHERE id = ?',
          [id]
        );

        if (!reservation) {
          throw new Error('Reservation not found');
        }

        if (reservation.user_id !== userId) {
          throw new Error('Unauthorized');
        }

        if (reservation.status === 'cancelled') {
          throw new Error('Already cancelled');
        }

        seatId = reservation.seat_id;
        database.run(`UPDATE reservations SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`, [id]);
        database.run('UPDATE seats SET is_available = 1 WHERE id = ?', [reservation.seat_id]);
        database.run(
          `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'RESERVATION_CANCEL', 'reservation', ?)`,
          [userId, id]
        );
      });
      database.save();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Reservation not found' || message === 'Unauthorized' || message === 'Already cancelled') {
        return { success: false, error: message };
      }
      throw error;
    }

    return { success: true };
  }
};