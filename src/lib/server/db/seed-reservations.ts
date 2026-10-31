import { getDb } from './index.js';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function seedReservations(): void {
  const db = getDb();

  // ── Check existing ──────────────────────────────────────────
  const existing = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM reservations');
  if (existing!.cnt > 0) {
    console.log(`Reservations already exist (${existing!.cnt}). Skipping.`);
    return;
  }

  // ── Get customers and managers (all can hold bookings) ────────
  const bookers = db.all<{ id: number }>(
    "SELECT id FROM users WHERE role IN ('customer', 'manager', 'admin')"
  );
  if (bookers.length === 0) {
    console.log('No bookable users found. Run seed users first.');
    return;
  }
  console.log(`  Bookable users: ${bookers.length}`);

  // ── Get flights open for booking (created or staffed) ────────
  const openFlights = db.all<{ id: number; flight_number: string; total_seats: number; state: string }>(
    "SELECT id, flight_number, total_seats, state FROM flights WHERE state IN ('created', 'staffed') ORDER BY id"
  );
  console.log(`  Flights open for booking: ${openFlights.length}`);

  if (openFlights.length === 0) {
    console.log('No flights available for booking.');
    return;
  }

  // ── Compute reservation targets ──────────────────────────────
  interface FlightTarget {
    flightId: number;
    flightNumber: string;
    state: string;
    targetCount: number;  // how many reservations to make
  }

  const targets: FlightTarget[] = [];

  for (const f of openFlights) {
    // Staffed flights: only a couple bookings (they're about to depart)
    // Created flights: 5-30 bookings depending on total seats
    const maxBookings = Math.min(f.total_seats, f.state === 'staffed' ? randomInt(1, 5) : randomInt(5, 30));
    const target = randomInt(1, maxBookings);
    targets.push({
      flightId: f.id,
      flightNumber: f.flight_number,
      state: f.state,
      targetCount: target
    });
  }

  const totalTarget = targets.reduce((sum, t) => sum + t.targetCount, 0);
  console.log(`  Target reservations: ${totalTarget}`);

  // ── Create reservations ──────────────────────────────────────
  const classes = ['economy', 'normal', 'business'] as const;
  const classWeights = [0.50, 0.30, 0.20];  // 50% economy, 30% normal, 20% business

  let created = 0;
  const batchSize = 100;

  for (let batchStart = 0; batchStart < targets.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, targets.length);
    const batchTargets = targets.slice(batchStart, batchEnd);

    db.transaction(() => {
      for (const t of batchTargets) {
        let made = 0;
        let attempts = 0;
        const maxAttempts = t.targetCount * 3;  // avoid infinite loops

        while (made < t.targetCount && attempts < maxAttempts) {
          attempts++;

          // Pick ticket type based on weights
          const roll = Math.random();
          let ticketType: 'economy' | 'normal' | 'business';
          if (roll < classWeights[0]) ticketType = 'economy';
          else if (roll < classWeights[0] + classWeights[1]) ticketType = 'normal';
          else ticketType = 'business';

          // For economy, pick any available economy seat (auto-assign)
          // For normal/business, pick a specific available seat of that class
          let seat: { id: number; price: number; class: string } | undefined;

          if (ticketType === 'economy') {
            seat = db.get<{ id: number; price: number; class: string }>(
              `SELECT id, price, class FROM seats
               WHERE flight_id = ? AND class = 'economy' AND is_available = 1
               ORDER BY RANDOM() LIMIT 1`,
              [t.flightId]
            );
          } else {
            seat = db.get<{ id: number; price: number; class: string }>(
              `SELECT id, price, class FROM seats
               WHERE flight_id = ? AND class = ? AND is_available = 1
               ORDER BY RANDOM() LIMIT 1`,
              [t.flightId, ticketType]
            );
          }

  if (!seat) break;

  // Pick a random user
          const user = bookers[randomInt(0, bookers.length - 1)];

          // Mark seat taken
          db.run('UPDATE seats SET is_available = 0 WHERE id = ?', [seat.id]);

          // Insert reservation
          const result = db.run(
            `INSERT INTO reservations (user_id, flight_id, seat_id, ticket_type, price, status)
             VALUES (?, ?, ?, ?, ?, 'confirmed')`,
            [user.id, t.flightId, seat.id, ticketType, seat.price]
          );

          // Audit log
          db.run(
            `INSERT INTO audit_log (user_id, action, entity, entity_id)
             VALUES (?, 'RESERVATION_CREATE', 'reservation', ?)`,
            [user.id, Number(result.lastInsertRowid)]
          );

          made++;
          created++;
        }

      }
    });

    // Progress report
    const pct = Math.round((created / totalTarget) * 100);
    process.stdout.write(`\r  ✓ ${created}/${totalTarget} reservations (${pct}%)`);
  }

  console.log(`\n  ✅ ${created} reservations created`);

  // ── Summary ──────────────────────────────────────────────────
  const final = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM reservations');
  const takenSeats = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM seats WHERE is_available = 0');

  console.log('\n──────────────────────────────────────');
  console.log('  Reservation seed complete!');
  console.log(`  Reservations: ${final!.cnt}`);
  console.log(`  Seats taken:  ${takenSeats!.cnt}`);
  console.log('──────────────────────────────────────');

  // Show a few sample reservations
  const samples = db.all<{ id: number; user_id: number; flight_number: string; ticket_type: string; status: string; seat_number: string }>(
    `SELECT r.id, r.user_id, f.flight_number, r.ticket_type, r.status, s.seat_number
     FROM reservations r
     JOIN flights f ON r.flight_id = f.id
     JOIN seats s ON r.seat_id = s.id
     ORDER BY RANDOM() LIMIT 5`
  );
  console.log('\n  Sample reservations:');
  for (const s of samples) {
    console.log(`    #${s.id} | user ${s.user_id} | ${s.flight_number} | ${s.seat_number} | ${s.ticket_type} | ${s.status}`);
  }
}
