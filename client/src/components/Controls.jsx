export default function Controls({
  onRefresh,
  lastUpdated,
  loading,
  error,
  count,
  label,
  hasData,
  stale,
}) {
  let badgeClass = 'status-badge';
  let badgeContent;

  if (error && !hasData) {
    badgeClass += ' status-badge--error';
    badgeContent = <>Error · {error}</>;
  } else if (!hasData) {
    badgeContent = <>Loading…</>;
  } else if (stale) {
    badgeClass += ' status-badge--stale';
    badgeContent = (
      <>
        <span className="live-dot" style={{ background: 'var(--stale)' }} aria-hidden="true" />
        {count.toLocaleString()} {label} · stale data
      </>
    );
  } else {
    badgeClass += ' status-badge--live';
    const time = lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
    badgeContent = (
      <>
        <span className="live-dot" aria-hidden="true" />
        {count.toLocaleString()} {label} · {time}
      </>
    );
  }

  return (
    <div className="controls">
      <span className={badgeClass} aria-live="polite">{badgeContent}</span>
      <button
        type="button"
        className="refresh-btn"
        onClick={onRefresh}
        disabled={loading}
        aria-label={`Refresh ${label} data`}
        title={`Fetch the latest ${label} data now`}
      >
        <span className={`refresh-icon${loading ? ' refresh-icon--spinning' : ''}`} aria-hidden="true">↻</span>
        {loading ? 'Refreshing…' : 'Refresh now'}
      </button>
    </div>
  );
}
