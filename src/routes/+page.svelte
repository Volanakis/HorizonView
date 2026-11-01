<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import AirportInput from '$lib/components/AirportInput.svelte';
  import RouteLine from '$lib/components/RouteLine.svelte';
  import StateChip from '$lib/components/StateChip.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { request, errorMessage } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { t } from '$lib/i18n.svelte';
  import { dayKey, formatDayLong, formatTime } from '$lib/format';
  import { iataToCity, IATA_PATTERN } from '$lib/airports';
  import type { Flight, Pagination as PageInfo } from '$lib/types';

  // The URL is the source of truth for filters: shareable, and Back works.
  let from = $state('');
  let to = $state('');
  let date = $state('');
  let submitted = $state(false);

  let flights = $state<Flight[]>([]);
  let pageInfo = $state<PageInfo>({ page: 1, limit: 20, total: 0, pages: 0 });
  let loading = $state(true);
  let loadError = $state('');
  let requestId = 0;

  const fromInvalid = $derived(submitted && from !== '' && !IATA_PATTERN.test(from));
  const toInvalid = $derived(submitted && to !== '' && !IATA_PATTERN.test(to));
  const hasFilters = $derived(['from', 'to', 'date'].some((k) => page.url.searchParams.get(k)));

  $effect(() => {
    const params = page.url.searchParams;
    from = params.get('from') ?? '';
    to = params.get('to') ?? '';
    date = params.get('date') ?? '';
    // Re-run when the session settles: staff see every state, others only bookable flights.
    void session.role;
    load(params);
  });

  async function load(params: URLSearchParams) {
    const id = ++requestId;
    loading = true;
    loadError = '';
    const query = new URLSearchParams();
    for (const key of ['from', 'to', 'date', 'page']) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    query.set('limit', '20');
    try {
      const res = await request<Flight[]>(`/flights?${query}`);
      if (id !== requestId) return;
      flights = res.data;
      if (res.pagination) pageInfo = res.pagination;
    } catch (error) {
      if (id === requestId) loadError = errorMessage(error);
    } finally {
      if (id === requestId) loading = false;
    }
  }

  function search(event: SubmitEvent) {
    event.preventDefault();
    submitted = true;
    if ((from && !IATA_PATTERN.test(from)) || (to && !IATA_PATTERN.test(to))) return;
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    if (date) query.set('date', date);
    goto(`/${query.size ? `?${query}` : ''}`, { keepFocus: true, noScroll: true });
  }

  function clear() {
    submitted = false;
    goto('/', { keepFocus: true, noScroll: true });
  }

  function goToPage(n: number) {
    const query = new URLSearchParams(page.url.searchParams);
    query.set('page', String(n));
    goto(`/?${query}`);
  }

  const groups = $derived.by(() => {
    const byDay = new Map<string, Flight[]>();
    for (const flight of flights) {
      const key = dayKey(flight.scheduled_time);
      byDay.set(key, [...(byDay.get(key) ?? []), flight]);
    }
    return [...byDay.entries()].map(([key, items]) => ({ key, label: formatDayLong(items[0].scheduled_time), items }));
  });
</script>

<svelte:head><title>{t('nav.flights')} · HorizonView</title></svelte:head>

