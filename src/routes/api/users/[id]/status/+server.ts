import { endpoint, body, idParam, ok } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { toggleActiveSchema } from '$lib/server/schemas.js';
import { getDb } from '$lib/server/db/index.js';

/** Deactivated users are rejected on their next request (see requireUser). */
export const PATCH = endpoint(async (event) => {
  const admin = requireUser(event, 'admin');
  const id = idParam(event);
  requireCsrf(event);
  const { is_active } = await body(event, toggleActiveSchema);

  const db = getDb();
  db.run('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
  db.run(`INSERT INTO audit_log (user_id, action, entity, entity_id) VALUES (?, 'USER_TOGGLE_ACTIVE', 'user', ?)`, [admin.userId, id]);
  return ok({ id, is_active });
});
