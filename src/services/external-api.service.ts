// External API integrations:
// 1. Aviationstack – Airport congestion check
// 2. Numverify – Phone number validation
// 3. Mailboxlayer – Email validation
// 4. IPstack – IP geolocation / language detection
// 5. Weatherstack – Weather data
// 6. Fixer – Currency conversion

const IATA_TO_CITY: Record<string, string> = {
  ATH: 'Athens', LHR: 'London', CDG: 'Paris', FCO: 'Rome', FRA: 'Frankfurt',
  AMS: 'Amsterdam', MAD: 'Madrid', BCN: 'Barcelona', IST: 'Istanbul', MUC: 'Munich',
  SKG: 'Thessaloniki', JFK: 'New York', LAX: 'Los Angeles', ORD: 'Chicago',
  DXB: 'Dubai', SIN: 'Singapore', HND: 'Tokyo', SYD: 'Sydney', HER: 'Heraklion',
  RHO: 'Rhodes', CFU: 'Corfu', BER: 'Berlin', VIE: 'Vienna', ZRH: 'Zurich',
  BRU: 'Brussels', LIS: 'Lisbon', CPH: 'Copenhagen', OSL: 'Oslo', ARN: 'Stockholm',
  HEL: 'Helsinki', WAW: 'Warsaw', PRG: 'Prague', BUD: 'Budapest', OTP: 'Bucharest',
  SOF: 'Sofia', BEG: 'Belgrade', ZAG: 'Zagreb', MXP: 'Milan', DUB: 'Dublin',
  EDI: 'Edinburgh', GVA: 'Geneva', NCE: 'Nice', TLV: 'Tel Aviv', CAI: 'Cairo',
  NRT: 'Tokyo', PEK: 'Beijing', ICN: 'Seoul', BKK: 'Bangkok',
};

interface AviationstackFlight {
  flight_date: string;
  flight_status: string;
  departure: { iata: string; scheduled: string };
  arrival: { iata: string; scheduled: string };
}

interface AviationstackResponse {
  data: AviationstackFlight[];
}

interface NumverifyResponse {
  valid: boolean;
  number: string;
  country_name: string;
}

interface MailboxlayerResponse {
  email: string;
  format_valid: boolean;
  mx_found: boolean;
  smtp_check: boolean;
  score: number;
}

interface IPstackResponse {
  country_code: string;
  country_name: string;
}

interface WeatherstackResponse {
  current?: {
    temperature: number;
    weather_descriptions: string[];
    weather_icons: string[];
    wind_speed: number;
    humidity: number;
    feelslike: number;
  };
  location?: {
    name: string;
    country: string;
  };
}

interface FixerResponse {
  success: boolean;
  base: string;
  rates: Record<string, number>;
}

async function safeFetch(url: string, timeoutMs = 5000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch {
    return null;
  }
}

export function iataToCity(iata: string): string {
  return IATA_TO_CITY[iata.toUpperCase()] || iata;
}

