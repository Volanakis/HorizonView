# ===== STAGE 1: Build =====
FROM node:20-alpine AS build

WORKDIR /app

# Dependency layer (cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# One SvelteKit app: UI + API
COPY svelte.config.js vite.config.ts tsconfig.json ./
COPY src/ ./src/
COPY static/ ./static/
COPY scripts/ ./scripts/

# adapter-node output → build/
RUN npm run build

# ===== STAGE 2: Production =====
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only (the Svelte toolchain is dev-only)
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/build/ ./build/
COPY --from=build /app/scripts/ ./scripts/

# Ensure data directory for SQLite volume mount
RUN mkdir -p /app/data && chown -R node:node /app/data

VOLUME [ "/app/data" ]

USER node
EXPOSE 3000

# 127.0.0.1, not localhost: in Alpine localhost resolves to ::1 first, and the server listens on IPv4.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', r => { let b=''; r.on('data',c=>b+=c); r.on('end',()=>process.exit(b.includes('\"status\":\"ok\"')?0:1)) })"

CMD ["node", "build"]
