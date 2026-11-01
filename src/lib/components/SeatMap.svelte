<script lang="ts" module>
  export type Selection = { kind: 'seat'; number: string } | { kind: 'economy' } | null;
</script>

<script lang="ts">
  import Icon from './Icon.svelte';
  import type { SeatView, TicketType } from '$lib/types';
  import { formatPrice } from '$lib/format';
  import { t } from '$lib/i18n.svelte';

  let {
    seats,
    selection,
    interactive,
    onselect
  }: {
    seats: SeatView[];
    selection: Selection;
    /** False for guests and staff: the cabin is shown, nothing is selectable. */
    interactive: boolean;
    onselect: (selection: Selection) => void;
  } = $props();

  const CABIN_ORDER: TicketType[] = ['business', 'normal', 'economy'];
  const rowOf = (seat: string) => Number(seat.match(/^\d+/)?.[0] ?? 0);
  const letterOf = (seat: string) => seat.replace(/^\d+/, '');

  // Seat letters left of the aisle, e.g. A B C | D E F
  const letters = $derived([...new Set(seats.map((s) => letterOf(s.number)))].sort());
  const leftLetters = $derived(new Set(letters.slice(0, Math.ceil(letters.length / 2))));

  const cabins = $derived(
    CABIN_ORDER.map((cls) => {
      const inCabin = seats.filter((s) => s.class === cls);
      const rows = new Map<number, { left: SeatView[]; right: SeatView[] }>();
      for (const seat of inCabin) {
        const row = rows.get(rowOf(seat.number)) ?? { left: [], right: [] };
        (leftLetters.has(letterOf(seat.number)) ? row.left : row.right).push(seat);
        rows.set(rowOf(seat.number), row);
      }
      const sortSide = (side: SeatView[]) => side.sort((a, b) => letterOf(a.number).localeCompare(letterOf(b.number)));
      return {
        cls,
        free: inCabin.filter((s) => s.status === 'available').length,
        total: inCabin.length,
        minPrice: inCabin.length ? Math.min(...inCabin.map((s) => s.price)) : 0,
        rows: [...rows.entries()]
          .sort(([a], [b]) => a - b)
          .map(([row, sides]) => ({ row, left: sortSide(sides.left), right: sortSide(sides.right) }))
      };
    }).filter((cabin) => cabin.total > 0)
  );

  const isSelected = (seat: SeatView) => selection?.kind === 'seat' && selection.number === seat.number;

  function toggleSeat(seat: SeatView) {
    onselect(selection?.kind === 'seat' && selection.number === seat.number ? null : { kind: 'seat', number: seat.number });
  }

  function toggleEconomy() {
    onselect(selection?.kind === 'economy' ? null : { kind: 'economy' });
  }
</script>

