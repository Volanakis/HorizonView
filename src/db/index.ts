import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { DDL } from './schema.js';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'sqlite://./horizonview.db';
const dbPath = dbUrl.replace(/^sqlite:\/\//, '');

class DatabaseWrapper {
  private db: Database.Database;

  constructor() {
    this.db = new Database(dbPath);
    this.db.exec(DDL);
  }

  run(sql: string, params: (string | number | null)[] = []): { changes: number; lastInsertRowid: number } {
    const result = this.db.prepare(sql).run(params);
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  get<T>(sql: string, params: (string | number | null)[] = []): T | undefined {
    return this.db.prepare(sql).get(params) as T | undefined;
  }

  all<T>(sql: string, params: (string | number | null)[] = []): T[] {
    return this.db.prepare(sql).all(params) as T[];
  }

  close(): void {
    this.db.close();
  }
}

export const db = new DatabaseWrapper();
export function getDb() {
  return db;
}
export default db;
