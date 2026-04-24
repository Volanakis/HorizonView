# Performance Tuning Skill

Analyze and optimize slow queries and caching strategies.

## Identifying Slow Queries

```sql
-- Enable query logging in sql.js
-- Log slow queries (>100ms)
SELECT * FROM flights
WHERE scheduled_time > datetime('now')
ORDER BY scheduled_time;

-- Use EXPLAIN (if available) to analyze query plan
```

## Adding Indexes

```sql
-- Add indexes for frequently filtered columns
CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights(departure);
CREATE INDEX IF NOT EXISTS idx_flights_arrival ON flights(arrival);
CREATE INDEX IF NOT EXISTS idx_flights_scheduled_time ON flights(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_flights_state ON flights(state);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_flights_route_date
ON flights(departure, arrival, scheduled_time);

-- Index foreign keys
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_flight ON reservations(flight_id);
```

## Caching External APIs

```typescript
// src/services/weather.cache.ts
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 600
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
    return data;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }
}

export const weatherCache = new ApiCache();
```

Use in service:

```typescript
async function getWeather(airport: string) {
  return weatherCache.getOrFetch(
    `weather:${airport}`,
    () => externalApi.fetchWeather(airport),
    300 // 5 minutes
  );
}
```

## Response Compression

```typescript
// src/app.ts
import compression from 'compression';
app.use(compression());
```

## Pagination Limits

```typescript
// Always limit result sets
const MAX_PAGE_SIZE = 50;

router.get('/flights', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, MAX_PAGE_SIZE);
  const offset = parseInt(req.query.offset) || 0;
  // Query with LIMIT/OFFSET
});
```

## Verification

1. Add indexes, run `npm run migrate`
2. Check slow query logs
3. Verify cache hit rates
4. Run load tests if needed
