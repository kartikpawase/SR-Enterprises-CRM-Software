# SR ENTERPRISES CRM

Commercial-grade, security-conscious, scalable SaaS for RO water purifier sales, spare-parts sales, RO repair, and home-service business operations.

---

## 📖 Authoritative Project Documents

The master product and flow specifications for this system are:

1. [`PRODUCT_REQUIREMENTS.txt`](./PRODUCT_REQUIREMENTS.txt) — WHAT the product contains (Product & Engineering Requirements).
2. [`AppFlow.md`](./AppFlow.md) — HOW users and business workflows move through the system (User Journey & Application Flow).

*These two documents are authoritative and govern all architectural and domain implementations.*

---

## 🏛️ Architecture Overview

```
SR-Enterprises-CRM (Monorepo)
├── apps/
│   ├── web/                     # React + TypeScript + Vite + Tailwind CSS + PWA
│   └── api/                     # Node.js + TypeScript + Fastify
│
├── packages/
│   ├── shared/                  # Common constants, error codes, HTTP status mappings
│   ├── types/                   # Shared TypeScript domain contracts, RBAC roles & API DTOs
│   ├── validation/              # Shared Zod validation schemas
│   └── config/                  # Shared TypeScript/ESLint base configurations
│
├── infrastructure/
│   └── docker/                  # Docker compose & container configurations
│
├── tests/
│   └── e2e/                     # Playwright end-to-end tests
│
├── .github/
│   └── workflows/ci.yml         # GitHub Actions CI quality gates
│
├── pnpm-workspace.yaml          # Workspace configuration
├── package.json                 # Unified monorepo runner scripts
├── docker-compose.yml           # Local PostgreSQL 18 & Redis services
└── .env.example                 # Environment variables specification
```

---

## 🚀 Approved Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide, Apache ECharts, Zustand, TanStack Query, React Hook Form, Zod |
| **PWA** | Vite PWA / Service Worker, Web App Manifest, Standalone Desktop Experience |
| **Backend** | Node.js, TypeScript, Fastify |
| **Database** | PostgreSQL 18 with Drizzle ORM |
| **Cache / Queue** | Redis + BullMQ |
| **Realtime** | Socket.IO |
| **Security** | Argon2id password hashing, Secure HTTP-only cookies, Rate limiting, Request correlation (`X-Request-ID`), Centralized error sanitization |
| **Testing** | Vitest, React Testing Library, Playwright |
| **CI / CD** | GitHub Actions |
| **Package Manager** | `pnpm` |

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** >= 20 (Node.js 22/24 LTS recommended)
- **pnpm** >= 9
- **Docker Desktop** (for local PostgreSQL 18 and Redis)
- **Git**

### 1. Clone & Setup Environment

```bash
# Clone repository
git clone <repository-url>
cd CRM-SR-Enterprices

# Copy environment variables template
cp .env.example .env
```

### 2. Start Infrastructure Containers

```bash
# Start PostgreSQL 18 & Redis
pnpm docker:up
```

### 3. Install Dependencies

```bash
# Install workspace dependencies
pnpm install
```

### 4. Run Development Servers

```bash
# Run both Frontend (port 3000) and Backend (port 4000) concurrently
pnpm dev

# Or run services individually:
pnpm dev:api   # Fastify API (http://localhost:4000)
pnpm dev:web   # React Vite App (http://localhost:3000)
```

---

## 📋 Developer Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts all monorepo applications in development mode |
| `pnpm build` | Builds all packages and applications in topological order |
| `pnpm test` | Runs Vitest across all apps and packages |
| `pnpm test:e2e` | Runs Playwright end-to-end tests |
| `pnpm lint` | Runs ESLint / type linters across workspace |
| `pnpm typecheck` | Validates TypeScript types across workspace without emitting code |
| `pnpm format` | Checks Prettier formatting across the codebase |
| `pnpm format:write` | Formats all source files with Prettier |
| `pnpm docker:up` | Starts local PostgreSQL 18 and Redis containers |
| `pnpm docker:down` | Stops local containers |

---

## 🔍 Health & Observability Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/health` | `GET` | **Liveness Probe**: Confirms API process is alive and responsive |
| `/ready` | `GET` | **Readiness Probe**: Confirms active connection to PostgreSQL 18 and Redis |
| `/api/v1` | `GET` | **API Root**: Base router for version 1 API endpoints |

---

## 🛡️ Security & Quality Standards

- **Centralized Error Handling**: Production error responses never leak stack traces, database credentials, or raw SQL syntax.
- **Fail-Fast Configuration**: Fastify backend crashes with an explicit diagnostic message if required production environment variables are invalid.
- **Argon2id Hashing**: Industry standard memory-hard password hashing.
- **Strict TypeScript**: `noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`, and zero unmanaged `any` casts.
- **Offline-Aware UX**: Real-time tracking of network connectivity (`connected`, `connecting`, `offline`, `syncing`).

---

## 📍 Next Phase

- **PHASE 1** — Database Architecture & Domain Model (PostgreSQL 18 Drizzle Schemas, Migrations, Constraints, Transactions, and Domain Repositories).
