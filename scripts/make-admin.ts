// Promote a user to admin, or create a new admin account.
//
//   npm run make-admin -- <username>              promote an existing user
//   npm run make-admin -- <username> <password>   create the user as admin if it doesn't exist
//
// Uses DATABASE_URL from the environment or .env (default sqlite://./horizonview.db).
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/server/db/index.js';

const STRONG_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

interface UserRow { id: number; username: string; role: string }

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function makeAdmin() {
  const [username, password] = process.argv.slice(2);
  if (!username) fail('Usage: npm run make-admin -- <username> [password]');

  const existing = db.get<UserRow>('SELECT id, username, role FROM users WHERE username = ?', [username]);

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`${username} is already an admin.`);
    } else {
      db.run(`UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?`, [existing.id]);
      console.log(`${username} is now an admin (was ${existing.role}).`);
    }
  } else {
    if (!password) fail(`No user "${username}". To create one, pass a password: npm run make-admin -- ${username} '<password>'`);
    if (!STRONG_PASSWORD.test(password)) fail('Password needs at least 8 characters, with an uppercase letter, a number and a symbol.');

    const hash = await bcrypt.hash(password, 12);
    // identity_number is required and unique; staff accounts created here get a placeholder to edit later.
    db.run(
      `INSERT INTO users (username, password, name, email, identity_number, role) VALUES (?, ?, ?, ?, ?, 'admin')`,
      [username, hash, username, `${username}@example.com`, `ADMIN-${username}`.slice(0, 20)]
    );
    console.log(`Created admin "${username}". Update the email and details on the Account page after signing in.`);
  }

  db.close();
}

makeAdmin().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
