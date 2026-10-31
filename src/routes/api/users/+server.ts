import { endpoint, query, ok, paginate } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { userListQuerySchema } from '$lib/server/schemas.js';
import { userService } from '$lib/server/services/user.service.js';

export const GET = endpoint((event) => {
  requireUser(event, 'admin');
  const { role, search, page = 1, limit = 20 } = query(event, userListQuerySchema);
  const { users, total } = userService.list({ role, search, page, limit });
  return ok(users, { pagination: paginate(page, limit, total) });
});
