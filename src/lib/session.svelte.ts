import type { AuthUser } from './types';
import { request, setSessionExpiredHandler } from './api';
import { toast } from './toast.svelte';
import { t } from './i18n.svelte';

class Session {
  user = $state<AuthUser | null>(null);
  /** False until the first /auth/me answer, so pages don't flash the signed-out state. */
  ready = $state(false);

  role = $derived(this.user?.role ?? null);
  isStaff = $derived(this.role === 'manager' || this.role === 'admin');
  isAdmin = $derived(this.role === 'admin');
  canBook = $derived(this.role === 'customer');
  hasTrips = $derived(this.role !== null && this.role !== 'visitor');

  async load(): Promise<void> {
    try {
      this.user = (await request<AuthUser>('/auth/me')).data;
    } catch {
      this.user = null;
    }
    this.ready = true;
  }

  async signIn(username: string, password: string): Promise<void> {
    await request('/auth/login', { method: 'POST', body: { username, password } });
    await this.load();
  }

  async signOut(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
    this.user = null;
  }
}

export const session = new Session();

setSessionExpiredHandler(() => {
  if (!session.user) return;
  session.user = null;
  toast.error(t('session.expired'));
});
