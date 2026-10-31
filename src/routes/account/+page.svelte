<script lang="ts">
  import { goto } from '$app/navigation';
  import Preferences from '$lib/components/Preferences.svelte';
  import { request, errorMessage, ApiError } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { toast } from '$lib/toast.svelte';
  import { settings, t } from '$lib/i18n.svelte';
  import { EMAIL, PHONE, STRONG_PASSWORD } from '$lib/validate';
  import type { AuthUser } from '$lib/types';

  // ── Profile ───────────────────────────────────────────────
  let profile = $state({ name: '', email: '', phone: '', address: '' });
  let profileTried = $state(false);
  let profileSaving = $state(false);
  let profileError = $state('');
  let profileServer = $state<Record<string, string>>({});

  $effect(() => {
    const user = session.user;
    if (user) profile = { name: user.name, email: user.email, phone: user.phone ?? '', address: user.address ?? '' };
  });

  const profileErrors = $derived.by(() => {
    const e: Record<string, string> = {};
    if (profile.name.trim().length < 2) e.name = t('v.nameMin');
    if (!EMAIL.test(profile.email)) e.email = t('v.email');
    if (profile.phone && !PHONE.test(profile.phone)) e.phone = t('v.phone');
    return e;
  });
  const showProfile = (f: string) => (profileTried ? profileErrors[f] : undefined) ?? profileServer[f];

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault();
    profileTried = true;
    profileError = '';
    profileServer = {};
    const user = session.user;
    if (!user || Object.keys(profileErrors).length) return;

    const changes: Record<string, string> = {};
    if (profile.name.trim() !== user.name) changes.name = profile.name.trim();
    if (profile.email.trim() !== user.email) changes.email = profile.email.trim();
    if (profile.phone !== (user.phone ?? '')) changes.phone = profile.phone;
    if (profile.address !== (user.address ?? '')) changes.address = profile.address;
    if (!Object.keys(changes).length) {
      profileError = t('account.noChanges');
      return;
    }

    profileSaving = true;
    try {
      session.user = (await request<AuthUser>('/auth/profile', { method: 'PATCH', body: changes })).data;
      profileTried = false;
      toast.success(t('account.saved'));
    } catch (error) {
      if (error instanceof ApiError) profileServer = error.fields;
      profileError = errorMessage(error);
    } finally {
      profileSaving = false;
    }
  }

  // ── Password ──────────────────────────────────────────────
  let pw = $state({ current: '', next: '', confirm: '' });
  let pwTried = $state(false);
  let pwSaving = $state(false);
  let pwError = $state('');

  const pwErrors = $derived.by(() => {
    const e: Record<string, string> = {};
    if (!pw.current) e.current = t('v.currentPassword');
    if (!STRONG_PASSWORD.test(pw.next)) e.next = t('v.password');
    if (pw.confirm !== pw.next) e.confirm = t('v.passwordMatch');
    return e;
  });
  const showPw = (f: string) => (pwTried ? pwErrors[f] : undefined);

  async function changePassword(event: SubmitEvent) {
    event.preventDefault();
    pwTried = true;
    pwError = '';
    if (Object.keys(pwErrors).length) return;
    pwSaving = true;
    try {
      await request('/auth/profile', { method: 'PATCH', body: { currentPassword: pw.current, newPassword: pw.next } });
      pw = { current: '', next: '', confirm: '' };
      pwTried = false;
      toast.success(t('account.passwordChanged'));
    } catch (error) {
      pwError = errorMessage(error);
    } finally {
      pwSaving = false;
    }
  }

  async function signOut() {
    try {
      await session.signOut();
      toast.info(t('account.signedOut'));
      goto('/');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
</script>

<svelte:head><title>{t('account.title')} · HorizonView</title></svelte:head>

<div class="page narrow">
  <div class="page-header">
    <div>
      <h1>{t('account.title')}</h1>
      {#if session.user}
        <p class="small muted">{t('account.signedInAs', { username: session.user.username, role: t(`role.${session.user.role}`) })}</p>
      {/if}
    </div>
    {#if session.user}<button class="btn" type="button" onclick={signOut}>{t('common.signOut')}</button>{/if}
  </div>

  {#if !session.ready}
    <div class="skeleton tall"></div>
  {:else if !session.user}
    <section class="card stack">
      <p>{t('account.guest')}</p>
      <div class="row">
        <a class="btn btn-primary" href="/login">{t('nav.signIn')}</a>
        <a class="btn" href="/register">{t('account.create')}</a>
      </div>
    </section>
  {:else}
    <section class="card stack" aria-labelledby="profile-title">
      <h2 id="profile-title">{t('account.profile')}</h2>
      <form class="stack" onsubmit={saveProfile} novalidate>
        {#if profileError}<p class="form-error" role="alert">{profileError}</p>{/if}
        <div class="form-grid">
          <div class="field">
            <label for="p-name">{t('account.name')}</label>
            <input id="p-name" class="input" autocomplete="name" bind:value={profile.name} aria-invalid={showProfile('name') ? 'true' : undefined} aria-describedby="p-name-err" />
            {#if showProfile('name')}<p class="error" id="p-name-err">{showProfile('name')}</p>{/if}
          </div>
          <div class="field">
            <label for="p-email">{t('account.email')}</label>
            <input id="p-email" class="input" type="email" autocomplete="email" bind:value={profile.email} aria-invalid={showProfile('email') ? 'true' : undefined} aria-describedby="p-email-err" />
            {#if showProfile('email')}<p class="error" id="p-email-err">{showProfile('email')}</p>{/if}
          </div>
          <div class="field">
            <label for="p-phone">{t('account.phone')} <span class="muted">({t('common.optional')})</span></label>
            <input id="p-phone" class="input" type="tel" autocomplete="tel" placeholder="+30 210 123 4567" bind:value={profile.phone} aria-invalid={showProfile('phone') ? 'true' : undefined} aria-describedby="p-phone-err" />
            {#if showProfile('phone')}<p class="error" id="p-phone-err">{showProfile('phone')}</p>{/if}
          </div>
          <div class="field">
            <label for="p-address">{t('account.address')} <span class="muted">({t('common.optional')})</span></label>
            <input id="p-address" class="input" autocomplete="street-address" maxlength="200" bind:value={profile.address} />
          </div>
        </div>
        <div><button class="btn btn-primary" type="submit" disabled={profileSaving}>{profileSaving ? t('account.saving') : t('account.save')}</button></div>
      </form>
    </section>

    <section class="card stack" aria-labelledby="pw-title">
      <h2 id="pw-title">{t('account.password')}</h2>
      <form class="stack" onsubmit={changePassword} novalidate>
        {#if pwError}<p class="form-error" role="alert">{pwError}</p>{/if}
        <!-- Lets password managers pair the new password with the right account. -->
        <input class="visually-hidden" type="text" autocomplete="username" value={session.user.username} readonly tabindex="-1" aria-hidden="true" />
        <div class="form-grid">
          <div class="field">
            <label for="pw-current">{t('account.currentPassword')}</label>
            <input id="pw-current" class="input" type="password" autocomplete="current-password" bind:value={pw.current} aria-invalid={showPw('current') ? 'true' : undefined} aria-describedby="pw-current-err" />
            {#if showPw('current')}<p class="error" id="pw-current-err">{showPw('current')}</p>{/if}
          </div>
          <div class="field">
            <label for="pw-next">{t('account.newPassword')}</label>
            <input id="pw-next" class="input" type="password" autocomplete="new-password" bind:value={pw.next} aria-invalid={showPw('next') ? 'true' : undefined} aria-describedby="pw-next-hint" />
            <p class="hint" class:error={!!showPw('next')} id="pw-next-hint">{showPw('next') ?? t('register.passwordHint')}</p>
          </div>
          <div class="field">
            <label for="pw-confirm">{t('account.confirmPassword')}</label>
            <input id="pw-confirm" class="input" type="password" autocomplete="new-password" bind:value={pw.confirm} aria-invalid={showPw('confirm') ? 'true' : undefined} aria-describedby="pw-confirm-err" />
            {#if showPw('confirm')}<p class="error" id="pw-confirm-err">{showPw('confirm')}</p>{/if}
          </div>
        </div>
        <div><button class="btn" type="submit" disabled={pwSaving}>{pwSaving ? t('account.saving') : t('account.changePassword')}</button></div>
      </form>
    </section>
  {/if}

  <section class="card stack" aria-labelledby="prefs-title">
    <h2 id="prefs-title">{t('settings.title')}</h2>
    <Preferences />
    {#if settings.currency !== 'EUR'}<p class="xs muted">{t('settings.ratesNote', { currency: settings.currency })}</p>{/if}
  </section>
</div>

<style>
  .narrow { max-width: 48rem; }
  .tall { min-height: 12rem; }
</style>
