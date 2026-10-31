import { endpoint, idParam, noContent, abort } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { ErrorCodes } from '$lib/server/errors.js';
import { reservationService } from '$lib/server/services/reservation.service.js';

/** Cancels a reservation; ownership is checked against the session, never the request body. */
export const DELETE = endpoint((event) => {
  const { userId } = requireUser(event, 'customer', 'manager', 'admin');
  const id = idParam(event);
  requireCsrf(event);

  const result = reservationService.cancel(id, userId);
  if (!result.success) {
    const code = 'code' in result ? result.code : undefined;
    if (code === ErrorCodes.UNAUTHORIZED) abort(403, 'FORBIDDEN', result.error ?? 'Forbidden');
    if (code === ErrorCodes.RESERVATION_NOT_FOUND) abort(404, 'NOT_FOUND', result.error ?? 'Reservation not found');
    abort(400, 'BAD_REQUEST', result.error ?? 'Cancellation failed');
  }
  return noContent();
});
