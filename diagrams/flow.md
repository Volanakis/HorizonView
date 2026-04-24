# User Roles & Workflows

## User Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ROLES HIERARCHY                         │
└─────────────────────────────────────────────────────────────────┘

                          ┌─────────┐
                          │  ADMIN  │
                          └────┬────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │  MANAGER   │  │  CUSTOMER  │  │  VISITOR   │
       └────────────┘  └────────────┘  └────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ROLE PERMISSIONS                           │
├─────────────────────────────────────────────────────────────────┤
│ ADMIN                                                           │
│  ├─ All manager permissions                                     │
│  ├─ User management (view, role change)                        │
│  ├─ Bulk import users (CSV — validated, size-limited)          │
│  └─ Audit log viewer                                           │
├─────────────────────────────────────────────────────────────────┤
│ MANAGER (Flight Manager)                                        │
│  ├─ Flight CRUD (create, read, update — CREATED state only)    │
│  ├─ Flight state transitions (CREATED→STAFFED→COMPLETED/CANCEL)│
│  ├─ View all reservations (no payment data of customers)       │
│  └─ Cannot access user personal data                           │
├─────────────────────────────────────────────────────────────────┤
│ CUSTOMER                                                        │
│  ├─ Search/view flights                                        │
│  ├─ Make reservations (own account only — IDOR enforced)       │
│  ├─ View/cancel own reservations                               │
│  └─ Profile management (own data only)                        │
├─────────────────────────────────────────────────────────────────┤
│ VISITOR                                                         │
│  ├─ Search/view flights (read-only, public data only)          │
│  ├─ Register account                                           │
│  └─ Login                                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow (httpOnly Cookie + Refresh Token Rotation)

```
┌──────────┐                                         ┌──────────┐
│  Browser │                                         │  Server  │
└────┬─────┘                                         └─────┬────┘
     │                                                     │
     │  POST /api/auth/login { username, password }        │
     │────────────────────────────────────────────────────►│
     │                                                     │ Validate creds
     │                                                     │ bcrypt.compare()
     │                                                     │ Generate:
     │                                                     │  - JWT (15 min)
     │                                                     │  - Refresh token
     │                                                     │    (store hash in DB)
     │  200 + Set-Cookie: access_token (httpOnly, Secure)  │
     │◄────────────────────────────────────────────────────│
     │       Set-Cookie: refresh_token (httpOnly, Secure)  │
     │       Body: { user: { id, username, role } }        │
     │                                                     │
     │  ... 14 minutes later, access token still valid ... │
     │                                                     │
     │  GET /api/flights (cookie sent automatically)       │
     │────────────────────────────────────────────────────►│
     │                                                     │ Verify JWT signature
     │                                                     │ Check expiry
     │  200 + flight data                                  │
     │◄────────────────────────────────────────────────────│
     │                                                     │
     │  ... access token expires (15 min) ...              │
     │                                                     │
     │  POST /api/auth/refresh (refresh_token cookie sent) │
     │  Header: X-CSRF-Token: <token>                      │
     │────────────────────────────────────────────────────►│
     │                                                     │ Hash incoming token
     │                                                     │ Lookup in DB
     │                                                     │ If revoked → 401
     │                                                     │   + revoke all
     │                                                     │     user tokens
     │                                                     │     (reuse detected)
     │                                                     │ Rotate: revoke old,
     │                                                     │  issue new pair
     │  200 + new access_token cookie + new refresh cookie │
     │◄────────────────────────────────────────────────────│
     │                                                     │
     │  POST /api/auth/logout                              │
     │  Header: X-CSRF-Token: <token>                      │
     │────────────────────────────────────────────────────►│
     │                                                     │ Revoke refresh token
     │                                                     │ Clear both cookies
     │  204 No Content                                     │
     │◄────────────────────────────────────────────────────│
```

