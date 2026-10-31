import { endpoint, ok, abort } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { authService } from '$lib/server/services/auth.service.js';

export const GET = endpoint(async (event) => {
  const { userId } = requireUser(event);
  const user = await authService.getUserById(userId);
  if (!user) abort(401, 'UNAUTHORIZED', 'User not found');
  return ok(user);
});
