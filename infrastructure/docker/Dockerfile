# ============================================================
# SR ENTERPRISES CRM — PRODUCTION MULTI-STAGE DOCKERFILE
# ============================================================
# Target Architecture: Linux ARM64 (aarch64) & AMD64 (x86_64)
# Target OS / Runtime: Debian Bookworm Slim + Node.js 22 LTS
# Target Package Mgr:  pnpm 9.15.4 (Deterministic via Corepack)
# Security Hardening:  Non-root user (crmuser:10001), 0 PHP/Dompdf runtimes
# ============================================================

# ------------------------------------------------------------
# STAGE 1: Builder
# ------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /build

# Enable Corepack for deterministic pnpm version
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy monorepo package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/desktop/package.json ./apps/desktop/

# Install all workspace dependencies reproducibly using frozen lockfile
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/
COPY apps/desktop/ ./apps/desktop/

# Build all packages, frontend Vite SPA, and Fastify backend
RUN pnpm run build

# Prune devDependencies to keep production image lean
RUN pnpm prune --prod

# ------------------------------------------------------------
# STAGE 2: Production Runner
# ------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Install only curl for container healthcheck audits (NO PHP, NO Dompdf)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated unprivileged non-root user and group
RUN groupadd -g 10001 crmgroup && \
    useradd -u 10001 -g crmgroup -m -s /bin/bash crmuser

# Copy root manifests and production node_modules
COPY --chown=crmuser:crmgroup package.json pnpm-workspace.yaml ./
COPY --from=builder --chown=crmuser:crmgroup /build/node_modules ./node_modules
COPY --from=builder --chown=crmuser:crmgroup /build/packages ./packages

# Copy backend API, schemas, drizzle migrations, and workspace node_modules
COPY --from=builder --chown=crmuser:crmgroup /build/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=crmuser:crmgroup /build/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=crmuser:crmgroup /build/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder --chown=crmuser:crmgroup /build/apps/api/package.json ./apps/api/package.json
COPY --chown=crmuser:crmgroup apps/api/src ./apps/api/src

# Copy compiled frontend Vite SPA for Fastify static serving & reverse proxy
COPY --from=builder --chown=crmuser:crmgroup /build/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=crmuser:crmgroup /build/apps/web/package.json ./apps/web/package.json

# Create runtime directories with appropriate permissions
RUN mkdir -p /app/storage/documents /app/storage/temp /app/backups /app/logs && \
    chown -R crmuser:crmgroup /app

# Switch to unprivileged non-root user
USER crmuser

EXPOSE 4000

# Container healthcheck via Fastify /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Production startup with PID 1 signal forwarding for graceful SIGTERM/SIGINT handling
CMD ["node", "apps/api/node_modules/tsx/dist/cli.mjs", "apps/api/src/server.ts"]
