import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { getDb } from './index.js';
import { generateSeats, insertSeats } from '../seats.js';
import { seedReservations } from './seed-reservations.js';

const users = [
  { username: 'admin',    password: 'Admin123!',    name: 'Admin User',     email: 'admin@horizonview.com',    role: 'admin',    identity_number: 'AT000001', address: null,     employee_code: 'EMP001' },
  { username: 'manager',  password: 'Manager123!',  name: 'Flight Manager', email: 'manager@horizonview.com',  role: 'manager',  identity_number: 'AT000002', address: null,     employee_code: 'EMP002' },
  { username: 'customer', password: 'Customer123!', name: 'John Customer',  email: 'customer@horizonview.com', role: 'customer', identity_number: 'AT000003', address: 'Athens, Greece', employee_code: null },
  { username: 'visitor',  password: 'Visitor123!',  name: 'Visitor User',   email: 'visitor@horizonview.com',  role: 'visitor',  identity_number: 'AT000004', address: null,     employee_code: null },
  { username: 'admin2', password: 'Admin123!', name: 'Admin User', email: 'admin2@horizonview.com', role: 'admin', identity_number: 'AT000005', address: null, employee_code: 'EMP003' },
];

// Dates are relative to the day the seed runs: a few completed flights in the
// past days, crew-assigned ones next week, and bookable ones 1–5 weeks out.
const base = new Date();
base.setUTCHours(0, 0, 0, 0);
base.setUTCDate(base.getUTCDate() - 3);
function dt(dayOffset: number, hour: number, min = 0): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, min, 0, 0);
  return d.toISOString();
}

const SPR = 6;
const BR = 5;
const flights = [
  { fn: 'HV-101', dep: 'ATH', arr: 'SKG', time: dt(0,  6, 30), seats: 180, state: 'completed' },
  { fn: 'HV-102', dep: 'SKG', arr: 'ATH', time: dt(0, 10,  0), seats: 180, state: 'completed' },
  { fn: 'HV-103', dep: 'ATH', arr: 'HER', time: dt(1,  7,  0), seats: 150, state: 'completed' },
  { fn: 'HV-104', dep: 'HER', arr: 'ATH', time: dt(1, 11, 45), seats: 150, state: 'completed' },
  { fn: 'HV-105', dep: 'ATH', arr: 'RHO', time: dt(2,  8, 15), seats: 120, state: 'completed' },
  { fn: 'HV-106', dep: 'RHO', arr: 'ATH', time: dt(7,  9,  0), seats: 120, state: 'staffed'   },
  { fn: 'HV-107', dep: 'ATH', arr: 'CFU', time: dt(7, 13, 30), seats: 100, state: 'staffed'   },
  { fn: 'HV-108', dep: 'CFU', arr: 'ATH', time: dt(8,  7, 45), seats: 100, state: 'staffed'   },
  { fn: 'HV-109', dep: 'ATH', arr: 'ZTH', time: dt(8, 11,  0), seats:  90, state: 'staffed'   },
  { fn: 'HV-110', dep: 'ZTH', arr: 'ATH', time: dt(9, 15, 20), seats:  90, state: 'staffed'   },
  { fn: 'HV-111', dep: 'ATH', arr: 'KGS', time: dt(14,  6,  0), seats: 120, state: 'created'  },
  { fn: 'HV-112', dep: 'KGS', arr: 'ATH', time: dt(14, 12, 30), seats: 120, state: 'created'  },
  { fn: 'HV-113', dep: 'ATH', arr: 'EFL', time: dt(15,  8, 45), seats:  80, state: 'created'  },
  { fn: 'HV-114', dep: 'EFL', arr: 'ATH', time: dt(15, 14,  0), seats:  80, state: 'created'  },
  { fn: 'HV-115', dep: 'SKG', arr: 'HER', time: dt(16,  7, 30), seats: 100, state: 'created'  },
  { fn: 'HV-116', dep: 'HER', arr: 'SKG', time: dt(16, 13, 15), seats: 100, state: 'created'  },
  { fn: 'HV-117', dep: 'ATH', arr: 'MJT', time: dt(17,  9,  0), seats:  72, state: 'created'  },
  { fn: 'HV-118', dep: 'MJT', arr: 'ATH', time: dt(17, 15, 45), seats:  72, state: 'created'  },
  { fn: 'HV-119', dep: 'ATH', arr: 'CHQ', time: dt(18,  6, 30), seats: 150, state: 'created'  },
  { fn: 'HV-120', dep: 'CHQ', arr: 'ATH', time: dt(18, 12,  0), seats: 150, state: 'created'  },
  { fn: 'HV-121', dep: 'ATH', arr: 'SMI', time: dt(21,  8,  0), seats:  72, state: 'created'  },
  { fn: 'HV-122', dep: 'SMI', arr: 'ATH', time: dt(21, 14, 30), seats:  72, state: 'created'  },
  { fn: 'HV-123', dep: 'ATH', arr: 'JMK', time: dt(22,  7, 15), seats:  60, state: 'created'  },
  { fn: 'HV-124', dep: 'JMK', arr: 'ATH', time: dt(22, 11, 45), seats:  60, state: 'created'  },
  { fn: 'HV-125', dep: 'SKG', arr: 'RHO', time: dt(23,  9, 30), seats: 120, state: 'created'  },
  { fn: 'HV-126', dep: 'RHO', arr: 'SKG', time: dt(28, 10,  0), seats: 120, state: 'created'  },
  { fn: 'HV-127', dep: 'HER', arr: 'RHO', time: dt(29,  8, 45), seats:  90, state: 'created'  },
  { fn: 'HV-128', dep: 'RHO', arr: 'HER', time: dt(29, 14, 15), seats:  90, state: 'created'  },
  { fn: 'HV-129', dep: 'ATH', arr: 'KGS', time: dt(35,  7,  0), seats: 120, state: 'created'  },
  { fn: 'HV-130', dep: 'KGS', arr: 'CHQ', time: dt(35, 13, 30), seats: 100, state: 'created'  },
].map(f => ({
  ...f,
  airplane: 'Boeing 737',
  seats_per_row: SPR,
  business_rows: BR,
  num_rows: Math.ceil(f.seats / SPR)
}));

