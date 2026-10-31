import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { seed } from '$lib/server/db/seed.js';
import { authService } from '$lib/server/services/auth.service.js';
import { ALLOWED_ORIGINS, NODE_ENV, assertServerConfig } from '$lib/server/config.js';
import { ensureCsrfCookie } from '$lib/server/csrf.js';
import { apiLimit } from '$lib/server/rate-limit.js';
import { ApiFailure } from '$lib/server/http.js';

export const init: ServerInit = async () => {
  assertServerConfig();

  if (NODE_ENV !== 'test') {
    // Auto-seed an empty database (Render's filesystem is ephemeral).
    const users = db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users');
    if (!users?.cnt) {
      console.log('Empty database detected, seeding...');
      await seed();
    } else {
      console.log(`Database initialized (${users.cnt} users)`);
    }

    const purged = authService.cleanupStaleData();
    if (purged.purgedTokens || purged.purgedResetTokens || purged.purgedAuditLogs) {
      console.log(`Cleanup: ${purged.purgedTokens} expired tokens, ${purged.purgedResetTokens} reset tokens, ${purged.purgedAuditLogs} audit logs purged`);
    }
  }

  // adapter-node emits this after it stops accepting requests (SIGINT/SIGTERM).
  process.on('sveltekit:shutdown', () => db.close());
};

// Security headers for everything SvelteKit renders. Pages also get the CSP from svelte.config.js.
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none'
};

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' };
}

export const handle: Handle = async ({ event, resolve }) => {
  const started = performance.now();
  const isApi = event.url.pathname === '/api' || event.url.pathname.startsWith('/api/');

  ensureCsrfCookie(event);

  let response: Response;
  if (isApi && event.request.method === 'OPTIONS') {
    response = new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(event.request),
        'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        'Access-Control-Allow-Headers': event.request.headers.get('access-control-request-headers') ?? 'Content-Type, X-CSRF-Token'
      }
    });
  } else if (isApi) {
    try {
      apiLimit(event);
      response = await resolve(event);
    } catch (error) {
      if (!(error instanceof ApiFailure)) throw error;
      response = error.response;
    }
    for (const [name, value] of Object.entries(corsHeaders(event.request))) response.headers.set(name, value);
    // JSON never needs to load anything, and holds personal data: lock it down and don't cache it.
    response.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    response.headers.set('Cache-Control', 'no-store');
  } else {
    response = await resolve(event);
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);

  if (NODE_ENV !== 'test') {
    console.log(`${event.request.method} ${event.url.pathname} ${response.status} ${(performance.now() - started).toFixed(1)}ms`);
  }
  return response;
};

export const handleError: HandleServerError = ({ error, status }) => {
  if (status !== 404) console.error('Unhandled error:', error instanceof Error ? error.stack ?? error.message : error);
  return { message: 'Internal server error' };
};
