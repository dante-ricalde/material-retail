# Multi-stage build for the NestJS API.
# Build context is the monorepo root (so package-lock.json + hoisted node_modules
# are available). The api build does NOT need apps/web — see .dockerignore.
#
# Stage 1: install full deps (incl. dev), compile TypeScript.
# Stage 2: ship a slim runtime image with only prod deps + compiled JS.

FROM node:20-bookworm-slim AS build
WORKDIR /repo

# Build toolchain for better-sqlite3's native module.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Workspace root + lockfile + api sources.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/nest-cli.json ./apps/api/nest-cli.json
COPY apps/api/src ./apps/api/src

# Install all workspace deps (hoisted to /repo/node_modules).
RUN npm ci

# Compile only the api workspace.
WORKDIR /repo/apps/api
RUN npm run build

# Drop dev deps for the runtime image.
WORKDIR /repo
RUN npm prune --omit=dev

# --------------------------------------------------------------------

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_DIR=/data
ENV ALERT_OUTBOX_DIR=/data/outbox

# Copy the workspace's hoisted node_modules + the api dist.
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json

RUN mkdir -p /data/outbox

EXPOSE 4000
CMD ["node", "dist/main.js"]
