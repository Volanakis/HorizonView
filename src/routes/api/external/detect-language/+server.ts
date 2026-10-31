import { endpoint, ok, clientIp } from '$lib/server/http.js';
import { externalLimit } from '$lib/server/rate-limit.js';
import { externalApiService } from '$lib/server/services/external-api.service.js';

/** IP-based country lookup. The UI no longer calls this; it reads the browser language instead. */
export const GET = endpoint(async (event) => {
  externalLimit(event);
  return ok(await externalApiService.detectCountry(clientIp(event)));
});