<div class="page">
  <section class="search card" aria-labelledby="search-title">
    <h1 id="search-title">{t('search.title')}</h1>
    <form class="search-form" onsubmit={search} novalidate>
      <div class="field">
        <label for="from">{t('search.from')}</label>
        <AirportInput id="from" bind:value={from} placeholder={t('search.airportPlaceholder')} invalid={fromInvalid} aria-describedby={fromInvalid ? 'from-error' : undefined} />
        {#if fromInvalid}<p class="error" id="from-error">{t('search.codeHint')}</p>{/if}
      </div>
      <div class="field">
        <label for="to">{t('search.to')}</label>
        <AirportInput id="to" bind:value={to} placeholder={t('search.airportPlaceholder')} invalid={toInvalid} aria-describedby={toInvalid ? 'to-error' : undefined} />
        {#if toInvalid}<p class="error" id="to-error">{t('search.codeHint')}</p>{/if}
      </div>
      <div class="field">
        <label for="date">{t('search.date')}</label>
        <input id="date" class="input" type="date" bind:value={date} />
      </div>
      <div class="actions">
        <button class="btn btn-primary" type="submit"><Icon name="search" size={18} />{t('search.submit')}</button>
        {#if hasFilters}
          <button class="btn btn-quiet" type="button" onclick={clear}>{t('search.clear')}</button>
        {/if}
      </div>
    </form>
  </section>

  <section class="results" aria-labelledby="results-title" aria-busy={loading}>
    <div class="page-header">
      <h2 id="results-title">{session.isStaff ? t('flights.headingStaff') : t('flights.heading')}</h2>
      {#if !loading && !loadError}
        <p class="small muted num">{pageInfo.total === 1 ? t('flights.countOne') : t('flights.count', { count: pageInfo.total })}</p>
      {/if}
    </div>

    {#if loading && flights.length === 0}
      <div class="stack" aria-label={t('common.loading')}>
        {#each [1, 2, 3] as n (n)}<div class="skeleton"></div>{/each}
      </div>
    {:else if loadError}
      <div class="empty">
        <p>{loadError}</p>
        <button class="btn" type="button" onclick={() => load(page.url.searchParams)}>{t('common.retry')}</button>
      </div>
    {:else if flights.length === 0}
      <div class="empty">
        <p>{t('flights.empty')}</p>
        {#if hasFilters}<button class="btn" type="button" onclick={clear}>{t('flights.emptyAction')}</button>{/if}
      </div>
    {:else}
      {#each groups as group (group.key)}
        <div class="day">
          <h3 class="section-title">{group.label}</h3>
          <ul class="flight-list">
            {#each group.items as flight (flight.id)}
              {@const seatsLeft = flight.available_seats ?? 0}
              <li class="flight card">
                <p class="time num">{formatTime(flight.scheduled_time)}</p>
                <div class="route"><RouteLine from={flight.departure} to={flight.arrival} /></div>
                <div class="meta">
                  <a class="stretch code" href="/flights/{flight.id}">
                    {flight.flight_number}
                    <span class="visually-hidden">, {iataToCity(flight.departure)} → {iataToCity(flight.arrival)}, {formatTime(flight.scheduled_time)}</span>
                  </a>
                  <span class="xs muted">{flight.airplane}</span>
                </div>
                <div class="status">
                  {#if flight.state !== 'created' || session.isStaff}<StateChip kind="flight" value={flight.state} />{/if}
                  <span class="small num" class:full={seatsLeft === 0}>
                    {seatsLeft === 0 ? t('flights.full') : t('flights.seatsLeft', { count: seatsLeft })}
                  </span>
                </div>
                <span class="go small" aria-hidden="true">
                  {session.canBook && flight.state === 'created' && seatsLeft > 0 ? t('flights.choose') : t('flights.view')} ›
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
      <Pagination page={pageInfo.page} pages={pageInfo.pages} onchange={goToPage} />
    {/if}
  </section>
</div>

<style>
  .search { display: grid; gap: 1rem; }

  .search-form {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
    align-items: start;
  }

  .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-self: end; }
  .actions .btn-primary { flex: 1; }

  .results { display: grid; gap: 1rem; }
  .day { display: grid; gap: 0.75rem; }

  .flight-list { display: grid; gap: 0.75rem; margin: 0; padding: 0; list-style: none; }

  .flight {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'time meta'
      'route route'
      'status go';
    gap: 0.75rem 1rem;
    align-items: center;
    padding: 1.25rem 1.5rem;
  }
  .flight:hover { border-color: var(--border); }
  .flight:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }

  .time {
    grid-area: time;
    font-family: var(--display);
    font-size: 1.875rem;
    font-weight: 500;
    line-height: 1;
  }
  .route { grid-area: route; min-width: 0; }
  .meta { grid-area: meta; display: grid; justify-items: end; text-align: right; }
  .status { grid-area: status; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
  .go { grid-area: go; justify-self: end; color: var(--muted); font-weight: 600; }
  .full { color: var(--danger); font-weight: 600; }

  /* The flight number link covers the whole card; one concise accessible name. */
  .stretch { color: var(--text); text-decoration: none; }
  .stretch:focus-visible { outline: none; }
  .stretch::after { content: ''; position: absolute; inset: 0; border-radius: var(--r-card); }

  @media (min-width: 48rem) {
    .flight {
      grid-template-columns: 5rem minmax(14rem, 1fr) 9rem 11rem 7rem;
      grid-template-areas: 'time route meta status go';
      gap: 1.5rem;
    }
    .status { justify-content: flex-start; }
  }
</style>
