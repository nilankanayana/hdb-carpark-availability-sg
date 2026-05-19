import staticInfo from '../data/carparks.json';

const byNumber = new Map((staticInfo.carparks ?? []).map((c) => [c.car_park_no, c]));

// Joins live availability rows (per-lot-type) onto the static carpark info
// (address, coords, etc.). Keeps the full lot_types map so the client can
// filter/display per lot type.
export function mergeCarparks(liveRows) {
  if (!liveRows?.length) return [];
  const out = [];
  for (const live of liveRows) {
    const info = byNumber.get(live.car_park_no);
    if (!info) continue;
    out.push({ ...info, ...live });
  }
  return out;
}

// Returns availability info for the given lot type, with a precomputed ratio.
// Returns null if the carpark doesn't have that lot type at all.
export function lotInfoFor(carpark, lotType) {
  const lot = carpark?.lot_types?.[lotType];
  if (!lot) return null;
  const ratio = lot.total_lots > 0 ? lot.lots_available / lot.total_lots : null;
  return { ...lot, availabilityRatio: ratio };
}

export function staticCarparkCount() {
  return byNumber.size;
}
