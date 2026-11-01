<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import RequireRole from '$lib/components/RequireRole.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import ImportDialog from './ImportDialog.svelte';
  import AuditLog from './AuditLog.svelte';
  import { request, errorMessage } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { toast } from '$lib/toast.svelte';
  import { t } from '$lib/i18n.svelte';
  import { formatDateTime, formatNumber } from '$lib/format';
  import type { AdminUser, Pagination as PageInfo, UserRole, UserStats } from '$lib/types';

  const ROLES: UserRole[] = ['customer', 'manager', 'admin', 'visitor'];
  const view = $derived(page.url.searchParams.get('view') === 'audit' ? 'audit' : 'accounts');

  let users = $state<AdminUser[]>([]);
  let pageInfo = $state<PageInfo>({ page: 1, limit: 20, total: 0, pages: 0 });
  let stats = $state<UserStats | null>(null);
  let loading = $state(true);
  let loadError = $state('');
  let search = $state('');
  let roleFilter = $state<UserRole | ''>('');
  let draftRole = $state<Record<number, UserRole>>({});
  let importOpen = $state(false);

  $effect(() => {
    if (session.isAdmin && view === 'accounts') {
      // Filters trigger their own reloads (debounced search, role change).
      untrack(() => {
        load(1);
        loadStats();
      });
    }
  });

  async function load(n: number) {
    loading = true;
    loadError = '';
    const query = new URLSearchParams({ page: String(n), limit: '20' });
    if (roleFilter) query.set('role', roleFilter);
    if (search.trim()) query.set('search', search.trim());
    try {
      const res = await request<AdminUser[]>(`/users?${query}`);
      users = res.data;
      if (res.pagination) pageInfo = res.pagination;
      draftRole = Object.fromEntries(users.map((u) => [u.id, u.role]));
    } catch (error) {
      loadError = errorMessage(error);
    } finally {
      loading = false;
    }
  }

  async function loadStats() {
    try { stats = (await request<UserStats>('/users/stats')).data; } catch { stats = null; }
  }

  let searchTimer: ReturnType<typeof setTimeout>;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => load(1), 300);
  }

  // ── Confirmations ─────────────────────────────────────────
  type Pending = { kind: 'role'; user: AdminUser; role: UserRole } | { kind: 'deactivate'; user: AdminUser };
  let pending = $state<Pending | null>(null);
  let confirmOpen = $state(false);
  let busy = $state(false);

  const dialog = $derived.by(() => {
    if (!pending) return null;
    const user = pending.user.username;
    return pending.kind === 'role'
      ? { title: t('users.roleTitle', { user }), body: t('users.roleBody', { user, role: t(`role.${pending.role}`) }), label: t('users.roleConfirm'), destructive: false }
      : { title: t('users.deactivateTitle', { user }), body: t('users.deactivateBody', { user }), label: t('users.deactivate'), destructive: true };
  });

  function ask(next: Pending) {
    pending = next;
    confirmOpen = true;
  }

  async function confirm() {
    if (!pending) return;
    const current = pending;
    busy = true;
    try {
      if (current.kind === 'role') {
        await request(`/users/${current.user.id}/role`, { method: 'PATCH', body: { role: current.role } });
        toast.success(t('users.roleChanged', { user: current.user.username, role: t(`role.${current.role}`) }));
        loadStats();
      } else {
        await setActive(current.user, false);
      }
      confirmOpen = false;
      await load(pageInfo.page);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      busy = false;
    }
  }

  async function setActive(user: AdminUser, active: boolean) {
    await request(`/users/${user.id}/status`, { method: 'PATCH', body: { is_active: active } });
    toast.success(t(active ? 'users.activated' : 'users.deactivated', { user: user.username }));
  }

  async function activate(user: AdminUser) {
    try {
      await setActive(user, true);
      await load(pageInfo.page);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
</script>

<svelte:head><title>{t('users.title')} · HorizonView</title></svelte:head>

<div class="page">
  <div class="page-header">
    <h1>{t('users.title')}</h1>
    {#if view === 'accounts' && session.isAdmin}
      <button class="btn btn-primary" type="button" onclick={() => (importOpen = true)}>{t('users.import')}</button>
    {/if}
  </div>

  <RequireRole roles={['admin']}>
    <nav class="segmented" aria-label={t('users.title')}>
      <a href="/users" aria-current={view === 'accounts' ? 'page' : undefined}>{t('users.tabUsers')}</a>
      <a href="/users?view=audit" aria-current={view === 'audit' ? 'page' : undefined}>{t('users.tabAudit')}</a>
    </nav>

    {#if view === 'audit'}
      <AuditLog />
    {:else}
      {#if stats}
        <section class="stats" aria-label={t('users.total')}>
          <p class="primary-stat">
            <span class="value num">{formatNumber(stats.total)}</span>
            <span class="small muted">{t('users.total')}</span>
          </p>
          <ul class="by-role">
            {#each ROLES as role (role)}
              <li><span class="num">{formatNumber(stats.byRole[role] ?? 0)}</span> <span class="muted">{t(`role.${role}`)}</span></li>
            {/each}
          </ul>
        </section>
      {/if}

      <div class="filters">
        <div class="field grow">
          <label for="search">{t('users.search')}</label>
          <input id="search" class="input" type="search" placeholder={t('users.searchPlaceholder')} bind:value={search} oninput={onSearch} />
        </div>
        <div class="field">
          <label for="role">{t('users.role')}</label>
          <select id="role" class="input" bind:value={roleFilter} onchange={() => load(1)}>
            <option value="">{t('users.allRoles')}</option>
            {#each ROLES as role (role)}<option value={role}>{t(`role.${role}`)}</option>{/each}
          </select>
        </div>
      </div>

      {#if loading && users.length === 0}
        <div class="skeleton tall"></div>
      {:else if loadError}
        <div class="empty"><p>{loadError}</p><button class="btn" type="button" onclick={() => load(pageInfo.page)}>{t('common.retry')}</button></div>
      {:else if users.length === 0}
        <div class="empty"><p>{t('users.empty')}</p></div>
      {:else}
        <p class="small muted num">{t('users.showing', { shown: users.length, total: pageInfo.total })}</p>
        <div class="table-wrap">
          <table class="table table-responsive">
            <thead>
              <tr>
                <th scope="col">{t('users.colUser')}</th>
                <th scope="col">{t('users.colRole')}</th>
                <th scope="col">{t('users.colStatus')}</th>
                <th scope="col">{t('users.colLastSeen')}</th>
                <th scope="col"><span class="visually-hidden">{t('manage.colActions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {#each users as user (user.id)}
                {@const self = user.id === session.user?.id}
                <tr>
                  <td data-label={t('users.colUser')}>
                    <div class="who">
                      <strong>{user.username}{#if self} <span class="chip">{t('users.you')}</span>{/if}</strong>
                      <span class="small">{user.name}</span>
                      <span class="xs muted">{user.email}</span>
                    </div>
                  </td>
                  <td data-label={t('users.colRole')}>
                    {#if self}
                      {t(`role.${user.role}`)}
                    {:else}
                      <div class="role-edit">
                        <label class="visually-hidden" for="role-{user.id}">{t('users.role')} · {user.username}</label>
                        <select id="role-{user.id}" class="input" bind:value={draftRole[user.id]}>
                          {#each ROLES as role (role)}<option value={role}>{t(`role.${role}`)}</option>{/each}
                        </select>
                        {#if draftRole[user.id] !== user.role}
                          <button class="btn btn-sm" type="button" onclick={() => ask({ kind: 'role', user, role: draftRole[user.id] })}>{t('users.apply')}</button>
                        {/if}
                      </div>
                    {/if}
                  </td>
                  <td data-label={t('users.colStatus')}>
                    <span class="chip {user.is_active ? 'chip-success' : 'chip-danger'}">{user.is_active ? t('users.active') : t('users.disabled')}</span>
                  </td>
                  <td data-label={t('users.colLastSeen')} class="num small">{user.last_login ? formatDateTime(user.last_login) : t('users.never')}</td>
                  <td class="cell-actions">
                    {#if !self}
                      {#if user.is_active}
                        <button class="btn btn-sm btn-danger" type="button" onclick={() => ask({ kind: 'deactivate', user })}>{t('users.deactivate')}</button>
                      {:else}
                        <button class="btn btn-sm" type="button" onclick={() => activate(user)}>{t('users.activate')}</button>
                      {/if}
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <Pagination page={pageInfo.page} pages={pageInfo.pages} onchange={load} />
      {/if}
    {/if}
  </RequireRole>
</div>

{#if dialog}
  <ConfirmDialog bind:open={confirmOpen} title={dialog.title} body={dialog.body} confirmLabel={dialog.label} destructive={dialog.destructive} {busy} onconfirm={confirm} />
{/if}

<ImportDialog bind:open={importOpen} onimported={() => { load(1); loadStats(); }} />

<style>
  .tall { min-height: 16rem; }

  .segmented {
    display: inline-flex;
    justify-self: start;
    padding: 0.25rem;
    gap: 0.25rem;
    border-radius: var(--r-control);
    background: var(--sunken);
  }
  .segmented a {
    min-height: 2.25rem;
    display: flex;
    align-items: center;
    padding: 0 1rem;
    border-radius: 6px;
    color: var(--muted);
    font-size: var(--fs-sm);
    font-weight: 600;
    text-decoration: none;
  }
  .segmented a[aria-current='page'] { background: var(--surface); color: var(--text); }

  /* One number carries the size; the breakdown stays secondary. */
  .stats { display: flex; flex-wrap: wrap; align-items: end; gap: 0.75rem 2.5rem; }
  .primary-stat { display: grid; }
  .value { font-family: var(--display); font-size: 3rem; font-weight: 500; line-height: 1; }
  .by-role { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; margin: 0; padding: 0; list-style: none; font-size: var(--fs-sm); }
  .by-role .num { font-weight: 600; }

  .filters { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; }
  .grow { flex: 1 1 16rem; }

  .who { display: grid; gap: 0.125rem; }
  .role-edit { display: flex; gap: 0.5rem; align-items: center; }
  .role-edit .input { min-height: 2.25rem; width: auto; }
</style>
