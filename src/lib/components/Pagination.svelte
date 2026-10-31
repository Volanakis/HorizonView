<script lang="ts">
  import { t } from '$lib/i18n.svelte';

  let { page, pages, onchange }: { page: number; pages: number; onchange: (page: number) => void } = $props();

  // 1 … 4 5 6 … 12 — 0 marks a gap.
  const range = $derived.by(() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const left = Math.max(2, page - 1);
    const right = Math.min(pages - 1, page + 1);
    const middle = Array.from({ length: right - left + 1 }, (_, i) => left + i);
    return [1, ...(left > 2 ? [0] : []), ...middle, ...(right < pages - 1 ? [0] : []), pages];
  });
</script>

{#if pages > 1}
  <nav class="pagination" aria-label={t('common.pagination')}>
    <button type="button" class="btn btn-sm" disabled={page <= 1} onclick={() => onchange(page - 1)}>
      {t('common.prev')}
    </button>
    <ol class="pages">
      {#each range as p, i (`${p}-${i}`)}
        <li>
          {#if p === 0}
            <span class="gap" aria-hidden="true">…</span>
          {:else}
            <button
              type="button"
              class="btn btn-sm num {p === page ? 'current' : 'btn-quiet'}"
              aria-current={p === page ? 'page' : undefined}
              aria-label={t('common.pageOf', { page: p, pages })}
              onclick={() => onchange(p)}
            >{p}</button>
          {/if}
        </li>
      {/each}
    </ol>
    <button type="button" class="btn btn-sm" disabled={page >= pages} onclick={() => onchange(page + 1)}>
      {t('common.next')}
    </button>
  </nav>
{/if}

<style>
  .pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .pages {
    display: flex;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .current { border-color: var(--text); }
  .gap { display: inline-block; padding: 0 0.25rem; color: var(--muted); }
</style>
