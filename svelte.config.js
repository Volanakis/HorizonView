import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // One Node server for the UI and the JSON API: `npm run build && npm start`.
    adapter: adapter({ out: 'build', precompress: true }),

    // SvelteKit adds a nonce for its own bootstrap script, so no inline or eval'd
    // script is ever allowed. External APIs are called by the server, not the browser.
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self'],
        // The screen-reader route announcer positions itself with a style attribute.
        'style-src-attr': ['unsafe-inline'],
        'img-src': ['self', 'data:'],
        'connect-src': ['self'],
        'font-src': ['self'],
        'object-src': ['none'],
        'frame-src': ['none'],
        'frame-ancestors': ['none'],
        'base-uri': ['self'],
        'form-action': ['self']
      }
    }
  }
};
