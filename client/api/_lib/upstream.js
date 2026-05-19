// Shared upstream client used by both the Express dev proxy (../../../server/index.js)
// and the Vercel Serverless Functions in this directory. Env vars are read lazily
// inside each call so dotenv loading order in the dev server does not matter.

function apiBase() {
  return process.env.DATA_GOV_SG_API_BASE || 'https://api.data.gov.sg/v1';
}

function apiKey() {
  return process.env.DATA_GOV_SG_API_KEY || '';
}

function cacheTtlMs() {
  return Number(process.env.PROXY_CACHE_TTL_MS || 30_000);
}

function authHeaders() {
  const h = { Accept: 'application/json' };
  const key = apiKey();
  if (key) h['x-api-key'] = key;
  return h;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Upstream ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function createCachedFetcher({ fetcher }) {
  let cache = null;
  let inflight = null;
  return {
    async get() {
      const now = Date.now();
      if (cache && now - cache.fetchedAt < cacheTtlMs()) {
        return { ...cache, fromCache: true };
      }
      if (inflight) return inflight;
      inflight = (async () => {
        try {
          const payload = await fetcher();
          cache = { fetchedAt: Date.now(), payload };
          return { ...cache, fromCache: false };
        } finally {
          inflight = null;
        }
      })();
      return inflight;
    },
    getCache() {
      return cache;
    },
  };
}

export const carparks = createCachedFetcher({
  fetcher: () => fetchJson(`${apiBase()}/transport/carpark-availability`),
});

export function shapeCarparks(fetchedAt, payload, extra = {}) {
  const item = payload?.items?.[0];
  const rows = (item?.carpark_data ?? []).map((c) => {
    // Build a keyed map of lot types (C: Cars, H: Heavy, Y: Motorcycles, S: M/cycle w/sidecar).
    // Some carparks expose more than one type; this lets the client pick which to display.
    const lot_types = {};
    for (const info of c.carpark_info ?? []) {
      if (!info?.lot_type) continue;
      lot_types[info.lot_type] = {
        total_lots: Number(info.total_lots ?? 0),
        lots_available: Number(info.lots_available ?? 0),
      };
    }
    return {
      car_park_no: c.carpark_number,
      update_datetime: c.update_datetime ?? null,
      lot_types,
    };
  });
  return {
    fetchedAt,
    apiTimestamp: item?.timestamp ?? null,
    count: rows.length,
    carparks: rows,
    ...extra,
  };
}

export async function handleResource(resource, shape, res) {
  try {
    const { fetchedAt, payload, fromCache } = await resource.get();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.setHeader('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.setHeader('X-Fetched-At', new Date(fetchedAt).toISOString());
    res.status(200).json(shape(fetchedAt, payload));
  } catch (err) {
    console.error('[proxy] upstream failed:', err.message);
    const cached = resource.getCache();
    if (cached) {
      res.setHeader('X-Cache', 'STALE');
      res.status(200).json(shape(cached.fetchedAt, cached.payload, { stale: true }));
    } else {
      res.status(502).json({ error: 'upstream_unavailable', message: err.message });
    }
  }
}

export { cacheTtlMs, apiKey };
