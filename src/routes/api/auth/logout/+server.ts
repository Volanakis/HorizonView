import { endpoint, noContent } from '$lib/server/http.js';
import { requireUser, clearSessionCookies } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { authService } from '$lib/server/services/auth.service.js';

export const POST = endpoint((event) => {
  const user = requireUser(event);
  requireCsrf(event);
  authService.revokeAllUserTokens(user.userId);
  clearSessionCookies(event.cookies);
  return noContent();
});
