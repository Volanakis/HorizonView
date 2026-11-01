// Promote a user to admin, or create a new admin account.
//
//   npm run make-admin -- <username>              promote an existing user
//   npm run make-admin -- <username> <password>   create the user as admin if it doesn't exist
//
// Plain Node with production dependencies only, so it also runs inside the Docker image:
//   docker compose exec app npm run make-admin -- <username> [password]
//
// Uses DATABASE_URL from the environment or .env (default sqlite://./horizonview.db).
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'node:fs';

const STRONG_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

dotenv.config();
const dbPath = (process.env.DATABASE_URL || 'sqlite://./horizonview.db').replace(/^sqlite:\/\//, '');
const [username, password] = process.argv.slice(2);

if (!username) fail('Usage: npm run make-admin -- <username> [password]');
if (!fs.existsSync(dbPath)) fail(`No database at ${dbPath}. Start the app once (or run npm run migrate) first.`);

const db = new Database(dbPath);
try {
  const existing = db.prepare('SELECT id, role FROM users WHERE username = ?').get(username);

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`${username} is already an admin.`);
    } else {
      db.prepare(`UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?`).run(existing.id);
      console.log(`${username} is now an admin (was ${existing.role}).`);
    }
  } else {
    if (!password) fail(`No user "${username}" (usernames are case-sensitive). To create one, pass a password: npm run make-admin -- ${username} '<password>'`);
    if (!STRONG_PASSWORD.test(password)) fail('Password needs at least 8 characters, with an uppercase letter, a number and a symbol.');

    // identity_number is required and unique; accounts created here get a placeholder to edit later.
    db.prepare(`INSERT INTO users (username, password, name, email, identity_number, role) VALUES (?, ?, ?, ?, ?, 'admin')`)
      .run(username, bcrypt.hashSync(password, 12), username, `${username}@example.com`, `ADMIN-${username}`.slice(0, 20));
    console.log(`Created admin "${username}". Update the email and details on the Account page after signing in.`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  db.close();
}
