import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { AuthUser, UserRole } from '../types/index.js';
import { generateTokenHash } from '../utils/crypto.js';

interface DbUser {
  id: number;
  username: string;
  password: string;
  name: string;
  vat_number: string | null;
  email: string;
  role: UserRole;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export const authService = {
  async register(data: {
    username: string;
    password: string;
    name: string;
    email: string;
    phone?: string;
    vat_number?: string;
  }): Promise<AuthUser> {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const database = getDb();

    const user = database.transaction(() => {
      database.run(
        `INSERT INTO users (username, password, name, email, phone, vat_number, role) VALUES (?, ?, ?, ?, ?, ?, 'customer')`,
        [data.username, hashedPassword, data.name, data.email, data.phone || null, data.vat_number || null]
      );
      const created = database.get<DbUser>('SELECT * FROM users WHERE username = ?', [data.username]);
      if (!created) throw new Error('Failed to create user');
      database.run(
        `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'REGISTER', 'user', ?)`,
        [created.id, created.id]
      );
      return created;
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    };
  },

  async login(
    username: string,
    password: string,
    ipAddress?: string
  ): Promise<AuthUser | null> {
    const database = getDb();
    const user = database.get<DbUser>('SELECT * FROM users WHERE username = ?', [username]);

    // Always run bcrypt.compare to prevent timing-based user enumeration
    const DUMMY_HASH = '$2a$12$dummyhashfordummycompare000000000000000000000000000000';
    const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    if (!user || !valid) {
      if (user) {
        database.run(
          `INSERT INTO audit_log (user_id, action, entity, entity_id, ip_address) VALUES (?, 'LOGIN_FAILED', 'user', ?, ?)`,
          [user.id, user.id, ipAddress || null]
        );
      }
      return null;
    }

    database.run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [user.id]);
    database.run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, ip_address) VALUES (?, 'LOGIN', 'user', ?, ?)`,
      [user.id, user.id, ipAddress || null]
    );

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    };
  },

  async getUserById(id: number): Promise<AuthUser | null> {
    const database = getDb();
    const user = database.get<{ id: number; username: string; name: string; email: string; role: UserRole }>(
      'SELECT id, username, name, email, role FROM users WHERE id = ?',
      [id]
    );

    return user || null;
  },

  saveRefreshToken(
    userId: number,
    token: string,
    expiresAt: Date,
    ipAddress?: string
  ): void {
    const database = getDb();
    const hash = generateTokenHash(token);
    database.run(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address) VALUES (?, ?, ?, ?)`,
      [userId, hash, expiresAt.toISOString(), ipAddress || null]
    );
  },

  validateRefreshToken(
    token: string,
    userId: number
  ): { valid: boolean; revoked: boolean } {
    const database = getDb();
    const hash = generateTokenHash(token);
    const stored = database.get<{ id: number }>(
      `SELECT id FROM refresh_tokens WHERE token_hash = ? AND user_id = ? AND revoked = 0 AND expires_at > datetime('now')`,
      [hash, userId]
    );

    if (!stored) {
      return { valid: false, revoked: false };
    }

    // Revoke only this specific token, not all sessions
    database.run(`UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?`, [hash]);

    return { valid: true, revoked: false };
  },

  revokeAllUserTokens(userId: number): void {
    const database = getDb();
    database.run(`UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`, [userId]);
  },

  async updateProfile(
    userId: number,
    data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const database = getDb();

    if (data.newPassword) {
      const user = database.get<DbUser>('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) return { success: false, error: 'User not found' };
      const valid = await bcrypt.compare(data.currentPassword || '', user.password);
      if (!valid) return { success: false, error: 'Current password is incorrect' };
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name)  { updates.push('name = ?');  params.push(data.name); }
    if (data.email) { updates.push('email = ?'); params.push(data.email); }
    if (data.newPassword) {
      const hashed = await bcrypt.hash(data.newPassword, 12);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (updates.length === 0) return { success: false, error: 'No changes provided' };

    updates.push("updated_at = datetime('now')");
    params.push(userId);

    try {
      database.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE')) return { success: false, error: 'Email already in use' };
      throw err;
    }

    return { success: true };
  },

  getUserRole(userId: number): UserRole | null {
    const database = getDb();
    const user = database.get<{ role: UserRole }>('SELECT role FROM users WHERE id = ?', [userId]);
    return user?.role || null;
  }
};