# ✈️ HorizonView

<h3 align="center">Airline Flight & Reservation Management System</h3>

<p align="center">
  <a href="https://github.com/Volanakis/HorizonView/stargazers">
    <img src="https://img.shields.io/github/stars/Volanakis/HorizonView?style=flat&logo=github" alt="stars">
  </a>
  <a href="https://github.com/Volanakis/HorizonView/network">
    <img src="https://img.shields.io/github/forks/Volanakis/HorizonView?style=flat&logo=github" alt="forks">
  </a>
  <a href="https://github.com/Volanakis/HorizonView/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/Volanakis/HorizonView?style=flat" alt="license">
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=flat&logo=node.js" alt="node">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript" alt="ts">
  </a>
</p>

---

## 📋 Table of Contents

- [🚀 About](#-about)
- [🛠️ Tech Stack](#-tech-stack)
- [🏗️ Architecture](#-architecture)
- [✨ Features](#-features)
- [📂 Project Structure](#-project-structure)
- [⚡ Quick Start](#-quick-start)
- [📦 Available Commands](#-available-commands)
- [🗃️ Database Schema](#-database-schema)
- [🔌 API Endpoints](#-api-endpoints)
- [🔒 Security](#-security)
- [❓ Troubleshooting](#-troubleshooting)
- [📄 License](#-license)

---

## 🚀 About

HorizonView is a **full-stack web application** for airline management, featuring:

- ✈️ Flight scheduling and lifecycle management
- 🎫 Real-time seat reservations with interactive seat maps
- 👤 Role-based access control (4 user roles)
- 🔒 JWT authentication with httpOnly cookies and CSRF protection

Built as part of the **Internet Programming** course (321-88103).

| Category | Details |
|:---------|:---------|
| **Type** | Full-stack Web Application |
| **Architecture** | 3-Tier (Presentation, Logic, Data) |
| **Development** | Active |
| **License** | MIT |

---

## 🛠️ Tech Stack

### Backend
| | Technology |
|--|--|
| Runtime | Node.js 18+ |
| Language | TypeScript 5.x (strict, NodeNext modules) |
| Framework | Express.js 4.x |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |
| Security | Helmet, express-rate-limit, CSRF double-submit |

### Frontend
| | Technology |
|--|--|
| Reactivity | Alpine.js v3 (CDN) |
| Styling | Custom CSS with CSS variables |
| Templating | Plain HTML5 |

### Data
| | Technology |
|--|--|
| Database | SQLite via sql.js (in-memory, file-persisted) |
| Schema | `src/db/schema.ts` — single DDL source of truth |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION TIER                            │
│        Alpine.js reactive UI  ·  Custom CSS  ·  HTML5          │
├─────────────────────────────────────────────────────────────────┤
│                      LOGIC TIER                                  │
│   Express routes  ·  Controllers  ·  Services (business logic)  │
│   Middleware: Helmet · CSRF · Rate-limit · JWT · Zod validation │
├─────────────────────────────────────────────────────────────────┤
│                       DATA TIER                                  │
│        sql.js (SQLite)  ·  Transactions  ·  Audit log           │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 👤 User Management
| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Registration/login with JWT httpOnly cookies + refresh tokens |
| 🔄 **Token Refresh** | Auto-refresh on 401 — seamless session renewal |
| 🛡️ **Role-Based Access** | visitor · customer · manager · admin |
| 📥 **Bulk Import** | Import users via JSON payload (Admin) |
| 🔑 **Role Management** | Promote/demote users (Admin) |

### 🛫 Flight Management
| Feature | Description |
|---------|-------------|
| 🔄 **Lifecycle States** | created → staffed → completed / cancelled |
| ✏️ **CRUD Operations** | Create, view, state-change, delete flights |
| 🔍 **Search & Filter** | By departure, arrival, date |

### 🎫 Reservations
| Feature | Description |
|---------|-------------|
| 🗺️ **Interactive Seat Map** | Visual seat selection per flight |
| 💺 **Ticket Classes** | Business ($450) · Normal ($250) · Economy ($150) |
| ❌ **Cancellation** | Cancel reservation, seat automatically freed |

---

## 📂 Project Structure

```
HorizonView/
├── src/
│   ├── index.ts              # App entry: middleware, routes, server
│   ├── db/
│   │   ├── index.ts          # DatabaseWrapper (sql.js)
│   │   ├── migrate.ts        # CLI migration script
│   │   └── schema.ts         # All DDL — tables + indexes
│   ├── middleware/
│   │   ├── auth.ts           # JWT verify, requireRole
│   │   ├── csrf.ts           # Double-submit CSRF protection
│   │   ├── rate-limit.ts     # Per-endpoint rate limiters
│   │   └── validate.ts       # Zod body/query/param validators
│   ├── routes/               # Thin Express routers
│   ├── controllers/          # Request parsing, response shaping
│   ├── services/             # Business logic, DB queries
│   ├── types/
│   │   └── index.ts          # All shared TypeScript types
│   └── utils/
│       └── crypto.ts         # Token hashing
├── public/
│   ├── css/styles.css        # Custom CSS with design tokens
│   ├── js/app.js             # Alpine.js app
│   └── views/index.html      # Single-page HTML
├── diagrams/                 # Architecture, API, and DB spec docs
├── .env.example
├── package.json
└── tsconfig.json
```

---

## ⚡ Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18.x or higher |
| npm | 9.x or higher |

### Step-by-Step

```bash
# 1. Clone the repository
git clone git@github.com:Volanakis/HorizonView.git
cd HorizonView

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env — set a strong JWT_SECRET

# 4. Run database migrations
npm run migrate

# 5. Start development server
npm run dev
```

> 🌐 Open your browser: **http://localhost:3000**

---

## 📦 Available Commands

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript for production |
| `npm start` | Run production server (requires build) |
| `npm run migrate` | Create/reset database from schema |

---

## 🗃️ Database Schema

### Users Table

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INTEGER | PK, AUTOINCREMENT |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL |
| `password` | VARCHAR(255) | NOT NULL — bcrypt hashed |
| `name` | VARCHAR(100) | NOT NULL |
| `vat_number` | VARCHAR(20) | UNIQUE, nullable |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL |
| `role` | VARCHAR(20) | CHECK: visitor/customer/manager/admin |
| `last_login` | DATETIME | nullable |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### Flights Table

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INTEGER | PK, AUTOINCREMENT |
| `flight_number` | VARCHAR(10) | UNIQUE, NOT NULL |
| `departure` | CHAR(3) | NOT NULL — IATA code |
| `arrival` | CHAR(3) | NOT NULL — IATA code |
| `scheduled_time` | DATETIME | NOT NULL |
| `state` | VARCHAR(20) | CHECK: created/staffed/completed/cancelled |
| `total_seats` | INTEGER | NOT NULL |
| `created_by` | INTEGER | FK → users(id) |

### Seats Table

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INTEGER | PK, AUTOINCREMENT |
| `flight_id` | INTEGER | FK → flights(id) ON DELETE CASCADE |
| `seat_number` | VARCHAR(5) | NOT NULL — e.g. "3B" |
| `class` | VARCHAR(20) | CHECK: economy/normal/business |
| `price` | NUMERIC(10,2) | CHECK > 0 |
| `is_available` | INTEGER | DEFAULT 1 (boolean) |

### Reservations Table

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INTEGER | PK, AUTOINCREMENT |
| `user_id` | INTEGER | FK → users(id) |
| `flight_id` | INTEGER | FK → flights(id) |
| `seat_id` | INTEGER | FK → seats(id), UNIQUE |
| `ticket_type` | VARCHAR(20) | CHECK: economy/normal/business |
| `price` | NUMERIC(10,2) | NOT NULL |
| `status` | VARCHAR(20) | CHECK: confirmed/cancelled |

---

## 🔌 API Endpoints

All responses use `{ success, data?, error?, pagination? }` envelopes.

### Authentication

| Method | Endpoint | Access | Description |
|:-------|:---------|:-------|:------------|
| `POST` | `/api/auth/register` | Public | Register new account |
| `POST` | `/api/auth/login` | Public | User login |
| `POST` | `/api/auth/logout` | Auth + CSRF | User logout |
| `POST` | `/api/auth/refresh` | CSRF | Rotate refresh token |
| `GET` | `/api/auth/me` | Auth | Get current user |

### Flights

| Method | Endpoint | Access | Description |
|:-------|:---------|:-------|:------------|
| `GET` | `/api/flights` | Public | List flights (filterable) |
| `GET` | `/api/flights/:id` | Public | Get flight details |
| `GET` | `/api/flights/:id/seats` | Public | Get seat map |
| `POST` | `/api/flights` | Manager + CSRF | Create flight |
| `PATCH` | `/api/flights/:id/state` | Manager + CSRF | Change flight state |
| `DELETE` | `/api/flights/:id` | Manager + CSRF | Delete flight |

### Reservations

| Method | Endpoint | Access | Description |
|:-------|:---------|:-------|:------------|
| `GET` | `/api/reservations` | Auth | Current user's reservations |
| `POST` | `/api/reservations` | Auth + CSRF | Create reservation |
| `DELETE` | `/api/reservations/:id` | Auth + CSRF | Cancel reservation |

### Users (Admin Only)

| Method | Endpoint | Access | Description |
|:-------|:---------|:-------|:------------|
| `GET` | `/api/users` | Admin | List all users |
| `PATCH` | `/api/users/:id/role` | Admin + CSRF | Change user role |
| `POST` | `/api/users/import` | Admin + CSRF | Bulk import users (JSON) |

---

## 🔒 Security

| Protection | Implementation |
|------------|----------------|
| 🍪 **Auth cookies** | JWT in `httpOnly + Secure + SameSite=Strict` cookies |
| 🔄 **Token rotation** | Refresh tokens rotated on every `/auth/refresh` call |
| 🛡️ **CSRF** | Double-submit cookie — `X-CSRF-Token` required on all mutations |
| 🔑 **Password hashing** | bcrypt, 12 salt rounds |
| ✅ **Input validation** | Zod schemas on all request bodies, query params, and :id params |
| 🚦 **Rate limiting** | Per-endpoint limits via express-rate-limit |
| 🏗️ **Security headers** | Helmet.js (CSP, HSTS, X-Frame-Options, nosniff) |
| 💉 **SQL injection** | Parameterized queries only — no string concatenation |
| 🔍 **IDOR prevention** | Ownership verified in service layer, never from client payload |
| 📋 **Audit log** | Append-only table: auth, flight, reservation, and role events |

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
|:------|:------|:---------|
| `EADDRINUSE: Port 3000` | Port already in use | Change `PORT` in `.env` |
| `JWT_SECRET is required` | Missing env var | Copy `.env.example` to `.env` and set `JWT_SECRET` |
| `Database not initialized` | `db.init()` not called | Ensure `await db.init()` runs before requests |
| Blank page / no JS | CSP blocking Alpine.js | Verify Helmet CSP allows `https://unpkg.com` + `unsafe-eval` |
| 403 on mutations | Missing CSRF token | Frontend must read `csrf_token` cookie and send `X-CSRF-Token` header |
| Token expired | 401 returned | Frontend auto-retries via `/auth/refresh` — check refresh token cookie |

---

## 📄 License

Released under the **MIT License** — Copyright (c) 2026 Volanakis Dimitrios.
