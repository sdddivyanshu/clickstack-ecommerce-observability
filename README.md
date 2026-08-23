# ShopKit — Full-Stack E-commerce

A complete e-commerce platform that's also a sandbox for modern observability and AI tooling. Under the hood it's a Vite + React storefront backed by an Express API and PostgreSQL — but layered on top is a full ClickHouse analytics pipeline, an OpenTelemetry/HyperDX logging stack, a Gemini-powered shopping assistant, and an MCP-connected analytics agent that can query your store's behavioral data in plain English. Ship it locally with one `npm run dev`, or all the way to Kubernetes with the included manifests.

## ✨ Features

### 🛍️ Storefront & shopping
- **Product catalog** — browsable/searchable products with category filters, pagination, and per-product detail pages
- **Cart & checkout** — persistent server-side cart (`GET/PUT/DELETE /api/cart`) that converts cleanly into an order on checkout
- **Order history** — customers can review past orders and track status; admins can update order status as it moves through fulfillment
- **Authentication** — JWT + bcrypt auth with `register` / `login` / `me` endpoints and route-level guards for logged-in vs. admin-only pages
- **Admin dashboard** — a dedicated `/admin` area for managing the product catalog (create/edit/delete) and reviewing/updating all customer orders

### 🤖 AI shopping assistant
- **In-app chat widget** — a floating assistant on every page (`ChatWidget.jsx`) that customers can open without leaving the storefront
- **Context-aware answers** — the assistant is fed live context with every message: the product the customer is currently viewing, their cart contents and running total, and recent order history, so it never has to guess prices or stock
- **Powered by Gemini** — backend (`/api/chat`) calls Google's Gemini API directly, with a system prompt that scopes the assistant to shopping questions only and instructs it to never fabricate prices, stock, or order details
- **Conversation-aware** — keeps a rolling window of message history so the assistant maintains context through a multi-turn conversation

### 🧠 Conversational analytics agent (MCP + LibreChat)
- **Ask your data questions in English** — a second, separate chat surface (LibreChat) hosts a "ClickHouse Analytics Agent" that translates plain-English questions into real, read-only SQL against your ClickHouse warehouse
- **MCP-powered** — connects to ClickHouse through the Model Context Protocol (`mcp-clickhouse`), so the agent runs actual queries rather than guessing answers
- **Pre-loaded with house rules** — seeded (`agent-seed.json`) with the exact schema, partition/TTL details, and analytics best practices (always filter on `ts`, use `quantile(0.95)` instead of `avg()` for latency, show the SQL it ran, etc.) so answers are trustworthy out of the box
- **Answers things like:** "What's the p95 latency on `/api/orders` this week?", "Show me the checkout funnel for the last 30 days," or "Which products get added to cart the most?"
- **Reusable agent-skills doc** — `agent-skills/AGENTS.md` packages the same schema knowledge as a portable skills file for any agent (or any teammate) that needs to write ClickHouse SQL against this data

### 📊 Full-stack observability & analytics
- **Three first-class data streams in ClickHouse:**
  | Table | Captures |
  |-------|----------|
  | `click_events` | Every pageview, click, add-to-cart, checkout, error, and instrumented `fetch()` call — with latency |
  | `server_logs` | Every inbound HTTP request: method, path, status, user, IP, duration |
  | `app_logs` | Structured info/warn/error log lines straight from the Node process |
- **Zero-effort client instrumentation** — `analytics.js` auto-captures pageviews, every click (with a CSS-selector-style target label), unhandled JS errors, and unhandled promise rejections — no manual `track()` calls required for the basics
- **Instrumented `fetch`** — the global `fetch` is monkey-patched so every call to `/api/*` is automatically logged with method, status, and duration, turning the frontend into its own APM
- **Reliable delivery** — events are batched (flushed every 5s or at 20 events) and flushed via `navigator.sendBeacon` on tab close/hide, so you don't lose the last few seconds of a session
- **OpenTelemetry log export** — the server ships structured logs to HyperDX/ClickStack over OTLP/HTTP, so request logs, app logs, and traces all land in one observability UI
- **Ready-made SQL** — the README ships with copy-paste queries for top pages, API p50/p95 latency, error rates by path, and a product-view → add-to-cart → checkout funnel

