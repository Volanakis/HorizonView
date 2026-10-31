import { endpoint, query, ok, paginate } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { auditQuerySchema } from '$lib/server/schemas.js';
import { userService } from '$lib/server/services/user.service.js';

export const GET = endpoint((event) => {
  requireUser(event, 'admin');
  const { action, page = 1, limit = 30 } = query(event, auditQuerySchema);
  const { logs, total } = userService.listAudit({ action, page, limit });
  return ok(logs, { pagination: paginate(page, limit, total) });
});
