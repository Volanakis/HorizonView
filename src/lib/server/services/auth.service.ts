import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import type { AuthUser, UserRole } from '../../types.js';
import { generateTokenHash, generateRandomToken } from '../crypto.js';
import { UserSchema } from '../db/validation.js';

/**
 * Service for authentication-related operations.
 * @module authService
 */


export const authService = {
  /**
   * Register a new user with the provided data.
   * @param data - User registration data
   * @returns The newly created user (without password)
   */
  async register(data: {
    username: string;
    password: string;
    name: string;
    email: string;
    phone?: string;
    vat_number?: string;
    identity_number?: string;
    address?: string;
    employee_code?: string;
    ipAddress?: string;
  }): Promise<AuthUser> {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const database = getDb();

    const user = database.transaction(() => {
      database.run(
        `INSERT INTO users (username, password, name, email, phone, vat_number, role, identity_number, address, employee_code) VALUES (?, ?, ?, ?, ?, ?, 'customer', ?, ?, ?)`,
        [data.username, hashedPassword, data.name, data.email, data.phone || null, data.vat_number || null, data.identity_number || null, data.address || null, data.employee_code || null]
      );
      const created = database.get('SELECT * FROM users WHERE username = ?', [data.username], UserSchema);
      if (!created) throw new Error('Failed to create user');
      database.run(
        `INSERT INTO audit_log (user_id, action, entity, entity_id, ip_address) VALUES (?, 'REGISTER', 'user', ?, ?)`,
        [created.id, created.id, data.ipAddress || null]
      );
      return created;
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role
    };
  },

  async login(
    username: string,
    password: string,
    ipAddress?: string
  ): Promise<AuthUser | null> {
    const database = getDb();
    const user = database.get('SELECT * FROM users WHERE username = ?', [username], UserSchema);

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

    database.transaction(() => {
      database.run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [user.id]);
      database.run(
        `INSERT INTO audit_log (user_id, action, entity, entity_id, ip_address) VALUES (?, 'LOGIN', 'user', ?, ?)`,
        [user.id, user.id, ipAddress || null]
      );
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role
    };
  },

  async getUserById(id: number): Promise<AuthUser | null> {
    const database = getDb();
    const user = database.get(
      'SELECT id, username, name, email, phone, address, role FROM users WHERE id = ?',
      [id],
      UserSchema.pick({ id: true, username: true, name: true, email: true, phone: true, address: true, role: true })
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
    token: string
  ): { valid: boolean; userId?: number; reused?: boolean } {
    const database = getDb();
    const hash = generateTokenHash(token);
    const stored = database.get<{ id: number; user_id: number }>(
      `SELECT id, user_id FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')`,
      [hash]
    );
    if (stored) {
      return { valid: true, userId: stored.user_id };
    }
    const revoked = database.get<{ user_id: number }>(
      `SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND revoked = 1`,
      [hash]
    );
    if (revoked) {
      return { valid: false, userId: revoked.user_id, reused: true };
    }
    return { valid: false };
  },

  revokeRefreshToken(token: string): void {
    const database = getDb();
    const hash = generateTokenHash(token);
    database.run(`UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?`, [hash]);
  },

  revokeAllUserTokens(userId: number): void {
    const database = getDb();
    database.run(`UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`, [userId]);
  },

  async updateProfile(
    userId: number,
    data: { name?: string; email?: string; phone?: string; address?: string; currentPassword?: string; newPassword?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const database = getDb();

    if (data.newPassword) {
      const user = database.get('SELECT * FROM users WHERE id = ?', [userId], UserSchema);
      if (!user) return { success: false, error: 'User not found' };
      const valid = await bcrypt.compare(data.currentPassword || '', user.password);
      if (!valid) return { success: false, error: 'Current password is incorrect' };
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined)    { updates.push('name = ?');    params.push(data.name); }
    if (data.email !== undefined)   { updates.push('email = ?');   params.push(data.email); }
    if (data.phone !== undefined)   { updates.push('phone = ?');   params.push(data.phone || null); }
    if (data.address !== undefined) { updates.push('address = ?'); params.push(data.address || null); }
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
      const match = msg.match(/UNIQUE constraint failed: users\.(\w+)/);
      if (match) {
        const field = match[1];
        return { success: false, error: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use` };
      }
      throw err;
    }

    return { success: true };
  },

  forgotPassword(email: string, ipAddress?: string): { success: boolean; token?: string; error?: string } {
    const database = getDb();
    const user = database.get(
      'SELECT id FROM users WHERE email = ?',
      [email],
      UserSchema.pick({ id: true })
    );

    if (!user) {
      return { success: false, error: 'No account found with that email' };
    }

    const token = generateRandomToken();
    const hash = generateTokenHash(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    database.run(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address) VALUES (?, ?, ?, ?)`,
      [user.id, hash, expiresAt.toISOString(), ipAddress || null]
    );

    database.run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, ip_address) VALUES (?, 'PASSWORD_RESET_REQUEST', 'user', ?, ?)`,
      [user.id, user.id, ipAddress || null]
    );

    return { success: true, token };
  },

  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<{ success: boolean; error?: string }> {
    const database = getDb();
    const hash = generateTokenHash(token);
    const stored = database.get<{ id: number; user_id: number; expires_at: string }>(
      `SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')`,
      [hash]
    );
    if (!stored) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    database.transaction(() => {
      database.run(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`, [stored.id]);
      database.run(`UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`, [hashedPassword, stored.user_id]);
      database.run(
        `INSERT INTO audit_log (user_id, action, entity, entity_id, ip_address) VALUES (?, 'PASSWORD_RESET', 'user', ?, ?)`,
        [stored.user_id, stored.user_id, ipAddress || null]
      );
    });

    return { success: true };
  },

  cleanupStaleData(): { purgedTokens: number; purgedResetTokens: number; purgedAuditLogs: number } {
    const database = getDb();
    const tokens = database.run(`DELETE FROM refresh_tokens WHERE expires_at <= datetime('now', '-30 days')`).changes;
    const resetTokens = database.run(`DELETE FROM password_reset_tokens WHERE expires_at <= datetime('now', '-7 days')`).changes;
    const auditLogs = database.run(`DELETE FROM audit_log WHERE created_at <= datetime('now', '-90 days')`).changes;
    return { purgedTokens: tokens, purgedResetTokens: resetTokens, purgedAuditLogs: auditLogs };
  },

  isUserActive(userId: number): boolean {
    const database = getDb();
    const user = database.get<{ is_active: number }>(
      'SELECT is_active FROM users WHERE id = ?', [userId]
    );
    return user?.is_active === 1;
  },

  getUserRole(userId: number): UserRole | null {
    const database = getDb();
    const user = database.get(
      'SELECT role FROM users WHERE id = ?',
      [userId],
      UserSchema.pick({ role: true })
    );
    return user?.role || null;
  }
};