### 🐳 DevOps & deployment
- **One-command local stack** — `docker compose up --build` brings up Postgres, ClickHouse, the API, the client, ClickStack/HyperDX, and the LibreChat + MCP analytics agent together
- **Live-reload in Docker** — Compose `watch` mode rebuilds/syncs the server and client containers on file changes, so containerized dev still feels like local dev
- **Production-grade Kubernetes manifests** — namespace, secrets, a Postgres `StatefulSet`, `Deployment`s for server/client, an nginx `Ingress` with cert-manager TLS, and `HorizontalPodAutoscaler`s (server scales 2→10, client 2→6)
- **Environment overlays** — Kustomize `dev` (single replica, local image tags) and `prod` (pinned SHA tags) overlays out of the box
- **CI/CD pipeline** — GitHub Actions workflow builds and pushes images to GHCR, updates the prod overlay, and rolls out the new version automatically on every push to `main`

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite, React 18, React Router 6 |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL (via `pg`) |
| Auth | JWT + bcrypt |
| Analytics warehouse | ClickHouse |
| Observability | OpenTelemetry → HyperDX/ClickStack |
| AI shopping assistant | Google Gemini |
| Analytics agent | LibreChat + MCP (`mcp-clickhouse`) |
| Orchestration | Docker Compose (local), Kubernetes + Kustomize (prod) |

## Project layout

```
ecommerce/
├── client/               # Vite React app
│   └── src/
│       ├── analytics.js  # Auto-capturing browser analytics SDK
│       ├── api/          # Typed API client
│       ├── components/   # Navbar, ProductCard, ChatWidget (AI assistant)
│       ├── hooks/        # useAuth, useCart (React context)
│       └── pages/        # Home, Products, Cart, Orders, Admin …
├── server/               # Express API
│   └── src/
│       ├── db/           # pool.js, migrate.js, seed.js, ch-client.js, ch-migrate.js
│       ├── middleware/   # auth.js (JWT), requestLogger.js
│       ├── routes/       # auth, products, cart, orders, chat (Gemini), events (analytics ingest)
│       └── utils/        # logger.js, otel.js (OTLP export to HyperDX)
├── agent-skills/         # AGENTS.md — portable ClickHouse schema/SQL skill for agents
├── agent-seed.json       # LibreChat "ClickHouse Analytics Agent" definition (MCP-powered)
├── librechat.yaml        # LibreChat config — custom endpoints + mcp-clickhouse server
└── k8s/                  # Kubernetes manifests (base + dev/prod overlays)
```

## Quick start

### 1. Prerequisites

- Node 20+
- PostgreSQL running locally (or a connection string)

### 2. Clone & install

```bash
git clone <repo>
cd ecommerce
npm install          # installs root + all workspaces
```

### 3. Configure environment

```bash
cp server/.env.example server/.env
# edit server/.env — set DATABASE_URL and JWT_SECRET
```

### 4. Database setup

```bash
npm run db:migrate   # creates tables
npm run db:seed      # loads sample products + users
```

Seed credentials:
- `admin@example.com` / `admin123`
- `customer@example.com` / `customer123`

### 5. Run dev servers

```bash
npm run dev          # starts both client (:5173) and server (:3000)
```

Open http://localhost:5173

## API reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login → JWT |
| GET | `/api/auth/me` | Bearer | Current user |

