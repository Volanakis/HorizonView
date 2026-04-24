# API Design Rule

RESTful API conventions for HorizonView.

## Response Envelope

```typescript
// Success response
{
  "data": { /* resource */ },
  "meta": { /* pagination metadata */ }
}

// Error response
{
  "error": {
    "message": "Human readable message",
    "code": "ERROR_CODE"
  }
}
```

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET/PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE (no content) |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict (duplicate, etc.) |
| 429 | Rate limited |
| 500 | Internal server error |

## Resource Naming

```typescript
// Routes
POST   /api/flights          // Create
GET    /api/flights          // List
GET    /api/flights/:id      // Get one
PATCH  /api/flights/:id      // Update
DELETE /api/flights/:id      // Delete

// Nested resources
GET    /api/flights/:id/reservations
GET    /api/users/:id/reservations
```

## Query Parameters

```typescript
// Pagination
GET /flights?page=2&limit=20

// Filtering
GET /flights?from=ATH&to=LHR

// Sorting
GET /flights?sort=scheduled_time&order=desc

// Field selection
GET /flights?fields=id,flight_number,departure
```

## Request Body

```typescript
// POST /flights
{
  "flight_number": "HV-001",
  "departure": "ATH",
  "arrival": "LHR",
  "scheduled_time": "2024-06-15T10:00:00Z",
  "total_seats": 180
}

// PATCH /flights/:id (partial update)
{
  "state": "staffed"
}
```

## Versioning

```typescript
// URL-based versioning
GET /api/v1/flights

// Or header
GET /flights
Accept-Version: v1
```

## RESTful Guidelines

- Use nouns for resources, not verbs
- Return appropriate status codes
- Use plural nouns: `/flights` not `/flight`
- Use sub-resources for relationships
- Support pagination on list endpoints
- Return Location header on create
