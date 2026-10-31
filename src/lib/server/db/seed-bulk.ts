import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { getDb } from './index.js';
import { generateSeats, insertSeats } from '../seats.js';

const GREEK_FIRST_NAMES = [
  'Georgios', 'Maria', 'Dimitrios', 'Eleni', 'Ioannis', 'Sophia', 'Nikolaos', 'Anna',
  'Panagiotis', 'Vasiliki', 'Konstantinos', 'Eirini', 'Athanasios', 'Dimitra', 'Christos',
  'Paraskevi', 'Evangelos', 'Katerina', 'Michail', 'Olympia', 'Petros', 'Stavroula',
  'Alexandros', 'Aikaterini', 'Stefanos', 'Angeliki', 'Spyridon', 'Efthymia', 'Vassilis',
  'Chrysoula', 'Theodoros', 'Fotini', 'Antonios', 'Ourania', 'Kyriakos', 'Despoina',
  'Emmanouil', 'Styliani', 'Thomas', 'Evdokia', 'Apostolos', 'Alkistis', 'Loukas',
  'Theodora', 'Ilias', 'Nafsika', 'Filippos', 'Kalomoira', 'Stamatis', 'Roula'
];

const GREEK_LAST_NAMES = [
  'Papadopoulos', 'Papadopoulou', 'Georgiou', 'Georgiadis', 'Nikolaidis',
  'Nikolaou', 'Dimitriou', 'Dimitriadis', 'Athanasiadis', 'Konstantinidis',
  'Konstantinou', 'Paraschou', 'Evangelou', 'Apostolou', 'Christodoulou',
  'Antoniou', 'Stefanou', 'Spyridakis', 'Mavromatis', 'Vlachos',
  'Karagiannis', 'Mitsotakis', 'Samaras', 'Kostas', 'Makris',
  'Papageorgiou', 'Papadaki', 'Kourtis', 'Kouros', 'Rousopoulos',
  'Alexandris', 'Ioannou', 'Savvidis', 'Michailidis', 'Panagiotou',
  'Vassiliadis', 'Pappas', 'Lambrou', 'Kyriakides', 'Anagnostou'
];

