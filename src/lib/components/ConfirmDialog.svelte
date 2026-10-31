<script lang="ts">
  import { t } from '$lib/i18n.svelte';

  let {
    open = $bindable(false),
    title,
    body,
    confirmLabel,
    cancelLabel,
    destructive = false,
    busy = false,
    onconfirm
  }: {
    open?: boolean;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    busy?: boolean;
    onconfirm: () => void;
  } = $props();

  const id = $props.id();
  let dialog: HTMLDialogElement;

  // The native <dialog> traps focus, closes on Escape and makes the page inert.
  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="dialog"
  aria-labelledby="{id}-title"
  aria-describedby="{id}-body"
  onclose={() => (open = false)}
>
  <form
    class="dialog-body"
    onsubmit={(event) => {
      event.preventDefault();
      onconfirm();
    }}
  >
    <h2 id="{id}-title">{title}</h2>
    <p id="{id}-body" class="muted">{body}</p>
    <div class="dialog-actions">
      <!-- Cancel comes first in focus order so Enter never triggers the irreversible action by accident. -->
      <button type="button" class="btn" onclick={() => (open = false)}>{cancelLabel ?? t('common.cancel')}</button>
      <button type="submit" class="btn {destructive ? 'btn-destructive' : 'btn-primary'}" disabled={busy}>
        {confirmLabel}
      </button>
    </div>
  </form>
</dialog>

<style>
  .btn-destructive {
    background: var(--danger);
    border-color: var(--danger);
    color: var(--surface);
  }
</style>
