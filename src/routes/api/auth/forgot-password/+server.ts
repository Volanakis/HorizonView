import { endpoint, body, ok, clientIp } from '$lib/server/http.js';
import { forgotPasswordLimit } from '$lib/server/rate-limit.js';
import { forgotPasswordSchema } from '$lib/server/schemas.js';
import { SHOW_RESET_TOKEN } from '$lib/server/config.js';
import { authService } from '$lib/server/services/auth.service.js';

export const POST = endpoint(async (event) => {
  forgotPasswordLimit(event);
  const { email } = await body(event, forgotPasswordSchema);
  const result = authService.forgotPassword(email, clientIp(event));

  if (SHOW_RESET_TOKEN && result.token) {
    console.log(`\n[Password Reset] Token for ${email}: ${result.token}\n`);
  }

  // Same answer whether or not the address exists, so accounts can't be enumerated.
  return ok(undefined, { message: 'If an account with that email exists, a reset link has been sent.' });
});
