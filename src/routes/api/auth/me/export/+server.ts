import { endpoint } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { accountService } from '$lib/server/services/account.service.js';

/** A downloadable copy of everything stored about the signed-in user. */
export const GET = endpoint((event) => {
  const { userId, username } = requireUser(event);
  return new Response(JSON.stringify(accountService.exportData(userId), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="horizonview-data-${username.replace(/[^\w.-]/g, '_')}.json"`
    }
  });
});
