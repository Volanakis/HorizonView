import { endpoint, body, ok, abort } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { profileUpdateSchema } from '$lib/server/schemas.js';
import { authService } from '$lib/server/services/auth.service.js';

export const PATCH = endpoint(async (event) => {
  const { userId } = requireUser(event);
  requireCsrf(event);
  const changes = await body(event, profileUpdateSchema);

  const result = await authService.updateProfile(userId, changes);
  if (!result.success) abort(400, 'BAD_REQUEST', result.error ?? 'Profile update failed');

  return ok(await authService.getUserById(userId));
});
