import { Request, Response, NextFunction } from 'express';
import { externalApiService } from '../services/external-api.service.js';

/**
 * Middleware that validates phone (Numverify) and email (Mailboxlayer)
 * before allowing registration to proceed.
 * Halts with 422 if either API returns invalid.
 * Falls back gracefully (allows registration) if APIs are unavailable.
 */
export async function validateRegistrationExternal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip external validation in test environment
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const { email, phone } = req.body as { email?: string; phone?: string };

  // Validate email via Mailboxlayer
  if (email) {
    const emailResult = await externalApiService.validateEmail(email);
    if (!emailResult.valid) {
      res.status(422).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: emailResult.message }
      });
      return;
    }
  }

  // Validate phone via Numverify
  if (phone) {
    const phoneResult = await externalApiService.validatePhone(phone);
    if (!phoneResult.valid) {
      res.status(422).json({
        success: false,
        error: { code: 'INVALID_PHONE', message: phoneResult.message }
      });
      return;
    }
  }

  next();
}
