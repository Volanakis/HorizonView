import type { RequestEvent } from '@sveltejs/kit';
import { NODE_ENV } from './config.js';
import { abort, clientIp } from './http.js';

interface Window { count: number; resetAt: number }

/**
 * Fixed-window, in-memory limiter (one server process). Behind a proxy, set
 * adapter-node's ADDRESS_HEADER / XFF_DEPTH so client IPs are real.
 */
function limiter(windowMs: number, max: number, message: string) {
  const windows = new Map<string, Window>();

  return (event: RequestEvent, key = clientIp(event)): void => {
    if (NODE_ENV === 'test') return;
    const now = Date.now();
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }
    let w = windows.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowMs };
      windows.set(key, w);
    }
    w.count++;
    if (w.count > max) {
      const retryAfter = Math.ceil((w.resetAt - now) / 1000);
      abort(429, 'RATE_LIMITED', message, {
        headers: {
          'Retry-After': String(retryAfter),
          'RateLimit-Limit': String(max),
          'RateLimit-Remaining': '0',
          'RateLimit-Reset': String(retryAfter)
        }
      });
    }
  };
}

const MIN = 60 * 1000;

/** Every /api request — 100 per 15 minutes per IP (static assets are not counted). */
export const apiLimit = limiter(15 * MIN, 100, 'Too many requests');
/** Keyed by IP + username, so one shared IP can't lock out other accounts. */
export const loginLimit = limiter(15 * MIN, 5, 'Too many login attempts, try again later');
export const registerLimit = limiter(60 * MIN, 3, 'Too many registration attempts, try again later');
export const refreshLimit = limiter(15 * MIN, 10, 'Too many token refresh attempts, try again later');
export const forgotPasswordLimit = limiter(60 * MIN, 3, 'Too many password reset attempts, try again later');
export const resetPasswordLimit = limiter(15 * MIN, 5, 'Too many password reset attempts, try again later');
/** Third-party calls cost money — 10 per minute. */
export const externalLimit = limiter(MIN, 10, 'Too many external API requests');

export function userKey(event: RequestEvent, raw: unknown): string {
  const username = (raw as { username?: unknown })?.username;
  const name = typeof username === 'string' ? username.toLowerCase().trim() : '';
  return name ? `${clientIp(event)}:${name}` : clientIp(event);
}
