import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const dbPath = (process.env.DATABASE_URL || './horizonview.db').replace(/^sqlite:\/\//, '');

const users = [
  { username: 'admin',    password: 'Admin123!',    name: 'Admin User',     email: 'admin@horizonview.com',    role: 'admin' },
  { username: 'manager',  password: 'Manager123!',  name: 'Flight Manager', email: 'manager@horizonview.com',  role: 'manager' },
  { username: 'customer', password: 'Customer123!', name: 'John Customer',  email: 'customer@horizonview.com', role: 'customer' },
  { username: 'visitor',  password: 'Visitor123!',  name: 'Visitor User',   email: 'visitor@horizonview.com',  role: 'visitor' },
  { username: 'volanakis', password: 'Admin123!', name: 'Dimit Volanakis', email: 'dimit@volanakis.com', role: 'admin' },
];

// 30 domestic Greek flights spread over the next 6 weeks
// Airports: ATH=Athens, SKG=Thessaloniki, HER=Heraklion, RHO=Rhodes,
//           CFU=Corfu, ZTH=Zakynthos, KGS=Kos, EFL=Kefalonia,
//           MJT=Mytilene, CHQ=Chania, SMI=Samos, JMK=Mykonos
const base = new Date('2026-05-01T00:00:00Z');
function dt(dayOffset: number, hour: number, min = 0): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, min, 0, 0);
  return d.toISOString();
}

const flights = [
  // Week 1
  { fn: 'HV-101', dep: 'ATH', arr: 'SKG', time: dt(0,  6, 30), seats: 180, state: 'completed' },
  { fn: 'HV-102', dep: 'SKG', arr: 'ATH', time: dt(0, 10,  0), seats: 180, state: 'completed' },
  { fn: 'HV-103', dep: 'ATH', arr: 'HER', time: dt(1,  7,  0), seats: 150, state: 'completed' },
  { fn: 'HV-104', dep: 'HER', arr: 'ATH', time: dt(1, 11, 45), seats: 150, state: 'completed' },
  { fn: 'HV-105', dep: 'ATH', arr: 'RHO', time: dt(2,  8, 15), seats: 120, state: 'completed' },
  // Week 2
  { fn: 'HV-106', dep: 'RHO', arr: 'ATH', time: dt(7,  9,  0), seats: 120, state: 'staffed'   },
  { fn: 'HV-107', dep: 'ATH', arr: 'CFU', time: dt(7, 13, 30), seats: 100, state: 'staffed'   },
  { fn: 'HV-108', dep: 'CFU', arr: 'ATH', time: dt(8,  7, 45), seats: 100, state: 'staffed'   },
  { fn: 'HV-109', dep: 'ATH', arr: 'ZTH', time: dt(8, 11,  0), seats:  90, state: 'staffed'   },
  { fn: 'HV-110', dep: 'ZTH', arr: 'ATH', time: dt(9, 15, 20), seats:  90, state: 'staffed'   },
  // Week 3
  { fn: 'HV-111', dep: 'ATH', arr: 'KGS', time: dt(14,  6,  0), seats: 120, state: 'created'  },
  { fn: 'HV-112', dep: 'KGS', arr: 'ATH', time: dt(14, 12, 30), seats: 120, state: 'created'  },
  { fn: 'HV-113', dep: 'ATH', arr: 'EFL', time: dt(15,  8, 45), seats:  80, state: 'created'  },
  { fn: 'HV-114', dep: 'EFL', arr: 'ATH', time: dt(15, 14,  0), seats:  80, state: 'created'  },
  { fn: 'HV-115', dep: 'SKG', arr: 'HER', time: dt(16,  7, 30), seats: 100, state: 'created'  },
  // Week 3 continued
  { fn: 'HV-116', dep: 'HER', arr: 'SKG', time: dt(16, 13, 15), seats: 100, state: 'created'  },
  { fn: 'HV-117', dep: 'ATH', arr: 'MJT', time: dt(17,  9,  0), seats:  72, state: 'created'  },
  { fn: 'HV-118', dep: 'MJT', arr: 'ATH', time: dt(17, 15, 45), seats:  72, state: 'created'  },
  { fn: 'HV-119', dep: 'ATH', arr: 'CHQ', time: dt(18,  6, 30), seats: 150, state: 'created'  },
  { fn: 'HV-120', dep: 'CHQ', arr: 'ATH', time: dt(18, 12,  0), seats: 150, state: 'created'  },
  // Week 4
  { fn: 'HV-121', dep: 'ATH', arr: 'SMI', time: dt(21,  8,  0), seats:  72, state: 'created'  },
  { fn: 'HV-122', dep: 'SMI', arr: 'ATH', time: dt(21, 14, 30), seats:  72, state: 'created'  },
  { fn: 'HV-123', dep: 'ATH', arr: 'JMK', time: dt(22,  7, 15), seats:  60, state: 'created'  },
  { fn: 'HV-124', dep: 'JMK', arr: 'ATH', time: dt(22, 11, 45), seats:  60, state: 'created'  },
  { fn: 'HV-125', dep: 'SKG', arr: 'RHO', time: dt(23,  9, 30), seats: 120, state: 'created'  },
  // Week 5
  { fn: 'HV-126', dep: 'RHO', arr: 'SKG', time: dt(28, 10,  0), seats: 120, state: 'created'  },
  { fn: 'HV-127', dep: 'HER', arr: 'RHO', time: dt(29,  8, 45), seats:  90, state: 'created'  },
  { fn: 'HV-128', dep: 'RHO', arr: 'HER', time: dt(29, 14, 15), seats:  90, state: 'created'  },
  { fn: 'HV-129', dep: 'ATH', arr: 'KGS', time: dt(35,  7,  0), seats: 120, state: 'created'  },
  { fn: 'HV-130', dep: 'KGS', arr: 'CHQ', time: dt(35, 13, 30), seats: 100, state: 'created'  },
];

