# Database Schema

## Entity Relationship Diagram

```
┌──────────────────────┐          ┌───────────────────────┐
│        USERS         │          │        FLIGHTS         │
├──────────────────────┤          ├───────────────────────┤
│ id           SERIAL  │          │ id           SERIAL   │
│ username     VARCHAR │          │ flight_number VARCHAR  │
│ password     VARCHAR │          │ departure    CHAR(3)   │
│ name         VARCHAR │          │ arrival      CHAR(3)   │
│ vat_number   VARCHAR │          │ scheduled_time TIMESTAMPTZ
│ email        VARCHAR │          │ state        VARCHAR   │
│ role         VARCHAR │          │ created_by   INT ──────┼──► USERS.id
│ last_login   TIMESTAMPTZ        │ created_at   TIMESTAMPTZ
│ created_at   TIMESTAMPTZ        │ updated_at   TIMESTAMPTZ
│ updated_at   TIMESTAMPTZ        └──────────┬────────────┘
└───────────┬──────────┘                     │
            │                                │
            │                    ┌───────────▼────────────┐
            │                    │          SEATS          │
            │                    ├────────────────────────┤
            │                    │ id           SERIAL    │
            │                    │ flight_id    INT ───────┼──► FLIGHTS.id
            │                    │ seat_number  VARCHAR   │
            │                    │ class        VARCHAR   │
            │                    │ price        NUMERIC   │
            │                    │ is_available BOOLEAN   │
            │                    └──────────┬─────────────┘
            │                               │
            │        ┌──────────────────────┤
            │        │     RESERVATIONS     │
            │        ├──────────────────────┤
            │        │ id          SERIAL   │
            └────────┤ user_id     INT      │
                     │ flight_id   INT ─────┼──► FLIGHTS.id
                     │ seat_id     INT ─────┼──► SEATS.id
                     │ ticket_type VARCHAR  │
                     │ price       NUMERIC  │
                     │ status      VARCHAR  │
                     │ cancelled_at TIMESTAMPTZ
                     │ created_at  TIMESTAMPTZ
                     └──────────────────────┘

┌────────────────────────┐      ┌──────────────────────────┐
│    REFRESH_TOKENS      │      │        AUDIT_LOG         │
├────────────────────────┤      ├──────────────────────────┤
│ id         SERIAL      │      │ id          SERIAL       │
│ user_id    INT ─────────┼──►  │ user_id     INT (nullable│
│ token_hash VARCHAR     │  USR │ action      VARCHAR      │
│ expires_at TIMESTAMPTZ │      │ entity      VARCHAR      │
│ revoked    BOOLEAN     │      │ entity_id   INT          │
│ created_at TIMESTAMPTZ │      │ ip_address  INET         │
│ ip_address INET        │      │ user_agent  TEXT         │
└────────────────────────┘      │ created_at  TIMESTAMPTZ  │
                                └──────────────────────────┘
```

## Table Details

### Users
```
┌──────────────────┬──────────────────┬──────────────────────────────┐
│ Column           │ Type             │ Constraints                  │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ id               │ SERIAL           │ PRIMARY KEY                  │
│ username         │ VARCHAR(50)      │ UNIQUE, NOT NULL             │
│ password         │ VARCHAR(255)     │ NOT NULL (bcrypt, 12 rounds) │
│ name             │ VARCHAR(100)     │ NOT NULL                     │
│ vat_number       │ VARCHAR(20)      │ UNIQUE, NULLABLE             │
│ email            │ VARCHAR(100)     │ UNIQUE, NOT NULL             │
│ role             │ VARCHAR          │ NOT NULL                     │
│                  │                  │ CHECK role IN ('visitor',     │
│                  │                  │ 'customer','manager','admin') │
│ last_login       │ TIMESTAMPTZ      │ NULLABLE                     │
│ created_at       │ TIMESTAMPTZ      │ DEFAULT NOW()                │
│ updated_at       │ TIMESTAMPTZ      │ DEFAULT NOW()                │
└──────────────────┴──────────────────┴──────────────────────────────┘
Note: Use VARCHAR + CHECK instead of ENUM to allow safe schema changes.
      TIMESTAMPTZ stores timezone — always store UTC.
```

### Flights
```
┌──────────────────┬──────────────────┬──────────────────────────────┐
│ Column           │ Type             │ Constraints                  │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ id               │ SERIAL           │ PRIMARY KEY                  │
│ flight_number    │ VARCHAR(10)      │ UNIQUE, NOT NULL             │
│ departure        │ CHAR(3)          │ NOT NULL (IATA code)         │
│ arrival          │ CHAR(3)          │ NOT NULL (IATA code)         │
│                  │                  │ CHECK departure != arrival    │
│ scheduled_time   │ TIMESTAMPTZ      │ NOT NULL                     │
│ state            │ VARCHAR          │ NOT NULL, DEFAULT 'created'  │
│                  │                  │ CHECK state IN ('created',    │
│                  │                  │ 'staffed','completed',        │
│                  │                  │ 'cancelled')                 │
│ created_by       │ INT              │ FOREIGN KEY → users.id       │
│ created_at       │ TIMESTAMPTZ      │ DEFAULT NOW()                │
│ updated_at       │ TIMESTAMPTZ      │ DEFAULT NOW()                │
└──────────────────┴──────────────────┴──────────────────────────────┘
```