### Products
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/products` | — | List (filter: `q`, `category`, `page`, `limit`) |
| GET | `/api/products/categories` | — | Category list |
| GET | `/api/products/:id` | — | Single product |
| POST | `/api/products` | Admin | Create |
| PATCH | `/api/products/:id` | Admin | Update |
| DELETE | `/api/products/:id` | Admin | Delete |

### Cart
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cart` | Bearer | Get cart |
| PUT | `/api/cart` | Bearer | Add/update item `{ product_id, quantity }` |
| DELETE | `/api/cart/:product_id` | Bearer | Remove item |
| DELETE | `/api/cart` | Bearer | Clear cart |

### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | Bearer | Checkout (cart → order) |
| GET | `/api/orders` | Bearer | My orders (admin: all) |
| GET | `/api/orders/:id` | Bearer | Order detail |
| PATCH | `/api/orders/:id/status` | Admin | Update status |

### AI chat & analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat` | Optional | AI shopping assistant — pass `{ messages, context }`, calls Gemini |
| POST | `/api/events` | — | Analytics ingest — batched browser events from `analytics.js` |

Requires `GOOGLE_KEY` (and optionally `LIBRECHAT_MODEL`, default `gemini-2.5-flash-lite`) in `server/.env` for the chat assistant to work.

## Docker (local / CI)

```bash
# Build images
docker build -t shopkit-server ./server
docker build -t shopkit-client ./client

# Or spin everything up with Compose
docker compose up --build
```

`docker-compose.yml` starts postgres, server (:3000), and client (:5173) with one command. Good for local testing before pushing to Kubernetes.

---


## ClickHouse (analytics & logs)

ClickHouse stores three streams of data:

| Table | What goes in |
|-------|-------------|
| `click_events` | Every browser interaction — pageviews, clicks, add-to-cart, checkout, errors, and all fetch() calls to `/api/*` with latency |
| `server_logs` | Every inbound HTTP request — method, path, status, user, IP, duration, sanitised body |
| `app_logs` | Structured log lines from the Node.js process (info / warn / error) |

### Local setup

```bash
# ClickHouse starts automatically with docker-compose
docker compose up --build

# Run the schema migration (creates DB + 3 tables)
npm run db:ch-migrate

# Verify
curl 'http://localhost:8123/?query=SHOW+TABLES+FROM+shopkit'
```

### Useful queries

```sql
-- Top pages by views (last 7 days)
SELECT page, count() AS views
FROM shopkit.click_events
WHERE event_type = 'pageview' AND ts > now() - INTERVAL 7 DAY
GROUP BY page ORDER BY views DESC LIMIT 20;

-- API call p50 / p95 latency by endpoint
SELECT
  target,
  quantile(0.5)(duration_ms)  AS p50_ms,
  quantile(0.95)(duration_ms) AS p95_ms,
  count() AS calls
FROM shopkit.click_events
WHERE event_type = 'api_call' AND ts > now() - INTERVAL 1 DAY
GROUP BY target ORDER BY calls DESC;

-- Error rate by path (server-side)
SELECT path, status, count() AS n
FROM shopkit.server_logs
WHERE status >= 400 AND ts > now() - INTERVAL 1 DAY
GROUP BY path, status ORDER BY n DESC;

-- Recent app errors
SELECT ts, message, context
FROM shopkit.app_logs
WHERE level = 'error'
ORDER BY ts DESC LIMIT 50;

-- Funnel: product_view → add_to_cart → checkout_complete
SELECT
  event_type,
  uniqExact(session_id) AS sessions
FROM shopkit.click_events
WHERE event_type IN ('product_view','add_to_cart','checkout_complete')
  AND ts > now() - INTERVAL 30 DAY
GROUP BY event_type;
```

### Kubernetes secrets

```bash
# Generate the password SHA-256 (required by users.xml)
PW=yourpassword
SHA=$(echo -n "$PW" | sha256sum | awk '{print $1}')
SHA_B64=$(echo -n "$SHA" | base64)

kubectl create secret generic clickhouse-secret -n shopkit \
  --from-literal=username=default \
  --from-literal=password="$PW" \
  --from-literal=password-sha256="$SHA_B64"
```

