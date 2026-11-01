import Database from 'better-sqlite3';
import { z } from 'zod';
import { DDL } from './schema.js';
import { runMigrations } from './migrations.js';
import {
  UserSchema,
  FlightSchema,
  SeatSchema,
  ReservationSchema,
  RefreshTokenSchema,
  AuditLogSchema
} from './validation.js';
import { resolveDbPath } from '../config.js';

class DatabaseWrapper {
  private connection: Database.Database | null = null;
  private stmtCache = new Map<string, Database.Statement>();

  // Opened on first use, so importing this module (e.g. while SvelteKit analyses
  // the build) never creates a database file.
  private get db(): Database.Database {
    if (!this.connection) {
      this.connection = new Database(resolveDbPath());
      this.connection.exec(DDL);
      runMigrations(this.connection);
    }
    return this.connection;
  }

  private prepare(sql: string): Database.Statement {
    let stmt = this.stmtCache.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.stmtCache.set(sql, stmt);
    }
    return stmt;
  }

  run(sql: string, params: (string | number | null)[] = []): { changes: number; lastInsertRowid: number } {
    const result = this.prepare(sql).run(params);
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  get<T>(sql: string, params: (string | number | null)[] = [], schema?: z.ZodSchema<T>): T | undefined {
    const result = this.prepare(sql).get(params);
    if (result === undefined) return undefined;
    if (schema) {
      return schema.parse(result);
    }
    return result as T;
  }

  all<T>(sql: string, params: (string | number | null)[] = [], schema?: z.ZodSchema<T>): T[] {
    const results = this.prepare(sql).all(params);
    if (schema) {
      return results.map(r => schema.parse(r));
    }
    return results as T[];
  }

  close(): void {
    this.connection?.close();
    this.connection = null;
    this.stmtCache.clear();
  }
}

export const db = new DatabaseWrapper();
export function getDb() {
  return db;
}
export default db;
