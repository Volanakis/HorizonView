# Cleanup Logs Skill

Pre-PR scrub of debug statements and temporary code.

## What to Remove

### Console Statements

```typescript
// REMOVE
console.log('User:', user);
console.debug('Query:', query);
console.error('Failed:', err);

// KEEP (minimal, production-safe)
console.error('Payment failed:', error.message);
```

### Debug Variables

```typescript
// REMOVE
const DEBUG = true;
const log = (...args) => console.log('[DEBUG]', ...args);
```

### Temporary Code

```typescript
// REMOVE
// TODO: Remove this after testing
if (process.env.NODE_ENV === 'development') {
  // temporary dev code
}

// FIXME: This is a hack
```

### Commented Code

```typescript
// REMOVE
// const oldWay = () => { ... };
// useNewWay();
```

## Cleanup Commands

```bash
# Find console.log statements
grep -r "console.log" src/

# Find TODO comments
grep -r "TODO" src/
grep -r "FIXME" src/
```

## Pre-PR Checklist

- [ ] No `console.log` statements
- [ ] No `console.debug`
- [ ] No debug variables
- [ ] No commented-out code
- [ ] No temporary workarounds
- [ ] TODO/FIXME updated with ticket numbers

## Usage

Before creating a PR:

```bash
# Check for issues
npm run lint

# Run typecheck
npx tsc --noEmit
```
