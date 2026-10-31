import { defineConfig } from 'vitest/config';

// Integration tests drive build/handler.js, so `npm test` builds first.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-db.ts'],
    globalSetup: ['tests/teardown.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-for-vitest-testing-only'
    },
    testTimeout: 60000,
    hookTimeout: 60000
  }
});
