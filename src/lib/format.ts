import { settings } from './i18n.svelte';

/** Prices are stored in EUR; other currencies are converted for display only. */
export function formatPrice(eur: number | null | undefined): string {
  if (eur === null || eur === undefined) return '';
  const rate = settings.currency === 'EUR' ? 1 : settings.rates[settings.currency];
  const currency = rate ? settings.currency : 'EUR';
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(eur * (rate ?? 1)) ? 0 : 2
  }).format(eur * (rate ?? 1));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(settings.locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

/** "Tue 3 Nov 2026" */
export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat(settings.locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

/** "Tuesday, 3 November 2026" — used for group headings */
export function formatDayLong(iso: string): string {
  return new Intl.DateTimeFormat(settings.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(settings.locale, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(iso));
}

/** Local calendar day key (YYYY-MM-DD) for grouping. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(settings.locale).format(n);
}

/** Booking reference shown on trips, e.g. HV101-0042 */
export function bookingReference(flightNumber: string, id: number): string {
  return `${flightNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${String(id).padStart(4, '0')}`;
}
