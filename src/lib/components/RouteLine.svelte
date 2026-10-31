<script lang="ts">
  import Icon from './Icon.svelte';
  import { iataToCity } from '$lib/airports';

  // The signature element: two airport codes joined by the horizon line.
  let { from, to, size = 'md' }: { from: string; to: string; size?: 'md' | 'lg' } = $props();
</script>

<div class="route {size}">
  <div class="end">
    <span class="code iata">{from}</span>
    <span class="city">{iataToCity(from)}</span>
  </div>
  <div class="line" aria-hidden="true">
    <span class="rule"></span>
    <Icon name="plane" size={size === 'lg' ? 22 : 16} />
    <span class="rule"></span>
  </div>
  <span class="visually-hidden">→</span>
  <div class="end to">
    <span class="code iata">{to}</span>
    <span class="city">{iataToCity(to)}</span>
  </div>
</div>

<style>
  .route {
    display: grid;
    grid-template-columns: auto minmax(2.5rem, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .end { display: grid; min-width: 0; }
  .to { text-align: right; }

  .iata { font-size: var(--fs-lg); line-height: 1.1; }
  .lg .iata { font-size: var(--fs-2xl); }

  .city {
    font-size: var(--fs-xs);
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lg .city { font-size: var(--fs-sm); }

  .line {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--muted);
  }

  .rule {
    flex: 1;
    border-top: 1.5px dashed var(--border);
  }
</style>
