# Multi-stage build for the NestJS API.
# Stage 1: install full deps (incl. dev) and compile TypeScript.
# Stage 2: ship a slim runtime image with only prod deps + compiled JS.

FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install build deps needed by better-sqlite3 (python3 + make + g++).
# Bookworm already has build-essential; slim doesn't. Keep the toolchain small.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Prune dev deps so the runtime image only carries what's needed.
RUN npm prune --omit=dev

# --------------------------------------------------------------------

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# libc6 compat for the prebuilt better-sqlite3 binary; ca-certificates for outbound SMTP TLS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000
# SQLite database + email outbox live on a Fly persistent volume mounted at /data.
ENV DATABASE_DIR=/data
ENV ALERT_OUTBOX_DIR=/data/outbox

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Create the data dir so SQLite can open before the volume is mounted on first boot.
# (The volume mount overlays this on first run, but the path needs to exist for any
# local fallback or first-boot startup probe.)
RUN mkdir -p /data/outbox

EXPOSE 4000
CMD ["node", "dist/main.js"]
