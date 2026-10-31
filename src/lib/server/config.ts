import dotenv from 'dotenv';
import { z } from 'zod';

// Read .env without writing it into process.env: SvelteKit imports this module while
// analysing the build, and a NODE_ENV leaking from .env would turn the client build
// into a development build. Real environment variables win over the file.
const fileEnv: Record<string, string> = {};
dotenv.config({ processEnv: fileEnv });

const ConfigSchema = z.object({
  DATABASE_URL: z.string().refine(v => v.startsWith('sqlite://'), 'DATABASE_URL must start with sqlite://').default('sqlite://./horizonview.db'),
  // Checked when the server starts (assertServerConfig), so builds don't need the secret.
  JWT_SECRET: z.string().default(''),
  ALLOWED_ORIGINS: z.string().default(''),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AVIATIONSTACK_API_KEY: z.string().optional(),
  NUMVERIFY_API_KEY: z.string().optional(),
  MAILBOXLAYER_API_KEY: z.string().optional(),
  IPSTACK_API_KEY: z.string().optional(),
  WEATHERSTACK_API_KEY: z.string().optional(),
  FIXER_API_KEY: z.string().optional(),
  ENABLE_EXTERNAL_VALIDATION: z.coerce.boolean().default(false),
  SHOW_RESET_TOKEN: z.coerce.boolean().default(false)
});

const result = ConfigSchema.safeParse({ ...fileEnv, ...process.env });

if (!result.success) {
  console.error('❌ Invalid environment variables:');
  result.error.errors.forEach(err => {
    console.error(`  - ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

const config = result.data;

/** Called once when the server starts (hooks.server.ts init). */
export function assertServerConfig(): void {
  if (config.JWT_SECRET.length < 32) {
    console.error('❌ Invalid environment variables:\n  - JWT_SECRET: JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
}

export function resolveDbPath(url?: string): string {
  return (url || config.DATABASE_URL).replace(/^sqlite:\/\//, '');
}

export const DATABASE_URL = config.DATABASE_URL;
export const JWT_SECRET = config.JWT_SECRET;
export const ALLOWED_ORIGINS = config.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
export const NODE_ENV = config.NODE_ENV;
export const ENABLE_EXTERNAL_VALIDATION = config.ENABLE_EXTERNAL_VALIDATION;
export const SHOW_RESET_TOKEN = config.SHOW_RESET_TOKEN;

export const EXTERNAL_API_KEYS = {
  AVIATIONSTACK: config.AVIATIONSTACK_API_KEY,
  NUMVERIFY: config.NUMVERIFY_API_KEY,
  MAILBOXLAYER: config.MAILBOXLAYER_API_KEY,
  IPSTACK: config.IPSTACK_API_KEY,
  WEATHERSTACK: config.WEATHERSTACK_API_KEY,
  FIXER: config.FIXER_API_KEY
};
