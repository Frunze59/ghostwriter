# ─── Stage 1: Build ────────────────────────────────────────────────────────────
# Vite compiles React + TypeScript into static HTML/JS/CSS files
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
# After this, /app/dist contains index.html + bundled assets

# ─── Stage 2: Serve ────────────────────────────────────────────────────────────
# nginx is a lightweight, battle-tested static file server.
# Much smaller than running a full Node process just to serve static files.
FROM nginx:alpine AS production

# Copy built assets into nginx's default serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config: handle SPA routing (all paths → index.html)
# Without this, refreshing on /some-route returns a 404
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
