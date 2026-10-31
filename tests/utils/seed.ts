import bcrypt from 'bcryptjs';
import { db } from '../../src/lib/server/db/index.js';
import request from 'supertest';

export function extractLoginTokens(res: request.Response): { accessToken: string; refreshToken: string; csrfToken: string } {
  const cookies = res.headers['set-cookie'];
  const all = Array.isArray(cookies) ? cookies.join('; ') : (cookies || '');
  const csrf = all.match(/csrf_token=([^;]+)/);
  const access = all.match(/access_token=([^;]+)/);
  const refresh = all.match(/refresh_token=([^;]+)/);
  return {
    csrfToken: csrf ? decodeURIComponent(csrf[1]) : '',
    accessToken: access ? access[1] : '',
    refreshToken: refresh ? refresh[1] : ''
  };
}

export function extractCsrfToken(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const csrfCookie = Array.isArray(setCookie)
    ? setCookie.filter(c => c.includes('csrf_token')).pop()
    : setCookie;
  if (!csrfCookie) return '';
  return csrfCookie.split(';')[0].split('=')[1];
}

export async function seedTestData() {
  const users = [
    { username: 'admin',    password: 'Admin123!',    name: 'Admin User',     email: 'admin@test.com',    role: 'admin',    identity_number: 'TST00001', employee_code: 'TST001' },
    { username: 'manager',  password: 'Manager123!',  name: 'Flight Manager', email: 'manager@test.com',  role: 'manager',  identity_number: 'TST00002', employee_code: 'TST002' },
    { username: 'customer', password: 'Customer123!', name: 'Customer User',  email: 'customer@test.com', role: 'customer', identity_number: 'TST00003' },
    { username: 'visitor',  password: 'Visitor123!',  name: 'Visitor User',   email: 'visitor@test.com',  role: 'visitor',  identity_number: 'TST00004' },
  ];
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 4);
    db.run(
      `INSERT INTO users (username, password, name, email, role, identity_number, is_active, address, employee_code) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [user.username, hash, user.name, user.email, user.role, user.identity_number, null, user.employee_code || null]
    );
  }
}

export function cleanupTestData() {
  db.run('DELETE FROM reservations');
  db.run('DELETE FROM seats');
  db.run('DELETE FROM flights');
  db.run('DELETE FROM refresh_tokens');
  db.run('DELETE FROM audit_log');
  db.run('DELETE FROM users');
}

export const TEST_USERS = {
  admin:    { username: 'admin',    password: 'Admin123!',    name: 'Admin User',     email: 'admin@test.com',    role: 'admin',    identity_number: 'TST00001' },
  manager:  { username: 'manager',  password: 'Manager123!',  name: 'Flight Manager', email: 'manager@test.com',  role: 'manager',  identity_number: 'TST00002' },
  customer: { username: 'customer', password: 'Customer123!', name: 'Customer User',  email: 'customer@test.com', role: 'customer', identity_number: 'TST00003' },
  visitor:  { username: 'visitor',  password: 'Visitor123!',  name: 'Visitor User',   email: 'visitor@test.com',  role: 'visitor',  identity_number: 'TST00004' },
};
