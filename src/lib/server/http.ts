import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import type { ZodSchema } from 'zod';
import type { Pagination } from '../types.js';

// Every API response uses the { success, data?, error?, pagination? } envelope.

export function ok(data?: unknown, init: { status?: number; pagination?: Pagination; message?: string } = {}): Response {
  const body: Record<string, unknown> = { success: true };
  if (data !== undefined) body.data = data;
  if (init.pagination) body.pagination = init.pagination;
  if (init.message) body.message = init.message;
  return Response.json(body, { status: init.status ?? 200 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function fail(
  status: number,
  code: string,
  message: string,
  extra: { details?: unknown; headers?: Record<string, string> } = {}
): Response {
  const error: Record<string, unknown> = { code, message };
  if (extra.details) error.details = extra.details;
  return Response.json({ success: false, error }, { status, headers: extra.headers });
}

/** Thrown by helpers to stop a handler with a ready-made error response. */
export class ApiFailure extends Error {
  constructor(public response: Response) {
    super(`API failure ${response.status}`);
  }
}

export function abort(...args: Parameters<typeof fail>): never {
  throw new ApiFailure(fail(...args));
}

/** Wraps a +server.ts handler: helper failures become their response, anything else a generic 500. */
export function endpoint(handler: (event: RequestEvent) => Response | Promise<Response>): RequestHandler {
  return async (event) => {
    try {
      return await handler(event);
    } catch (error) {
      if (error instanceof ApiFailure) return error.response;
      console.error('Unhandled error:', error instanceof Error ? error.stack ?? error.message : error);
      return fail(500, 'SERVER_ERROR', 'Internal server error');
    }
  };
}

export function paginate(page: number, limit: number, total: number): Pagination {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}

const MAX_BODY_BYTES = 100 * 1024;

/** Reads the JSON body without validating it (rate limiters key on raw fields first). */
export async function readJson(event: RequestEvent): Promise<unknown> {
  const text = await event.request.text();
  if (text.length > MAX_BODY_BYTES) abort(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    abort(400, 'BAD_REQUEST', 'Malformed JSON body');
  }
}

export function validate<T>(raw: unknown, schema: ZodSchema<T>): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    abort(422, 'VALIDATION_ERROR', `Invalid input: ${details.map((d) => d.field).join(', ')}`, { details });
  }
  return result.data;
}

export async function body<T>(event: RequestEvent, schema: ZodSchema<T>): Promise<T> {
  return validate(await readJson(event), schema);
}

export function query<T>(event: RequestEvent, schema: ZodSchema<T>): T {
  const result = schema.safeParse(Object.fromEntries(event.url.searchParams));
  if (!result.success) {
    abort(400, 'INVALID_QUERY', 'Invalid query parameters', {
      details: result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
    });
  }
  return result.data;
}

/** The :id route parameter as a positive integer. */
export function idParam(event: RequestEvent): number {
  const id = Number(event.params.id);
  if (!Number.isInteger(id) || id < 1) abort(400, 'BAD_REQUEST', 'Invalid id parameter — must be a positive integer');
  return id;
}

export function clientIp(event: RequestEvent): string {
  try {
    return event.getClientAddress();
  } catch {
    return 'unknown';
  }
}
