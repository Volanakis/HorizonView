import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { resolveDbPath } from '../config.js';

dotenv.config();

const dbPath = resolveDbPath(process.env.DATABASE_URL);

async function undoMigrate() {
  try {
    await fs.access(dbPath);
    await fs.unlink(dbPath);
    console.log(`Database file "${dbPath}" deleted. Run "npm run migrate" to recreate.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`Database file "${dbPath}" not found — nothing to undo.`);
    } else {
      console.error('Error deleting database file:', error);
      process.exit(1);
    }
  }
}

undoMigrate();
