<script lang="ts">
  import '@fontsource-variable/noto-serif-display';
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Icon, { type IconName } from '$lib/components/Icon.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import Preferences from '$lib/components/Preferences.svelte';
  import { session } from '$lib/session.svelte';
  import { settings, t } from '$lib/i18n.svelte';
  import { request } from '$lib/api';
  import type { MessageKey } from '$lib/locales/en';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    document.documentElement.lang = settings.lang;
    session.load();
    request<{ rates: Record<string, number> }>('/external/exchange-rates?symbols=USD,GBP')
      .then(({ data }) => {
        settings.rates = data.rates;
      })
      .catch(() => { /* prices stay in EUR */ });
  });

  interface Tab { href: string; label: MessageKey; icon: IconName }

  // Sections depend on the role, and stay put while people move around.
  const tabs = $derived.by(() => {
    const list: Tab[] = [{ href: '/', label: 'nav.flights', icon: 'plane' }];
    if (session.hasTrips) list.push({ href: '/trips', label: 'nav.trips', icon: 'ticket' });
    if (session.isStaff) list.push({ href: '/manage', label: 'nav.manage', icon: 'sliders' });
    if (session.isAdmin) list.push({ href: '/users', label: 'nav.users', icon: 'users' });
    list.push({ href: '/account', label: session.user ? 'nav.account' : 'nav.signIn', icon: 'user' });
    return list;
  });

  function isCurrent(href: string): boolean {
    const path = page.url.pathname;
    if (href === '/') return path === '/' || path.startsWith('/flights');
    if (href === '/account') return path === '/account' || path === '/login' || path === '/register';
    return path.startsWith(href);
  }
</script>

<a class="skip btn" href="#main">{t('nav.skip')}</a>

<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="/">
      <!-- Reversed (light) version of the logo, made for the dark header bar -->
      <img class="logo" src="/logo-reversed.png" alt="" width="56" height="40" />
      <span>HorizonView</span>
    </a>

    <nav class="desktop-nav" aria-label={t('nav.main')}>
      {#each tabs.slice(0, -1) as tab (tab.href)}
        <a href={tab.href} aria-current={isCurrent(tab.href) ? 'page' : undefined}>{t(tab.label)}</a>
      {/each}
    </nav>

    <div class="topbar-end">
      <div class="desktop-only"><Preferences compact /></div>
      {#if session.ready}
        {#if session.user}
          <a class="account-link desktop-only" href="/account" aria-current={isCurrent('/account') ? 'page' : undefined}>
            <Icon name="user" size={18} />
            <span>{session.user.name}</span>
          </a>
        {:else}
          <a class="btn btn-sm desktop-only" href="/login">{t('nav.signIn')}</a>
        {/if}
      {/if}
    </div>
  </div>
</header>

<main id="main" tabindex="-1">
  {@render children()}
</main>

<footer class="footer">
  <p class="xs muted">{t('footer.note')} · <a href="/privacy">{t('footer.privacy')}</a></p>
</footer>

<nav class="tabbar" aria-label={t('nav.main')}>
  {#each tabs as tab (tab.href)}
    <a href={tab.href} aria-current={isCurrent(tab.href) ? 'page' : undefined}>
      <Icon name={tab.icon} size={22} />
      <span>{t(tab.label)}</span>
    </a>
  {/each}
</nav>

<Toasts />

<style>
  .skip {
    position: absolute;
    left: 0.5rem;
    top: -4rem;
    z-index: 60;
  }
  .skip:focus { top: 0.5rem; }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--bar);
    color: var(--on-bar);
  }

  .topbar-inner {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    max-width: var(--content);
    margin: 0 auto;
    padding: 0 var(--gutter);
    min-height: 4rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    color: var(--on-bar);
    font-family: var(--display);
    font-size: 1.375rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-decoration: none;
  }
  .logo { display: block; }

  .desktop-nav { display: none; gap: 0.25rem; }
  .desktop-nav a, .account-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.25rem;
    padding: 0 0.75rem;
    border-radius: var(--r-control);
    color: var(--on-bar-muted);
    font-size: var(--fs-sm);
    font-weight: 600;
    letter-spacing: 0.02em;
    text-decoration: none;
  }
  .desktop-nav a:hover, .account-link:hover { color: var(--on-bar); }
  .desktop-nav a[aria-current='page'], .account-link[aria-current='page'] { color: #fff; background: var(--bar-pill); }

  .topbar-end { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; }
  .desktop-only { display: none; }

  /* Controls sitting on the aubergine bar */
  .topbar :global(.input) {
    background: transparent;
    color: var(--on-bar);
    border-color: var(--bar-border);
  }
  .topbar :global(.input option) { color: #3b1e4d; background: #fff; }
  .topbar :global(.btn) {
    background: transparent;
    color: var(--on-bar);
    border-color: var(--bar-border);
  }
  .topbar :global(.btn:hover) { background: var(--bar-pill); }
  .topbar :global(:focus-visible) { outline-color: var(--on-bar); }

  main { outline: none; }

  .footer {
    padding: 1.5rem var(--gutter) calc(var(--tabbar-h) + 1.5rem + env(safe-area-inset-bottom));
    text-align: center;
  }

  .tabbar {
    position: fixed;
    inset: auto 0 0;
    z-index: 20;
    display: flex;
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--surface);
    border-top: 1px solid var(--hairline);
  }

  .tabbar a {
    flex: 1;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 0.125rem;
    min-height: var(--tabbar-h);
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
  }
  .tabbar a[aria-current='page'] { color: var(--accent); }

  @media (min-width: 48rem) {
    .desktop-nav { display: flex; }
    .desktop-only { display: flex; }
    .tabbar { display: none; }
    .footer { padding-bottom: 2rem; }
  }
</style>
