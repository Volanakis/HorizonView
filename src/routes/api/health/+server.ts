import { db } from '$lib/server/db/index.js';

/** Liveness + database check for load balancers: 200 { status: 'ok' } or 503. */
export function GET(): Response {
  let database = 'connected';
  try {
    db.get('SELECT 1');
  } catch {
    database = 'disconnected';
  }
  const healthy = database === 'connected';
  return Response.json({ status: healthy ? 'ok' : 'error', database }, { status: healthy ? 200 : 503 });
}
