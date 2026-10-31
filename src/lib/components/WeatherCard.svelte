<script lang="ts">
  import type { Weather } from '$lib/types';
  import { iataToCity } from '$lib/airports';
  import { t } from '$lib/i18n.svelte';

  /** undefined while loading, null when the API has no data */
  let { code, weather }: { code: string; weather: Weather | null | undefined } = $props();
</script>

<div class="weather">
  <p class="small"><span class="code">{code}</span> <span class="muted">{iataToCity(code)}</span></p>
  {#if weather === undefined}
    <p class="muted small" aria-busy="true">{t('common.loading')}</p>
  {:else if weather === null}
    <p class="muted small">{t('weather.unavailable')}</p>
  {:else}
    <p class="temp num">{Math.round(weather.temperature)}°</p>
    <p class="small">{weather.description}</p>
    <p class="xs muted num">
      {t('weather.detail', { feels: Math.round(weather.feelslike), wind: weather.wind_speed, humidity: weather.humidity })}
    </p>
  {/if}
</div>

<style>
  .weather { display: grid; gap: 0.125rem; align-content: start; }
  .temp { font-size: var(--fs-xl); font-weight: 600; line-height: 1.2; }
</style>
