# ─── Stage 1: Build ────────────────────────────────────────────────────────────
# We use a full Node image to compile TypeScript → JavaScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first — Docker caches this layer separately.
# If package.json doesn't change, Docker reuses the cached node_modules
# layer on the next build (much faster rebuilds).
COPY package*.json ./
RUN npm ci

# Copy source and compile TS → JS
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 2: Production ───────────────────────────────────────────────────────
# Start fresh from a clean Node image — no TypeScript compiler, no dev tools.
# This keeps the final image small and secure.
FROM node:20-alpine AS production

WORKDIR /app

# Only install production dependencies (no devDependencies)
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JS from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
