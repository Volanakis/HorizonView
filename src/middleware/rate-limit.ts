import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const isTest = process.env.NODE_ENV === 'test';
const ipKey = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';

// POST /api/auth/login — 5 requests per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts, try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey
});

// POST /api/auth/register — 3 requests per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many registration attempts, try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey
});

// POST /api/auth/refresh — 10 requests per 15 minutes per IP
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many token refresh attempts, try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey
});

// All other API endpoints — 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false
});
