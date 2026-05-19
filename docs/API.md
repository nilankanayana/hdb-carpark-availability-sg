# API Reference — data.gov.sg HDB Car Parks

Reference for the public APIs powering this dashboard.

## Official documentation

- Portal: <https://data.gov.sg/>
- Developer guide: <https://guide.data.gov.sg/developer-guide/api-overview>
- Real-time APIs index: <https://data.gov.sg/developer>
- Static datasets: <https://data.gov.sg/datasets>

The machine-readable contract for the realtime endpoint is checked into the repo as [`CarparkAvailability.json`](../CarparkAvailability.json) (OpenAPI 3.0). Note: the spec's response example is incomplete; the actual shape is documented below.

## Live: Carpark availability

```
GET https://api.data.gov.sg/v1/transport/carpark-availability
```

### Query parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `date_time` | string | No | `YYYY-MM-DD[T]HH:mm:ss` (SGT). Returns the snapshot nearest the requested time. |

### Authentication

Public endpoint. An optional `x-api-key` header lifts rate limits. The proxy attaches it automatically when `DATA_GOV_SG_API_KEY` is set.

### Actual response shape

```json
{
  "items": [
    {
      "timestamp": "2026-05-19T21:59:37+08:00",
      "carpark_data": [
        {
          "carpark_number": "HE12",
          "update_datetime": "2026-05-19T21:59:01",
          "carpark_info": [
            { "total_lots": "105", "lot_type": "C", "lots_available": "101" }
          ]
        }
      ]
    }
  ]
}
```

Each `carpark_data[i].carpark_info` is an array of lot-type breakdowns:

| `lot_type` | Meaning |
|---|---|
| `C` | Cars |
| `H` | Heavy vehicles |
| `S` | Motorcycles with side car |
| `Y` | Motorcycles |

All numeric fields are returned as strings — coerce on read.

### Refresh cadence

Upstream refreshes every minute. **Recommended client cadence: 60 s** (we honour this in `App.jsx`).

### Proxy response shape

`/api/carparks` (this app) flattens the upstream into a per-carpark row using the primary `carpark_info[0]` entry (typically `C`) and surfaces additional lot types under `other_lot_types`:

```json
{
  "fetchedAt": 1716147600000,
  "apiTimestamp": "2026-05-19T21:59:37+08:00",
  "count": 2014,
  "carparks": [
    {
      "car_park_no": "HE12",
      "total_lots": 105,
      "lots_available": 101,
      "lot_type": "C",
      "update_datetime": "2026-05-19T21:59:01",
      "other_lot_types": []
    }
  ]
}
```

Response headers:

- `X-Cache: HIT|MISS|STALE` — in-memory cache state.
- `X-Fetched-At` — ISO timestamp of upstream fetch.
- `Cache-Control: s-maxage=30, stale-while-revalidate=60` — instructs Vercel's edge to cache for 30 s with 60 s SWR.

## Static: HDB Car Park Information

Dataset: <https://data.gov.sg/datasets/d_23f946fa557947f93a8043bbef41dd09/view>

Stable inventory — committed to the repo as `HDBCarparkInformation.csv` and re-downloaded only when the dataset is updated upstream.

### CSV columns

| Column | Notes |
|---|---|
| `car_park_no` | Stable identifier, joins to the live feed's `carpark_number`. |
| `address` | Human-readable address (used for search). |
| `x_coord`, `y_coord` | **SVY21** (EPSG:3414) easting/northing in metres. Convert to WGS84 lat/lng before use. |
| `car_park_type` | E.g. `MULTI-STOREY CAR PARK`, `BASEMENT CAR PARK`, `SURFACE CAR PARK`. |
| `type_of_parking_system` | `ELECTRONIC PARKING` or `COUPON PARKING`. |
| `short_term_parking` | E.g. `WHOLE DAY`, `7AM-7PM`. |
| `free_parking` | Description of free-parking windows. |
| `night_parking` | `YES` / `NO`. |
| `car_park_decks` | Integer. |
| `gantry_height` | Metres. |
| `car_park_basement` | `Y` / `N`. |

### Coordinate conversion (SVY21 → WGS84)

`client/scripts/build-carparks.mjs` does the one-shot conversion using `proj4` with EPSG:3414:

```js
proj4.defs('EPSG:3414', '+proj=tmerc +lat_0=1.366666666666667 +lon_0=103.8333333333333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs');
```

Output: `client/src/data/carparks.json` — `{ carparks: [...] }` with `lat`/`lng` floats and all the human-readable columns.

## Client merge

`client/src/lib/mergeCarparks.js` joins the live rows (by `car_park_no` / `carpark_number`) onto the static info. Live rows without a static match (e.g. URA / commercial carparks that appear in the live feed but aren't in the HDB dataset) are dropped.

Each merged row carries an `availabilityRatio = lots_available / total_lots`, which drives marker colour bands:

- `>= 0.5` → green (high availability)
- `0.1 – 0.5` → amber
- `< 0.1` → red
- `null` / `total_lots = 0` → grey

## Rate limits

Not formally published. Stay polite:

- Poll no faster than once per minute (we do 60 s).
- Cache responses (we do 30 s in-memory + 30 s edge).
- Skip rendering churn when `update_datetime` hasn't changed.

## License & attribution

Singapore Open Data License. Attribute as:

> Data from data.gov.sg, provided by HDB and the Land Transport Authority.
