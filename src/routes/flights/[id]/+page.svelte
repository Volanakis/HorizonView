<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import RouteLine from '$lib/components/RouteLine.svelte';
  import StateChip from '$lib/components/StateChip.svelte';
  import WeatherCard from '$lib/components/WeatherCard.svelte';
  import SeatMap, { type Selection } from '$lib/components/SeatMap.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { request, errorMessage, ApiError } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { toast } from '$lib/toast.svelte';
  import { t } from '$lib/i18n.svelte';
  import { formatDayLong, formatPrice, formatTime } from '$lib/format';
  import type { Flight, SeatView, TicketType, Weather } from '$lib/types';

  let flight = $state<Flight | null>(null);
  let seats = $state<SeatView[]>([]);
  let weather = $state<{ from: Weather | null | undefined; to: Weather | null | undefined }>({ from: undefined, to: undefined });
  let loading = $state(true);
  let notFound = $state(false);
  let loadError = $state('');
  let selection = $state<Selection>(null);
  let booking = $state(false);

  const flightId = $derived(Number(page.params.id));

  $effect(() => {
    load(flightId);
  });

  async function load(id: number) {
    loading = true;
    notFound = false;
    loadError = '';
    selection = null;
    try {
      const [flightRes, seatRes] = await Promise.all([
        request<Flight>(`/flights/${id}`),
        request<{ seats: SeatView[] }>(`/flights/${id}/seats`)
      ]);
      flight = flightRes.data;
      seats = seatRes.data.seats;
      loadWeather(flight);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound = true;
      else loadError = errorMessage(error);
    } finally {
      loading = false;
    }
  }

  async function loadWeather(f: Flight) {
    weather = { from: undefined, to: undefined };
    const get = (code: string) =>
      request<Weather | null>(`/external/weather?location=${encodeURIComponent(code)}`)
        .then((r) => r.data)
        .catch(() => null);
    const [from, to] = await Promise.all([get(f.departure), get(f.arrival)]);
    weather = { from, to };
  }

  async function reloadSeats() {
    const res = await request<{ seats: SeatView[] }>(`/flights/${flightId}/seats`);
    seats = res.data.seats;
  }

  const bookable = $derived(flight?.state === 'created');
  const interactive = $derived(session.canBook && bookable);

  const selected = $derived.by((): { cls: TicketType; seat: string | null; price: number } | null => {
    if (selection?.kind === 'economy') {
      const economy = seats.filter((s) => s.class === 'economy' && s.status === 'available');
      return economy.length ? { cls: 'economy', seat: null, price: Math.min(...economy.map((s) => s.price)) } : null;
    }
    if (selection?.kind === 'seat') {
      const number = selection.number;
      const seat = seats.find((s) => s.number === number);
      return seat ? { cls: seat.class, seat: seat.number, price: seat.price } : null;
    }
    return null;
  });

  async function book() {
    if (!flight || !selected) return;
    booking = true;
    try {
      await request('/reservations', {
        method: 'POST',
        body: { flight_id: flight.id, ticket_type: selected.cls, ...(selected.seat ? { seat_number: selected.seat } : {}) }
      });
      toast.success(
        selected.seat
          ? t('booking.done', { seat: selected.seat, flight: flight.flight_number })
          : t('booking.doneEconomy', { flight: flight.flight_number })
      );
      goto('/trips');
    } catch (error) {
      toast.error(errorMessage(error));
      if (error instanceof ApiError && error.status === 409) {
        selection = null;
        await reloadSeats();
      }
    } finally {
      booking = false;
    }
  }

  const notice = $derived.by(() => {
    if (!flight || !session.ready) return '';
    if (!bookable) return t('booking.closed');
    if (!session.user) return t('booking.signIn');
    if (!session.canBook) return t('booking.customersOnly');
    return '';
  });
</script>

<svelte:head>
  <title>{flight ? `${flight.flight_number} ${flight.departure}–${flight.arrival}` : t('nav.flights')} · HorizonView</title>
</svelte:head>

