import { carparks, cacheTtlMs, apiKey } from './_lib/upstream.js';

export default function handler(_req, res) {
  const cc = carparks.getCache();
  res.status(200).json({
    ok: true,
    cacheTtlMs: cacheTtlMs(),
    carparks: {
      hasCache: !!cc,
      cacheAgeMs: cc ? Date.now() - cc.fetchedAt : null,
    },
    hasApiKey: !!apiKey(),
  });
}
