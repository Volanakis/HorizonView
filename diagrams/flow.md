# 👥 User Roles & Workflows

> Diagrams render natively on GitHub via [Mermaid](https://mermaid.js.org/).

## User Roles

```mermaid
flowchart TB
    ADMIN["👑 ADMIN"]
    MANAGER["🛫 MANAGER"]
    CUSTOMER["🎫 CUSTOMER"]
    VISITOR["👀 VISITOR"]
    ADMIN --> MANAGER
    ADMIN --> CUSTOMER
    ADMIN --> VISITOR
```

### Role Permissions

| Role | Permissions |
|:-----|:------------|
| 👑 **Admin** | All manager permissions · user management (view, stats, role change, toggle active) · **bulk import users (JSON)** · audit-log access |
| 🛫 **Manager** | Flight CRUD (delete only in `created` state) · flight state transitions · airport-status lookup |
| 🎫 **Customer** | Search/view flights · make reservations (own — IDOR enforced) · view/cancel own reservations · update own profile |
| 👀 **Visitor** | Search/view flights (public data) · register · login · forgot/reset password · external APIs (weather, exchange rates, language detection) |

## Authentication Flow (httpOnly Cookie + Refresh Token Rotation)

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server

    B->>S: POST /auth/login { username, password }
    Note right of S: Validate creds · bcrypt.compare()<br/>Issue JWT (15m) + refresh token (store hash)
    S-->>B: 200 · Set-Cookie access_token + refresh_token<br/>Body { user }

    B->>S: GET /api/flights (access_token cookie sent)
    Note right of S: Verify JWT signature + expiry
    S-->>B: 200 · flight data

    Note over B,S: ...access token expires (15 min)...

    B->>S: POST /auth/refresh (refresh cookie + X-CSRF-Token)
    Note right of S: Hash token, look up in DB<br/>If revoked → revoke ALL user tokens (reuse!)<br/>Else rotate: revoke old, issue new pair
    S-->>B: 200 · new access_token + refresh_token

    B->>S: POST /auth/logout (X-CSRF-Token)
    Note right of S: Revoke refresh token · clear cookies
    S-->>B: 204 No Content
```

## Profile Update Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server

    B->>S: PATCH /auth/profile (X-CSRF-Token)<br/>{ name?, email?, address?, phone? }
    Note right of S: JWT verify · Zod validate<br/>Update allowed fields in users table
    S-->>B: 200 · updated user object
```

## Password Reset Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server

    B->>S: POST /auth/forgot-password { email }
    Note right of S: Look up user by email<br/>Generate 32-byte random token<br/>Store SHA-256 hash (1h TTL)
    S-->>B: 200 · { message }

    Note over B,S: ...user retrieves token from email (or dev response if SHOW_RESET_TOKEN)...

    B->>S: POST /auth/reset-password { token, newPassword }
    Note right of S: Hash token<br/>Verify not used & not expired<br/>Update password (bcrypt, 12 rounds)<br/>Revoke ALL refresh tokens<br/>Mark token as used
    S-->>B: 200 · password updated

    Note over B,S: All existing sessions invalidated
```

## Flight Lifecycle (State Machine)

```mermaid
stateDiagram-v2
    [*] --> created: Create flight (Manager)
    created --> staffed: Assign crew
    created --> cancelled: Cancel before staffing
    created --> [*]: Delete (only in this state)
    staffed --> completed: Flight departs
    staffed --> cancelled: Cancel after staffing
    completed --> [*]
    cancelled --> [*]
```

| State | Rules |
|:------|:------|
| `created` | Seats bookable · flight deletable (only if no confirmed reservations) |
| `staffed` | Pricing locked (snapshot in seats) · seats locked |
| `completed` | Terminal — no mutations (write attempt → 422) |
| `cancelled` | Terminal — reservations auto-cancelled |

> Transitions are enforced in the **service layer** (not just the DB `CHECK`). Invalid transitions return `422`; every transition is written to the audit log.

## Booking Flow (with Concurrency Safety)

```mermaid
flowchart LR
    A[Search flights] --> B[Select flight]
    B --> C[Choose seat]
    C --> D[Confirm reservation]
    D --> T

    subgraph T["better-sqlite3 transaction"]
        direction TB
        T1[BEGIN] --> T2{flight in<br/>created/staffed?}
        T2 -->|no| T3[ROLLBACK → 422 Not bookable]
        T2 -->|yes| T4{seat available<br/>& class matches<br/>ticket_type?}
        T4 -->|no| T5[ROLLBACK → 409/400 Conflict]
        T4 -->|yes| T6[Snapshot price<br/>UPDATE seat is_available = 0<br/>INSERT reservation]
        T6 --> T7[COMMIT]
    end

    T7 --> OK([201 Confirmed])
    T3 --> FAIL([422 Not bookable])
    T5 --> FAIL2([409/400 Conflict])
```

### Ticket Classes

| Class | Cabin rows | Tier |
|:------|:-----------|:-----|
| 💺 **Business** | Front rows | Highest price · premium service |
| 🪑 **Normal** | Middle rows | Mid price · standard service |
| 🎟️ **Economy** | Rear rows | Lowest price · basic service |

> Prices are set per-seat in the `created` state, locked once a flight moves to `staffed`, and a price **snapshot** is stored on each reservation at booking time.

## JSON User Import Flow (Admin)

```mermaid
flowchart TB
    A["Admin POST /api/users/import<br/>{ users: [ ... ] }"] --> V
    subgraph V["Per-row Zod validation (1–500 users)"]
        V1["username · password · name · email"]
        V2["identity_number (required)"]
        V3["role? · vat_number? · address? · employee_code?"]
    end
    V --> B["Bulk INSERT in a transaction<br/>passwords bcrypt-hashed (12 rounds)<br/>duplicates skipped"]
    B --> R["Summary returned:<br/>{ imported, skipped, errors[] }<br/>Import logged to audit_log"]
```