export const externalApiService = {
  /**
   * Aviationstack: Check airport congestion at a given time.
   * "Free" if <= 5 flights in a 15-minute window, "Busy" otherwise.
   */
  async checkAirportCongestion(
    iataCode: string,
    scheduledTime: string
  ): Promise<{ status: 'free' | 'busy' | 'unknown'; flightCount: number; message: string }> {
    const apiKey = process.env.AVIATIONSTACK_API_KEY;
    if (!apiKey) {
      return { status: 'unknown', flightCount: 0, message: 'Aviationstack API key not configured' };
    }

    try {
      const date = scheduledTime.split('T')[0];
      const depUrl = `http://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}&dep_iata=${encodeURIComponent(iataCode)}&flight_date=${encodeURIComponent(date)}&limit=100`;
      const arrUrl = `http://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}&arr_iata=${encodeURIComponent(iataCode)}&flight_date=${encodeURIComponent(date)}&limit=100`;

      const [depRes, arrRes] = await Promise.all([safeFetch(depUrl), safeFetch(arrUrl)]);

      let allFlights: AviationstackFlight[] = [];
      if (depRes?.ok) {
        const depData = await depRes.json() as AviationstackResponse;
        allFlights = allFlights.concat(depData.data || []);
      }
      if (arrRes?.ok) {
        const arrData = await arrRes.json() as AviationstackResponse;
        allFlights = allFlights.concat(arrData.data || []);
      }

      // Filter flights within a 15-minute window of the scheduled time
      const targetTime = new Date(scheduledTime).getTime();
      const windowMs = 15 * 60 * 1000;
      const nearbyFlights = allFlights.filter(f => {
        const depTime = new Date(f.departure?.scheduled || '').getTime();
        const arrTime = new Date(f.arrival?.scheduled || '').getTime();
        return Math.abs(depTime - targetTime) <= windowMs || Math.abs(arrTime - targetTime) <= windowMs;
      });

      const threshold = 5;
      const isBusy = nearbyFlights.length > threshold;

      return {
        status: isBusy ? 'busy' : 'free',
        flightCount: nearbyFlights.length,
        message: isBusy
          ? `Airport ${iataCode} is congested: ${nearbyFlights.length} movements within 15 min`
          : `Airport ${iataCode} is free: ${nearbyFlights.length} movements within 15 min`
      };
    } catch {
      return { status: 'unknown', flightCount: 0, message: 'Failed to check airport congestion' };
    }
  },

  /**
   * Numverify: Validate a phone number.
   * Falls back to valid=true if API is unavailable.
   */
  async validatePhone(phone: string): Promise<{ valid: boolean; message: string }> {
    const apiKey = process.env.NUMVERIFY_API_KEY;
    if (!apiKey) {
      return { valid: true, message: 'Phone validation skipped (API key not configured)' };
    }

    try {
      const url = `http://apilayer.net/api/validate?access_key=${encodeURIComponent(apiKey)}&number=${encodeURIComponent(phone)}`;
      const res = await safeFetch(url);
      if (!res?.ok) return { valid: true, message: 'Phone validation service unavailable' };

      const data = await res.json() as NumverifyResponse;
      return {
        valid: data.valid,
        message: data.valid ? 'Phone number is valid' : 'Phone number is invalid'
      };
    } catch {
      return { valid: true, message: 'Phone validation service unavailable' };
    }
  },

  /**
   * Mailboxlayer: Validate an email address (format + MX record check).
   * Falls back to valid=true if API is unavailable.
   */
  async validateEmail(email: string): Promise<{ valid: boolean; score: number; message: string }> {
    const apiKey = process.env.MAILBOXLAYER_API_KEY;
    if (!apiKey) {
      return { valid: true, score: 1, message: 'Email validation skipped (API key not configured)' };
    }

    try {
      const url = `http://apilayer.net/api/check?access_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&smtp=1&format=1`;
      const res = await safeFetch(url);
      if (!res?.ok) return { valid: true, score: 1, message: 'Email validation service unavailable' };

      const data = await res.json() as MailboxlayerResponse;
      const isValid = data.format_valid && data.mx_found;
      return {
        valid: isValid,
        score: data.score,
        message: isValid ? 'Email address is valid' : 'Email address appears invalid or unreachable'
      };
    } catch {
      return { valid: true, score: 1, message: 'Email validation service unavailable' };
    }
  },

  /**
   * IPstack: Detect country from IP address.
   * Returns 'el' for Greece, 'en' for everywhere else.
   */
  async detectCountry(ip: string): Promise<{ country_code: string; country_name: string; language: 'el' | 'en' }> {
    const apiKey = process.env.IPSTACK_API_KEY;
    if (!apiKey) {
      return { country_code: 'US', country_name: 'Unknown', language: 'en' };
    }

    try {
      const resolvedIp = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip) ? 'check' : ip;
      const url = `http://api.ipstack.com/${resolvedIp}?access_key=${encodeURIComponent(apiKey)}&fields=country_code,country_name`;
      const res = await safeFetch(url);
      if (!res?.ok) return { country_code: 'US', country_name: 'Unknown', language: 'en' };

      const data = await res.json() as IPstackResponse;
      const isGreece = data.country_code === 'GR';
      return {
        country_code: data.country_code || 'US',
        country_name: data.country_name || 'Unknown',
        language: isGreece ? 'el' : 'en'
      };
    } catch {
      return { country_code: 'US', country_name: 'Unknown', language: 'en' };
    }
  },

  /**
   * Weatherstack: Get current weather for a location (city name or IATA code).
   */
  async getWeather(location: string): Promise<{
    temperature: number;
    description: string;
    icon: string;
    wind_speed: number;
    humidity: number;
    feelslike: number;
    city: string;
    country: string;
  } | null> {
    const apiKey = process.env.WEATHERSTACK_API_KEY;
    if (!apiKey) return null;

    try {
      const city = IATA_TO_CITY[location.toUpperCase()] || location;
      const url = `http://api.weatherstack.com/current?access_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(city)}`;
      const res = await safeFetch(url);
      if (!res?.ok) return null;

      const data = await res.json() as WeatherstackResponse;
      if (!data.current) return null;

      return {
        temperature: data.current.temperature,
        description: data.current.weather_descriptions?.[0] || 'Unknown',
        icon: data.current.weather_icons?.[0] || '',
        wind_speed: data.current.wind_speed,
        humidity: data.current.humidity,
        feelslike: data.current.feelslike,
        city: data.location?.name || location,
        country: data.location?.country || ''
      };
    } catch {
      return null;
    }
  },

  /**
   * Fixer: Get exchange rates (free tier: EUR base only).
   * Falls back to hardcoded rates if API is unavailable.
   */
  async getExchangeRates(
    base: string = 'EUR',
    symbols: string[] = ['USD', 'GBP']
  ): Promise<{ base: string; rates: Record<string, number> }> {
    const apiKey = process.env.FIXER_API_KEY;
    const fallbackRates: Record<string, number> = { USD: 1.08, GBP: 0.86 };

    if (!apiKey) {
      return { base, rates: fallbackRates };
    }

    try {
      const url = `http://data.fixer.io/api/latest?access_key=${encodeURIComponent(apiKey)}&symbols=${symbols.join(',')}`;
      const res = await safeFetch(url);
      if (!res?.ok) return { base, rates: fallbackRates };

      const data = await res.json() as FixerResponse;
      if (!data.success || !data.rates || Object.keys(data.rates).length === 0) {
        return { base, rates: fallbackRates };
      }

      return { base: data.base || base, rates: data.rates };
    } catch {
      return { base, rates: fallbackRates };
    }
  }
};
