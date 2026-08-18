# Multi-stage build for the React + Vite web app.
# Build context = monorepo root (so package-lock.json + hoisted node_modules
# are available). The web build does NOT need apps/api — see .dockerignore.
#
# Stage 1: install deps and run `vite build` with VITE_API_BASE=/api.
# Stage 2: ship a slim Node image that serves dist/ via web-server.mjs.

FROM node:20-bookworm-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY apps/web/vite.config.ts ./apps/web/vite.config.ts
COPY apps/web/index.html ./apps/web/index.html
COPY apps/web/src ./apps/web/src

RUN npm ci

WORKDIR /repo/apps/web
ENV VITE_API_BASE=/api
RUN npm run build

# --------------------------------------------------------------------

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV API_TARGET=http://material-retail-dante-api.internal:4000

COPY --from=build /repo/apps/web/dist ./dist
COPY apps/web/web-server.mjs ./web-server.mjs

EXPOSE 8080
CMD ["node", "web-server.mjs"]
