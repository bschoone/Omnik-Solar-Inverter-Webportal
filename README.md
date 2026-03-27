# Solar inverter dashboard

Monorepo for collecting Omnik-style inverter telemetry over HTTP and optional TCP push, storing samples in SQLite, and visualizing them in a React dashboard.

## Layout

| Path | Role |
|------|------|
| `backend/` | Node (Express) API, collector, SQLite persistence, OpenAPI docs |
| `frontend/` | Vite + React + MUI dashboard |

## Prerequisites

- Node.js 20+
- An inverter or Wi‑Fi stick reachable on your LAN (optional for development — you can test TCP ingestion locally)

## Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set INVERTER_BASE to your device, optional HTTP auth, tokens if you use admin routes.
npm install
npm run dev
```

The API listens on `PORT` (default `3000`). Interactive documentation is served under `/documentation` (Scalar).

Build and run production output:

```bash
npm run build
npm start
```

### SQLite

The database path is `SOLAR_DB_PATH` (default `./data/samples.sqlite3` under `backend/`). The directory `backend/data/` is tracked with a `.gitkeep`; database files and WAL sidecars are gitignored so local energy data is not committed.

### Docker

From `backend/`:

```bash
docker compose --profile prod up --build -d
# or with bind-mounted source for development:
docker compose --profile dev up --build
```

See `backend/docker-compose.yml` for ports (`3000`, `8899`) and volume layout.

### TCP test frame

With `INVERTER_TCP_ENABLE=1`, you can send a synthetic push burst:

```bash
npm run tcp:send-test -- 127.0.0.1 8899
```

## Frontend

```bash
cd frontend
cp .env.example .env   # optional; only if you need non-default API/docs URLs
npm install
npm run dev
```

During `npm run dev`, API requests to `/api` are proxied to the backend (see `frontend/vite.config.ts`). For production, build static assets and serve them with the API or set `VITE_API_BASE` to the API origin.

## Configuration

- **Backend**: all variables are documented in `backend/.env.example`. Defaults use [RFC 5737 documentation addresses](https://datatracker.ietf.org/doc/html/rfc5737) where a placeholder IP is needed — replace with your real inverter base URL in `.env`.
- **Frontend**: `frontend/.env.example` describes optional `VITE_*` overrides.

## Security notes

- Never commit `backend/.env` or real `ADMIN_API_TOKEN` / `BACKUP_API_TOKEN` values.
- Restrict admin and backup routes to trusted networks if you enable tokens.
