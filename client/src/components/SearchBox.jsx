import { useEffect, useRef, useState } from 'react';
import { searchCarparks } from '../lib/searchCarparks.js';
import { lotInfoFor } from '../lib/mergeCarparks.js';

function availabilityBadgeClass(ratio, total) {
  if (total <= 0 || ratio == null) return 'result-badge result-badge--unknown';
  if (ratio >= 0.5) return 'result-badge result-badge--high';
  if (ratio >= 0.1) return 'result-badge result-badge--mid';
  return 'result-badge result-badge--low';
}

export default function SearchBox({ carparks, lotType, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const results = query ? searchCarparks(query, carparks) : [];

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function commit(carpark) {
    onSelect(carpark.car_park_no);
    setQuery(carpark.address || carpark.car_park_no);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
    }
  }

  return (
    <div className="search-box" ref={wrapperRef}>
      <div className="search-input-wrapper">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          className="search-input"
          placeholder="Search by road, building or carpark number…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            onClick={() => { setQuery(''); setOpen(false); }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {open && query && (
        <div className="search-results" role="listbox">
          {results.length === 0 ? (
            <div className="search-empty">No car parks match "{query}".</div>
          ) : (
            results.map((c, idx) => {
              const lot = lotInfoFor(c, lotType);
              return (
                <button
                  key={c.car_park_no}
                  type="button"
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={`search-result${idx === activeIdx ? ' search-result--active' : ''}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => commit(c)}
                >
                  <div className="result-main">
                    <span className="result-address">{c.address || '(no address)'}</span>
                    <span className="result-id">{c.car_park_no}</span>
                  </div>
                  <span className={availabilityBadgeClass(lot?.availabilityRatio, lot?.total_lots ?? 0)}>
                    {lot && lot.total_lots > 0 ? `${lot.lots_available} / ${lot.total_lots}` : '— / —'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
