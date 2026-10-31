import { endpoint, body, idParam, ok, abort } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { flightStateSchema } from '$lib/server/schemas.js';
import { flightService } from '$lib/server/services/flight.service.js';

/** created → staffed → completed, or → cancelled. The service enforces the state machine. */
export const PATCH = endpoint(async (event) => {
  const user = requireUser(event, 'manager', 'admin');
  const id = idParam(event);
  requireCsrf(event);
  const { state } = await body(event, flightStateSchema);

  const result = flightService.updateState(id, state, user.userId);
  if (!result.success) abort(422, 'INVALID_STATE', result.error ?? 'Invalid state change');
  return ok({ id, state });
});
