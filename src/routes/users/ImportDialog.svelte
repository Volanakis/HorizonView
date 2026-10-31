<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { request, errorMessage } from '$lib/api';
  import { t } from '$lib/i18n.svelte';
  import type { ImportResult } from '$lib/types';

  let { open = $bindable(false), onimported }: { open?: boolean; onimported: () => void } = $props();

  let dialog: HTMLDialogElement;
  let json = $state('');
  let error = $state('');
  let result = $state<ImportResult | null>(null);
  let importing = $state(false);

  $effect(() => {
    if (open && !dialog.open) {
      error = '';
      result = null;
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  });

  async function readFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) json = await file.text();
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = '';
    result = null;
    let users: unknown;
    try { users = JSON.parse(json); } catch { error = t('import.invalidJson'); return; }
    if (!Array.isArray(users)) { error = t('import.notArray'); return; }
    importing = true;
    try {
      result = (await request<ImportResult>('/users/import', { method: 'POST', body: { users } })).data;
      onimported();
    } catch (e) {
      error = errorMessage(e);
    } finally {
      importing = false;
    }
  }
</script>

<dialog bind:this={dialog} class="dialog wide" aria-labelledby="import-title" onclose={() => (open = false)}>
  <form class="dialog-body" onsubmit={submit} novalidate>
    <h2 id="import-title">{t('import.title')}</h2>
    <p class="small muted">{t('import.body')}</p>

    <div class="field">
      <label for="import-json">{t('import.field')}</label>
      <textarea
        id="import-json"
        class="input"
        spellcheck="false"
        placeholder={'[{"username":"jdoe","password":"Secret123!","name":"Jane Doe","email":"jane@example.com","identity_number":"AB123456","role":"customer"}]'}
        bind:value={json}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'import-error' : undefined}
      ></textarea>
      {#if error}<p class="error" id="import-error">{error}</p>{/if}
    </div>

    <label class="btn btn-sm file">
      <Icon name="upload" size={16} />{t('import.file')}
      <input class="visually-hidden" type="file" accept="application/json,.json" onchange={readFile} />
    </label>

    {#if result}
      <div class="result" role="status">
        <p class="small num"><strong>{t('import.result', { created: result.created, skipped: result.skipped, errors: result.errors.length })}</strong></p>
        {#if result.errors.length}
          <ul class="xs">{#each result.errors as message, i (i)}<li>{message}</li>{/each}</ul>
        {/if}
      </div>
    {/if}

    <div class="dialog-actions">
      <button type="button" class="btn" onclick={() => (open = false)}>{t('common.close')}</button>
      <button type="submit" class="btn btn-primary" disabled={importing || !json.trim()}>
        {importing ? t('import.importing') : t('import.submit')}
      </button>
    </div>
  </form>
</dialog>

<style>
  .wide { width: min(40rem, calc(100vw - 2rem)); }
  .file { justify-self: start; }
  .file:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
  .result { padding: 0.75rem 1rem; border: 1px solid var(--hairline); border-radius: var(--r-control); background: var(--sunken); }
  .result ul { margin: 0.5rem 0 0; padding-left: 1.25rem; color: var(--danger); }
</style>
