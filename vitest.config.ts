import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': '/mnt/c/Users/Dimit/HorizonView/src'
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'sqlite://./horizonview-test.db',
      JWT_SECRET: 'test-secret-key-for-vitest-only'
    },
    testTimeout: 60000,
    hookTimeout: 60000
  }
});