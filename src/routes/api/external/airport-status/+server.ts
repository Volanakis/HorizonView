import { endpoint, ok, abort } from '$lib/server/http.js';
import { externalLimit } from '$lib/server/rate-limit.js';
import { requireUser } from '$lib/server/auth.js';
import { externalApiService } from '$lib/server/services/external-api.service.js';

/** Airport congestion around a time — managers and admins only. */
export const GET = endpoint(async (event) => {
  externalLimit(event);
  requireUser(event, 'manager', 'admin');

  const iata = (event.url.searchParams.get('iata') ?? '').toUpperCase();
  const datetime = event.url.searchParams.get('datetime') ?? '';
  if (iata.length !== 3) abort(400, 'BAD_REQUEST', 'Valid 3-letter IATA code required');
  if (!datetime) abort(400, 'BAD_REQUEST', 'datetime query parameter required');

  return ok(await externalApiService.checkAirportCongestion(iata, datetime));
});
