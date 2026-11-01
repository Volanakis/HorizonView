import type Database from 'better-sqlite3';
import { DDL, usersTable, reservationsTable } from './schema.js';

const RESERVATION_COLUMNS = ['id', 'user_id', 'flight_id', 'seat_id', 'ticket_type', 'price', 'status', 'cancelled_at', 'created_at', 'updated_at'];
const USER_COLUMNS = ['id', 'username', 'password', 'name', 'vat_number', 'identity_number', 'is_active', 'address', 'employee_code', 'email', 'phone', 'role', 'last_login', 'created_at', 'updated_at'];

/**
 * Brings databases created by older versions up to the current schema.
 * Each step checks the stored table definition first, so this is safe to run on every start.
 */
export function runMigrations(db: Database.Database): void {
  const tableSql = (name: string) =>
    (db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name) as { sql: string } | undefined)?.sql ?? '';

  let rebuilt = false;

  // A cancelled booking used to keep its seat forever (table-level UNIQUE(seat_id)).
  if (/UNIQUE\s*\(\s*seat_id\s*\)/i.test(tableSql('reservations'))) {
    rebuild(db, 'reservations', reservationsTable, RESERVATION_COLUMNS);
    rebuilt = true;
  }

  // The ID number is optional at sign-up (data minimisation).
  if (/identity_number\s+VARCHAR\(20\)\s+UNIQUE\s+NOT\s+NULL/i.test(tableSql('users'))) {
    rebuild(db, 'users', usersTable, USER_COLUMNS);
    rebuilt = true;
  }

  // Indexes are dropped together with the old tables.
  if (rebuilt) db.exec(DDL);
}

/**
 * SQLite can't alter a constraint in place: copy into a new table and swap it in
 * (https://sqlite.org/lang_altertable.html#otheralter). Foreign keys are switched off
 * for the swap, because other tables reference this one; ids are copied unchanged.
 */
function rebuild(db: Database.Database, name: string, definition: (name: string) => string, columns: string[]): void {
  const cols = columns.join(', ');
  const enforced = db.pragma('foreign_keys', { simple: true });
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(definition(`${name}_new`));
      db.exec(`INSERT INTO ${name}_new (${cols}) SELECT ${cols} FROM ${name}`);
      db.exec(`DROP TABLE ${name}`);
      db.exec(`ALTER TABLE ${name}_new RENAME TO ${name}`);
    })();
  } finally {
    if (enforced) db.pragma('foreign_keys = ON');
  }
  console.log(`Database migrated: rebuilt table "${name}".`);
}
