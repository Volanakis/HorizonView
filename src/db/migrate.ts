import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { DDL } from './schema.js';

dotenv.config();

const dbPath = (process.env.DATABASE_URL || 'sqlite://./horizonview.db').replace(/^sqlite:\/\//, '');

function migrate() {
  console.log('Running migrations...');

  const db = new Database(dbPath);
  db.exec(DDL);
  db.close();

  console.log('Migrations complete!');
}

migrate();
