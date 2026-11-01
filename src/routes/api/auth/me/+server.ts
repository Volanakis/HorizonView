import { endpoint, body, ok, abort, noContent } from '$lib/server/http.js';
import { requireUser, clearSessionCookies } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { deleteAccountSchema } from '$lib/server/schemas.js';
import { authService } from '$lib/server/services/auth.service.js';
import { accountService } from '$lib/server/services/account.service.js';

export const GET = endpoint(async (event) => {
  const { userId } = requireUser(event);
  const user = await authService.getUserById(userId);
  if (!user) abort(401, 'UNAUTHORIZED', 'User not found');
  return ok(user);
});

/** Deletes (anonymises) the signed-in user's account. Requires the current password. */
export const DELETE = endpoint(async (event) => {
  const { userId } = requireUser(event);
  requireCsrf(event);
  const { password } = await body(event, deleteAccountSchema);

  const result = await accountService.deleteAccount(userId, password);
  // 403, not 401: a wrong password must not look like an expired session to the client.
  if (result === 'WRONG_PASSWORD') abort(403, 'INVALID_PASSWORD', 'Password is incorrect');
  if (result === 'LAST_ADMIN') abort(409, 'LAST_ADMIN', 'You are the only admin. Make someone else an admin first.');

  clearSessionCookies(event.cookies);
  return noContent();
});
