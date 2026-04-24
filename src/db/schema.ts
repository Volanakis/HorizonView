// Single source of truth for all DDL.
// Imported by both db/index.ts (runtime init) and db/migrate.ts (CLI migration).
export const DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    vat_number VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK(role IN ('visitor', 'customer', 'manager', 'admin')),
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_number VARCHAR(10) UNIQUE NOT NULL,
    departure CHAR(3) NOT NULL,
    arrival CHAR(3) NOT NULL,
    scheduled_time DATETIME NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'created' CHECK(state IN ('created', 'staffed', 'completed', 'cancelled')),
    total_seats INTEGER NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK(departure != arrival)
  );

  CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    seat_number VARCHAR(5) NOT NULL,
    class VARCHAR(20) NOT NULL CHECK(class IN ('economy', 'normal', 'business')),
    price NUMERIC(10,2) NOT NULL CHECK(price > 0),
    is_available INTEGER NOT NULL DEFAULT 1,
    UNIQUE(flight_id, seat_number)
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    flight_id INTEGER NOT NULL REFERENCES flights(id),
    seat_id INTEGER NOT NULL REFERENCES seats(id),
    ticket_type VARCHAR(20) NOT NULL CHECK(ticket_type IN ('economy', 'normal', 'business')),
    price NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled')),
    cancelled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seat_id)
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50),
    entity_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
  CREATE INDEX IF NOT EXISTS idx_flights_number    ON flights(flight_number);
  CREATE INDEX IF NOT EXISTS idx_flights_state     ON flights(state);
  CREATE INDEX IF NOT EXISTS idx_flights_scheduled ON flights(scheduled_time);
  CREATE INDEX IF NOT EXISTS idx_seats_flight      ON seats(flight_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_user   ON reservations(user_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_flight ON reservations(flight_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
  CREATE INDEX IF NOT EXISTS idx_audit_log_user    ON audit_log(user_id);
`;
