import { getDb } from './db/index.js';
import type { TicketType } from '../types.js';

export const SEAT_CONFIG = {
  BUSINESS_ROWS: 5,
  COLS: ['A', 'B', 'C', 'D', 'E', 'F'] as const
} as const;

export const PRICES: Record<TicketType, number> = {
  economy: 150,
  normal: 250,
  business: 450
};

export interface SeatDef {
  flight_id: number;
  seat_number: string;
  class: TicketType;
  price: number;
}

export function generateSeats(
  flightId: number,
  totalSeats: number,
  businessRows: number = SEAT_CONFIG.BUSINESS_ROWS,
  seatsPerRow: number = SEAT_CONFIG.COLS.length
): SeatDef[] {
  const seats: SeatDef[] = [];
  const totalRows = Math.ceil(totalSeats / seatsPerRow);
  const cols = Array.from({ length: seatsPerRow }, (_, i) => String.fromCharCode(65 + i));
  const remainingRows = totalRows - businessRows;
  const normalRows = Math.floor(remainingRows * 0.5);

  let seatCount = 0;
  for (let row = 1; row <= totalRows; row++) {
    for (const col of cols) {
      if (seatCount >= totalSeats) break;

      let classType: TicketType;
      if (row <= businessRows) {
        classType = 'business';
      } else if (row <= businessRows + normalRows) {
        classType = 'normal';
      } else {
        classType = 'economy';
      }

      seats.push({
        flight_id: flightId,
        seat_number: `${row}${col}`,
        class: classType,
        price: PRICES[classType]
      });
      seatCount++;
    }
  }

  return seats;
}

export function insertSeats(seats: SeatDef[]): void {
  if (seats.length === 0) return;
  const db = getDb();
  const placeholders = seats.map(() => '(?, ?, ?, ?, 1)').join(', ');
  const values = seats.flatMap(s => [s.flight_id, s.seat_number, s.class, s.price]);
  db.run(
    `INSERT INTO seats (flight_id, seat_number, class, price, is_available) VALUES ${placeholders}`,
    values
  );
}
