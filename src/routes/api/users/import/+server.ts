import { endpoint, body, ok } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { userImportSchema } from '$lib/server/schemas.js';
import { userService } from '$lib/server/services/user.service.js';

/** Bulk import (1–500 users); existing usernames/emails are skipped, not overwritten. */
export const POST = endpoint(async (event) => {
  const admin = requireUser(event, 'admin');
  requireCsrf(event);
  const { users } = await body(event, userImportSchema);
  return ok(await userService.bulkImport(users, admin.userId));
});
