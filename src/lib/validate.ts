// Client-side checks mirror the API's Zod schemas so problems show up while typing.
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE = /^[\d\s\-+()]{5,20}$/;
export const STRONG_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

/** Only same-site paths are accepted as a post-login destination. */
export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}
