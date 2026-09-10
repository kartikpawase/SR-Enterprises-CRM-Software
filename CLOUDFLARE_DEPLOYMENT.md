# SR Enterprises CRM — Cloudflare Deployment Guide

This guide describes how to deploy the SR Enterprises CRM software on **Cloudflare** (via **Cloudflare Pages** and **Wrangler**) while maintaining full compatibility with **Render** for backend API services.

---

## Architecture Overview

```
                        ┌────────────────────────────────────────────────────────┐
                        │              Cloudflare Global Edge Network            │
                        │                                                        │
                        │  ┌──────────────────────┐   ┌───────────────────────┐  │
Clients / Browsers ───► │  │ Cloudflare Pages     │   │ Cloudflare Edge       │  │
                        │  │ (React 18 SPA + PWA) │   │ Reverse Proxy / Funcs │  │
                        │  └──────────────────────┘   └───────────┬───────────┘  │
                        └─────────────────────────────────────────┼──────────────┘
                                                                  │
                                                Secure HTTPS API  │ (/api/*)
                                                                  ▼
                                              ┌───────────────────────────────────┐
                                              │      Render Cloud Backend API     │
                                              │  (Fastify + PostgreSQL + Redis)   │
                                              │ https://...onrender.com           │
                                              └───────────────────────────────────┘
```

- **Frontend & Edge Routing**: Hosted on **Cloudflare Pages**, delivering sub-millisecond edge latency, automatic SSL, DDoS protection, and PWA caching.
- **Single Page Application (SPA) Routing**: Handled via `_redirects` (`/* /index.html 200`), allowing all React Router URLs (`/customers`, `/services`, `/invoices`, `/dues`, `/reports`) to refresh and load seamlessly.
- **Backend API & Data Layer**: Hosted on **Render**, executing business calculations, database operations, background schedulers, and notifications.
- **Automatic Reverse Proxying**: Cloudflare Pages `_redirects` and Edge Functions (`functions/api/[[catchall]].ts`) forward API requests to the Render backend transparently.

---

## Method 1: 1-Click Deployment via Cloudflare Dashboard (Recommended)

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, select **Compute (Workers & Pages)** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
3. Choose GitHub and select your repository:
   - `siddharth-varpe/CRM-SR-Enterprises-V2` (or your active CRM repo).
4. Configure the build settings:
   - **Project name**: `sr-enterprises-crm`
   - **Framework preset**: `Vite` (or `None`)
   - **Build command**: `pnpm run build:web`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
5. (Optional) In **Environment variables (Advanced)**, add:
   - `BACKEND_URL`: `https://sr-enterprises-crm-software.onrender.com` (or your custom API domain)
   - `NODE_VERSION`: `20`
6. Click **Save and Deploy**.
7. Cloudflare will build the bundle, configure edge routes, and deploy your site to `https://sr-enterprises-crm.pages.dev`.

---

## Method 2: Deployment via Wrangler CLI

You can also deploy directly from your local terminal using Wrangler:

```bash
# 1. Build the production web bundle
pnpm run build:cloudflare

# 2. Deploy to Cloudflare Pages
pnpm run deploy:cloudflare
```

*(If not already logged into Cloudflare, Wrangler will open a browser window to authenticate your Cloudflare account).*

---

## Custom Domain Setup

To connect your own domain (e.g. `crm.srenterprises.com`):

1. Go to your Cloudflare Pages project in the dashboard.
2. Select the **Custom domains** tab.
3. Click **Set up a custom domain** and enter your domain name (e.g. `crm.srenterprises.com`).
4. If your domain's DNS is managed by Cloudflare, it will configure CNAME and SSL automatically with zero downtime.

---

## Dual Cloudflare + Render Operational Guarantees

- **Render Service**: Continues running unmodified via `render.yaml` with all dependencies and environment variables intact.
- **Zero Breaking Changes**: Business math, tax calculations, and database structures are untouched.
- **CORS Integration**: `apps/api/src/app.ts` permits all `*.pages.dev` and `*.workers.dev` origins automatically.
