# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- "First Class" look: aubergine header, self-hosted *Noto Serif Display* (with Greek) for headings, times, prices and airport codes, small-caps eyebrows, more spacing; champagne gold reserved for Business class
- Demo data is no longer seeded in production unless `SEED_DEMO_DATA=true`; seed flights are dated relative to today
- Production refuses the placeholder JWT secrets from this repository; Docker Compose requires `JWT_SECRET`; the Kubernetes overlays no longer apply a placeholder Secret
- ID number, VAT number and address are optional at sign-up

### Added

- Data export (`GET /api/auth/me/export`) and account deletion (`DELETE /api/auth/me`, anonymises the account) on the Account page
- Automatic migration of older databases (`src/lib/server/db/migrations.ts`)

### Fixed

- A seat freed by a cancellation could never be booked again
- `"false"` in env flags was read as true (e.g. `SHOW_RESET_TOKEN=false` printed reset tokens)
- `npm run seed:flights` failed (missing columns, 30-seat rows)

## [1.1.0] — 2026-11-01

### Changed

- Whole application is now one SvelteKit app (adapter-node): Express, Helmet, cors, cookie-parser, morgan, compression and express-rate-limit are gone. Express middleware moved to `hooks.server.ts` and small helpers in `src/lib/server/`; every route is a `+server.ts` endpoint at the same `/api` URL
- Alpine.js frontend replaced by Svelte 5 pages
- UI redesigned on a purple palette (`#F3E9F6` · `#CBB1D6` · `#9B78B6` · `#6C468A` · `#3B1E4D`) with checked contrast in light and dark, phone tab bar, seat selection on its own page, cabin-style seat map, boarding-pass trips, native confirmation dialogs, Greek translation of the whole UI
- CSP: SvelteKit nonces, no `unsafe-eval` or `unsafe-inline` scripts; the browser no longer contacts external APIs; API responses get `default-src 'none'` and `no-store`
- Language comes from the browser setting instead of an IP lookup
- Global API rate limiter applies to `/api` only, not to static assets
- Integration tests run against the production build (`build/handler.js`)

### Fixed

- Economy bookings failed validation because `seat_number` was required
- Login and registration accepted any `?return=` URL (open redirect)
- Registration didn't sign the new user in
- Page zoom was disabled on mobile (`user-scalable=no`)
- Managers and admins only saw open and crew-assigned flights (the list never read the session)
- Past bookings could be "cancelled" from the UI
- `npm run make-admin` crashed (called a missing `db.init()`)

### Added

- Privacy notice page (`/privacy`)

## [1.0.0] — 2026-06-20

### Added

- Initial release
- Flight scheduling and lifecycle management (created → staffed → completed / cancelled)
- Interactive seat map with real-time availability
- Role-based access control (visitor, customer, manager, admin)
- JWT authentication with httpOnly cookies and CSRF double-submit protection
- Refresh token rotation with reuse detection
- External API integrations (weather, exchange rates, airport status)
- Bulk user import (Admin)
- Audit log (append-only)
- Docker support (multi-stage build + docker-compose)
- SQLite database with better-sqlite3
- Comprehensive test suite (vitest)
