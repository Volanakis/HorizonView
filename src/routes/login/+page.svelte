<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { ApiError, errorMessage } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { t } from '$lib/i18n.svelte';
  import { safeReturnPath } from '$lib/validate';

  let username = $state('');
  let password = $state('');
  let submitting = $state(false);
  let error = $state('');
  let tried = $state(false);

  const returnTo = $derived(safeReturnPath(page.url.searchParams.get('return')));
  const registerHref = $derived(`/register${page.url.search}`);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    tried = true;
    error = '';
    if (!username.trim() || !password) return;
    submitting = true;
    try {
      await session.signIn(username.trim(), password);
      goto(returnTo, { replaceState: true });
    } catch (e) {
      error = e instanceof ApiError && e.status === 401 ? t('auth.invalid') : errorMessage(e);
      password = '';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>{t('auth.title')} · HorizonView</title></svelte:head>

<div class="page auth">
  <section class="card stack" aria-labelledby="login-title">
    <h1 id="login-title">{t('auth.title')}</h1>
    <form class="stack" onsubmit={submit} novalidate>
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
      <div class="field">
        <label for="username">{t('auth.username')}</label>
        <input id="username" class="input" autocomplete="username" autocapitalize="none" spellcheck="false" bind:value={username} aria-invalid={tried && !username.trim() ? 'true' : undefined} aria-describedby="username-err" />
        {#if tried && !username.trim()}<p class="error" id="username-err">{t('v.required')}</p>{/if}
      </div>
      <div class="field">
        <label for="password">{t('auth.password')}</label>
        <input id="password" class="input" type="password" autocomplete="current-password" bind:value={password} aria-invalid={tried && !password ? 'true' : undefined} aria-describedby="password-err" />
        {#if tried && !password}<p class="error" id="password-err">{t('v.required')}</p>{/if}
      </div>
      <button class="btn btn-primary" type="submit" disabled={submitting}>{submitting ? t('auth.submitting') : t('auth.submit')}</button>
    </form>
    <p class="small muted">{t('auth.new')} <a href={registerHref}>{t('auth.createLink')}</a></p>
  </section>
</div>

<style>
  .auth { max-width: 26rem; padding-top: 2.5rem; }
</style>
