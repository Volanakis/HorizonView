import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import type { UserRole } from '../../types.js';
import { UserSchema, UserPublicSchema, AuditLogWithActorSchema, type AuditLogWithActor } from '../db/validation.js';

export interface UserPublic {
  id: number;
  username: string;
  name: string;
  vat_number: string | null;
  identity_number: string | null;
  is_active: number;
  address: string | null;
  employee_code: string | null;
  email: string;
  role: UserRole;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export const userService = {
  list(filters: { role?: UserRole; page?: number; limit?: number; search?: string }): { users: UserPublic[]; total: number } {
    const database = getDb();
    let sql = 'SELECT id, username, name, vat_number, identity_number, is_active, address, employee_code, email, role, last_login, created_at, updated_at FROM users WHERE 1=1';
    const params: (string | number | null)[] = [];

    if (filters.role) {
      sql += ' AND role = ?';
      params.push(filters.role);
    }
    if (filters.search) {
      sql += ' AND (LOWER(username) LIKE ? OR LOWER(name) LIKE ?)';
      const term = `%${filters.search.toLowerCase()}%`;
      params.push(term, term);
    }

    const countParams: (string | number | null)[] = [];
    let countWhere = '1=1';
    if (filters.role) { countWhere += ' AND role = ?'; countParams.push(filters.role); }
    if (filters.search) {
      countWhere += ' AND (LOWER(username) LIKE ? OR LOWER(name) LIKE ?)';
      const term = `%${filters.search.toLowerCase()}%`;
      countParams.push(term, term);
    }
    const countSql = `SELECT COUNT(*) as total FROM users WHERE ${countWhere}`;
    const total = database.get<{ total: number }>(countSql, countParams)?.total || 0;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const rows = database.all(sql, params, UserPublicSchema);
    return { users: rows.map(u => ({ ...u })), total };
  },

  getStats(): { total: number; byRole: Record<string, number> } {
    const database = getDb();
    const total = database.get<{ total: number }>('SELECT COUNT(*) as total FROM users')?.total || 0;
    const rows = database.all<{ role: string; cnt: number }>('SELECT role, COUNT(*) as cnt FROM users GROUP BY role');
    const byRole: Record<string, number> = { visitor: 0, customer: 0, manager: 0, admin: 0 };
    rows.forEach((r: { role: string; cnt: number }) => { byRole[r.role] = r.cnt; });
    return { total, byRole };
  },

  listAudit(filters: { page?: number; limit?: number; action?: string }): { logs: AuditLogWithActor[]; total: number } {
    const database = getDb();
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 30, 100);
    const params: (string | number | null)[] = [];
    let where = '';
    if (filters.action) { where = 'WHERE a.action = ?'; params.push(filters.action); }
    const total = database.get<{ total: number }>(`SELECT COUNT(*) as total FROM audit_log a ${where}`, params)?.total || 0;
    const sql = `
      SELECT a.id, a.user_id, a.action, a.entity, a.entity_id, a.ip_address, a.user_agent, a.created_at,
             u.username as actor_username
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const logs = database.all<AuditLogWithActor>(sql, [...params, limit, (page - 1) * limit], AuditLogWithActorSchema);
    return { logs, total };
  },

  getById(id: number): UserPublic | null {
    const database = getDb();
    const user = database.get(
      'SELECT id, username, name, vat_number, identity_number, is_active, address, employee_code, email, role, last_login, created_at, updated_at FROM users WHERE id = ?',
      [id],
      UserPublicSchema
    );
    return user || null;
  },

  updateRole(id: number, newRole: UserRole, actorId: number): { success: boolean; error?: string } {
    const database = getDb();
    const user = database.get(
      'SELECT id, role FROM users WHERE id = ?',
      [id],
      UserSchema.pick({ id: true, role: true })
    );
    if (!user) return { success: false, error: 'User not found' };
    if (user.role === newRole) return { success: false, error: 'User already has that role' };

    database.run(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, [newRole, id]);
    database.run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'ROLE_CHANGE', 'user', ?)`,
      [actorId, id]
    );

    return { success: true };
  },

  /**
   * Bulk-import users. Each entry must have username, name, email, password, and optionally role and vat_number.
   * Returns { created, skipped } counts.
   */
  async bulkImport(
    entries: { username: string; name: string; email: string; password: string; identity_number: string; role?: UserRole; vat_number?: string; address?: string; employee_code?: string }[],
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
          `INSERT INTO users (username, password, name, email, identity_number, vat_number, address, employee_code, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.username,
            hashedPassword,
            entry.name,
            entry.email,
            entry.identity_number,
            entry.vat_number || null,
            entry.address || null,
            entry.employee_code || null,
            entry.role || 'customer'
          ]
        );
          const user = database.get('SELECT id FROM users WHERE username = ?', [entry.username], UserSchema.pick({ id: true }));
        if (user) {
          database.run(
            `INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'USER_IMPORT', 'user', ?)`,
            [actorId, user.id]
          );
        }
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/UNIQUE constraint failed/.test(msg)) {
          skipped++;
        } else {
          errors.push(`${entry.username}: ${msg}`);
        }
      }
    }


    return { created, skipped, errors };
  }
};
