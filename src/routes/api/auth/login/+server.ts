import { endpoint, readJson, validate, ok, abort, clientIp } from '$lib/server/http.js';
import { loginLimit, userKey } from '$lib/server/rate-limit.js';
import { loginSchema } from '$lib/server/schemas.js';
import { generateTokens, refreshExpiry, setSessionCookies } from '$lib/server/auth.js';
import { rotateCsrfToken } from '$lib/server/csrf.js';
import { authService } from '$lib/server/services/auth.service.js';

export const POST = endpoint(async (event) => {
  const raw = await readJson(event);
  loginLimit(event, userKey(event, raw));
  const { username, password } = validate(raw, loginSchema);
  const ip = clientIp(event);

  const user = await authService.login(username, password, ip);
  if (!user) abort(401, 'UNAUTHORIZED', 'Invalid credentials');

  const { accessToken, refreshToken } = generateTokens({ userId: user.id, username: user.username, role: user.role });
  try {
    authService.saveRefreshToken(user.id, refreshToken, refreshExpiry(), ip);
  } catch {
    abort(500, 'SERVER_ERROR', 'Failed to persist session');
  }

  rotateCsrfToken(event);
  setSessionCookies(event.cookies, accessToken, refreshToken);
  // Tokens travel only in httpOnly cookies, never in the body.
  return ok({ user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});
