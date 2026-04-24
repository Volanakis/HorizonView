# Caching Rule

Caching strategies for HorizonView.

## Cache Locations

1. **In-memory** — Application-level, single instance
2. **Database** — Query result caching
3. **External API** — Third-party responses
4. **Browser** — Static assets, PWA offline

## In-Memory Cache

```typescript
// src/utils/cache.ts
export class Cache<T> {
  private store = new Map<string, { value: T; expires: number }>();

  set(key: string, value: T, ttlMs: number = 60000): void {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }

  get(key: string): T | undefined {
    const item = this.store.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return undefined;
    }
    return item.value;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
```

## API Response Caching

```typescript
// src/services/flight.service.ts
import { Cache } from '../utils/cache.js';

const flightsCache = new Cache<Flight[]>();

export async function getFlights(filters: FlightFilters): Promise<Flight[]> {
  const cacheKey = JSON.stringify(filters);

  const cached = flightsCache.get(cacheKey);
  if (cached) return cached;

  const flights = await db.query('SELECT * FROM flights WHERE ...', [...]);
  flightsCache.set(cacheKey, flights, 30000); // 30s TTL

  return flights;
}

// Invalidate on mutations
export async function createFlight(data: CreateFlightDto): Promise<Flight> {
  const flight = await db.insert('flights', data);
  flightsCache.clear(); // Invalidate all cached flights
  return flight;
}
```

## HTTP Caching Headers

```typescript
// ETag support
app.get('/flights', (req, res) => {
  const flights = getFlights();
  const etag = generateEtag(flights);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.set('ETag', etag);
  res.set('Cache-Control', 'public, max-age=30');
  res.json(flights);
});
```

## Guidelines

- Cache expensive operations (external API calls, complex queries)
- Use appropriate TTLs per data type
- Invalidate cache on data mutations
- Don't cache user-specific data in shared cache
- Consider memory limits for in-memory cache
