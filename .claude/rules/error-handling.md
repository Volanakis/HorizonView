# Error Handling Rule

Centralized error handling for HorizonView.

## Error Types

```typescript
// src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}
```

## Error Handler Middleware

```typescript
// src/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  // Don't leak internal errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
```

## Async Error Wrapper

```typescript
// src/utils/async-handler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

## Usage

```typescript
// routes/flights.route.ts
import { asyncHandler } from '../utils/async-handler.js';
import { NotFoundError } from '../errors/app-error.js';

router.get('/flights/:id', asyncHandler(async (req, res) => {
  const flight = await FlightService.getById(req.params.id);
  if (!flight) throw new NotFoundError('Flight');
  res.json(flight);
}));
```

## Guidelines

- Use typed error classes
- Don't expose internal error details
- Log errors server-side
- Return consistent error format
