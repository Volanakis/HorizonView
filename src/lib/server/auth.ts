import type { Cookies, RequestEvent } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import type { JwtPayload, UserRole } from '../types.js';
import { JWT_SECRET, NODE_ENV } from './config.js';
import { generateRandomToken } from './crypto.js';
import { getDb } from './db/index.js';
import { abort } from './http.js';

const ACCESS_TTL_S = 15 * 60;
const REFRESH_TTL_S = 7 * 24 * 60 * 60;

export function generateTokens(payload: JwtPayload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL_S });
  const refreshToken = generateRandomToken();
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_TTL_S * 1000);
}

const cookieOptions = {
  path: '/',
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'strict'
} as const;

export function setSessionCookies(cookies: Cookies, accessToken: string, refreshToken: string): void {
  cookies.set('access_token', accessToken, { ...cookieOptions, maxAge: ACCESS_TTL_S });
  cookies.set('refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_TTL_S });
}

export function clearSessionCookies(cookies: Cookies): void {
  cookies.delete('access_token', cookieOptions);
  cookies.delete('refresh_token', cookieOptions);
}

/** The signed-in, active user if there is one — for public endpoints that show staff more. */
export function currentUser(event: RequestEvent): JwtPayload | null {
  const token = event.cookies.get('access_token');
  const user = token ? verifyToken(token) : null;
  if (!user) return null;
  const row = getDb().get<{ is_active: number }>('SELECT is_active FROM users WHERE id = ?', [user.userId]);
  return row?.is_active ? user : null;
}

/**
 * The signed-in user, or a 401/403 response. Deactivated accounts are rejected
 * on every request, so disabling a user takes effect immediately.
 */
export function requireUser(event: RequestEvent, ...roles: UserRole[]): JwtPayload {
  const token = event.cookies.get('access_token');
  if (!token) abort(401, 'UNAUTHORIZED', 'Authentication required');

  const user = verifyToken(token);
  if (!user) abort(401, 'UNAUTHORIZED', 'Invalid or expired token');

  const row = getDb().get<{ is_active: number }>('SELECT is_active FROM users WHERE id = ?', [user.userId]);
  if (!row || row.is_active === 0) abort(401, 'ACCOUNT_DISABLED', 'Your account has been deactivated');

  if (roles.length && !roles.includes(user.role)) abort(403, 'FORBIDDEN', 'Insufficient permissions');
  return user;
}
