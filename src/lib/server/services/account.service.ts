import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '../db/index.js';

export type DeleteAccountResult = 'DELETED' | 'WRONG_PASSWORD' | 'LAST_ADMIN';

/** The data subject's own requests: a copy of their data, and erasure. */
export const accountService = {
  /** Everything stored about one user, as plain JSON (right of access / portability). */
  exportData(userId: number) {
    const db = getDb();
    return {
      exported_at: new Date().toISOString(),
      profile: db.get(
        `SELECT id, username, name, email, phone, address, vat_number, identity_number, employee_code,
                role, is_active, last_login, created_at, updated_at
         FROM users WHERE id = ?`,
        [userId]
      ),
      reservations: db.all(
        `SELECT r.id, f.flight_number, f.departure, f.arrival, f.scheduled_time, s.seat_number,
                r.ticket_type, r.price, r.status, r.cancelled_at, r.created_at
         FROM reservations r
         JOIN flights f ON f.id = r.flight_id
         JOIN seats s ON s.id = r.seat_id
         WHERE r.user_id = ? ORDER BY r.created_at`,
        [userId]
      ),
      activity: db.all(
        `SELECT action, entity, entity_id, ip_address, user_agent, created_at
         FROM audit_log WHERE user_id = ? ORDER BY created_at`,
        [userId]
      ),
      sessions: db.all(
        `SELECT created_at, expires_at, revoked, ip_address FROM refresh_tokens WHERE user_id = ? ORDER BY created_at`,
        [userId]
      )
    };
  },

  /**
   * Erasure. Rows are anonymised rather than deleted: past bookings stay for the
   * airline's records but no longer point to a person. Upcoming bookings are
   * cancelled so their seats go back on sale.
   */
  async deleteAccount(userId: number, password: string): Promise<DeleteAccountResult> {
    const db = getDb();
    const user = db.get<{ password: string; role: string }>('SELECT password, role FROM users WHERE id = ?', [userId]);
    if (!user || !(await bcrypt.compare(password, user.password))) return 'WRONG_PASSWORD';

    if (user.role === 'admin') {
      const admins = db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1`);
      if ((admins?.count ?? 0) <= 1) return 'LAST_ADMIN';
    }

    // A random password nobody knows, so the row can never sign in again.
    const unusable = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const now = new Date().toISOString();

    db.transaction(() => {
      const upcoming = db.all<{ id: number; seat_id: number }>(
        `SELECT r.id, r.seat_id FROM reservations r JOIN flights f ON f.id = r.flight_id
         WHERE r.user_id = ? AND r.status = 'confirmed' AND f.scheduled_time > ?`,
        [userId, now]
      );
      for (const booking of upcoming) {
        db.run(`UPDATE reservations SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`, [booking.id]);
        db.run('UPDATE seats SET is_available = 1 WHERE id = ?', [booking.seat_id]);
      }

      db.run(
        `UPDATE users SET username = 'deleted-' || id, name = 'Deleted user', email = 'deleted-' || id || '@invalid',
                phone = NULL, address = NULL, vat_number = NULL, identity_number = NULL, employee_code = NULL,
                password = ?, is_active = 0, last_login = NULL, updated_at = datetime('now')
         WHERE id = ?`,
        [unusable, userId]
      );
      db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
      db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
      db.run('UPDATE audit_log SET ip_address = NULL, user_agent = NULL WHERE user_id = ?', [userId]);
      db.run(`INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'ACCOUNT_DELETE', 'user', ?)`, [userId, userId]);
    });

    return 'DELETED';
  }
};
