# syntax=docker/dockerfile:1

# Deers-Rock — Healthcare Operating Environment (deers-rock@0.5.0)
# Multi-stage build: compile TypeScript, then ship only prod deps + dist + public.

# ---- Build stage -----------------------------------------------------------
# Node 20 slim (major-pinned). Project engines field requires node >=20.
FROM node:20-slim AS build

WORKDIR /app

# Install ALL deps (dev deps required for tsc) from the lockfile.
COPY package.json package-lock.json ./
RUN npm ci

# Compile: tsc -> rootDir ./src, outDir ./dist
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
# Fresh slim image with PRODUCTION deps only. The single runtime dependency is
# better-sqlite3 (installs from prebuilt binaries — no compiler toolchain
# needed), so `npm ci --omit=dev` is sufficient for `node dist/cli/index.js up`.
FROM node:20-slim AS runtime

ENV NODE_ENV=production \
    DATA_DIR=/data

WORKDIR /app

# Production dependencies only (better-sqlite3).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output and the static dashboard (served from <app-root>/public,
# resolved relative to dist/ at runtime).
COPY --from=build /app/dist ./dist
COPY public ./public
COPY LICENSE ./LICENSE

# Persistent state: better-sqlite3 journal (world-journal.db + -wal/-shm) and
# generated exports land under DATA_DIR. Pre-create it writable by 'node'.
RUN mkdir -p /data && chown node:node /data
USER node

# The app resolves its port as: $PORT, then the `up <port>` CLI arg, default 3000.
# - Override with env:  docker run -e PORT=4000 ...
# - Override with arg:  docker run ... node dist/cli/index.js up 4000
EXPOSE 3000

# Liveness probe. Node 20 ships global fetch, so no curl/wget needed. Uses
# /api/status; any response < 500 counts as healthy — 401 is expected when the
# deployment sets DR_API_KEY (auth proves the server is up; only server-side
# failures mark the container unhealthy).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3000')+'/api/status').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/cli/index.js", "up", "3000"]
