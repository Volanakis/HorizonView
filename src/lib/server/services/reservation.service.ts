import { getDb } from '../db/index.js';
import type { Reservation, ReservationWithDetails, TicketType } from '../../types.js';
import { type ErrorCode, ErrorCodes, serviceError } from '../errors.js';

interface DbReservation {
  id: number;
  user_id: number;
  flight_id: number;
  seat_id: number;
  ticket_type: TicketType;
  price: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FullReservation {
  id: number;
  user_id: number;
  flight_id: number;
  seat_id: number;
  ticket_type: TicketType;
  price: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  flight_number: string;
  departure: string;
  arrival: string;
  scheduled_time: string;
  seat_number: string;
}

export const reservationService = {
  getByUser(userId: number, page = 1, limit = 20): { reservations: ReservationWithDetails[]; total: number } {
    const database = getDb();
    const offset = (page - 1) * limit;

    const totalResult = database.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ?',
      [userId]
    );
    const total = totalResult?.count || 0;

    const reservations = database.all<FullReservation>(
      `SELECT r.*, f.flight_number, f.departure, f.arrival, f.scheduled_time, s.seat_number
       FROM reservations r
       JOIN flights f ON r.flight_id = f.id
       JOIN seats s ON r.seat_id = s.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return {
      reservations: reservations.map(r => ({
        id: r.id,
        user_id: r.user_id,
        flight_id: r.flight_id,
        seat_id: r.seat_id,
        ticket_type: r.ticket_type,
        price: r.price,
        status: r.status,
        cancelled_at: r.cancelled_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        flight_number: r.flight_number,
        departure: r.departure,
        arrival: r.arrival,
        scheduled_time: r.scheduled_time,
        seat_number: r.seat_number
      })),
      total
    };
  },

  create(data: {
    user_id: number;
    flight_id: number;
    seat_number?: string;
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
          throw serviceError(ErrorCodes.FLIGHT_NOT_FOUND, 'Flight not found');
        }

        if (!['created', 'staffed'].includes(flight.state)) {
          throw serviceError(ErrorCodes.FLIGHT_NOT_OPEN, 'Flight is not open for booking');
        }

        let seat: { id: number; price: number; is_available: number; class: string } | undefined;

        if (data.ticket_type === 'economy') {
          seat = database.get(
            `SELECT id, price, is_available, class FROM seats
             WHERE flight_id = ? AND class = 'economy' AND is_available = 1
             ORDER BY RANDOM() LIMIT 1`,
            [data.flight_id]
          ) ?? undefined;
          if (!seat) throw serviceError(ErrorCodes.NO_ECONOMY_SEATS, 'No economy seats available');
        } else {
          if (!data.seat_number) throw serviceError(ErrorCodes.SEAT_REQUIRED, 'Seat number required for business and normal tickets');
          seat = database.get(
            `SELECT id, price, is_available, class FROM seats
             WHERE flight_id = ? AND seat_number = ?`,
            [data.flight_id, data.seat_number]
          ) ?? undefined;
          if (!seat) throw serviceError(ErrorCodes.SEAT_NOT_FOUND, 'Seat not found');
          if (data.ticket_type === 'normal' && seat.class === 'business') {
            throw serviceError(ErrorCodes.SEAT_CLASS_MISMATCH, 'Normal tickets cannot be assigned to business-class seats');
          }
        }

        if (seat.is_available !== 1) throw serviceError(ErrorCodes.SEAT_TAKEN, 'Seat is already taken');

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
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        return error as { success: false; error: string; code: ErrorCode };
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      return serviceError(ErrorCodes.RESERVATION_FAILED, message);
    }

    if (!reservation) {
      return serviceError(ErrorCodes.RESERVATION_FAILED, 'Failed to create reservation');
    }

    return { success: true, reservation };
  },

  cancel(id: number, userId: number): { success: boolean; error?: string } {
    const database = getDb();

    try {
      database.transaction(() => {
        const reservation = database.get<{ id: number; user_id: number; seat_id: number; status: string }>(
          'SELECT * FROM reservations WHERE id = ?',
          [id]
        );

        if (!reservation) {
          throw serviceError(ErrorCodes.RESERVATION_NOT_FOUND, 'Reservation not found');
        }

        if (reservation.user_id !== userId) {
          throw serviceError(ErrorCodes.UNAUTHORIZED, 'Unauthorized');
        }

        if (reservation.status === 'cancelled') {
          throw serviceError(ErrorCodes.ALREADY_CANCELLED, 'Already cancelled');
        }

        database.run(`UPDATE reservations SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`, [id]);
        database.run('UPDATE seats SET is_available = 1 WHERE id = ?', [reservation.seat_id]);
        database.run(
          `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'RESERVATION_CANCEL', 'reservation', ?)`,
          [userId, id]
        );
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        return error as { success: false; error: string; code: ErrorCode };
      }
      throw error;
    }

    return { success: true };
  }
};