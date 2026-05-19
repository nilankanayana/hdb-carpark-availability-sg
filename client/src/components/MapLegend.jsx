const ITEMS = [
  { cls: 'legend-dot--high', label: '≥ 50% free' },
  { cls: 'legend-dot--mid', label: '10 – 50%' },
  { cls: 'legend-dot--low', label: '< 10%' },
  { cls: 'legend-dot--unknown', label: 'No data' },
];

export default function MapLegend() {
  return (
    <div className="map-legend" aria-label="Availability legend">
      <span className="map-legend-title">Availability</span>
      {ITEMS.map((it) => (
        <span key={it.label} className="map-legend-item">
          <span className={`map-legend-dot ${it.cls}`} aria-hidden="true" />
          <span>{it.label}</span>
        </span>
      ))}
    </div>
  );
}
