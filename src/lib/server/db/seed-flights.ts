// npm run seed:flights — adds 20 Greek domestic flights (A320, 180 seats) over the next 10 days.
// Uses the same seat layout as the main seed and the Create flight form.
import { getDb } from './index.js';
import { generateSeats, insertSeats } from '../seats.js';
import { iataToCity } from '../../airports.js';

const flightsWithinGreece = [
  { number: 'HV201', departure: 'ATH', arrival: 'SKG' },
  { number: 'HV202', departure: 'SKG', arrival: 'ATH' },
  { number: 'HV203', departure: 'ATH', arrival: 'HER' },
  { number: 'HV204', departure: 'HER', arrival: 'ATH' },
  { number: 'HV205', departure: 'ATH', arrival: 'RHO' },
  { number: 'HV206', departure: 'RHO', arrival: 'ATH' },
  { number: 'HV207', departure: 'ATH', arrival: 'JMK' },
  { number: 'HV208', departure: 'JMK', arrival: 'ATH' },
  { number: 'HV209', departure: 'ATH', arrival: 'JTR' },
  { number: 'HV210', departure: 'JTR', arrival: 'ATH' },
  { number: 'HV211', departure: 'SKG', arrival: 'HER' },
  { number: 'HV212', departure: 'HER', arrival: 'SKG' },
  { number: 'HV213', departure: 'SKG', arrival: 'KVA' },
  { number: 'HV214', departure: 'KVA', arrival: 'SKG' },
  { number: 'HV215', departure: 'ATH', arrival: 'CHQ' },
  { number: 'HV216', departure: 'CHQ', arrival: 'ATH' },
  { number: 'HV217', departure: 'ATH', arrival: 'KGS' },
  { number: 'HV218', departure: 'KGS', arrival: 'ATH' },
  { number: 'HV219', departure: 'ATH', arrival: 'EFL' },
  { number: 'HV220', departure: 'EFL', arrival: 'ATH' }
];

const TOTAL_SEATS = 180;
const SEATS_PER_ROW = 6;
const BUSINESS_ROWS = 5;

function seedFlights() {
  console.log('Seeding flights within Greece...\n');
  const db = getDb();

  const manager = db.get<{ id: number }>("SELECT id FROM users WHERE username = 'manager'");
  if (!manager) {
    console.error('Manager user not found. Run npm run seed first.');
    process.exit(1);
  }

  let created = 0;
  flightsWithinGreece.forEach((flight, i) => {
    // Two flights a day, starting tomorrow, at 07:00 and 15:00 UTC.
    const when = new Date();
    when.setUTCDate(when.getUTCDate() + 1 + Math.floor(i / 2));
    when.setUTCHours(i % 2 ? 15 : 7, 0, 0, 0);

    try {
      db.transaction(() => {
        const { lastInsertRowid } = db.run(
          `INSERT INTO flights (flight_number, departure, arrival, scheduled_time, total_seats, created_by, state, airplane, num_rows, seats_per_row, business_rows)
           VALUES (?, ?, ?, ?, ?, ?, 'created', 'Airbus A320', ?, ?, ?)`,
          [flight.number, flight.departure, flight.arrival, when.toISOString(), TOTAL_SEATS, manager.id,
           TOTAL_SEATS / SEATS_PER_ROW, SEATS_PER_ROW, BUSINESS_ROWS]
        );
        insertSeats(generateSeats(Number(lastInsertRowid), TOTAL_SEATS, BUSINESS_ROWS, SEATS_PER_ROW));
      });
      created++;
      console.log(`✓ Created ${flight.number}: ${iataToCity(flight.departure)} → ${iataToCity(flight.arrival)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(message.includes('UNIQUE') ? `- ${flight.number} already exists (skipped)` : `✗ ${flight.number}: ${message}`);
    }
  });

  db.close();
  console.log(`\n✅ Done! ${created} flights seeded within Greece.`);
}

seedFlights();
