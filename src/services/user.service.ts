import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { UserRole } from '../types/index.js';

interface DbUser {
  id: number;
  username: string;
  name: string;
  vat_number: string | null;
  email: string;
  role: UserRole;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: number;
  username: string;
  name: string;
  vat_number: string | null;
  email: string;
  role: UserRole;
  last_login: string | null;
  created_at: string;
}

export const userService = {
  list(filters: { role?: UserRole; page?: number; limit?: number }): { users: UserPublic[]; total: number } {
    const database = getDb();
    let sql = 'SELECT id, username, name, vat_number, email, role, last_login, created_at, updated_at FROM users WHERE 1=1';
    const params: (string | number | null)[] = [];

    if (filters.role) {
      sql += ' AND role = ?';
      params.push(filters.role);
    }

    const countSql = `SELECT COUNT(*) as total FROM users WHERE 1=1${filters.role ? ' AND role = ?' : ''}`;
    const total = database.get<{ total: number }>(countSql, filters.role ? [filters.role] : [])?.total || 0;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const rows = database.all<DbUser>(sql, params);
    return { users: rows.map(u => ({ ...u })), total };
  },

  getById(id: number): UserPublic | null {
    const database = getDb();
    const user = database.get<DbUser>(
      'SELECT id, username, name, vat_number, email, role, last_login, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return user || null;
  },

  updateRole(id: number, newRole: UserRole, actorId: number): { success: boolean; error?: string } {
    const database = getDb();
    const user = database.get<{ id: number; role: UserRole }>('SELECT id, role FROM users WHERE id = ?', [id]);
    if (!user) return { success: false, error: 'User not found' };
    if (user.role === newRole) return { success: false, error: 'User already has that role' };

    database.run(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, [newRole, id]);
    database.run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'ROLE_CHANGE', 'user', ?)`,
      [actorId, id]
    );
    database.save();
    return { success: true };
  },

  /**
   * Bulk-import users. Each entry must have username, name, email, password, and optionally role and vat_number.
   * Returns { created, skipped } counts.
   */
  async bulkImport(
    entries: { username: string; name: string; email: string; password: string; role?: UserRole; vat_number?: string }[],
    actorId: number
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    const database = getDb();
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        const hashedPassword = await bcrypt.hash(entry.password, 12);
        database.run(
          `INSERT INTO users (username, password, name, email, vat_number, role) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            entry.username,
            hashedPassword,
            entry.name,
            entry.email,
            entry.vat_number || null,
            entry.role || 'customer'
          ]
        );
        const user = database.get<{ id: number }>('SELECT id FROM users WHERE username = ?', [entry.username]);
        if (user) {
          database.run(
            `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'USER_IMPORT', 'user', ?)`,
            [actorId, user.id]
          );
        }
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Constraint violation = duplicate username/email — skip silently but track it
        if (msg.includes('UNIQUE') || msg.includes('CONSTRAINT')) {
          skipped++;
        } else {
          errors.push(`${entry.username}: ${msg}`);
        }
      }
    }

    database.save();
    return { created, skipped, errors };
  }
};
