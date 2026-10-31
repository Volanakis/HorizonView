// Shared by the UI (labels, suggestions) and the API (weather lookups).
export const IATA_TO_CITY: Record<string, string> = {
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
  JMK: 'Mykonos', JTR: 'Santorini', KVA: 'Kavala', KLX: 'Kalamata',
  CHQ: 'Chania', ZTH: 'Zakynthos', PVK: 'Preveza', GPA: 'Patras',
  KGS: 'Kos', MLO: 'Milos', JSI: 'Skiathos', AXD: 'Alexandroupoli',
  LRS: 'Leros', KIT: 'Kithira', VOL: 'Volos', IOA: 'Ioannina',
  EFL: 'Kefalonia', MJT: 'Mytilene', SMI: 'Samos',
};

export function iataToCity(iata: string): string {
  return IATA_TO_CITY[iata.toUpperCase()] || iata;
}


/** Suggestions for airport inputs, sorted by city. */
export const AIRPORTS = Object.entries(IATA_TO_CITY)
  .map(([code, city]) => ({ code, city }))
  .sort((a, b) => a.city.localeCompare(b.city) || a.code.localeCompare(b.code));

export const IATA_PATTERN = /^[A-Z]{3}$/;
