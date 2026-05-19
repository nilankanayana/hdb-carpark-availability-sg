#!/usr/bin/env node
// Build static carpark info: parse the data.gov.sg CSV (SVY21 coords) and emit
// client/src/data/carparks.json with WGS84 lat/lng. Run via `npm run build:data`.
//
// Source dataset:
//   https://data.gov.sg/datasets/d_23f946fa557947f93a8043bbef41dd09/view
// Place the downloaded CSV at the repo root as `HDBCarparkInformation.csv`,
// then run this script (`npm run build:data`).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import proj4 from 'proj4';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SRC_CSV = path.join(REPO_ROOT, 'HDBCarparkInformation.csv');
const OUT_JSON = path.join(REPO_ROOT, 'client', 'src', 'data', 'carparks.json');

// SVY21 (Singapore) → WGS84
proj4.defs(
  'EPSG:3414',
  '+proj=tmerc +lat_0=1.366666666666667 +lon_0=103.8333333333333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs'
);
const toWGS84 = proj4('EPSG:3414', 'EPSG:4326');

function num(v, fallback = null) {
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
}

function main() {
  if (!fs.existsSync(SRC_CSV)) {
    console.error(`Source CSV not found at ${SRC_CSV}`);
    console.error('Download the dataset from:');
    console.error('  https://data.gov.sg/datasets/d_23f946fa557947f93a8043bbef41dd09/view');
    console.error('and save it at the repo root as HDBCarparkInformation.csv');
    process.exit(1);
  }

  const csv = fs.readFileSync(SRC_CSV, 'utf-8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    console.warn(`CSV parse warnings: ${parsed.errors.length}`);
    for (const e of parsed.errors.slice(0, 5)) console.warn(' -', e.message, '(row', e.row + ')');
  }

  const carparks = [];
  let skipped = 0;
  for (const row of parsed.data) {
    const carParkNo = pick(row, 'car_park_no', 'CarParkID', 'carpark_no');
    const address = pick(row, 'address', 'Address');
    const xCoord = num(pick(row, 'x_coord', 'XCoord', 'x'));
    const yCoord = num(pick(row, 'y_coord', 'YCoord', 'y'));
    if (!carParkNo || xCoord == null || yCoord == null) {
      skipped++;
      continue;
    }
    const [lng, lat] = toWGS84.forward([xCoord, yCoord]);
    carparks.push({
      car_park_no: String(carParkNo).trim(),
      address: String(address ?? '').trim(),
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      car_park_type: pick(row, 'car_park_type', 'CarParkType') ?? '',
      type_of_parking_system: pick(row, 'type_of_parking_system', 'TypeOfParkingSystem') ?? '',
      short_term_parking: pick(row, 'short_term_parking', 'ShortTermParking') ?? '',
      free_parking: pick(row, 'free_parking', 'FreeParking') ?? '',
      night_parking: pick(row, 'night_parking', 'NightParking') ?? '',
      car_park_decks: num(pick(row, 'car_park_decks', 'CarParkDecks'), 0),
      gantry_height: num(pick(row, 'gantry_height', 'GantryHeight'), 0),
      car_park_basement: pick(row, 'car_park_basement', 'CarParkBasement') ?? '',
    });
  }

  // Sanity check: lat/lng should fall within Singapore's rough envelope.
  const ootb = carparks.filter((c) => c.lat < 1.15 || c.lat > 1.5 || c.lng < 103.55 || c.lng > 104.1);
  if (ootb.length) {
    console.warn(`Warning: ${ootb.length} carparks fall outside Singapore's lat/lng envelope.`);
    console.warn('Sample:', ootb.slice(0, 3));
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify({ carparks }, null, 2));
  console.log(`Wrote ${carparks.length} carparks to ${path.relative(REPO_ROOT, OUT_JSON)} (skipped ${skipped} rows)`);
}

main();
