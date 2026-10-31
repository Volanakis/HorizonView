import { endpoint, ok, abort, clientIp } from '$lib/server/http.js';
import { refreshLimit } from '$lib/server/rate-limit.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { generateTokens, refreshExpiry, setSessionCookies, clearSessionCookies } from '$lib/server/auth.js';
import { authService } from '$lib/server/services/auth.service.js';

/** Rotates the refresh token; reusing a revoked one revokes every session of that user. */
export const POST = endpoint(async (event) => {
  refreshLimit(event);
  requireCsrf(event);

  const token = event.cookies.get('refresh_token');
  if (!token) abort(401, 'UNAUTHORIZED', 'No refresh token');

  const { valid, userId, reused } = authService.validateRefreshToken(token);
  if (!valid || !userId) {
    if (reused && userId) authService.revokeAllUserTokens(userId);
    clearSessionCookies(event.cookies);
    abort(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const user = await authService.getUserById(userId);
  if (!user) {
    clearSessionCookies(event.cookies);
    abort(401, 'UNAUTHORIZED', 'User not found');
  }

  const { accessToken, refreshToken } = generateTokens({ userId: user.id, username: user.username, role: user.role });
  // Save the new token before revoking the old one, so a failed save can't lock the user out.
  try {
    authService.saveRefreshToken(user.id, refreshToken, refreshExpiry(), clientIp(event));
  } catch {
    clearSessionCookies(event.cookies);
    abort(500, 'SERVER_ERROR', 'Failed to persist session');
  }
  authService.revokeRefreshToken(token);

  setSessionCookies(event.cookies, accessToken, refreshToken);
  return ok();
});
