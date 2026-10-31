import { en, type MessageKey } from './locales/en';
import { el } from './locales/el';

export type Lang = 'en' | 'el';
export type Currency = 'EUR' | 'USD' | 'GBP';

const dictionaries: Record<Lang, Record<MessageKey, string>> = { en, el };
const LANG_KEY = 'horizonview_lang';
const CURRENCY_KEY = 'horizonview_currency';

// Preferences are per-device conveniences; storage can be unavailable (private mode).
function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* not persisted */ }
}

function initialLang(): Lang {
  const stored = read(LANG_KEY);
  if (stored === 'en' || stored === 'el') return stored;
  // The browser already knows the preferred language; no IP lookup needed.
  const nav = typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase();
  return nav.startsWith('el') ? 'el' : 'en';
}

function initialCurrency(): Currency {
  const stored = read(CURRENCY_KEY);
  return stored === 'USD' || stored === 'GBP' ? stored : 'EUR';
}

class Settings {
  lang = $state<Lang>(initialLang());
  currency = $state<Currency>(initialCurrency());
  /** EUR-based rates from /api/external/exchange-rates */
  rates = $state<Partial<Record<Currency, number>>>({});

  locale = $derived(this.lang === 'el' ? 'el-GR' : 'en-GB');

  setLang(lang: Lang): void {
    this.lang = lang;
    write(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }

  setCurrency(currency: Currency): void {
    this.currency = currency;
    write(CURRENCY_KEY, currency);
  }
}

export const settings = new Settings();

/** Translate a key, filling {placeholders} from vars. Reactive on settings.lang. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let text = dictionaries[settings.lang][key] ?? en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
