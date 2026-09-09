# ============================================================
# SR ENTERPRISES CRM — PRODUCTION MULTI-STAGE DOCKERFILE
# ============================================================
# Target: Node.js 22 LTS Bookworm + PHP CLI (Dompdf / PHPMailer)
# Security: Non-root execution (crmuser), zero development tsx in runtime

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

# Install all workspace dependencies
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

# Install PHP CLI, extensions required by Dompdf & PHPMailer, and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    php-cli \
    php-mbstring \
    php-xml \
    php-gd \
    php-curl \
    php-zip \
    fontconfig \
    fonts-dejavu-core \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group
RUN groupadd -g 10001 crmgroup && \
    useradd -u 10001 -g crmgroup -m -s /bin/bash crmuser

# Copy root manifests and production node_modules
COPY --chown=crmuser:crmgroup package.json pnpm-workspace.yaml ./
COPY --from=builder --chown=crmuser:crmgroup /build/node_modules ./node_modules
COPY --from=builder --chown=crmuser:crmgroup /build/packages ./packages

# Copy compiled backend API (pure JS, zero tsx dependency) and its workspace node_modules
COPY --from=builder --chown=crmuser:crmgroup /build/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=crmuser:crmgroup /build/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=crmuser:crmgroup /build/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder --chown=crmuser:crmgroup /build/apps/api/package.json ./apps/api/package.json
COPY --chown=crmuser:crmgroup apps/api/src/loader.mjs apps/api/src/register.js ./apps/api/src/

# Copy compiled frontend Vite SPA for Fastify static serving
COPY --from=builder --chown=crmuser:crmgroup /build/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=crmuser:crmgroup /build/apps/web/package.json ./apps/web/package.json

# Copy existing PHP mailer, Dompdf, and PDF templates with vendor dependencies
COPY --chown=crmuser:crmgroup scripts/mailer/ ./scripts/mailer/

# Create runtime directories with appropriate permissions
RUN mkdir -p /app/storage/documents /app/storage/temp /app/backups /app/logs /app/scripts/mailer/outbox /app/scripts/mailer/previews && \
    chown -R crmuser:crmgroup /app

# Switch to non-root user
USER crmuser

EXPOSE 4000

# Container healthcheck via Fastify /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Production startup with native Node 22 ESM loader (zero tsx dependency)
CMD ["node", "--import", "./apps/api/src/register.js", "apps/api/dist/server.js"]
