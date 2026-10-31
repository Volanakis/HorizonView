import { endpoint, body, query, ok, abort, paginate } from '$lib/server/http.js';
import { requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { reservationCreateSchema, reservationListQuerySchema } from '$lib/server/schemas.js';
import { ErrorCodes } from '$lib/server/errors.js';
import { reservationService } from '$lib/server/services/reservation.service.js';

const BOOKERS = ['customer', 'manager', 'admin'] as const;

/** The signed-in user's own reservations only. */
export const GET = endpoint((event) => {
  const { userId } = requireUser(event, ...BOOKERS);
  const { page = 1, limit = 20 } = query(event, reservationListQuerySchema);
  const { reservations, total } = reservationService.getByUser(userId, page, limit);
  return ok(reservations, { pagination: paginate(page, limit, total) });
});

/** Books inside a transaction that re-checks availability; seat_id is UNIQUE as the backstop. */
export const POST = endpoint(async (event) => {
  const { userId } = requireUser(event, ...BOOKERS);
  requireCsrf(event);
  const data = await body(event, reservationCreateSchema);

  const result = reservationService.create({ user_id: userId, ...data });
  if (!result.success) {
    if ('code' in result && result.code === ErrorCodes.SEAT_TAKEN) abort(409, 'CONFLICT', result.error ?? 'Seat is already taken');
    abort(400, 'BAD_REQUEST', result.error ?? 'Reservation failed');
  }
  return ok({ reservation: result.reservation }, { status: 201 });
});