async function seed() {
  const SQL = await initSqlJs();
  let db: any;

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    console.error('Database not found. Run npm run migrate first.');
    process.exit(1);
  }

  // ── Users ──────────────────────────────────────────────────
  console.log('Seeding users…\n');
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 12);
    try {
      db.run(
        `INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)`,
        [user.username, hash, user.name, user.email, user.role]
      );
      console.log(`  ✓ ${user.role.padEnd(8)} ${user.username} / ${user.password}`);
    } catch (err: any) {
      if (err.message.includes('UNIQUE')) {
        console.log(`  - ${user.username} already exists (skipped)`);
      } else {
        console.error(`  ✗ ${user.username}:`, err.message);
      }
    }
  }

  // Resolve manager id for created_by
  const managerRow: any = db.exec(`SELECT id FROM users WHERE username = 'manager' LIMIT 1`);
  const managerId: number = managerRow?.[0]?.values?.[0]?.[0] ?? 1;

  // ── Flights + Seats ────────────────────────────────────────
  console.log('\nSeeding flights…\n');
  for (const f of flights) {
    try {
      db.run(
        `INSERT INTO flights (flight_number, departure, arrival, scheduled_time, state, total_seats, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [f.fn, f.dep, f.arr, f.time, f.state, f.seats, managerId]
      );

      // Retrieve the new flight id
      const res: any = db.exec(`SELECT last_insert_rowid() AS id`);
      const flightId: number = res[0].values[0][0];

      // Generate seats: first 10% business, next 20% normal, rest economy
      const biz    = Math.round(f.seats * 0.1);
      const normal = Math.round(f.seats * 0.2);
      const econ   = f.seats - biz - normal;

      const seatDefs: { cls: string; count: number; price: number }[] = [
        { cls: 'business', count: biz,    price: 180 },
        { cls: 'normal',   count: normal, price: 90  },
        { cls: 'economy',  count: econ,   price: 55  },
      ];

      let seatNum = 1;
      for (const { cls, count, price } of seatDefs) {
        for (let i = 0; i < count; i++) {
          db.run(
            `INSERT INTO seats (flight_id, seat_number, class, price, is_available) VALUES (?, ?, ?, ?, 1)`,
            [flightId, String(seatNum++), cls, price]
          );
        }
      }

      console.log(`  ✓ ${f.fn}  ${f.dep} → ${f.arr}  [${f.state.padEnd(9)}]  ${f.seats} seats`);
    } catch (err: any) {
      if (err.message.includes('UNIQUE')) {
        console.log(`  - ${f.fn} already exists (skipped)`);
      } else {
        console.error(`  ✗ ${f.fn}:`, err.message);
      }
    }
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log('\n✅ Done!\n');
  console.log('  Accounts:');
  console.log('    admin    / Admin123!');
  console.log('    manager  / Manager123!');
  console.log('    customer / Customer123!');
  console.log('    visitor  / Visitor123!');
  console.log('    volanakis / Admin123!');
}

export { seed };
