<script lang="ts">
  import { AIRPORTS } from '$lib/airports';
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    value = $bindable(''),
    id,
    invalid = false,
    ...rest
  }: { value?: string; id: string; invalid?: boolean } & Omit<HTMLInputAttributes, 'value'> = $props();
</script>

<!-- Suggestions instead of free typing; any 3-letter code still works. -->
<input
  {id}
  class="input code upper"
  type="text"
  inputmode="text"
  autocomplete="off"
  autocapitalize="characters"
  spellcheck="false"
  maxlength="3"
  list="{id}-airports"
  aria-invalid={invalid ? 'true' : undefined}
  bind:value={() => value, (v) => (value = v.toUpperCase().replace(/[^A-Z]/g, ''))}
  {...rest}
/>
<datalist id="{id}-airports">
  {#each AIRPORTS as airport (airport.code)}
    <option value={airport.code}>{airport.city}</option>
  {/each}
</datalist>

<style>
  .upper { text-transform: uppercase; }
  .upper::placeholder { text-transform: none; font-family: var(--font); font-weight: 400; }
</style>
