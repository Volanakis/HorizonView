import { endpoint, body, idParam, ok, abort } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { userRoleSchema } from '$lib/server/schemas.js';
import { userService } from '$lib/server/services/user.service.js';

export const PATCH = endpoint(async (event) => {
  const admin = requireUser(event, 'admin');
  const id = idParam(event);
  requireCsrf(event);
  const { role } = await body(event, userRoleSchema);

  // Admins can't demote themselves (and lock everyone out).
  if (admin.userId === id) abort(400, 'BAD_REQUEST', 'Cannot change your own role');

  const result = userService.updateRole(id, role, admin.userId);
  if (!result.success) {
    const notFound = result.error === 'User not found';
    abort(notFound ? 404 : 400, notFound ? 'NOT_FOUND' : 'BAD_REQUEST', result.error ?? 'Role change failed');
  }
  return ok({ id, role });
});
