import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Sets a non-httpOnly CSRF token cookie if one is not already present.
 * Apply globally so the frontend always has a valid token to read.
 */
export function csrfInit(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // Must be readable by JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
  }
  next();
}

/**
 * Validates the double-submit CSRF cookie.
 * The client must read the csrf_token cookie and echo it back in the
 * X-CSRF-Token request header.
 */
export function csrfProtect(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid or missing CSRF token' }
    });
    return;
  }
  next();
}
