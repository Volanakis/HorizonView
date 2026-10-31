import { endpoint, ok } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { userService } from '$lib/server/services/user.service.js';

export const GET = endpoint((event) => {
  requireUser(event, 'admin');
  return ok(userService.getStats());
});
