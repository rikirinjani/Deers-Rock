# syntax=docker/dockerfile:1

# Deers-Rock — Healthcare Operating Environment (deers-rock@0.5.0)
# Multi-stage build: compile TypeScript, then ship only prod deps + dist + public.

# ---- Build stage -----------------------------------------------------------
# Node 22 slim (major-pinned). Project is tested on node 20 and 22.
FROM node:22-slim AS build

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
FROM node:22-slim AS runtime

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

CMD ["node", "dist/cli/index.js", "up", "3000"]
