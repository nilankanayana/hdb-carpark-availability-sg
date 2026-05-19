const TYPES = [
  { id: 'C', label: 'Cars' },
  { id: 'Y', label: 'Motorcycles' },
  { id: 'H', label: 'Heavy' },
  { id: 'S', label: 'M/cycle + sidecar' },
];

export default function LotTypeSelector({ value, onChange, counts }) {
  return (
    <div className="lot-type-selector" role="tablist" aria-label="Lot type">
      {TYPES.map((t) => {
        const count = counts?.[t.id] ?? 0;
        const disabled = count === 0;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={value === t.id}
            disabled={disabled}
            className={`lot-type-chip${value === t.id ? ' lot-type-chip--active' : ''}`}
            onClick={() => onChange(t.id)}
            title={`${t.label} · ${count.toLocaleString()} car parks`}
          >
            <span className="lot-type-label">{t.label}</span>
            <span className="lot-type-count">{count.toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
}
