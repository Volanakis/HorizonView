# AGENTS.md - HorizonView

## Project Status
- New repository, no codebase yet
- README documents intended architecture only

## Expected Stack (from README)
- **Runtime:** Node.js 18.x
- **Language:** TypeScript 5.x
- **Backend:** Express.js or Fastify
- **Frontend:** Alpine.js + HTML5 + Tailwind CSS
- **Database:** PostgreSQL/MySQL/SQLite

## Developer Commands (from README)

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server |
| `npm run build` | Compile for production |
| `npm run migrate` | Run DB migrations |
| `npm run migrate:undo` | Undo last migration |
| `npm test` | Run tests |

## Required Setup
1. Create `.env` file with:
   ```
   PORT=3000
   DATABASE_URL="sql_connection_string"
   JWT_SECRET="your_secret_key"
   ```
2. Run `npm install`
3. Run `npm run migrate`
4. Run `npm run dev`

## Entry Point
- Not yet created (per README: `src/index.ts`)

## Architecture to Implement
- 3-tier: Presentation (Alpine.js) → Logic (Node.js/TS) → Data (SQL)
- 4 user roles: Visitor, Customer, Flight Manager, Admin
- Flight lifecycle: Created → Staffed → Completed/Cancelled
- Ticket types: Economy, Normal, Business

## Notes
- No lint/typecheck commands verified in actual config yet
- README is the source of truth until package.json exists