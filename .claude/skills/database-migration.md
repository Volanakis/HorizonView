# Database Migration Skill

This skill helps update the database schema following project conventions.

## Where Schema Lives

**All DDL is in `src/db/schema.ts`** — the `DDL` string export.  
Both `db/index.ts` (runtime init) and `db/migrate.ts` (CLI reset) import from it.  
Never duplicate table definitions anywhere else.

## SQLite Conventions (sql.js)

```sql
-- ✅ VARCHAR + CHECK instead of ENUM
state VARCHAR(20) NOT NULL CHECK(state IN ('created', 'staffed', 'completed', 'cancelled'))

-- ❌ No ENUMs in SQLite
state ENUM('created', 'staffed')

-- ✅ DATETIME for timestamps — store UTC ISO strings
created_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- ❌ Not TIMESTAMPTZ (PostgreSQL syntax — not valid in SQLite)
created_at TIMESTAMPTZ DEFAULT NOW()

-- ✅ INTEGER for boolean (sql.js)
is_available INTEGER NOT NULL DEFAULT 1

-- ❌ Not BOOLEAN
is_available BOOLEAN DEFAULT TRUE

-- ✅ INTEGER PRIMARY KEY AUTOINCREMENT
id INTEGER PRIMARY KEY AUTOINCREMENT

-- ❌ Not SERIAL (PostgreSQL)
id SERIAL PRIMARY KEY
```

## Adding a Table

Edit `src/db/schema.ts` — add your `CREATE TABLE IF NOT EXISTS` statement to the `DDL` string, then add relevant `CREATE INDEX IF NOT EXISTS` statements.

```typescript
// In src/db/schema.ts, inside the DDL template literal:
  CREATE TABLE IF NOT EXISTS examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_examples_user ON examples(user_id);
```

## Resetting the Database

```bash
# ⚠️ Deletes all data and recreates from current DDL
npm run migrate
```

## Verification

After adding a table:
1. Run `npm run migrate` — should complete without errors
2. Run `npx tsc --noEmit` — schema.ts must compile clean
3. Start dev server — "Database initialized" confirms schema applied
