# Multi-stage build for the React + Vite web app.
# Stage 1: install deps and run `vite build` with VITE_API_BASE pointing at
#          the same-origin /api path (so requests go through the web server's proxy).
# Stage 2: ship a slim Node image that serves dist/ via web-server.mjs.

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src

# Same-origin: web fetches go to /api/* which this same web container proxies
# to the api Fly service over the internal network.
ENV VITE_API_BASE=/api
RUN npm run build

# --------------------------------------------------------------------

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
# Override at deploy time if needed.
ENV API_TARGET=http://material-retail-dante-api.internal:4000

# Only the build output + the static server are needed at runtime.
COPY --from=build /app/dist ./dist
COPY web-server.mjs ./web-server.mjs

EXPOSE 8080
CMD ["node", "web-server.mjs"]
