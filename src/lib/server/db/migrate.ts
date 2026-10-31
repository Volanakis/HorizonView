import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { DDL } from './schema.js';
import { resolveDbPath } from '../config.js';

dotenv.config();

const dbPath = resolveDbPath(process.env.DATABASE_URL);

function migrate() {
  console.log('Running migrations...');

  const db = new Database(dbPath);
  db.exec(DDL);
  db.close();

  console.log('Migrations complete!');
}

migrate();
