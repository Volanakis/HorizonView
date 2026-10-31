<script lang="ts">
  import { settings, t, type Currency, type Lang } from '$lib/i18n.svelte';

  let { compact = false }: { compact?: boolean } = $props();
  const id = $props.id();
</script>

<div class="prefs" class:compact>
  <div class="field">
    <label for="{id}-lang" class:visually-hidden={compact}>{t('settings.language')}</label>
    <select
      id="{id}-lang"
      class="input"
      value={settings.lang}
      onchange={(e) => settings.setLang(e.currentTarget.value as Lang)}
    >
      <!-- Each language is named in its own language. -->
      <option value="en" lang="en">English</option>
      <option value="el" lang="el">Ελληνικά</option>
    </select>
  </div>
  <div class="field">
    <label for="{id}-cur" class:visually-hidden={compact}>{t('settings.currency')}</label>
    <select
      id="{id}-cur"
      class="input"
      value={settings.currency}
      onchange={(e) => settings.setCurrency(e.currentTarget.value as Currency)}
    >
      <option value="EUR">EUR €</option>
      <option value="USD">USD $</option>
      <option value="GBP">GBP £</option>
    </select>
  </div>
</div>

<style>
  .prefs { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); }
  .compact { display: flex; gap: 0.5rem; }
  .compact .input { min-height: 2.25rem; width: auto; padding-right: 0.5rem; font-size: var(--fs-sm); }
</style>
