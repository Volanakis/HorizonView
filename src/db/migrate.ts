import initSqlJs from 'sql.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { DDL } from './schema.js';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || './horizonview.db';
const dbPath = dbUrl.replace(/^sqlite:\/\//, '');

async function migrate() {
  console.log('Running migrations...');

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.exec(DDL);

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  db.close();
  console.log('Migrations complete!');
}

migrate().catch(console.error);
