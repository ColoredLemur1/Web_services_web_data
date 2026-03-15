# -----------------------------------------------------------------------------
# Stage 1: Install dependencies and prepare production node_modules
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json package-lock.json* ./

# Install all dependencies (needed for any optional native/postinstall steps)
RUN npm ci

# Copy application source
COPY . .

# Remove devDependencies so the final image only has production deps
RUN npm prune --production

# -----------------------------------------------------------------------------
# Stage 2: Minimal production image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production node_modules and app from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/app.js ./
COPY --from=builder --chown=nodejs:nodejs /app/config ./config
COPY --from=builder --chown=nodejs:nodejs /app/controllers ./controllers
COPY --from=builder --chown=nodejs:nodejs /app/middleware ./middleware
COPY --from=builder --chown=nodejs:nodejs /app/routes ./routes
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

USER nodejs

# Use PORT from environment (Railway, Render, etc.) or default 3000 for local
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "app.js"]