{#snippet seatCell(seat: SeatView)}
  {@const taken = seat.status === 'reserved'}
  {@const cls = t(`class.${seat.class}`)}
  {#if interactive && seat.class !== 'economy' && !taken}
    <button
      type="button"
      class="seat {seat.class}"
      class:selected={isSelected(seat)}
      aria-pressed={isSelected(seat)}
      aria-label={t('seat.aria', { seat: seat.number, cls, price: formatPrice(seat.price) })}
      onclick={() => toggleSeat(seat)}
    >
      {#if isSelected(seat)}<Icon name="check" size={16} />{:else}{letterOf(seat.number)}{/if}
    </button>
  {:else}
    <span
      class="seat {seat.class} static"
      class:taken
      role="img"
      aria-label={taken ? t('seat.ariaTaken', { seat: seat.number, cls }) : t('seat.aria', { seat: seat.number, cls, price: formatPrice(seat.price) })}
    >
      {#if taken}<Icon name="x" size={14} />{:else}{letterOf(seat.number)}{/if}
    </span>
  {/if}
{/snippet}

<div class="seatmap">
  <ul class="legend" aria-label={t('seat.legend')}>
    <li><span class="seat swatch" aria-hidden="true"></span>{t('seat.legendFree')}</li>
    <li><span class="seat swatch taken" aria-hidden="true"><Icon name="x" size={12} /></span>{t('seat.legendTaken')}</li>
    <li><span class="seat swatch selected" aria-hidden="true"><Icon name="check" size={12} /></span>{t('seat.legendSelected')}</li>
    <li><span class="seat swatch business" aria-hidden="true"></span>{t('class.business')}</li>
  </ul>

  <div class="fuselage">
    <p class="nose xs muted">{t('seat.front')}</p>
    {#each cabins as cabin (cabin.cls)}
      <section class="cabin" aria-labelledby="cabin-{cabin.cls}">
        <header class="cabin-head">
          <h3 id="cabin-{cabin.cls}" class="cabin-name" class:business={cabin.cls === 'business'}>{t(`class.${cabin.cls}`)}</h3>
          <p class="small muted num">
            {t('seat.from', { price: formatPrice(cabin.minPrice) })} · {t('seat.free', { free: cabin.free, total: cabin.total })}
          </p>
        </header>

        {#if cabin.cls === 'economy'}
          <div class="economy-pick">
            <p class="small muted">{t('seat.economyNote')}</p>
            {#if interactive}
              <button
                type="button"
                class="btn btn-sm"
                class:picked={selection?.kind === 'economy'}
                aria-pressed={selection?.kind === 'economy'}
                disabled={cabin.free === 0}
                onclick={toggleEconomy}
              >
                {#if selection?.kind === 'economy'}<Icon name="check" size={16} />{t('seat.economyPicked')}
                {:else if cabin.free === 0}{t('seat.economyFull')}
                {:else}{t('seat.economyPick')}{/if}
              </button>
            {/if}
          </div>
        {/if}

        <div class="rows" class:dimmed={cabin.cls === 'economy' && selection?.kind === 'economy'}>
          {#each cabin.rows as row (row.row)}
            <div class="row-line">
              <div class="side">{#each row.left as seat (seat.number)}{@render seatCell(seat)}{/each}</div>
              <span class="aisle xs muted num" aria-hidden="true">{row.row}</span>
              <div class="side">{#each row.right as seat (seat.number)}{@render seatCell(seat)}{/each}</div>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>

<style>
  .seatmap { display: grid; gap: 1rem; }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--fs-sm);
  }
  .legend li { display: flex; align-items: center; gap: 0.5rem; }

  .fuselage {
    display: grid;
    gap: 1.5rem;
    justify-items: center;
    padding: 1.25rem 0.75rem 1.5rem;
    border: 1px solid var(--hairline);
    border-radius: 3rem 3rem var(--r-card) var(--r-card);
    background: var(--surface);
    overflow-x: auto;
  }

  .nose { text-align: center; }

  .cabin { display: grid; gap: 0.75rem; justify-items: center; width: 100%; }
  .cabin-head { text-align: center; }
  .cabin-name { font-family: var(--display); font-size: 1.375rem; font-weight: 500; }

  .economy-pick { display: grid; gap: 0.5rem; justify-items: center; text-align: center; }
  .picked { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

  .rows { display: grid; gap: 0.375rem; }
  .row-line { display: flex; align-items: center; gap: 0.25rem; }
  .side { display: flex; gap: 0.25rem; }
  .aisle { width: 1.75rem; text-align: center; }

  .seat {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2.25rem;
    padding: 0;
    border: 1.5px solid var(--border);
    border-radius: 6px 6px 4px 4px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-xs);
    font-weight: 600;
  }

  /* Business seats are bigger, as they are in the cabin, and the only gold on the page. */
  .seat.business { width: 2.375rem; height: 2.75rem; border-color: var(--gold-line); color: var(--gold); }

  button.seat { cursor: pointer; }
  button.seat:hover { border-color: var(--accent); }

  .seat.selected {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
  }

  .seat.taken {
    border-style: dashed;
    border-color: var(--border);
    background: var(--seat-taken);
    color: var(--muted);
  }

  .seat.static.economy:not(.taken) { color: var(--muted); }
  .dimmed .seat.economy:not(.taken) { border-color: var(--accent); }

  /* Legend swatches stay small at every width (beats the seat sizes below). */
  .legend .seat.swatch { width: 1.25rem; height: 1.375rem; }

  @media (min-width: 30rem) {
    .seat { width: 2.25rem; height: 2.5rem; }
    .seat.business { width: 2.625rem; height: 3rem; }
    .row-line, .side { gap: 0.375rem; }
  }
</style>
