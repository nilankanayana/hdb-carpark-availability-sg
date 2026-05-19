# Singapore HDB Car Park Availability

Live HDB carpark availability across Singapore, on a clustered map with address search and per-carpark detail panel. Built on React + Vite, served via Vercel Serverless Functions (with a small Express proxy for local development).

## Quick start

```bash
# install everything
npm run install:all

# (one-off) convert the SVY21 static carpark info CSV → WGS84 JSON
npm run build:data

# dev (server + client)
npm run dev
# open http://127.0.0.1:8502/
```

## Architecture

```
hdb-carpark-availability-sg/
├── HDBCarparkInformation.csv     # static dataset (committed, ~300 KB)
├── CarparkAvailability.json      # API spec (OpenAPI 3.0)
├── server/                       # Express proxy for local dev
├── client/
│   ├── api/                      # Vercel Serverless Functions
│   │   ├── carparks.js           # GET /api/carparks (live availability)
│   │   ├── health.js
│   │   └── _lib/upstream.js      # shared fetcher + cache + response shaping
│   ├── scripts/build-carparks.mjs# CSV → JSON, run via `npm run build:data`
│   └── src/
│       ├── data/carparks.json    # generated; committed
│       ├── lib/{merge,search}*.js
│       ├── hooks/{useResource,useTheme,useCarparks}.js
│       └── components/{MapView,CarparkPanel,SearchBox,Controls,ThemeToggle}.jsx
└── docs/
    ├── IMPLEMENTATION-PLAN.md
    └── API.md
```

## Environment

Copy `.env.example` to `.env` and fill in:

| Var | Default | Notes |
|---|---|---|
| `DATA_GOV_SG_API_KEY` | _empty_ | Optional. Only used for higher rate limits — the endpoint is public. |
| `DATA_GOV_SG_API_BASE` | `https://api.data.gov.sg/v1` | Override only for testing. |
| `SERVER_HOST` / `SERVER_PORT` | `127.0.0.1` / `3002` | Local Express proxy. Ignored on Vercel. |
| `CLIENT_HOST` / `CLIENT_PORT` | `127.0.0.1` / `8502` | Local Vite dev server. Ignored on Vercel. |
| `PROXY_CACHE_TTL_MS` | `30000` | In-memory cache TTL for upstream responses. |

## Updating the static dataset

The HDB carpark inventory rarely changes. When it does:

1. Re-download the CSV from <https://data.gov.sg/datasets/d_23f946fa557947f93a8043bbef41dd09/view>.
2. Replace `HDBCarparkInformation.csv` at the repo root.
3. `npm run build:data` → regenerates `client/src/data/carparks.json`.
4. Commit both files.

## Deploy (Vercel)

- **Framework Preset**: Vite (auto-detected).
- **Root Directory**: `client`.
- **Environment Variables**: only `DATA_GOV_SG_API_KEY` (Production + Preview + Development).
- **Deployment Protection**: disabled for the production URL.

Serverless functions in `client/api/*` are deployed automatically. The Express server in `server/` is for local dev only and is not used in production.

## Data

- **Live availability**: `GET /transport/carpark-availability` (data.gov.sg, recommended poll cadence = 60s).
- **Static info**: dataset `d_23f946fa557947f93a8043bbef41dd09` (HDB Car Park Information). Coordinates are in SVY21 (EPSG:3414) and converted to WGS84 by `build-carparks.mjs`.

See `docs/API.md` for the full reference, response shapes, and merge logic.

## License & attribution

Data is provided under the **Singapore Open Data License**. The footer credits data.gov.sg, HDB, and the Land Transport Authority.