## Conversational analytics agent (LibreChat + MCP)

`docker compose up --build` also starts **LibreChat** (chat UI, :3080 by default), **MongoDB** and **Meilisearch** (LibreChat's storage/search), and **ClickStack/HyperDX** (observability UI). LibreChat connects to ClickHouse through an MCP server (`mcp-clickhouse`, declared in `librechat.yaml`) running in read-only mode.

A ready-made agent is defined in `agent-seed.json` — a "ClickHouse Analytics Agent" preloaded with the full schema, partition/TTL rules, and query conventions (always filter on `ts`, prefer `quantile(0.95)` over `avg()` for latency, show counts *and* conversion % for funnels, etc.). Import it into LibreChat to start asking questions like:

- "How many users visited the products page today?"
- "What's the p95 API latency for `/api/orders` this week?"
- "Show the checkout conversion funnel for the last 30 days"
- "Which products get added to cart most often?"

The same schema knowledge lives in `agent-skills/AGENTS.md` as a portable skills doc, so any other agent (or teammate) writing ClickHouse SQL against this data starts from the same playbook.

## Kubernetes

```
k8s/
├── base/
│   ├── namespace.yaml    # shopkit namespace
│   ├── secrets.yaml      # postgres + jwt secrets (replace values!)
│   ├── postgres.yaml     # StatefulSet + headless Service + PVC
│   ├── server.yaml       # Deployment (2 replicas) + Service + migrate Job
│   ├── client.yaml       # Deployment (2 replicas) + Service
│   ├── ingress.yaml      # nginx Ingress + TLS via cert-manager
│   ├── hpa.yaml          # HPA: server scales 2→10, client 2→6
│   └── kustomization.yaml
└── overlays/
    ├── dev/              # 1 replica, local image tags
    └── prod/             # pinned SHA image tags
```

### Prerequisites

```bash
# nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml

# cert-manager (TLS)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.0/cert-manager.yaml
```

### Secrets

Edit `k8s/base/secrets.yaml` or create secrets imperatively (preferred — never commit real values):

```bash
# Postgres credentials
kubectl create secret generic postgres-secret -n shopkit \
  --from-literal=username=postgres \
  --from-literal=password=<strong-password>

# App secrets
kubectl create secret generic server-secret -n shopkit \
  --from-literal=jwt-secret=<long-random-string> \
  --from-literal=database-url=postgresql://postgres:<password>@postgres:5432/ecommerce
```

### Deploy

```bash
# Dev (minikube / kind)
kustomize build k8s/overlays/dev | kubectl apply -f -

# Production
kustomize build k8s/overlays/prod | kubectl apply -f -

# Watch rollout
kubectl rollout status deployment/server -n shopkit
kubectl rollout status deployment/client -n shopkit
```

### Migrate & seed

```bash
# Run migration job (creates tables)
kubectl create job db-migrate-manual --from=job/db-migrate -n shopkit

# One-off seed pod
kubectl run db-seed -n shopkit --rm -it --restart=Never \
  --image=ghcr.io/YOUR_ORG/shopkit-server:latest \
  --env="DATABASE_URL=$(kubectl get secret server-secret -n shopkit -o jsonpath='{.data.database-url}' | base64 -d)" \
  -- node src/db/seed.js
```

### CI/CD

`.github/workflows/ci.yml` handles the full pipeline on every push to `main`:

1. Builds and pushes Docker images to GHCR (tagged with the commit SHA)
2. Updates the prod kustomize overlay with the new tags
3. Applies manifests and waits for rollouts to complete

**Required GitHub secrets:**

| Secret | Value |
|--------|-------|
| `KUBECONFIG` | base64-encoded kubeconfig for your cluster |

### Update domain

Replace `shop.example.com` in `k8s/base/ingress.yaml` with your actual domain before deploying.

---

## Production build (static only)

```bash
npm run build        # builds client to client/dist/
```
