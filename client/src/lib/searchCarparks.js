const MAX_RESULTS = 20;

export function searchCarparks(query, carparks) {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const c of carparks) {
    const haystack = `${c.address ?? ''} ${c.car_park_no ?? ''}`.toLowerCase();
    if (haystack.includes(q)) {
      out.push(c);
      if (out.length >= MAX_RESULTS) break;
    }
  }
  return out;
}

export { MAX_RESULTS };
