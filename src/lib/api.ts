import type { Pagination } from './types';
import { t } from './i18n.svelte';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
    /** Field-level messages from Zod validation (422), keyed by field name */
    public fields: Record<string, string> = {}
  ) {
    super(message);
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  error?: { code: string; message: string; details?: { field: string; message: string }[] };
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Paths that must never trigger a silent token refresh. */
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh'];

let onSessionExpired: () => void = () => {};
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

function csrfToken(): string {
  const cookie = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='));
  return cookie ? decodeURIComponent(cookie.slice('csrf_token='.length)) : '';
}

// One refresh at a time: parallel 401s wait for the same rotation.
let refreshing: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': csrfToken() }
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function request<T = undefined>(
  path: string,
  options: { method?: Method; body?: unknown } = {},
  canRetry = true
): Promise<{ data: T; pagination?: Pagination }> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken();

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError(0, 'NETWORK', t('error.network'));
  }

  if (res.status === 401 && canRetry && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) return request<T>(path, options, false);
    onSessionExpired();
  }

  if (res.status === 204) return { data: undefined as T };

  let body: Envelope<T> | null = null;
  try { body = (await res.json()) as Envelope<T>; } catch { /* not JSON */ }

  if (!res.ok || !body?.success) {
    const fields = Object.fromEntries((body?.error?.details ?? []).map((d) => [d.field, d.message]));
    throw new ApiError(res.status, body?.error?.code, body?.error?.message ?? t('error.generic'), fields);
  }

  return { data: body.data as T, pagination: body.pagination };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : t('error.generic');
}