## Flight Lifecycle (State Machine)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLIGHT STATE MACHINE                         │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────┐      ┌──────────┐      ┌───────────┐
    │ CREATED  │─────►│ STAFFED  │─────►│ COMPLETED │
    └──────────┘      └──────────┘      └───────────┘
         │                 │
         │                 │
         ▼                 ▼
    ┌──────────┐      ┌──────────┐
    │CANCELLED │◄─────│CANCELLED │
    └──────────┘      └──────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     STATE TRANSITIONS                           │
├─────────────────────────────────────────────────────────────────┤
│ CREATED   ──► STAFFED    (Manager assigns crew)                 │
│ CREATED   ──► CANCELLED  (Manager cancels before staffing)      │
│ STAFFED   ──► COMPLETED  (Flight departs successfully)          │
│ STAFFED   ──► CANCELLED  (Manager cancels after staffing)       │
│ COMPLETED ── TERMINAL    (no further changes)                   │
│ CANCELLED ── TERMINAL    (no further changes)                   │
├─────────────────────────────────────────────────────────────────┤
│                     STATE-SPECIFIC RULES                        │
├─────────────────────────────────────────────────────────────────┤
│ CREATED:  Pricing editable, seats bookable                      │
│ STAFFED:  Pricing locked (snapshot in seats table), seats locked│
│ COMPLETED: No mutations allowed — 422 on any write attempt      │
│ CANCELLED: No mutations allowed — reservations auto-cancelled   │
├─────────────────────────────────────────────────────────────────┤
│ Transitions enforced at SERVICE LAYER (not just DB)             │
│ Invalid transition → 422 with descriptive error code            │
│ All transitions written to AUDIT_LOG                            │
└─────────────────────────────────────────────────────────────────┘
```

## Booking Flow (with Concurrency Safety)

```
┌──────────────────────────────────────────────────────────────────┐
│                     RESERVATION PROCESS                          │
└──────────────────────────────────────────────────────────────────┘

   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │ Search   │───►│ Select   │───►│ Choose   │───►│   Confirm    │
   │ Flights  │    │ Flight   │    │ Seat     │    │   Reserve    │
   └──────────┘    └──────────┘    └──────────┘    └──────┬───────┘
                                                          │
                                     ┌────────────────────▼──────────┐
                                     │  BEGIN TRANSACTION             │
                                     │  SELECT seat FOR UPDATE        │ ← locks row
                                     │  IF NOT available → ROLLBACK   │ → 409
                                     │  UPDATE seat SET available=F   │
                                     │  INSERT reservation            │
                                     │  COMMIT                        │
                                     └────────────────────┬──────────┘
                                                          │
                                                ┌─────────▼────────┐
                                                │  201 Confirmed   │
                                                │ (or 409 Conflict)│
                                                └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        TICKET CLASSES                           │
├─────────────────────────────────────────────────────────────────┤
│ ECONOMY  ▸ Rows 16-30  │ Lowest price  │ Basic service          │
│ NORMAL   ▸ Rows  6-15  │ Mid price     │ Standard service       │
│ BUSINESS ▸ Rows  1-5   │ Highest price │ Premium service        │
├─────────────────────────────────────────────────────────────────┤
│ Prices set per-seat in CREATED state                            │
│ Prices locked once flight moves to STAFFED                      │
│ Reservation stores a price snapshot at booking time             │
└─────────────────────────────────────────────────────────────────┘
```

## CSV User Import Flow (Admin)

```
Admin uploads CSV
       │
       ▼
┌─────────────────────────────────┐
│ Validate file                   │
│  - MIME type = text/csv only    │
│  - Size limit: 2 MB             │
│  - Parse with strict schema     │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Per-row Zod validation          │
│  - username, email, name, role  │
│  - vat_number format            │
│  - Duplicates flagged           │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Bulk INSERT in a transaction    │
│ Passwords auto-generated,       │
│ hashed with bcrypt (12 rounds)  │
│ Users notified via email        │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Import summary returned:        │
│  { imported: N, skipped: M,     │
│    errors: [{ row, reason }] }  │
│ Full import logged to AUDIT_LOG │
└─────────────────────────────────┘
```
