import { endpoint, ok } from '$lib/server/http.js';
import { externalLimit } from '$lib/server/rate-limit.js';
import { externalApiService } from '$lib/server/services/external-api.service.js';

/** EUR-based rates; falls back to fixed indicative rates when the provider is unavailable. */
export const GET = endpoint(async (event) => {
  externalLimit(event);
  const base = event.url.searchParams.get('base') || 'EUR';
  const symbols = (event.url.searchParams.get('symbols') || 'USD,GBP').split(',').map((s) => s.trim().toUpperCase());
  return ok(await externalApiService.getExchangeRates(base, symbols));
});
