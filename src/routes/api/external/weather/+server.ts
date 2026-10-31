import { endpoint, ok, abort } from '$lib/server/http.js';
import { externalLimit } from '$lib/server/rate-limit.js';
import { externalApiService } from '$lib/server/services/external-api.service.js';

/** Current weather for a city or IATA code; null when the provider has nothing. */
export const GET = endpoint(async (event) => {
  externalLimit(event);
  const location = event.url.searchParams.get('location');
  if (!location) abort(400, 'BAD_REQUEST', 'location query parameter required');
  return ok(await externalApiService.getWeather(location));
});
