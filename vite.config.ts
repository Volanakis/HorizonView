import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// NODE_ENV in .env is meant for the server at runtime. Vite would otherwise pick it up
// (as VITE_USER_NODE_ENV) and silently produce a development build.
if (process.argv.includes('build')) process.env.NODE_ENV = 'production';

export default defineConfig({
  plugins: [sveltekit()],
  server: { port: 3000 }
});