### Seats
```
┌──────────────────┬──────────────────┬──────────────────────────────┐
│ Column           │ Type             │ Constraints                  │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ id               │ SERIAL           │ PRIMARY KEY                  │
│ flight_id        │ INT              │ FOREIGN KEY → flights.id     │
│ seat_number      │ VARCHAR(5)       │ NOT NULL                     │
│ class            │ VARCHAR          │ NOT NULL                     │
│                  │                  │ CHECK class IN ('economy',    │
│                  │                  │ 'normal','business')         │
│ price            │ NUMERIC(10,2)    │ NOT NULL, CHECK price > 0    │
│ is_available     │ BOOLEAN          │ NOT NULL, DEFAULT TRUE       │
└──────────────────┴──────────────────┴──────────────────────────────┘
UNIQUE (flight_id, seat_number)

Why a separate seats table:
- Enables SELECT ... FOR UPDATE on individual seat rows
- Prevents double-booking under concurrent requests without app-level locks
- Prices are per-seat (set at creation, locked once flight is 'staffed')
```

### Reservations
```
┌──────────────────┬──────────────────┬──────────────────────────────┐
│ Column           │ Type             │ Constraints                  │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ id               │ SERIAL           │ PRIMARY KEY                  │
│ user_id          │ INT              │ FOREIGN KEY → users.id       │
│ flight_id        │ INT              │ FOREIGN KEY → flights.id     │
│ seat_id          │ INT              │ FOREIGN KEY → seats.id       │
│ ticket_type      │ VARCHAR          │ NOT NULL                     │
│                  │                  │ CHECK type IN ('economy',     │
│                  │                  │ 'normal','business')         │
│ price            │ NUMERIC(10,2)    │ NOT NULL (snapshot at booking)│
│ status           │ VARCHAR          │ DEFAULT 'confirmed'          │
│                  │                  │ CHECK status IN ('confirmed', │
│                  │                  │ 'cancelled')                 │
│ cancelled_at     │ TIMESTAMPTZ      │ NULLABLE                     │
│ created_at       │ TIMESTAMPTZ      │ DEFAULT NOW()                │
└──────────────────┴──────────────────┴──────────────────────────────┘
```

### Refresh Tokens
```
┌──────────────────┬──────────────────┬──────────────────────────────┐
│ Column           │ Type             │ Constraints                  │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ id               │ SERIAL           │ PRIMARY KEY                  │
│ user_id          │ INT              │ FOREIGN KEY → users.id       │
│ token_hash       │ VARCHAR(255)     │ NOT NULL (SHA-256 of token)  │
│ expires_at       │ TIMESTAMPTZ      │ NOT NULL                     │
│ revoked          │ BOOLEAN          │ DEFAULT FALSE                │
│ ip_address       │ INET             │ NULLABLE (for anomaly detect)│
│ created_at       │ TIMESTAMPTZ      │ DEFAULT NOW()                │
└──────────────────┴──────────────────┴──────────────────────────────┘
Note: Raw token is never stored — only SHA-256 hash.
      Revoked tokens are kept until expires_at for reuse detection.
      A cron job can purge rows where expires_at < NOW() AND revoked = TRUE.
```

### Audit Log
```
┌──────────────────┬──────────────────┬──────────────────────────────┐
│ Column           │ Type             │ Constraints                  │
├──────────────────┼──────────────────┼──────────────────────────────┤
│ id               │ SERIAL           │ PRIMARY KEY                  │
│ user_id          │ INT              │ NULLABLE (pre-auth events)   │
│ action           │ VARCHAR(100)     │ NOT NULL (e.g. LOGIN_FAILED) │
│ entity           │ VARCHAR(50)      │ NULLABLE (e.g. 'reservation')│
│ entity_id        │ INT              │ NULLABLE                     │
│ ip_address       │ INET             │ NULLABLE                     │
│ user_agent       │ TEXT             │ NULLABLE                     │
│ created_at       │ TIMESTAMPTZ      │ DEFAULT NOW()                │
└──────────────────┴──────────────────┴──────────────────────────────┘
Note: Append-only. No UPDATE or DELETE permissions granted on this table.
      Logged events: LOGIN, LOGIN_FAILED, LOGOUT, REGISTER,
                     FLIGHT_CREATE, FLIGHT_STATE_CHANGE,
                     RESERVATION_CREATE, RESERVATION_CANCEL,
                     USER_ROLE_CHANGE, USER_IMPORT
```

## Indexes

```
users         │ username       (UNIQUE)
              │ email          (UNIQUE)
              │ vat_number     (UNIQUE, NULLS NOT DISTINCT)
              │ role           (for role-based queries)
──────────────┼───────────────────────────────────────────
flights       │ flight_number  (UNIQUE)
              │ state          (filter by active flights)
              │ scheduled_time (date-range search)
──────────────┼───────────────────────────────────────────
seats         │ (flight_id, seat_number) UNIQUE composite
              │ flight_id + is_available (seat map queries)
──────────────┼───────────────────────────────────────────
reservations  │ user_id        (user's reservation list)
              │ flight_id      (flight manifest)
              │ seat_id        (UNIQUE — enforces one booking per seat)
──────────────┼───────────────────────────────────────────
refresh_tokens│ token_hash     (lookup on refresh)
              │ user_id + revoked (revoke all tokens for a user)
              │ expires_at     (cleanup job)
──────────────┼───────────────────────────────────────────
audit_log     │ user_id        (per-user history)
              │ created_at     (time-range queries)
              │ action         (filter by event type)
```

## Concurrency: Seat Booking Transaction

```sql
-- Prevents double-booking under concurrent requests
BEGIN;

SELECT id, is_available
FROM seats
WHERE id = $seatId
FOR UPDATE;                    -- locks this row until COMMIT

-- If is_available = false → ROLLBACK + return 409 Conflict

UPDATE seats
SET is_available = FALSE
WHERE id = $seatId;

INSERT INTO reservations (user_id, flight_id, seat_id, ticket_type, price, status)
VALUES ($userId, $flightId, $seatId, $type, $price, 'confirmed');

COMMIT;
```
