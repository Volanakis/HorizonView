# Contributing to HorizonView

Thank you for your interest! Here's how to get started.

## Development Setup

```bash
git clone git@github.com:Volanakis/HorizonView.git
cd HorizonView
npm install
cp .env.example .env
npm run migrate
npm run dev   # UI + API on http://localhost:3000
```

## Code Standards

- TypeScript with strict mode — run `npm run check` (`svelte-check`: pages, API and tests) before committing
- No `console.log` in production code
- API: one `+server.ts` per route under `src/routes/api/`, wrapped in `endpoint()`; checks in the same order as existing endpoints (`requireUser` → id → `requireCsrf` → `body()`), business logic in `src/lib/server/services`
- Server-only code lives in `src/lib/server/` (SvelteKit refuses to ship it to the browser) and imports with relative paths, so the CLI scripts can run it with `tsx`
- UI: Svelte 5 runes, text through `t()` with keys in both `locales/en.ts` and `locales/el.ts`, colors only from the tokens in `src/app.css`, and no `style=` attributes (the CSP blocks inline styles)

## Testing

- `npm test` — run all tests
- `npm run test:coverage` — coverage report
- Add tests for new features

## Pull Request Process

1. Create a feature branch from `main`
2. Write tests for your changes
3. Ensure `npm run typecheck` and `npm test` pass
4. Open a PR using the template

## Questions?

Open a [discussion](https://github.com/Volanakis/HorizonView/discussions) or issue.
