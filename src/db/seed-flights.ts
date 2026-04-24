import initSqlJs from 'sql.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const dbPath = (process.env.DATABASE_URL || './horizonview.db').replace(/^sqlite:\/\//, '');

const greekAirports = [
  { code: 'ATH', name: 'Athens' },
  { code: 'SKG', name: 'Thessaloniki' },
  { code: 'HER', name: 'Heraklion' },
  { code: 'RHO', name: 'Rhodes' },
  { code: 'JMK', name: 'Mykonos' },
  { code: 'JTR', name: 'Santorini' },
  { code: 'KVA', name: 'Kavala' },
  { code: 'CHQ', name: 'Chania' },
  { code: 'KGS', name: 'Kos' },
  { code: 'EFL', name: 'Kefalonia' }
];

const flightsWithinGreece = [
  { number: 'HV101', departure: 'ATH', arrival: 'SKG' },
  { number: 'HV102', departure: 'SKG', arrival: 'ATH' },
  { number: 'HV103', departure: 'ATH', arrival: 'HER' },
  { number: 'HV104', departure: 'HER', arrival: 'ATH' },
  { number: 'HV105', departure: 'ATH', arrival: 'RHO' },
  { number: 'HV106', departure: 'RHO', arrival: 'ATH' },
  { number: 'HV107', departure: 'ATH', arrival: 'JMK' },
  { number: 'HV108', departure: 'JMK', arrival: 'ATH' },
  { number: 'HV109', departure: 'ATH', arrival: 'JTR' },
  { number: 'HV110', departure: 'JTR', arrival: 'ATH' },
  { number: 'HV111', departure: 'SKG', arrival: 'HER' },
  { number: 'HV112', departure: 'HER', arrival: 'SKG' },
  { number: 'HV113', departure: 'SKG', arrival: 'KVA' },
  { number: 'HV114', departure: 'KVA', arrival: 'SKG' },
  { number: 'HV115', departure: 'ATH', arrival: 'CHQ' },
  { number: 'HV116', departure: 'CHQ', arrival: 'ATH' },
  { number: 'HV117', departure: 'ATH', arrival: 'KGS' },
  { number: 'HV118', departure: 'KGS', arrival: 'ATH' },
  { number: 'HV119', departure: 'ATH', arrival: 'EFL' },
  { number: 'HV120', departure: 'EFL', arrival: 'ATH' }
];

async function seedFlights() {
  console.log('Seeding flights within Greece...\n');

  const SQL = await initSqlJs();
  let db: any;

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    console.error('Database not found. Run npm run migrate first.');
    process.exit(1);
  }

  const managerStmt = db.prepare("SELECT id FROM users WHERE username = 'manager'");
  managerStmt.bind();
  let managerId = 0;
  if (managerStmt.step()) {
    managerId = managerStmt.getAsObject().id as number;
  }
  managerStmt.free();

  if (!managerId) {
    console.error('Manager user not found. Run npm run seed first.');
    process.exit(1);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  for (let i = 0; i < flightsWithinGreece.length; i++) {
    const flight = flightsWithinGreece[i];
    const scheduledDate = new Date(startDate);
    scheduledDate.setHours(6 + (i * 2), 0, 0, 0);

    try {
      db.run(
        `INSERT INTO flights (flight_number, departure, arrival, scheduled_time, total_seats, created_by, state) VALUES (?, ?, ?, ?, ?, ?, 'created')`,
        [flight.number, flight.departure, flight.arrival, scheduledDate.toISOString(), 180, managerId]
      );

      const flightStmt = db.prepare('SELECT id FROM flights WHERE flight_number = ?');
      flightStmt.bind([flight.number]);
      let flightId = 0;
      if (flightStmt.step()) {
        flightId = flightStmt.getAsObject().id as number;
      }
      flightStmt.free();

      if (!flightId) continue;

      const businessRows = 5;
      const normalRows = 10;
      const totalSeats = 180;

      let seatNum = 1;
      for (let row = 1; row <= Math.ceil(totalSeats / 30); row++) {
        for (let col = 1; col <= 30; col++) {
          if (seatNum > totalSeats) break;

          let classType: string;
          let price: number;

          if (row <= businessRows) {
            classType = 'business';
            price = 450;
          } else if (row <= businessRows + normalRows) {
            classType = 'normal';
            price = 250;
          } else {
            classType = 'economy';
            price = 150;
          }

          const seatNumber = `${row}${String.fromCharCode(64 + col)}`;
          db.run(
            `INSERT INTO seats (flight_id, seat_number, class, price, is_available) VALUES (?, ?, ?, ?, 1)`,
            [flightId, seatNumber, classType, price]
          );
          seatNum++;
        }
      }

      const depName = greekAirports.find(a => a.code === flight.departure)?.name;
      const arrName = greekAirports.find(a => a.code === flight.arrival)?.name;
      console.log(`✓ Created ${flight.number}: ${depName} → ${arrName}`);
    } catch (err: any) {
      if (err.message.includes('UNIQUE')) {
        console.log(`- ${flight.number} already exists (skipped)`);
      } else {
        console.error(`✗ Error creating ${flight.number}:`, err.message);
      }
    }
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log('\n✅ Done! 20 flights seeded within Greece.');
}

seedFlights().catch(console.error);