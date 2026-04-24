import initSqlJs, { Database } from 'sql.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { DDL } from './schema.js';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || './horizonview.db';
const dbPath = dbUrl.replace(/^sqlite:\/\//, '');

class DatabaseWrapper {
  private db: Database | null = null;
  // Serialise disk writes so concurrent requests never clobber each other.
  private saveQueue: Promise<void> = Promise.resolve();

  async init(): Promise<void> {
    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
      this.db.exec(DDL);
    }
  }

  run(sql: string, params: (string | number | null)[] = []): { changes: number; lastInsertRowid: number } {
    if (!this.db) throw new Error('Database not initialized');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.db.run(sql, params as any);
    const changes = this.db.getRowsModified();
    const rowResult = this.db.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid = (rowResult[0]?.values?.[0]?.[0] as number) ?? 0;
    return { changes, lastInsertRowid };
  }

  exec(sql: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run('BEGIN TRANSACTION');
    try {
      const result = fn();
      this.db.run('COMMIT');
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  get<T>(sql: string, params: (string | number | null)[] = []): T | undefined {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stmt.bind(params as any);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row as T;
    }
    stmt.free();
    return undefined;
  }

  all<T>(sql: string, params: (string | number | null)[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');
    const results: T[] = [];
    const stmt = this.db.prepare(sql);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stmt.bind(params as any);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  /**
   * Enqueues a disk write. Writes are serialised through saveQueue so that
   * concurrent requests always write the latest in-memory state in order.
   */
  save(): void {
    if (!this.db) return;
    // Snapshot the current state synchronously before any await.
    const data = this.db.export();
    this.saveQueue = this.saveQueue.then(() => {
      fs.writeFileSync(dbPath, Buffer.from(data));
    }).catch(err => {
      console.error('DB save error:', err);
    });
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
}

export const db = new DatabaseWrapper();
export function getDb() {
  return db;
}
export default db;