<div class="page">
  <a class="back small" href="/"><Icon name="back" size={16} />{t('flight.back')}</a>

  {#if loading && !flight}
    <div class="skeleton tall" aria-label={t('common.loading')}></div>
  {:else if notFound}
    <div class="empty">
      <p>{t('flight.notFound')}</p>
      <a class="btn" href="/">{t('flight.back')}</a>
    </div>
  {:else if loadError}
    <div class="empty">
      <p>{loadError}</p>
      <button class="btn" type="button" onclick={() => load(flightId)}>{t('common.retry')}</button>
    </div>
  {:else if flight}
    <div class="layout">
      <section class="map" aria-labelledby="seat-title">
        <h2 id="seat-title">{interactive ? t('seat.title') : t('seat.cabin')}</h2>
        <SeatMap {seats} {selection} {interactive} onselect={(s) => (selection = s)} />
      </section>

      <div class="side">
        <section class="info card" aria-labelledby="flight-title">
          <div class="row spread">
            <h1 id="flight-title">{flight.flight_number}</h1>
            <StateChip kind="flight" value={flight.state} />
          </div>
          <RouteLine from={flight.departure} to={flight.arrival} size="lg" />
          <dl class="facts">
            <div><dt>{t('flight.departs')}</dt><dd class="num">{formatDayLong(flight.scheduled_time)} · {formatTime(flight.scheduled_time)}</dd></div>
            <div><dt>{t('flight.aircraft')}</dt><dd>{flight.airplane}</dd></div>
          </dl>
          <div class="weather">
            <h3 class="section-title">{t('weather.title')}</h3>
            <div class="weather-grid">
              <WeatherCard code={flight.departure} weather={weather.from} />
              <WeatherCard code={flight.arrival} weather={weather.to} />
            </div>
          </div>
        </section>

        {#if notice}
          <div class="notice card">
            <p class="small">{notice}</p>
            {#if bookable && !session.user}
              <a class="btn btn-sm" href="/login?return={encodeURIComponent(page.url.pathname)}">{t('nav.signIn')}</a>
            {/if}
          </div>
        {:else if interactive}
          <div class="book card" class:is-business={selected?.cls === 'business'} aria-live="polite">
            <p class="small" class:business={selected?.cls === 'business'}>
              {#if selected}
                {selected.seat ? t('booking.summary', { cls: t(`class.${selected.cls}`), seat: selected.seat }) : t('booking.summaryEconomy')}
              {:else}
                <span class="muted">{t('booking.none')}</span>
              {/if}
            </p>
            <button class="btn btn-primary" type="button" disabled={!selected || booking} onclick={book}>
              {booking ? t('booking.booking') : selected ? t('booking.confirm', { price: formatPrice(selected.price) }) : t('seat.title')}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    justify-self: start;
    min-height: 2.75rem;
    color: var(--muted);
    font-weight: 600;
    text-decoration: none;
  }
  .back:hover { color: var(--text); }

  .tall { min-height: 24rem; }

  .layout { display: grid; gap: 1.5rem; }
  .side { display: contents; }
  .info { order: 1; display: grid; gap: 1.25rem; }
  .map { order: 2; display: grid; gap: 1rem; }
  .notice, .book { order: 3; }

  .spread { justify-content: space-between; }

  .facts { display: grid; gap: 0.75rem; margin: 0; }
  .facts div { display: grid; gap: 0.125rem; }
  .facts dt { font-size: var(--fs-xs); color: var(--muted); }
  .facts dd { margin: 0; font-weight: 500; }

  .weather { display: grid; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--hairline); }
  .weather-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

  .notice { display: grid; gap: 0.75rem; justify-items: start; }

  /* On phones the booking bar stays reachable above the tab bar. */
  .book {
    position: sticky;
    bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 0.75rem);
    display: grid;
    gap: 0.75rem;
    box-shadow: var(--shadow-overlay);
  }

  .book.is-business { border-top: 2px solid var(--gold-line); }
  .book.is-business p { font-weight: 600; }

  @media (min-width: 60rem) {
    .layout { grid-template-columns: minmax(0, 1fr) 22rem; align-items: start; }
    .side { display: grid; gap: 1rem; position: sticky; top: 4.5rem; }
    .map { order: 0; }
    .book { position: static; box-shadow: none; }
  }
</style>
