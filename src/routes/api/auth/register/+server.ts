import { endpoint, readJson, validate, ok, abort, clientIp } from '$lib/server/http.js';
import { registerLimit, userKey } from '$lib/server/rate-limit.js';
import { registerSchema } from '$lib/server/schemas.js';
import { checkRegistrationExternally } from '$lib/server/registration-checks.js';
import { rotateCsrfToken } from '$lib/server/csrf.js';
import { authService } from '$lib/server/services/auth.service.js';

const FIELD_LABELS: Record<string, string> = {
  username: 'Username',
  email: 'Email',
  identity_number: 'Identity number (AT)'
};

export const POST = endpoint(async (event) => {
  const raw = await readJson(event);
  registerLimit(event, userKey(event, raw));
  const data = validate(raw, registerSchema);
  await checkRegistrationExternally(data.email, data.phone);

  let user;
  try {
    user = await authService.register({ ...data, ipAddress: clientIp(event) });
  } catch (error) {
    const field = (error instanceof Error ? error.message : '').match(/UNIQUE constraint failed: users\.(\w+)/)?.[1];
    if (!field) throw error;
    const label = FIELD_LABELS[field] ?? field.charAt(0).toUpperCase() + field.slice(1);
    abort(409, 'CONFLICT', `${label} already exists`);
  }

  rotateCsrfToken(event);
  return ok({ user: { id: user.id, username: user.username, name: user.name, role: user.role } }, { status: 201 });
});
