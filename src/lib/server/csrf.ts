import type { RequestEvent } from '@sveltejs/kit';
import crypto from 'crypto';
import { NODE_ENV } from './config.js';
import { abort } from './http.js';

// Double-submit cookie: the page reads csrf_token and echoes it in X-CSRF-Token.
const COOKIE = 'csrf_token';
const HEADER = 'x-csrf-token';
const MAX_AGE_S = 24 * 60 * 60;

function setCookie(event: RequestEvent, value: string): void {
  event.cookies.set(COOKIE, value, {
    path: '/',
    httpOnly: false,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE_S
  });
}

/** Issues a token on first visit, and extends the existing one on every request. */
export function ensureCsrfCookie(event: RequestEvent): void {
  setCookie(event, event.cookies.get(COOKIE) || crypto.randomBytes(32).toString('hex'));
}

/** Fresh token after sign-in or registration, to prevent session fixation. */
export function rotateCsrfToken(event: RequestEvent): void {
  setCookie(event, crypto.randomBytes(32).toString('hex'));
}

export function requireCsrf(event: RequestEvent): void {
  const cookie = event.cookies.get(COOKIE);
  const header = event.request.headers.get(HEADER);
  if (!cookie || !header || cookie !== header) abort(403, 'FORBIDDEN', 'Invalid or missing CSRF token');
}
