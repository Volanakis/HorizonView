# 🏗️ System Architecture

> Diagrams render natively on GitHub via [Mermaid](https://mermaid.js.org/).

## 3-Tier Architecture (Security-Hardened)

One SvelteKit app (adapter-node) holds all three tiers: Svelte pages, `+server.ts` API endpoints, and server-only services.

```mermaid
flowchart TB
    subgraph P["🖥️ Presentation Tier — src/routes/**/+page.svelte"]
        direction LR
        A["Svelte 5 pages (client-rendered)<br/>no token in localStorage<br/>same-origin fetch with cookies"]
        C["Scoped CSS on purple design tokens<br/>light + dark · responsive<br/>no inline scripts or eval"]
    end

    subgraph L["⚙️ Logic Tier — SvelteKit on Node.js · TypeScript"]
        direction TB
        SEC["🛡️ hooks.server.ts<br/>headers · CORS · rate limit · CSRF cookie"]
        EP["+server.ts endpoints<br/>requireUser · requireCsrf · Zod"]
        SVC["src/lib/server/services<br/>(business logic)"]
        SEC --> EP --> SVC
    end

    subgraph D["🗄️ Data Tier"]
        DB["better-sqlite3 (SQLite)<br/>Parameterized queries<br/>Synchronous transactions<br/>Append-only audit log"]
    end

    P -->|HTTPS / JSON · HSTS enforced| L
    L -->|Parameterized SQL| D

    classDef tier fill:#3b1e4d,stroke:#9b78b6,color:#f3e9f6;
    class P,L,D tier;
```

## Request Flow (with Security Layers)

```mermaid
flowchart TD
    Browser([Browser — HTTPS only]) --> HK

    subgraph HK["hooks.server.ts — every request"]
        direction TB
        CK["1 · CSRF cookie issued / extended"]
        CO["2 · CORS preflight — allowed-origins list"]
        RL["3 · API rate limit — per IP"]
        CK --> CO --> RL
    end

    HK --> R{SvelteKit router}
    R --> PG["Pages → HTML shell with nonce CSP"]
    R --> EP["/api/**/+server.ts"]

    EP --> G["requireUser(roles) · requireCsrf<br/>endpoint-specific rate limit"]
    G --> V["Zod schema validation<br/>(422 with field errors)"]
    V --> S["Service layer<br/>(business rules · ownership checks)"]
    S --> DBX["Database<br/>(parameterized queries · transactions)"]
    DBX --> Resp(["JSON envelope — no stack traces<br/>security headers added on the way out"])
```

## Security Details

### 🪖 Response Headers

| Header | Value |
|:-------|:------|
| `Content-Security-Policy` (pages) | Set by SvelteKit (`kit.csp`): `script-src 'self' 'nonce-…'` · `style-src 'self'` · `connect-src 'self'` · `frame-ancestors 'none'` |
| `Content-Security-Policy` (API) | `default-src 'none'; frame-ancestors 'none'` + `Cache-Control: no-store` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cross-Origin-Opener-Policy` / `-Resource-Policy` | `same-origin` |

### 🚦 Rate Limiting

| Endpoint | Limit |
|:---------|:------|
| `POST /api/auth/login` | 5 requests / 15 min |
| `POST /api/auth/register` | 3 requests / hour |
| `POST /api/auth/refresh` | 10 requests / 15 min |
| `POST /api/auth/forgot-password` | 3 requests / hour |
| `POST /api/auth/reset-password` | 5 requests / 15 min |
| `GET /api/external/*` | 10 requests / min |
| All other `/api` endpoints | 100 requests / 15 min (static assets are not limited) |

### 🔑 Authentication

| Token | Details |
|:------|:--------|
| **Access token** | JWT · 15 min TTL · `httpOnly + Secure` cookie |
| **Refresh token** | Opaque · 7 day TTL · stored hashed · single-use rotation |
| **CSRF token** | Double-submit cookie pattern, required on all mutations |

### ✅ Input Validation

- All request bodies, query params, and `:id` params validated with **Zod** schemas.
- Bulk user import validated per-row (JSON payload, max 500 users).

## Technology Stack

```mermaid
flowchart LR
    subgraph FE["Frontend"]
        SV["Svelte 5 pages"]
        CSS["Scoped CSS + purple tokens"]
        FX["fetch + CSRF header"]
    end
    subgraph BE["Backend"]
        N["Node.js 20.19+"]
        KIT["SvelteKit 2 · adapter-node"]
        TS["TypeScript 5.x"]
        SECX["hooks.server.ts · zod · jsonwebtoken"]
    end
    subgraph DB["Database"]
        SQ["SQLite (better-sqlite3)"]
        TX["Synchronous transactions"]
        CK["CHECK constraints (enum-like)"]
        AUD["Append-only audit log"]
    end
    FE --> BE --> DB
```

**Database notes**

- Parameterized queries only — no string concatenation.
- Concurrency: SQLite serializes writes; seat booking re-checks availability inside a synchronous transaction (see [`database.md`](./database.md)).
- `CHECK` constraints emulate enums on `role`, `state`, `class`, `status`.
