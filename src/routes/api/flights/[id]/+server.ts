import { endpoint, idParam, ok, noContent, abort } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { ErrorCodes } from '$lib/server/errors.js';
import { flightService } from '$lib/server/services/flight.service.js';

export const GET = endpoint((event) => {
  const flight = flightService.getById(idParam(event));
  if (!flight) abort(404, 'NOT_FOUND', 'Flight not found');
  return ok(flight);
});

/** Only flights still in the `created` state can be deleted; their seats and bookings go with them. */
export const DELETE = endpoint((event) => {
  const user = requireUser(event, 'manager', 'admin');
  const id = idParam(event);
  requireCsrf(event);

  const result = flightService.delete(id, user.userId);
  if (!result.success) {
    const notFound = 'code' in result && result.code === ErrorCodes.FLIGHT_NOT_FOUND;
    abort(notFound ? 404 : 422, notFound ? 'NOT_FOUND' : 'DELETE_FAILED', result.error ?? 'Delete failed');
  }
  return noContent();
});
