<script lang="ts">
  import type { FlightState, ReservationStatus } from '$lib/types';
  import { t } from '$lib/i18n.svelte';

  type Props =
    | { kind: 'flight'; value: FlightState }
    | { kind: 'reservation'; value: ReservationStatus };

  let props: Props = $props();

  // Each state gets its own shape as well as its colour (see app.css .chip variants).
  const TONE: Record<string, string> = {
    'flight:created': 'chip-success',
    'flight:staffed': 'chip-neutral',
    'flight:completed': '',
    'flight:cancelled': 'chip-danger',
    'reservation:confirmed': 'chip-success',
    'reservation:completed': '',
    'reservation:cancelled': 'chip-danger'
  };

  const label = $derived(props.kind === 'flight' ? t(`state.${props.value}`) : t(`status.${props.value}`));
</script>

<span class="chip {TONE[`${props.kind}:${props.value}`]}">{label}</span>
