# ══════════════════════════════════════════════════════════════════════════════
# RETE - Multi-stage Docker build
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application (frontend + backend)
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Copy database schema for migrations
COPY shared ./shared
COPY drizzle.config.ts ./

# Install drizzle-kit for migrations (needed at runtime for db:push)
RUN npm install drizzle-kit

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S rete -u 1001 -G nodejs

USER rete

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/auth/me || exit 1

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=5000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.cjs"]
