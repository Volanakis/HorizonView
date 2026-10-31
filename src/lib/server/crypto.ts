import crypto from 'crypto';

export function generateTokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}