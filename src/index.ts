import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { db } from './db/index.js';
import { seed } from './db/seed.js';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await db.init();

    // Auto-seed if database is empty (fixes Render ephemeral filesystem)
    const users = db.all('SELECT COUNT(*) as cnt FROM users');
    if (!users[0]?.cnt) {
      console.log('Empty database detected, seeding...');
      await seed();
    } else {
      console.log(`Database initialized (${users[0].cnt} users)`);
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed');
        db.close();
        console.log('Database closed');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
