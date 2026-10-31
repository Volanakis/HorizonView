<script lang="ts">
  import { onMount } from 'svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { request, errorMessage } from '$lib/api';
  import { t } from '$lib/i18n.svelte';
  import { formatDateTime } from '$lib/format';
  import type { AuditEntry, Pagination as PageInfo } from '$lib/types';
  import type { MessageKey } from '$lib/locales/en';

  const ACTIONS = [
    'LOGIN', 'LOGIN_FAILED', 'REGISTER', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET',
    'FLIGHT_CREATE', 'FLIGHT_STATE_CHANGE', 'FLIGHT_DELETE',
    'RESERVATION_CREATE', 'RESERVATION_CANCEL',
    'ROLE_CHANGE', 'USER_IMPORT', 'USER_TOGGLE_ACTIVE'
  ] as const;

  let entries = $state<AuditEntry[]>([]);
  let pageInfo = $state<PageInfo>({ page: 1, limit: 30, total: 0, pages: 0 });
  let action = $state('');
  let loading = $state(true);
  let loadError = $state('');

  onMount(() => load(1));

  async function load(n: number) {
    loading = true;
    loadError = '';
    const query = new URLSearchParams({ page: String(n), limit: '30' });
    if (action) query.set('action', action);
    try {
      const res = await request<AuditEntry[]>(`/users/audit?${query}`);
      entries = res.data;
      if (res.pagination) pageInfo = res.pagination;
    } catch (error) {
      loadError = errorMessage(error);
    } finally {
      loading = false;
    }
  }

  const label = (value: string) =>
    (ACTIONS as readonly string[]).includes(value) ? t(`audit.${value}` as MessageKey) : value;
</script>

<section class="stack" aria-labelledby="audit-title">
  <h2 id="audit-title" class="visually-hidden">{t('users.tabAudit')}</h2>
  <div class="filters">
    <div class="field">
      <label for="audit-action">{t('audit.action')}</label>
      <select id="audit-action" class="input" bind:value={action} onchange={() => load(1)}>
        <option value="">{t('audit.allActions')}</option>
        {#each ACTIONS as value (value)}<option {value}>{label(value)}</option>{/each}
      </select>
    </div>
    <p class="xs muted">{t('audit.retention')}</p>
  </div>

  {#if loading && entries.length === 0}
    <div class="skeleton tall"></div>
  {:else if loadError}
    <div class="empty"><p>{loadError}</p><button class="btn" type="button" onclick={() => load(pageInfo.page)}>{t('common.retry')}</button></div>
  {:else if entries.length === 0}
    <div class="empty"><p>{t('audit.empty')}</p></div>
  {:else}
    <div class="table-wrap">
      <table class="table table-responsive">
        <thead>
          <tr>
            <th scope="col">{t('audit.time')}</th>
            <th scope="col">{t('audit.action')}</th>
            <th scope="col">{t('audit.actor')}</th>
            <th scope="col">{t('audit.target')}</th>
          </tr>
        </thead>
        <tbody>
          {#each entries as entry (entry.id)}
            <tr>
              <td data-label={t('audit.time')} class="num">{formatDateTime(entry.created_at)}</td>
              <td data-label={t('audit.action')} class:failed={entry.action === 'LOGIN_FAILED'}>{label(entry.action)}</td>
              <td data-label={t('audit.actor')}>{entry.actor_username ?? t('audit.anonymous')}</td>
              <td data-label={t('audit.target')} class="code small">{entry.entity ? `${entry.entity} #${entry.entity_id ?? '—'}` : '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pagination page={pageInfo.page} pages={pageInfo.pages} onchange={load} />
  {/if}
</section>

<style>
  .tall { min-height: 16rem; }
  .filters { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: end; }
  .failed { color: var(--danger); font-weight: 600; }
</style>
