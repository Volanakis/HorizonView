import { endpoint, idParam, ok, abort } from '$lib/server/http.js';
import { flightService } from '$lib/server/services/flight.service.js';

const CLASSES = ['economy', 'normal', 'business'];

/** Public seat map: availability only, never who booked a seat. */
export const GET = endpoint((event) => {
  const id = idParam(event);
  if (!flightService.getById(id)) abort(404, 'NOT_FOUND', 'Flight not found');

  const classFilter = event.url.searchParams.get('class') ?? undefined;
  if (classFilter && !CLASSES.includes(classFilter)) {
    abort(400, 'BAD_REQUEST', 'Invalid class filter. Must be economy, normal, or business.');
  }

  const seats = flightService.getSeats(id, classFilter).map((s) => ({
    number: s.seat_number,
    class: s.class,
    price: s.price,
    status: s.is_available ? 'available' : 'reserved'
  }));
  return ok({ flight_id: id, seats });
});