const AIRPORTS = ['ATH', 'SKG', 'HER', 'RHO', 'JMK', 'JTR', 'KVA', 'CHQ', 'KGS', 'EFL', 'CFU', 'ZTH', 'MJT', 'SMI'];
const AIRPLANES = [
  'Airbus A320', 'Airbus A321', 'Airbus A319', 'Boeing 737-800', 'Boeing 737-700',
  'Boeing 737-900', 'Airbus A330', 'Bombardier CRJ900', 'Embraer E195', 'ATR 72-600',
  'Airbus A220', 'Embraer E190'
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatVat(index: number): string {
  return `EL${String(index).padStart(9, '0')}`;
}

function formatIdentity(index: number): string {
  return `AT${String(index).padStart(6, '0')}`;
}

function formatEmployeeCode(index: number): string {
  return `EMP${String(index).padStart(4, '0')}`;
}

function formatFlightNumber(index: number): string {
  return `HV-${500 + index}`;
}

function dtString(date: Date): string {
  return date.toISOString();
}

async function seedBulk(): Promise<void> {
  const db = getDb();

  // ── Check existing data ──────────────────────────────────────
  const existingUsers = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users');
  const existingFlights = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM flights');
  const startUserIdx = Math.max(6, (existingUsers?.cnt ?? 0) + 1);
  const startFlightIdx = Math.max(131, (existingFlights?.cnt ?? 0) + 1);

  console.log(`Existing: ${existingUsers?.cnt ?? 0} users, ${existingFlights?.cnt ?? 0} flights`);

  // ── Create 200 users ─────────────────────────────────────────
  const TOTAL_USERS = 200;
  const usersToCreate = TOTAL_USERS - (existingUsers?.cnt ?? 0);

  if (usersToCreate > 0) {
    console.log(`\nCreating ${usersToCreate} users…\n`);

    const batchSize = 50;
    let created = 0;

    // Pre-compute the single password hash for all users
    const password = 'Test1234!';
    const hash = await bcrypt.hash(password, 12);

    for (let batchStart = 0; batchStart < usersToCreate; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, usersToCreate);
      const userRows: { username: string; hash: string; name: string; email: string; role: string; vatNumber: string; identityNumber: string; address: string | null; employeeCode: string | null }[] = [];

      // Build user data outside transaction
      for (let i = batchStart; i < batchEnd; i++) {
        const idx = startUserIdx + i;
        const firstName = pick(GREEK_FIRST_NAMES);
        const lastName = pick(GREEK_LAST_NAMES);
        const username = `user${idx}`;

        let role = 'customer';
        if (idx <= 2) role = 'admin';
        else if (idx <= 5) role = 'manager';
        else if (idx <= 10) role = 'visitor';

        const name = `${firstName} ${lastName}`;
        const email = `${username}@example.com`;
        const identityNumber = formatIdentity(idx);
        const vatNumber = formatVat(idx);
        const address = idx % 3 === 0 ? null : `${randomInt(1, 200)} ${pick(['Ermou', 'Stadiou', 'Panepistimiou', 'Akadimias', 'Syngrou', 'Patision', 'Solonos', 'Vouliagmenis', 'Kifisias', 'Posidonos'])} str., ${pick(['Athens', 'Thessaloniki', 'Heraklion', 'Patras', 'Larisa'])}, Greece`;
        const employeeCode = role === 'admin' || role === 'manager' ? formatEmployeeCode(idx) : null;

        userRows.push({ username, hash, name, email, role, vatNumber, identityNumber, address, employeeCode });
      }

      // Insert batch in a sync transaction
      db.transaction(() => {
        for (const row of userRows) {
          try {
            db.run(
              `INSERT INTO users (username, password, name, email, role, vat_number, identity_number, is_active, address, employee_code)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
              [row.username, row.hash, row.name, row.email, row.role, row.vatNumber, row.identityNumber, row.address, row.employeeCode]
            );
            created++;
          } catch (_err: any) {
            // UNIQUE violations skipped silently
          }
        }
      });

      if (created % 20 === 0 || created >= usersToCreate) {
        process.stdout.write(`\r  ✓ ${created}/${usersToCreate} users`);
      }
    }
    console.log(`\n  ✅ ${created} users created`);
  } else {
    console.log('\n  Skipping user creation (200+ already exist)');
  }

  // ── Get manager ID ───────────────────────────────────────────
  const managerRow = db.get<{ id: number }>("SELECT id FROM users WHERE role = 'manager' LIMIT 1");
  const managerId = managerRow?.id ?? 1;

  // ── Create 500 flights ───────────────────────────────────────
  const TOTAL_FLIGHTS = 500;
  const flightsToCreate = TOTAL_FLIGHTS - (existingFlights?.cnt ?? 0);

  if (flightsToCreate > 0) {
    console.log(`\nCreating ${flightsToCreate} flights…\n`);

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    baseDate.setUTCHours(0, 0, 0, 0);

    const flightBatchSize = 25;
    let createdFlights = 0;

    for (let batchStart = 0; batchStart < flightsToCreate; batchStart += flightBatchSize) {
      const batchEnd = Math.min(batchStart + flightBatchSize, flightsToCreate);

      db.transaction(() => {
        for (let i = batchStart; i < batchEnd; i++) {
          const idx = startFlightIdx + i;
          const fn = formatFlightNumber(idx);

          const dep = pick(AIRPORTS);
          let arr = pick(AIRPORTS);
          while (arr === dep) arr = pick(AIRPORTS);

          // Spread flights across 90 days
          const dayOffset = Math.floor((i / flightsToCreate) * 90);
          const hour = randomInt(6, 21);
          const minute = pick([0, 15, 30, 45]);

          const scheduled = new Date(baseDate);
          scheduled.setUTCDate(scheduled.getUTCDate() + dayOffset);
          scheduled.setUTCHours(hour, minute, 0, 0);

          // State distribution: ~70% created, ~12% staffed, ~10% completed, ~8% cancelled
          const stateRoll = Math.random();
          let state: string;
          if (stateRoll < 0.10) state = 'completed';
          else if (stateRoll < 0.22) state = 'staffed';
          else if (stateRoll < 0.30) state = 'cancelled';
          else state = 'created';

          const airplane = pick(AIRPLANES);
          const seatsPerRow = 6;
          const businessRows = randomInt(3, 6);
          const totalRows = randomInt(15, 30);
          const totalSeats = totalRows * seatsPerRow;

          try {
            db.run(
              `INSERT INTO flights (flight_number, departure, arrival, scheduled_time, state, total_seats, created_by, airplane, num_rows, seats_per_row, business_rows)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [fn, dep, arr, dtString(scheduled), state, totalSeats, managerId, airplane, totalRows, seatsPerRow, businessRows]
            );

            const flightRow = db.get<{ id: number }>('SELECT id FROM flights WHERE flight_number = ?', [fn]);
            if (flightRow) {
              const seats = generateSeats(flightRow.id, totalSeats, businessRows, seatsPerRow);
              insertSeats(seats);

              // If completed, mark all seats as unavailable
              if (state === 'completed') {
                db.run('UPDATE seats SET is_available = 0 WHERE flight_id = ?', [flightRow.id]);
              }
            }

            createdFlights++;
            if (createdFlights % 50 === 0 || createdFlights === flightsToCreate) {
              process.stdout.write(`\r  ✓ ${createdFlights}/${flightsToCreate} flights`);
            }
          } catch (err: any) {
            if (err.message?.includes('UNIQUE')) {
              // skip
            } else {
              console.error(`\n  ✗ ${fn}: ${err.message}`);
            }
          }
        }
      });

      console.log(` (batch ${Math.ceil(batchEnd / flightBatchSize)}/${Math.ceil(flightsToCreate / flightBatchSize)})`);
    }
    console.log(`\n  ✅ ${createdFlights} flights created`);
  } else {
    console.log('\n  Skipping flight creation (500+ already exist)');
  }

  // ── Summary ──────────────────────────────────────────────────
  const finalUsers = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users');
  const finalFlights = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM flights');
  const finalSeats = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM seats');

  console.log('\n──────────────────────────────────────');
  console.log('  Bulk seed complete!');
  console.log(`  Users:   ${finalUsers?.cnt ?? 0}`);
  console.log(`  Flights: ${finalFlights?.cnt ?? 0}`);
  console.log(`  Seats:   ${finalSeats?.cnt ?? 0}`);
  console.log('──────────────────────────────────────');
  console.log('\n  Test account (all users):');
  console.log('    username: user6..user200');
  console.log('    password: Test1234!');
  console.log('  (First 5 users from original seed:');
  console.log('    admin / Admin123!');
  console.log('    manager / Manager123!');
  console.log('    customer / Customer123!');
  console.log('    visitor / Visitor123!');
  console.log('    admin     / Admin123!');
}

seedBulk().catch(err => {
  console.error('\n❌ Seed error:', err);
  process.exit(1);
});
