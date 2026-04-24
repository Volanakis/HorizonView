# System Architecture

## 3-Tier Architecture (Security-Hardened)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION TIER                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Alpine.js (UI Logic)      │  Tailwind CSS (Styling)      │  │
│  │  - No token in localStorage│  - Responsive Design         │  │
│  │  - CSRF token on forms     │  - Components                │  │
│  │  - Fetch with credentials  │  - No inline styles (CSP)    │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       LOGIC TIER                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               Node.js + Express + TypeScript               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │  Security   │ │ Controllers │ │      Services       │  │  │
│  │  │  Middleware │ │  (HTTP)     │ │  (Business Logic)   │  │  │
│  │  │ ─────────── │ └─────────────┘ └─────────────────────┘  │  │
│  │  │ Helmet.js   │                                           │  │
│  │  │ CORS        │ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │ Rate Limit  │ │  Auth MW    │ │   Zod Validation    │  │  │
│  │  │ CSRF        │ │ JWT+Cookie  │ │   (Input Schemas)   │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        DATA TIER                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL (Primary)                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │  │
│  │  │  Users   │ │ Flights  │ │  Seats   │ │  Audit Log  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────────┘  │  │
│  │  ┌──────────┐ ┌──────────────┐                           │  │
│  │  │Reserv.   │ │Refresh Tokens│  Parameterized queries    │  │
│  │  └──────────┘ └──────────────┘  Row-level locking        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow (with Security Layers)

```
Browser
  │
  │  HTTPS only (HSTS enforced)
  ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Security Middleware Stack                     │
│                                                                  │
│  1. Helmet.js          → CSP, HSTS, X-Frame-Options, etc.       │
│  2. CORS               → Whitelist of allowed origins only       │
│  3. Rate Limiter       → Per-IP + per-user limits (express-rate-limit) │
│  4. Body Parser        → Max body size enforced                  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │   Router    │
                          └──────┬──────┘
                                 │
               ┌─────────────────┼─────────────────┐
               ▼                 ▼                 ▼
         ┌──────────┐     ┌──────────┐      ┌──────────┐
         │  Auth    │     │ Flights  │      │Reserv.   │
         │Controller│     │Controller│      │Controller│
         └────┬─────┘     └────┬─────┘      └────┬─────┘
              │                │                  │
              ▼                ▼                  ▼
         ┌──────────────────────────────────────────────┐
         │              Zod Schema Validation            │
         │  (rejects malformed input before business logic) │
         └────────────────────┬─────────────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │  Service    │
                       │  Layer      │
                       └──────┬──────┘
                              │
                              ▼
                       ┌─────────────┐
                       │  Database   │
                       │ (Parameterized
                       │  queries +  │
                       │  FOR UPDATE │
                       │  locking)   │
                       └──────┬──────┘
                              │
                              ▼
                          Response
                       (no stack traces
                        in production)
```

## Security Middleware Details

```
┌─────────────────────────────────────────────────────────────────┐
│                        HELMET.JS HEADERS                        │
├─────────────────────────────────────────────────────────────────┤
│ Content-Security-Policy   → script-src 'self' only             │
│ Strict-Transport-Security → max-age=31536000; includeSubDomains│
│ X-Frame-Options           → DENY (clickjacking protection)     │
│ X-Content-Type-Options    → nosniff                            │
│ Referrer-Policy           → strict-origin-when-cross-origin    │
│ Permissions-Policy        → camera=(), microphone=()           │
├─────────────────────────────────────────────────────────────────┤
│                        RATE LIMITING                            │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/auth/login      → 5 requests / 15 min (per IP)       │
│ POST /api/auth/register   → 3 requests / hour  (per IP)        │
│ POST /api/auth/refresh    → 10 requests / 15 min (per IP)      │
│ All other endpoints       → 100 requests / 15 min (per user)   │
├─────────────────────────────────────────────────────────────────┤
│                      AUTHENTICATION                             │
├─────────────────────────────────────────────────────────────────┤
│ Access token   → JWT, 15 min TTL, httpOnly + Secure cookie     │
│ Refresh token  → Opaque token, 7 days TTL, httpOnly cookie     │
│                  Stored hashed in DB, single-use rotation      │
│ CSRF token     → Double-submit cookie pattern                  │
├─────────────────────────────────────────────────────────────────┤
│                      INPUT VALIDATION                           │
├─────────────────────────────────────────────────────────────────┤
│ All request bodies validated with Zod schemas                  │
│ All query params sanitized before use in queries               │
│ File uploads: type check + size limit (CSV import only)        │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  HTML5   │  │Alpine.js │  │Tailwind  │  │  Fetch   │       │
│  │  DOM     │  │Reactive  │  │  CSS     │  │+credentials       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
├─────────────────────────────────────────────────────────────────┤
│                          BACKEND                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Node.js │ │ Express  │ │TypeScript│ │ Security         │  │
│  │  18.x    │ │  API     │ │  5.x     │ │ helmet / zod /   │  │
│  └──────────┘ └──────────┘ └──────────┘ │ express-rate-limit│  │
│                                          └──────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                         DATABASE                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL 16+                                           │  │
│  │ - Parameterized queries (pg / Drizzle ORM)               │  │
│  │ - Row-level locking (SELECT ... FOR UPDATE)              │  │
│  │ - CHECK constraints on ENUM-like columns                 │  │
│  │ - Triggers for audit log                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```
