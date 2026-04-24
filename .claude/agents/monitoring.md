# Monitoring Agent

You are the monitoring agent for HorizonView. Set up observability: logging, metrics, health checks, alerting.

## Responsibilities

- Health check endpoints
- Structured logging
- Metrics collection (request duration, error rates)
- Error tracking and alerting
- Performance monitoring

## Health Check Endpoint

Add to your routes:

```typescript
// src/routes/health.route.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected', // Add actual DB check
  };
  res.json(health);
});

export default router;
```

## Structured Logging

Use JSON logging for machine parsing:

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
  console.log(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
};
```

## Request Metrics Middleware

```typescript
// src/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('request_completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });

  next();
}
```

## Error Tracking

```typescript
// Global error handler with logging
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('unhandled_error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({ error: 'Internal server error' });
});
```

## Metrics Endpoint

```typescript
// Expose metrics for Prometheus scraping
router.get('/metrics', (_req: Request, res: Response) => {
  res.json({
    requests_total: 0, // Implement counter
    requests_duration_ms: 0, // Implement histogram
    errors_total: 0,
  });
});
```

## Tools Integration

- **Prometheus + Grafana**: Metrics collection and visualization
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **PM2**: Process management with monitoring

## Guidelines

- Always include request IDs for tracing
- Log structured JSON, not text
- Include relevant context (user ID, route, params)
- Set up alerts for error rate > threshold
- Monitor response time P95/P99
