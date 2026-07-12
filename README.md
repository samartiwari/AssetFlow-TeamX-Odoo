# AssetFlow

Enterprise Asset & Resource Management System — a centralized ERP platform for tracking,
allocating, and maintaining an organization's physical assets and shared resources.

AssetFlow replaces spreadsheets and paper logs with structured asset lifecycles, centralized
resource booking, a maintenance approval workflow, structured audit cycles, and real-time
visibility into who holds what, where it is, and its condition. It is industry-agnostic — any
organization with equipment, furniture, vehicles, or shared spaces can use it.

## Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React + Vite + TypeScript, Ant Design, TanStack Query |
| Backend  | Express + TypeScript, Prisma ORM |
| Database | PostgreSQL 16 (via Docker) |
| Auth     | JWT (stored in `localStorage`) |

## Repository layout

```
.
├── client/                 # React + Vite frontend
│   └── src/
│       └── api/client.ts   # axios instance (attaches JWT, points at the API)
├── server/                 # Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma    # data model (see docs/DATA_MODEL.md)
│   │   └── seed.ts          # re-runnable demo seed
│   └── src/
│       ├── index.ts         # Express app, /health, /api/* routes
│       ├── lib/             # prisma client, http helpers, auth helpers
│       ├── middleware/      # requireAuth / role guards
│       └── routes/          # API route modules
├── docker-compose.yml      # PostgreSQL (5434) + Adminer (8001)
└── docs/                   # DATA_MODEL.md, API.md
```

## Getting started

Requires **Node 22** (see `.nvmrc`) and **Docker**.

### 1. Start the database

```bash
docker compose up -d          # from the repo root — Postgres on port 5434
```

### 2. Backend

```bash
cd server
cp .env.example .env          # DATABASE_URL, JWT_SECRET, PORT, CLIENT_ORIGIN
npm install
npm run migrate               # apply Prisma migrations
npm run seed                  # load demo data (wipe + reseed)
npm run dev                   # API on http://localhost:4000
```

Verify the pipe: `GET http://localhost:4000/health` → `{ "data": { "ok": true, "service": "assetflow-api" } }`.

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev                   # app on http://localhost:5173
```

## Backend scripts (`server/`)

| Script | Purpose |
|--------|---------|
| `npm run dev`           | Start the API with hot reload (`tsx watch`) |
| `npm run build`         | Compile TypeScript to `dist/` |
| `npm run start`         | Run the compiled server |
| `npm run migrate`       | `prisma migrate dev` |
| `npm run seed`          | Re-seed the database with demo data |
| `npm run prisma:studio` | Open Prisma Studio |

## API response contract

Every endpoint returns a consistent envelope:

- **Success:** `{ "data": <payload> }`
- **Failure:** `{ "error": "<message>", ...extra }`

Conflict responses (`409`) may carry extra fields describing the conflict (e.g. the current
holder of an asset, or the overlapping booking slot). See [docs/API.md](docs/API.md).

## Roles

Accounts are created as **Employee** only. An **Admin** promotes selected employees to
**Department Head** or **Asset Manager** from the Employee Directory — roles are never
self-assigned at signup.

| Role | Capabilities |
|------|--------------|
| Admin | Departments, categories, audit cycles, role assignment, org-wide analytics |
| Asset Manager | Registers/allocates assets; approves transfers, maintenance, returns, discrepancies |
| Department Head | Views department assets; approves department allocations/transfers; books resources |
| Employee | Views own assets; books resources; raises maintenance; initiates return/transfer requests |

## Documentation

- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — entities, enums, relationships, ER diagram
- [docs/API.md](docs/API.md) — response contract and endpoint reference
