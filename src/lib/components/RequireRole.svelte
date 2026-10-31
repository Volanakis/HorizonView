<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { UserRole } from '$lib/types';
  import { page } from '$app/state';
  import { session } from '$lib/session.svelte';
  import { t } from '$lib/i18n.svelte';

  let { roles, children }: { roles?: UserRole[]; children: Snippet } = $props();

  const loginHref = $derived(`/login?return=${encodeURIComponent(page.url.pathname + page.url.search)}`);
</script>

{#if !session.ready}
  <div class="skeleton" aria-busy="true" aria-label={t('common.loading')}></div>
{:else if !session.user}
  <div class="empty">
    <p>{t('guard.signIn')}</p>
    <a class="btn btn-primary" href={loginHref}>{t('nav.signIn')}</a>
  </div>
{:else if roles && !roles.includes(session.user.role)}
  <div class="empty">
    <p>{t('guard.forbidden')}</p>
    <a class="btn" href="/">{t('notFound.home')}</a>
  </div>
{:else}
  {@render children()}
{/if}
