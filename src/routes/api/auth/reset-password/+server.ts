import { endpoint, body, ok, abort, clientIp } from '$lib/server/http.js';
import { resetPasswordLimit } from '$lib/server/rate-limit.js';
import { resetPasswordSchema } from '$lib/server/schemas.js';
import { authService } from '$lib/server/services/auth.service.js';

export const POST = endpoint(async (event) => {
  resetPasswordLimit(event);
  const { token, password } = await body(event, resetPasswordSchema);

  const result = await authService.resetPassword(token, password, clientIp(event));
  if (!result.success) abort(400, 'BAD_REQUEST', result.error ?? 'Password reset failed');

  return ok(undefined, { message: 'Password has been reset successfully.' });
});
