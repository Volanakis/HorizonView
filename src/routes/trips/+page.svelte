<script lang="ts">
  import RequireRole from '$lib/components/RequireRole.svelte';
  import RouteLine from '$lib/components/RouteLine.svelte';
  import StateChip from '$lib/components/StateChip.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { request, errorMessage } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { toast } from '$lib/toast.svelte';
  import { t } from '$lib/i18n.svelte';
  import { bookingReference, formatDateTime, formatDayLong, formatPrice, formatTime } from '$lib/format';
  import type { Pagination as PageInfo, ReservationWithDetails as Reservation } from '$lib/types';

  let trips = $state<Reservation[]>([]);
  let pageInfo = $state<PageInfo>({ page: 1, limit: 50, total: 0, pages: 0 });
  let loading = $state(true);
  let loadError = $state('');

  let pending = $state<Reservation | null>(null);
  let confirmOpen = $state(false);
  let cancelling = $state(false);

  $effect(() => {
    if (session.hasTrips) load(1);
  });

  async function load(n: number) {
    loading = true;
    loadError = '';
    try {
      const res = await request<Reservation[]>(`/reservations?page=${n}&limit=50`);
      trips = res.data;
      if (res.pagination) pageInfo = res.pagination;
    } catch (error) {
      loadError = errorMessage(error);
    } finally {
      loading = false;
    }
  }

  const now = Date.now();
  const upcoming = $derived(
    trips
      .filter((r) => r.status === 'confirmed' && new Date(r.scheduled_time).getTime() >= now)
      .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
  );
  const past = $derived(trips.filter((r) => !upcoming.includes(r)));

  function askCancel(trip: Reservation) {
    pending = trip;
    confirmOpen = true;
  }

  async function cancel() {
    if (!pending) return;
    cancelling = true;
    const trip = pending;
    try {
      await request(`/reservations/${trip.id}`, { method: 'DELETE' });
      confirmOpen = false;
      toast.success(t('trips.cancelled', { seat: trip.seat_number }));
      await load(pageInfo.page);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      cancelling = false;
    }
  }
</script>

<svelte:head><title>{t('trips.title')} · HorizonView</title></svelte:head>

{#snippet tripCard(trip: Reservation, active: boolean)}
  <li class="trip card" class:inactive={!active} class:business-trip={trip.ticket_type === 'business'}>
    <div class="trip-head">
      <p class="when">
        <span class="num time">{formatTime(trip.scheduled_time)}</span>
        <span class="small muted">{formatDayLong(trip.scheduled_time)}</span>
      </p>
      <StateChip kind="reservation" value={trip.status} />
    </div>
    <RouteLine from={trip.departure} to={trip.arrival} size="lg" />
    <dl class="pass">
      <div><dt>{t('flight.number')}</dt><dd class="code">{trip.flight_number}</dd></div>
      <div><dt>{t('trips.seat')}</dt><dd class="code">{trip.seat_number}</dd></div>
      <div><dt>{t('trips.class')}</dt><dd class:business={trip.ticket_type === 'business'}>{t(`class.${trip.ticket_type}`)}</dd></div>
      <div><dt>{t('trips.paid')}</dt><dd class="num">{formatPrice(trip.price)}</dd></div>
    </dl>
    <div class="trip-foot">
      <p class="xs muted">
        {t('trips.reference')} <span class="code">{bookingReference(trip.flight_number, trip.id)}</span>
        · {t('trips.booked', { date: formatDateTime(trip.created_at) })}
      </p>
      {#if active}
        <button class="btn btn-sm btn-danger" type="button" onclick={() => askCancel(trip)}>{t('trips.cancel')}</button>
      {/if}
    </div>
  </li>
{/snippet}

<div class="page">
  <div class="page-header">
    <h1>{t('trips.title')}</h1>
  </div>

  <RequireRole roles={['customer', 'manager', 'admin']}>
    {#if loading && trips.length === 0}
      <div class="stack">{#each [1, 2] as n (n)}<div class="skeleton tall"></div>{/each}</div>
    {:else if loadError}
      <div class="empty">
        <p>{loadError}</p>
        <button class="btn" type="button" onclick={() => load(pageInfo.page)}>{t('common.retry')}</button>
      </div>
    {:else if trips.length === 0}
      <div class="empty">
        <p>{t('trips.empty')}</p>
        <a class="btn btn-primary" href="/">{t('trips.emptyAction')}</a>
      </div>
    {:else}
      {#if upcoming.length}
        <section class="group" aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" class="section-title">{t('trips.upcoming')}</h2>
          <ul class="list">{#each upcoming as trip (trip.id)}{@render tripCard(trip, true)}{/each}</ul>
        </section>
      {/if}
      {#if past.length}
        <section class="group" aria-labelledby="past-title">
          <h2 id="past-title" class="section-title">{t('trips.past')}</h2>
          <ul class="list">{#each past as trip (trip.id)}{@render tripCard(trip, false)}{/each}</ul>
        </section>
      {/if}
      <Pagination page={pageInfo.page} pages={pageInfo.pages} onchange={load} />
    {/if}
  </RequireRole>
</div>

{#if pending}
  <ConfirmDialog
    bind:open={confirmOpen}
    title={t('trips.cancelTitle')}
    body={t('trips.cancelBody', { seat: pending.seat_number, flight: pending.flight_number })}
    confirmLabel={t('trips.cancel')}
    cancelLabel={t('trips.keep')}
    destructive
    busy={cancelling}
    onconfirm={cancel}
  />
{/if}

<style>
  .tall { min-height: 12rem; }
  .group { display: grid; gap: 0.5rem; }
  .list { display: grid; gap: 0.75rem; margin: 0; padding: 0; list-style: none; grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr)); }

  .trip { display: grid; gap: 1rem; }
  .inactive { background: transparent; }
  .inactive :global(.iata) { color: var(--muted); }

  .trip-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
  .when { display: grid; }
  .time { font-family: var(--display); font-size: 1.75rem; font-weight: 500; line-height: 1.1; }

  /* Business boarding passes carry a gold rule. */
  .business-trip { border-top: 2px solid var(--gold-line); }

  /* Boarding-pass strip: a perforated rule, then the four facts people look for at the gate. */
  .pass {
    display: grid;
    grid-template-columns: repeat(4, auto);
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0;
    padding-top: 1rem;
    border-top: 1.5px dashed var(--hairline);
  }
  .pass div { display: grid; gap: 0.125rem; }
  .pass dt { font-size: var(--fs-xs); color: var(--muted); }
  .pass dd { margin: 0; font-weight: 600; }

  .trip-foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; }
</style>