export async function seed(): Promise<void> {
  const db = getDb();

  // ── Users ──────────────────────────────────────────────────
  console.log('Seeding users…\n');
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 12);
    try {
      db.run(
        `INSERT INTO users (username, password, name, email, role, identity_number, is_active, address, employee_code) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [user.username, hash, user.name, user.email, user.role, user.identity_number, user.address, user.employee_code]
      );
      console.log(`  ✓ ${user.role.padEnd(8)} ${user.username} / ${user.password}`);
    } catch (err: any) {
      if (err.message?.includes('UNIQUE')) {
        console.log(`  - ${user.username} already exists (skipped)`);
      } else {
        console.error(`  ✗ ${user.username}:`, err.message);
      }
    }
  }

  const managerRow = db.get<{ id: number }>(`SELECT id FROM users WHERE username = 'manager' LIMIT 1`);
  const managerId: number = managerRow?.id ?? 1;

  // ── Flights + Seats ────────────────────────────────────────
  console.log('\nSeeding flights…\n');
  for (const f of flights) {
    try {
      let flightId: number;

      db.transaction(() => {
        const result = db.run(
          `INSERT INTO flights (flight_number, departure, arrival, scheduled_time, state, total_seats, created_by, airplane, num_rows, seats_per_row, business_rows) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [f.fn, f.dep, f.arr, f.time, f.state, f.seats, managerId, f.airplane, f.num_rows, f.seats_per_row, f.business_rows]
        );
        flightId = Number(result.lastInsertRowid);

        const seats = generateSeats(flightId, f.seats, f.business_rows, f.seats_per_row);
        insertSeats(seats);
      });

      console.log(`  ✓ ${f.fn}  ${f.dep} → ${f.arr}  [${f.state.padEnd(9)}]  ${f.seats} seats`);
    } catch (err: any) {
      if (err.message?.includes('UNIQUE')) {
        console.log(`  - ${f.fn} already exists (skipped)`);
      } else {
        console.error(`  ✗ ${f.fn}:`, err.message);
      }
    }
  }

  // ── Reservations ───────────────────────────────────────────
  console.log('\nSeeding reservations…\n');
  seedReservations();

  console.log('\n✅ Done!\n');
  console.log('  Accounts:');
  console.log('    admin    / Admin123!');
  console.log('    manager  / Manager123!');
  console.log('    customer / Customer123!');
  console.log('    visitor  / Visitor123!');

}

// Run directly when invoked as a script (npm run seed)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed().catch(console.error);
}
