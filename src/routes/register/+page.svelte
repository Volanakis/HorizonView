<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { ApiError, errorMessage, request } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { toast } from '$lib/toast.svelte';
  import { t } from '$lib/i18n.svelte';
  import { EMAIL, PHONE, STRONG_PASSWORD, safeReturnPath } from '$lib/validate';

  let form = $state({
    username: '',
    name: '',
    email: '',
    phone: '',
    identity_number: '',
    vat_number: '',
    address: '',
    password: '',
    confirm: ''
  });
  let privacyRead = $state(false);
  let tried = $state(false);
  let submitting = $state(false);
  let formError = $state('');
  let serverFields = $state<Record<string, string>>({});

  const returnTo = $derived(safeReturnPath(page.url.searchParams.get('return')));

  // Mirrors the API's register schema.
  const errors = $derived.by(() => {
    const e: Record<string, string> = {};
    if (form.username.trim().length < 3) e.username = t('v.usernameMin');
    if (form.name.trim().length < 2) e.name = t('v.nameMin');
    if (!EMAIL.test(form.email.trim())) e.email = t('v.email');
    if (form.phone && !PHONE.test(form.phone)) e.phone = t('v.phone');
    if (form.address.trim() && form.address.trim().length < 5) e.address = t('v.addressMin');
    if (!STRONG_PASSWORD.test(form.password)) e.password = t('v.password');
    if (form.confirm !== form.password) e.confirm = t('v.passwordMatch');
    if (!privacyRead) e.privacy = t('v.privacy');
    return e;
  });

  const show = (field: string) => (tried ? errors[field] : undefined) ?? serverFields[field];
  const invalid = (field: string) => (show(field) ? 'true' : undefined);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    tried = true;
    formError = '';
    serverFields = {};
    if (Object.keys(errors).length) {
      await tick();
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    submitting = true;
    const username = form.username.trim();
    try {
      await request('/auth/register', {
        method: 'POST',
        body: {
          username,
          name: form.name.trim(),
          email: form.email.trim(),
          // Optional details are only sent when given.
          ...(form.phone ? { phone: form.phone } : {}),
          ...(form.identity_number.trim() ? { identity_number: form.identity_number.trim() } : {}),
          ...(form.vat_number.trim() ? { vat_number: form.vat_number.trim() } : {}),
          ...(form.address.trim() ? { address: form.address.trim() } : {}),
          password: form.password
        }
      });
      // Registration doesn't start a session; sign in with the same credentials.
      await session.signIn(username, form.password);
      toast.success(t('register.done'));
      goto(returnTo, { replaceState: true });
    } catch (error) {
      if (error instanceof ApiError) serverFields = error.fields;
      formError = errorMessage(error);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>{t('register.title')} · HorizonView</title></svelte:head>

{#snippet text(field: keyof typeof form, label: string, opts: { type?: string; autocomplete?: HTMLInputElement['autocomplete']; optional?: boolean; hint?: string; placeholder?: string })}
  <div class="field">
    <label for="r-{field}">{label}{#if opts.optional} <span class="muted">({t('common.optional')})</span>{/if}</label>
    <input
      id="r-{field}"
      class="input"
      type={opts.type ?? 'text'}
      autocomplete={opts.autocomplete ?? 'off'}
      placeholder={opts.placeholder}
      bind:value={form[field]}
      aria-invalid={invalid(field)}
      aria-describedby="r-{field}-msg"
    />
    {#if show(field)}
      <p class="error" id="r-{field}-msg">{show(field)}</p>
    {:else if opts.hint}
      <p class="hint" id="r-{field}-msg">{opts.hint}</p>
    {/if}
  </div>
{/snippet}

<div class="page auth">
  <section class="card stack" aria-labelledby="register-title">
    <h1 id="register-title">{t('register.title')}</h1>
    <form class="stack" onsubmit={submit} novalidate>
      {#if formError}<p class="form-error" role="alert">{formError}</p>{/if}

      <div class="form-grid">
        {@render text('username', t('auth.username'), { autocomplete: 'username' })}
        {@render text('name', t('account.name'), { autocomplete: 'name' })}
        {@render text('email', t('account.email'), { type: 'email', autocomplete: 'email' })}
        {@render text('phone', t('account.phone'), { type: 'tel', autocomplete: 'tel', optional: true, placeholder: '+30 210 123 4567' })}
        {@render text('identity_number', t('register.identity'), { optional: true })}
        {@render text('vat_number', t('register.vat'), { optional: true })}
      </div>
      {@render text('address', t('account.address'), { autocomplete: 'street-address', optional: true })}
      <div class="form-grid">
        {@render text('password', t('auth.password'), { type: 'password', autocomplete: 'new-password', hint: t('register.passwordHint') })}
        {@render text('confirm', t('account.confirmPassword'), { type: 'password', autocomplete: 'new-password' })}
      </div>

      <div class="field">
        <label class="check">
          <input type="checkbox" bind:checked={privacyRead} aria-invalid={invalid('privacy')} aria-describedby="r-privacy-msg" />
          <span>{t('register.privacyBefore')} <a href="/privacy" target="_blank" rel="noopener">{t('register.privacyLink')}</a>.</span>
        </label>
        {#if show('privacy')}<p class="error" id="r-privacy-msg">{show('privacy')}</p>{/if}
      </div>

      <button class="btn btn-primary" type="submit" disabled={submitting}>{submitting ? t('register.submitting') : t('register.submit')}</button>
    </form>
    <p class="small muted">{t('register.have')} <a href="/login{page.url.search}">{t('register.signIn')}</a></p>
  </section>
</div>

<style>
  .auth { max-width: 40rem; padding-top: 2rem; }
</style>
