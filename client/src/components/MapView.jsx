import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { lotInfoFor } from '../lib/mergeCarparks.js';
import MapLegend from './MapLegend.jsx';

const DEFAULT_CENTER = [1.3521, 103.8198];
const DEFAULT_ZOOM = 12;
const FOCUS_ZOOM = 17;
const NEAR_ME_ZOOM = 15;

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const LOCATE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>' +
  '<line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>' +
  '<line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>' +
  '</svg>';

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: '<span class="user-location-pulse"></span><span class="user-location-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function availabilityClass(ratio, totalLots) {
  if (totalLots <= 0 || ratio == null) return 'carpark-marker--unknown';
  if (ratio >= 0.5) return 'carpark-marker--high';
  if (ratio >= 0.1) return 'carpark-marker--mid';
  return 'carpark-marker--low';
}

function makeIcon(lot, selected) {
  const cls = availabilityClass(lot?.availabilityRatio, lot?.total_lots ?? 0);
  const sizeCls = selected ? 'carpark-marker--selected' : '';
  const label = lot?.lots_available != null ? lot.lots_available : '?';
  return L.divIcon({
    className: `carpark-marker ${cls} ${sizeCls}`.trim(),
    html: `<span class="carpark-marker-label">${label}</span>`,
    iconSize: selected ? [40, 40] : [32, 32],
    iconAnchor: selected ? [20, 20] : [16, 16],
  });
}

export default function MapView({ carparks, lotType, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
    }).addTo(map);
    mapRef.current = map;

    clusterRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 60,
      disableClusteringAtZoom: 16,
    });
    clusterRef.current.addTo(map);

    const HomeControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const el = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-home-control');
        el.innerHTML =
          '<a href="#" role="button" title="Reset view" aria-label="Reset map to Singapore overview">⌂</a>';
        L.DomEvent.disableClickPropagation(el);
        L.DomEvent.on(el, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.6 });
        });
        return el;
      },
    });
    new HomeControl().addTo(map);

    const NearMeControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const el = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-nearme-control');
        const a = L.DomUtil.create('a', '', el);
        a.href = '#';
        a.title = 'Show my location';
        a.setAttribute('role', 'button');
        a.setAttribute('aria-label', 'Show my location and zoom to nearby car parks');
        a.innerHTML = LOCATE_ICON_SVG;
        L.DomEvent.disableClickPropagation(el);
        L.DomEvent.on(el, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          if (a.classList.contains('is-loading')) return;
          if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
          }
          a.classList.add('is-loading');
          setLocationError(null);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latlng = [pos.coords.latitude, pos.coords.longitude];
              if (userMarkerRef.current) {
                userMarkerRef.current.setLatLng(latlng);
              } else {
                userMarkerRef.current = L.marker(latlng, {
                  icon: userLocationIcon,
                  interactive: false,
                  keyboard: false,
                  zIndexOffset: 1000,
                }).addTo(map);
              }
              map.flyTo(latlng, NEAR_ME_ZOOM, { duration: 0.8 });
              a.classList.remove('is-loading');
            },
            (err) => {
              let msg = 'Unable to get your location.';
              if (err.code === err.PERMISSION_DENIED) msg = 'Location permission denied.';
              else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location is currently unavailable.';
              else if (err.code === err.TIMEOUT) msg = 'Location request timed out.';
              setLocationError(msg);
              a.classList.remove('is-loading');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        });
        return el;
      },
    });
    new NearMeControl().addTo(map);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
    };
  }, []);

  // Sync markers with the carparks list + active lot type
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    const existing = markersRef.current;
    const seen = new Set();
    const toAdd = [];

    for (const c of carparks) {
      if (c.lat == null || c.lng == null) continue;
      const lot = lotInfoFor(c, lotType);
      if (!lot) continue;
      seen.add(c.car_park_no);
      let marker = existing.get(c.car_park_no);
      const isSelected = c.car_park_no === selectedId;
      if (!marker) {
        marker = L.marker([c.lat, c.lng], { icon: makeIcon(lot, isSelected) });
        marker.bindTooltip(c.address || c.car_park_no, { direction: 'top', offset: [0, -10] });
        marker.on('click', () => onSelect(c.car_park_no));
        marker.carparkData = c;
        existing.set(c.car_park_no, marker);
        toAdd.push(marker);
      } else {
        marker.setLatLng([c.lat, c.lng]);
        marker.setIcon(makeIcon(lot, isSelected));
        marker.carparkData = c;
      }
    }

    if (toAdd.length) cluster.addLayers(toAdd);

    const toRemove = [];
    for (const [id, marker] of existing) {
      if (!seen.has(id)) {
        toRemove.push(marker);
        existing.delete(id);
      }
    }
    if (toRemove.length) cluster.removeLayers(toRemove);
  }, [carparks, lotType, onSelect, selectedId]);

  // Fly to selected when it changes
  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster || !selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (marker?.carparkData) {
      const { lat, lng } = marker.carparkData;
      map.flyTo([lat, lng], FOCUS_ZOOM, { duration: 0.6 });
      setTimeout(() => {
        if (cluster.hasLayer(marker)) marker.openTooltip();
      }, 700);
    }
  }, [selectedId]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      <MapLegend />
      {locationError && (
        <div className="map-toast" role="alert">
          <span>{locationError}</span>
          <button
            type="button"
            className="map-toast-close"
            onClick={() => setLocationError(null)}
            aria-label="Dismiss location error"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
