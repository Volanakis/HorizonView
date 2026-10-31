<script lang="ts">
  import Icon from './Icon.svelte';
  import { toast } from '$lib/toast.svelte';
  import { t } from '$lib/i18n.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each toast.items as item (item.id)}
    <div class="toast toast-{item.kind}" role={item.kind === 'error' ? 'alert' : 'status'}>
      {#if item.kind === 'success'}<span class="mark"><Icon name="check" size={18} /></span>{/if}
      {#if item.kind === 'error'}<span class="mark"><Icon name="x" size={18} /></span>{/if}
      <p>{item.message}</p>
      <button type="button" class="dismiss" aria-label={t('common.dismiss')} onclick={() => toast.dismiss(item.id)}>
        <Icon name="x" size={16} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    z-index: 50;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    display: grid;
    gap: 0.5rem;
    width: min(28rem, calc(100vw - 2rem));
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.75rem 0.5rem 0.75rem 1rem;
    border: 1px solid var(--hairline);
    border-radius: var(--r-card);
    background: var(--surface);
    box-shadow: var(--shadow-overlay);
    font-size: var(--fs-sm);
    font-weight: 500;
    pointer-events: auto;
  }

  .toast p { flex: 1; padding-top: 0.125rem; }
  .mark { display: flex; padding-top: 0.125rem; }
  .toast-success .mark { color: var(--success); }
  .toast-error { border-color: var(--danger); }
  .toast-error .mark { color: var(--danger); }

  .dismiss {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: var(--r-control);
    background: none;
    color: var(--muted);
    cursor: pointer;
  }
  .dismiss:hover { background: var(--sunken); }

  @media (min-width: 48rem) {
    .toasts { left: auto; right: 1.5rem; top: 4.5rem; transform: none; }
  }
</style>
