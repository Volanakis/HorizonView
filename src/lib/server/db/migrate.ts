import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { DDL } from './schema.js';
import { runMigrations } from './migrations.js';
import { resolveDbPath } from '../config.js';

dotenv.config();

const dbPath = resolveDbPath(process.env.DATABASE_URL);

function migrate() {
  console.log('Running migrations...');

  const db = new Database(dbPath);
  db.exec(DDL);
  runMigrations(db);
  db.close();

  console.log('Migrations complete!');
}

migrate();
