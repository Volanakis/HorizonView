import { endpoint, body, query, ok, paginate } from '$lib/server/http.js';
import { currentUser, requireUser } from '$lib/server/auth.js';
import { requireCsrf } from '$lib/server/csrf.js';
import { flightCreateSchema, flightSearchSchema } from '$lib/server/schemas.js';
import { flightService } from '$lib/server/services/flight.service.js';
import type { FlightState } from '$lib/types.js';

export const GET = endpoint((event) => {
  const { from, to, date, page = 1, limit = 20 } = query(event, flightSearchSchema);
  const role = currentUser(event)?.role;
  const isStaff = role === 'manager' || role === 'admin';

  const { flights, total } = flightService.getAll({
    from,
    to,
    date,
    page,
    limit,
    // Customers and guests only see bookable/staffed flights; managers and admins see every state.
    states: isStaff ? undefined : (['created', 'staffed'] as FlightState[])
  });
  return ok(flights, { pagination: paginate(page, limit, total) });
});

export const POST = endpoint(async (event) => {
  const user = requireUser(event, 'manager', 'admin');
  requireCsrf(event);
  const data = await body(event, flightCreateSchema);
  const flight = flightService.create({ ...data, created_by: user.userId });
  return ok(flight, { status: 201 });
});
