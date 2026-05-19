import { useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import CarparkPanel from './components/CarparkPanel.jsx';
import SearchBox from './components/SearchBox.jsx';
import Controls from './components/Controls.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import LotTypeSelector from './components/LotTypeSelector.jsx';
import { useCarparks } from './hooks/useCarparks.js';
import { useTheme } from './hooks/useTheme.js';
import { mergeCarparks } from './lib/mergeCarparks.js';

const REFRESH_MS = 60_000;
const DEFAULT_LOT_TYPE = 'C';

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const live = useCarparks(REFRESH_MS);
  const [lotType, setLotType] = useState(DEFAULT_LOT_TYPE);
  const [selectedId, setSelectedId] = useState(null);

  const merged = useMemo(
    () => mergeCarparks(live.data?.carparks ?? []),
    [live.data]
  );

  // Carparks that have the currently-selected lot type
  const filtered = useMemo(
    () => merged.filter((c) => c.lot_types?.[lotType]),
    [merged, lotType]
  );

  // Per-lot-type counts for the selector chips
  const lotTypeCounts = useMemo(() => {
    const counts = { C: 0, H: 0, Y: 0, S: 0 };
    for (const c of merged) {
      for (const key of Object.keys(c.lot_types ?? {})) {
        if (key in counts) counts[key] += 1;
      }
    }
    return counts;
  }, [merged]);

  const selected = useMemo(
    () => (selectedId ? merged.find((c) => c.car_park_no === selectedId) ?? null : null),
    [merged, selectedId]
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">🅿</span>
          <div className="brand-text">
            <h1 className="brand-title">Singapore HDB Car Parks</h1>
            <span className="brand-subtitle">Live availability · LTA / HDB feeds</span>
          </div>
        </div>
        <div className="header-actions">
          <Controls
            onRefresh={live.refresh}
            lastUpdated={live.lastUpdated}
            loading={live.loading}
            error={live.error}
            count={filtered.length}
            label="car parks"
            hasData={!!live.data}
            stale={live.data?.stale}
          />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      <main className="app-main">
        <section className="map-card">
          <LotTypeSelector value={lotType} onChange={setLotType} counts={lotTypeCounts} />
          <MapView
            carparks={filtered}
            lotType={lotType}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>
        <section className="side-column">
          <SearchBox carparks={filtered} lotType={lotType} onSelect={setSelectedId} />
          <CarparkPanel carpark={selected} lotType={lotType} onClose={() => setSelectedId(null)} />
        </section>
      </main>
      <footer className="app-footer">
        <span>
          Data from <a href="https://data.gov.sg" target="_blank" rel="noreferrer">data.gov.sg</a>,
          provided by HDB and the Land Transport Authority.
        </span>
        <span>
          Made by Nilanka with <a href="https://claude.com/claude-code" target="_blank" rel="noreferrer">Claude Code</a> — 2026 May
        </span>
      </footer>
    </div>
  );
}
