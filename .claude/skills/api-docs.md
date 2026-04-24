# API Documentation Skill

Generate OpenAPI/Swagger documentation for Express routes.

## Prerequisites

Install the required package:
```bash
npm install @asteasolutions/zod-to-openapi
```

## Usage

### 1. Define Schemas

Create a schemas file or add to existing:

```typescript
// src/docs/schemas.ts
import { z } from 'zod';
import { OpenAPIV3 } from 'openapi-types';

export const UserSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['visitor', 'customer', 'manager', 'admin'] },
  },
};

export const ErrorSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
};
```

### 2. Register Routes

In your route file, add OpenAPI metadata:

```typescript
// src/routes/flights.route.ts
import { Router } from 'express';
import { z } from 'zod';
import { createRoute, OpenAPIV3 } from '@asteasolutions/zod-to-openapi';

const flightSchema = z.object({
  id: z.number(),
  flight_number: z.string(),
  departure: z.string().length(3),
  arrival: z.string().length(3),
  scheduled_time: z.string().datetime(),
  state: z.enum(['created', 'staffed', 'completed', 'cancelled']),
});

export const getFlights = createRoute({
  method: 'get',
  path: '/flights',
  tags: ['Flights'],
  summary: 'List all flights',
  responses: {
    200: {
      description: 'List of flights',
      content: {
        'application/json': {
          schema: z.array(flightSchema),
        },
      },
    },
  },
});
```

### 3. Generate Spec

Create OpenAPI spec generator:

```typescript
// src/docs/index.ts
import { generateOpenAPISpec } from '@asteasolutions/zod-to-openapi';
import { flightsRouter } from '../routes/flights.route.js';
// ... import other routers

export const spec = generateOpenAPISpec({
  openapi: '3.0.0',
  info: {
    title: 'HorizonView API',
    version: '1.0.0',
    description: 'Airline Flight & Reservation Management API',
  },
  routes: [
    ...flightsRouter,
    // ... other routes
  ],
});
```

### 4. Serve Swagger UI

```bash
npm install swagger-ui-express
```

```typescript
// src/app.ts
import swaggerUi from 'swagger-ui-express';
import { spec } from './docs/index.js';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
```

## Endpoint: `/api-docs`

Access at `http://localhost:3000/api-docs`

## Verification

1. Run `npx tsc --noEmit` — must compile clean
2. Start dev server
3. Visit `/api-docs` to view interactive docs
