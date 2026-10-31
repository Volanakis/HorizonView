<script lang="ts">
  import RequireRole from '$lib/components/RequireRole.svelte';
  import AirportInput from '$lib/components/AirportInput.svelte';
  import StateChip from '$lib/components/StateChip.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { request, errorMessage, ApiError } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { toast } from '$lib/toast.svelte';
  import { t } from '$lib/i18n.svelte';
  import { formatDateTime } from '$lib/format';
  import { IATA_PATTERN } from '$lib/airports';
  import type { AirportStatus, Flight, FlightState, Pagination as PageInfo } from '$lib/types';
  import type { MessageKey } from '$lib/locales/en';

  // ── Schedule ──────────────────────────────────────────────
  let flights = $state<Flight[]>([]);
  let pageInfo = $state<PageInfo>({ page: 1, limit: 50, total: 0, pages: 0 });
  let loading = $state(true);
  let loadError = $state('');

  $effect(() => {
    if (session.isStaff) load(1);
  });

  async function load(n: number) {
    loading = true;
    loadError = '';
    try {
      const res = await request<Flight[]>(`/flights?page=${n}&limit=50`);
      flights = res.data;
      if (res.pagination) pageInfo = res.pagination;
    } catch (error) {
      loadError = errorMessage(error);
    } finally {
      loading = false;
    }
  }

  // ── Create ────────────────────────────────────────────────
  const blank = () => ({
    flight_number: '',
    departure: '',
    arrival: '',
    scheduled_time: '',
    airplane: 'Boeing 737-800',
    num_rows: 25,
    seats_per_row: 6,
    business_rows: 5
  });
  let form = $state(blank());
  let attempted = $state(false);
  let creating = $state(false);
  let createError = $state('');
  let serverFields = $state<Record<string, string>>({});

  const capacity = $derived(Number(form.num_rows) * Number(form.seats_per_row));

  const errors = $derived.by(() => {
    const e: Record<string, string> = {};
    if (!form.flight_number.trim()) e.flight_number = t('v.required');
    if (!IATA_PATTERN.test(form.departure)) e.departure = t('manage.errCode');
    if (!IATA_PATTERN.test(form.arrival)) e.arrival = t('manage.errCode');
    else if (form.arrival === form.departure) e.arrival = t('manage.errSame');
    if (!form.scheduled_time) e.scheduled_time = t('v.required');
    else if (new Date(form.scheduled_time).getTime() <= Date.now()) e.scheduled_time = t('manage.errFuture');
    if (!form.airplane.trim()) e.airplane = t('v.required');
    if (!(capacity >= 30 && capacity <= 300)) e.capacity = t('manage.errCapacity');
    if (Number(form.business_rows) >= Number(form.num_rows)) e.business_rows = t('manage.errBusiness');
    return e;
  });

  const shown = (field: string) => (attempted ? errors[field] : undefined) ?? serverFields[field];

  async function create(event: SubmitEvent) {
    event.preventDefault();
    attempted = true;
    createError = '';
    serverFields = {};
    if (Object.keys(errors).length) return;
    creating = true;
    try {
      const number = form.flight_number.trim().toUpperCase();
      await request('/flights', {
        method: 'POST',
        body: {
          flight_number: number,
          departure: form.departure,
          arrival: form.arrival,
          scheduled_time: new Date(form.scheduled_time).toISOString(),
          total_seats: capacity,
          airplane: form.airplane.trim(),
          num_rows: Number(form.num_rows),
          seats_per_row: Number(form.seats_per_row),
          business_rows: Number(form.business_rows)
        }
      });
      toast.success(t('manage.created', { flight: number }));
      form = blank();
      attempted = false;
      traffic = null;
      await load(1);
    } catch (error) {
      if (error instanceof ApiError) serverFields = error.fields;
      createError = errorMessage(error);
    } finally {
      creating = false;
    }
  }

  // ── Airport traffic ───────────────────────────────────────
  let traffic = $state<{ code: string; result: AirportStatus }[] | null>(null);
  let checking = $state(false);

  async function checkTraffic() {
    if (!IATA_PATTERN.test(form.departure) || !IATA_PATTERN.test(form.arrival) || !form.scheduled_time) {
      toast.info(t('manage.trafficNeeds'));
      return;
    }
    checking = true;
    const when = encodeURIComponent(new Date(form.scheduled_time).toISOString());
    try {
      traffic = await Promise.all(
        [form.departure, form.arrival].map(async (code) => ({
          code,
          result: (await request<AirportStatus>(`/external/airport-status?iata=${code}&datetime=${when}`)).data
        }))
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      checking = false;
    }
  }

  // ── State changes ─────────────────────────────────────────
  type Action = { flight: Flight; to: FlightState | 'delete' };
  let action = $state<Action | null>(null);
  let actionOpen = $state(false);
  let acting = $state(false);

  const NEXT: Record<FlightState, FlightState[]> = {
    created: ['staffed', 'cancelled'],
    staffed: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };
  const ACTION_LABEL: Record<FlightState, MessageKey> = {
    created: 'state.created',
    staffed: 'manage.toStaffed',
    completed: 'manage.toCompleted',
    cancelled: 'manage.toCancelled'
  };

  const dialog = $derived.by(() => {
    if (!action) return null;
    const flight = action.flight.flight_number;
    switch (action.to) {
      case 'delete': return { title: t('manage.confirmDelete', { flight }), body: t('manage.confirmDeleteBody'), label: t('manage.delete'), destructive: true };
      case 'cancelled': return { title: t('manage.confirmCancelled', { flight }), body: t('manage.confirmCancelBody'), label: t('manage.toCancelled'), destructive: true };
      case 'staffed': return { title: t('manage.confirmStaffed', { flight }), body: t('manage.confirmStateBody'), label: t('manage.toStaffed'), destructive: false };
      default: return { title: t('manage.confirmCompleted', { flight }), body: t('manage.confirmStateBody'), label: t('manage.toCompleted'), destructive: false };
    }
  });

  function ask(flight: Flight, to: Action['to']) {
    action = { flight, to };
    actionOpen = true;
  }

  async function runAction() {
    if (!action) return;
    const { flight, to } = action;
    acting = true;
    try {
      if (to === 'delete') {
        await request(`/flights/${flight.id}`, { method: 'DELETE' });
        toast.success(t('manage.deleted', { flight: flight.flight_number }));
      } else {
        await request(`/flights/${flight.id}/state`, { method: 'PATCH', body: { state: to } });
        toast.success(t('manage.stateChanged', { flight: flight.flight_number, state: t(`state.${to}`) }));
      }
      actionOpen = false;
      await load(pageInfo.page);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      acting = false;
    }
  }
</script>

<svelte:head><title>{t('manage.title')} · HorizonView</title></svelte:head>

<div class="page">
  <div class="page-header"><h1>{t('manage.title')}</h1></div>

  <RequireRole roles={['manager', 'admin']}>
    <section class="card stack" aria-labelledby="new-title">
      <h2 id="new-title">{t('manage.new')}</h2>
      <form class="stack" onsubmit={create} novalidate>
        {#if createError}<p class="form-error" role="alert">{createError}</p>{/if}
        <div class="form-grid">
          <div class="field">
            <label for="fn">{t('manage.flightNumber')}</label>
            <input id="fn" class="input code" maxlength="10" placeholder="HV-201" autocomplete="off" bind:value={form.flight_number} aria-invalid={shown('flight_number') ? 'true' : undefined} aria-describedby="fn-err" />
            {#if shown('flight_number')}<p class="error" id="fn-err">{shown('flight_number')}</p>{/if}
          </div>
          <div class="field">
            <label for="dep">{t('manage.from')}</label>
            <AirportInput id="dep" bind:value={form.departure} placeholder="ATH" invalid={!!shown('departure')} aria-describedby="dep-err" />
            {#if shown('departure')}<p class="error" id="dep-err">{shown('departure')}</p>{/if}
          </div>
          <div class="field">
            <label for="arr">{t('manage.to')}</label>
            <AirportInput id="arr" bind:value={form.arrival} placeholder="LHR" invalid={!!shown('arrival')} aria-describedby="arr-err" />
            {#if shown('arrival')}<p class="error" id="arr-err">{shown('arrival')}</p>{/if}
          </div>
          <div class="field">
            <label for="when">{t('manage.time')}</label>
            <input id="when" class="input num" type="datetime-local" bind:value={form.scheduled_time} aria-invalid={shown('scheduled_time') ? 'true' : undefined} aria-describedby="when-err" />
            {#if shown('scheduled_time')}<p class="error" id="when-err">{shown('scheduled_time')}</p>{/if}
          </div>
        </div>

        <fieldset class="cabin">
          <legend class="label">{t('manage.aircraft')}</legend>
          <div class="form-grid">
            <div class="field wide">
              <label for="plane" class="visually-hidden">{t('manage.aircraft')}</label>
              <input id="plane" class="input" maxlength="100" bind:value={form.airplane} aria-invalid={shown('airplane') ? 'true' : undefined} />
              {#if shown('airplane')}<p class="error">{shown('airplane')}</p>{/if}
            </div>
            <div class="field">
              <label for="rows">{t('manage.rows')}</label>
              <input id="rows" class="input num" type="number" min="1" max="50" bind:value={form.num_rows} aria-describedby="cap" />
            </div>
            <div class="field">
              <label for="spr">{t('manage.seatsPerRow')}</label>
              <input id="spr" class="input num" type="number" min="1" max="12" bind:value={form.seats_per_row} aria-describedby="cap" />
            </div>
            <div class="field">
              <label for="br">{t('manage.businessRows')}</label>
              <input id="br" class="input num" type="number" min="0" max="20" bind:value={form.business_rows} aria-invalid={shown('business_rows') ? 'true' : undefined} />
              {#if shown('business_rows')}<p class="error">{shown('business_rows')}</p>{/if}
            </div>
          </div>
          <p id="cap" class="small num" class:bad={!!shown('capacity')}>
            <strong>{t('manage.capacity', { count: Number.isFinite(capacity) ? capacity : 0 })}</strong>
            <span class="muted"> · {shown('capacity') ?? t('manage.capacityHint')}</span>
          </p>
        </fieldset>

        {#if traffic}
          <ul class="traffic" aria-live="polite">
            {#each traffic as item (item.code)}
              <li class="small">
                <span class="code">{item.code}</span>
                <span class="chip {item.result.status === 'busy' ? 'chip-warning' : item.result.status === 'free' ? 'chip-success' : ''}">
                  {item.result.status === 'busy'
                    ? t('manage.trafficBusy', { count: item.result.flightCount })
                    : item.result.status === 'free'
                      ? t('manage.trafficFree', { count: item.result.flightCount })
                      : t('manage.trafficUnknown')}
                </span>
              </li>
            {/each}
          </ul>
        {/if}

        <div class="row">
          <button class="btn btn-primary" type="submit" disabled={creating}>{creating ? t('manage.creating') : t('manage.create')}</button>
          <button class="btn" type="button" disabled={checking} onclick={checkTraffic}>{checking ? t('manage.trafficChecking') : t('manage.traffic')}</button>
        </div>
      </form>
    </section>

    <section class="stack" aria-labelledby="list-title">
      <div class="page-header">
        <h2 id="list-title">{t('manage.list')}</h2>
        <p class="small muted num">{t('flights.count', { count: pageInfo.total })}</p>
      </div>

      {#if loading && flights.length === 0}
        <div class="skeleton tall"></div>
      {:else if loadError}
        <div class="empty"><p>{loadError}</p><button class="btn" type="button" onclick={() => load(pageInfo.page)}>{t('common.retry')}</button></div>
      {:else if flights.length === 0}
        <div class="empty"><p>{t('manage.empty')}</p></div>
      {:else}
        <div class="table-wrap">
          <table class="table table-responsive">
            <thead>
              <tr>
                <th scope="col">{t('manage.colFlight')}</th>
                <th scope="col">{t('manage.colRoute')}</th>
                <th scope="col">{t('manage.colDeparts')}</th>
                <th scope="col">{t('manage.colSeats')}</th>
                <th scope="col">{t('manage.colState')}</th>
                <th scope="col"><span class="visually-hidden">{t('manage.colActions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {#each flights as flight (flight.id)}
                {@const booked = flight.total_seats - (flight.available_seats ?? flight.total_seats)}
                <tr>
                  <td data-label={t('manage.colFlight')}><a class="code" href="/flights/{flight.id}">{flight.flight_number}</a></td>
                  <td data-label={t('manage.colRoute')} class="code">{flight.departure} → {flight.arrival}</td>
                  <td data-label={t('manage.colDeparts')} class="num">{formatDateTime(flight.scheduled_time)}</td>
                  <td data-label={t('manage.colSeats')} class="num">{t('manage.booked', { booked, total: flight.total_seats })}</td>
                  <td data-label={t('manage.colState')}><StateChip kind="flight" value={flight.state} /></td>
                  <td class="cell-actions">
                    <div class="row actions">
                      {#each NEXT[flight.state] as next (next)}
                        <button class="btn btn-sm" class:btn-danger={next === 'cancelled'} type="button" onclick={() => ask(flight, next)}>{t(ACTION_LABEL[next])}</button>
                      {/each}
                      {#if flight.state === 'created'}
                        <button class="btn btn-sm btn-danger" type="button" onclick={() => ask(flight, 'delete')}>{t('manage.delete')}</button>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <Pagination page={pageInfo.page} pages={pageInfo.pages} onchange={load} />
      {/if}
    </section>
  </RequireRole>
</div>

{#if dialog}
  <ConfirmDialog
    bind:open={actionOpen}
    title={dialog.title}
    body={dialog.body}
    confirmLabel={dialog.label}
    destructive={dialog.destructive}
    busy={acting}
    onconfirm={runAction}
  />
{/if}

<style>
  .tall { min-height: 16rem; }

  .cabin {
    display: grid;
    gap: 1rem;
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--hairline);
    border-radius: var(--r-control);
  }
  .cabin legend { padding: 0 0.25rem; }
  .wide { grid-column: 1 / -1; }
  .bad strong { color: var(--danger); }

  .traffic { display: grid; gap: 0.5rem; margin: 0; padding: 0; list-style: none; }
  .traffic li { display: flex; align-items: center; gap: 0.75rem; }

  .actions { justify-content: flex-end; flex-wrap: nowrap; }

  @media (max-width: 47.99rem) {
    .actions { justify-content: flex-start; flex-wrap: wrap; }
  }
</style>
