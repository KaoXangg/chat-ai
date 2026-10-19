# ==========================================
# Stage 1: Build & Production Dependencies
# ==========================================
FROM node:22-alpine AS deps
WORKDIR /app

# Copy dependency files and local vendor dependencies
COPY package*.json ./
COPY vendor ./vendor

# Install production dependencies only using lockfile
RUN npm ci --omit=dev

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# Install curl for container HEALTHCHECK
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=5000

# Copy production dependencies and local vendor
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/vendor ./vendor
COPY package*.json ./

# Copy backend application source code
COPY . .

# Set non-root ownership and switch user
RUN chown -R node:node /app
USER node

EXPOSE 5000

# Container healthcheck querying GET /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fs http://localhost:${PORT:-5000}/health || exit 1

CMD ["node", "server.js"]
