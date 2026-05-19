import { lotInfoFor } from '../lib/mergeCarparks.js';

function bandClass(ratio, total) {
  if (total <= 0 || ratio == null) return 'fill-bar--unknown';
  if (ratio >= 0.5) return 'fill-bar--high';
  if (ratio >= 0.1) return 'fill-bar--mid';
  return 'fill-bar--low';
}

const LOT_TYPE_LABELS = {
  C: 'Cars',
  H: 'Heavy vehicles',
  S: 'M/cycles + sidecar',
  Y: 'Motorcycles',
};

export default function CarparkPanel({ carpark, lotType, onClose }) {
  if (!carpark) {
    return (
      <aside className="panel panel--empty">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">🅿</span>
          <p className="empty-title">No car park selected</p>
          <p className="empty-text">Click a marker on the map or search above to view live availability.</p>
        </div>
      </aside>
    );
  }

  const updated = carpark.update_datetime ? new Date(carpark.update_datetime) : null;
  const lot = lotInfoFor(carpark, lotType);
  const ratio = lot?.availabilityRatio;
  const pct = ratio != null ? Math.round(ratio * 100) : null;
  const others = Object.entries(carpark.lot_types ?? {})
    .filter(([type, info]) => type !== lotType && info.total_lots > 0)
    .map(([type, info]) => ({ lot_type: type, ...info }));

  return (
    <aside className="panel">
      <header className="panel-header">
        <div className="panel-title-group">
          <h2 className="panel-title">{carpark.address || 'Car park'}</h2>
          <span className="panel-id">{carpark.car_park_no}</span>
        </div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close panel">
          &times;
        </button>
      </header>
      <div className="panel-body">
        <div className="availability-hero">
          <div className="availability-type">{LOT_TYPE_LABELS[lotType] ?? lotType}</div>
          {lot ? (
            <>
              <div className="availability-number">
                <span className="availability-value">{lot.lots_available.toLocaleString()}</span>
                <span className="availability-divider">/</span>
                <span className="availability-total">{lot.total_lots.toLocaleString()}</span>
              </div>
              <div className="availability-label">
                lots available {pct != null && <>· {pct}%</>}
              </div>
              {lot.total_lots > 0 && ratio != null && (
                <div className="fill-bar-track" aria-hidden="true">
                  <div
                    className={`fill-bar ${bandClass(ratio, lot.total_lots)}`}
                    style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="availability-label">
              No {LOT_TYPE_LABELS[lotType]?.toLowerCase() ?? lotType} lots at this car park.
            </div>
          )}
          <div className="availability-updated">
            {updated ? `Updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No update timestamp'}
          </div>
        </div>

        {others.length > 0 && (
          <div className="other-lots">
            <div className="other-lots-title">Other lot types</div>
            {others.map((o) => (
              <div key={o.lot_type} className="other-lot-row">
                <span className="other-lot-label">{LOT_TYPE_LABELS[o.lot_type] ?? o.lot_type}</span>
                <span className="other-lot-value">{o.lots_available} / {o.total_lots}</span>
              </div>
            ))}
          </div>
        )}

        <dl className="panel-meta">
          <dt>Type</dt>
          <dd>{carpark.car_park_type || '—'}</dd>
          <dt>Parking system</dt>
          <dd>{carpark.type_of_parking_system || '—'}</dd>
          <dt>Short-term parking</dt>
          <dd>{carpark.short_term_parking || '—'}</dd>
          <dt>Free parking</dt>
          <dd>{carpark.free_parking || '—'}</dd>
          <dt>Night parking</dt>
          <dd>{carpark.night_parking || '—'}</dd>
          <dt>Decks</dt>
          <dd>{carpark.car_park_decks ?? '—'}</dd>
          <dt>Gantry height</dt>
          <dd>{carpark.gantry_height ? `${carpark.gantry_height} m` : '—'}</dd>
          <dt>Basement</dt>
          <dd>{carpark.car_park_basement === 'Y' ? 'Yes' : carpark.car_park_basement === 'N' ? 'No' : '—'}</dd>
          <dt>Location</dt>
          <dd>{carpark.lat != null && carpark.lng != null ? `${carpark.lat.toFixed(5)}, ${carpark.lng.toFixed(5)}` : '—'}</dd>
        </dl>
      </div>
    </aside>
  );
}
