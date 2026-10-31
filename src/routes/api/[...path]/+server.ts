import { fail } from '$lib/server/http.js';

/** Unknown /api paths answer in JSON, not with the HTML error page. */
export function fallback(): Response {
  return fail(404, 'NOT_FOUND', 'Endpoint not found');
}
