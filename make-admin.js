import dotenv from 'dotenv';
dotenv.config();

import { db } from './dist/db/index.js';
import bcrypt from 'bcryptjs';

async function makeAdmin() {
  await db.init();

  // First, list all users
  const users = db.all('SELECT id, username, email, role FROM users');
  console.log('Current users:');
  users.forEach(u => console.log(`  ID: ${u.id}, Username: ${u.username}, Role: ${u.role}`));

  const username = process.argv[2] || 'volanakis';
  const password = process.argv[3] || 'Admin123!';

  // Check if user exists
  const existing = db.get('SELECT id, username, role FROM users WHERE username = ?', [username]);

  if (existing) {
    // Update existing user to admin
    const result = db.run(
      'UPDATE users SET role = ?, updated_at = datetime("now") WHERE username = ?',
      ['admin', username]
    );
    if (result.changes > 0) {
      console.log(`\nSuccess! ${username} is now an admin`);
    }
  } else {
    // Create new user with admin role
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = db.run(
      `INSERT INTO users (username, password, name, email, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
      [username, hashedPassword, 'Dimit Volanakis', `${username}@example.com`, 'admin']
    );
    if (result.changes > 0) {
      console.log(`\nSuccess! Created user "${username}" with admin role`);
      console.log(`Password: ${password}`);
    }
  }

  const updated = db.get('SELECT id, username, role FROM users WHERE username = ?', [username]);
  console.log('User info:', updated);

  db.save();
  db.close();
}

makeAdmin().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
