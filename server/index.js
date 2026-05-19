import express from 'express';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '..', '.env') });

const { carparks, shapeCarparks, handleResource, cacheTtlMs, apiKey } =
  await import('../client/api/_lib/upstream.js');

const PORT = Number(process.env.SERVER_PORT || process.env.PORT || 3002);
const HOST = process.env.SERVER_HOST || '127.0.0.1';

const app = express();

app.get('/api/carparks', (_req, res) => handleResource(carparks, shapeCarparks, res));

app.get('/api/health', (_req, res) => {
  const cc = carparks.getCache();
  res.json({
    ok: true,
    cacheTtlMs: cacheTtlMs(),
    carparks: {
      hasCache: !!cc,
      cacheAgeMs: cc ? Date.now() - cc.fetchedAt : null,
    },
    hasApiKey: !!apiKey(),
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[proxy] listening on http://${HOST}:${PORT}`);
  console.log(`[proxy] cache TTL ${cacheTtlMs()}ms · API key ${apiKey() ? 'set' : 'not set'}`);
});
