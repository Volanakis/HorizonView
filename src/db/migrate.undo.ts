import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || './horizonview.db';
const dbPath = dbUrl.replace(/^sqlite:\/\//, '');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log(`Database file "${dbPath}" deleted. Run "npm run migrate" to recreate.`);
} else {
  console.log(`Database file "${dbPath}" not found — nothing to undo.`);
}
