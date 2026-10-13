import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { Navigation, Layers } from 'lucide-react';

interface AdventureMapViewProps {
  height?: string | number;
  showControls?: boolean;
  destination?: { lat: number; lng: number; name?: string };
  onOpenKeyModal?: () => void;
}

export default function AdventureMapView({
  height = '100%',
  showControls = true,
  destination,
  onOpenKeyModal,
}: AdventureMapViewProps) {
  const { state } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [following, setFollowing] = useState(true);
  const [tileMode, setTileMode] = useState<'dark' | 'osm'>('dark');

  const defaultLat = state.lastSample?.lat ?? 12.9716;
  const defaultLng = state.lastSample?.lng ?? 77.5946;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl =
      tileMode === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Custom motorcycle icon
    const motoIcon = L.divIcon({
      className: 'moto-gps-marker',
      html: `
        <div style="
          width: 22px;
          height: 22px;
          background: #3b82f6;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 14px rgba(59, 130, 246, 0.8);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -5px;
            left: 5px;
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-bottom: 6px solid #60a5fa;
          "></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const userMarker = L.marker([defaultLat, defaultLng], { icon: motoIcon }).addTo(map);

    mapInstanceRef.current = map;
    userMarkerRef.current = userMarker;

    // Save tileLayer reference to map
    (map as unknown as { _tileLayer: L.TileLayer })._tileLayer = tileLayer;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch Tile Mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const currentLayer = (map as unknown as { _tileLayer?: L.TileLayer })._tileLayer;
    if (currentLayer) map.removeLayer(currentLayer);

    const tileUrl =
      tileMode === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
    (map as unknown as { _tileLayer: L.TileLayer })._tileLayer = newLayer;
  }, [tileMode]);

  // Update user position
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = userMarkerRef.current;
    if (!map || !marker || !state.lastSample) return;

    const latlng: L.LatLngTuple = [state.lastSample.lat, state.lastSample.lng];
    marker.setLatLng(latlng);

    if (following) {
      map.panTo(latlng, { animate: true, duration: 0.5 });
    }
  }, [state.lastSample, following]);

  // Destination & Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (destination) {
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `
          <div style="
            background: #ef4444;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 6px;
            border-radius: 6px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            white-space: nowrap;
          ">
            🏁 ${destination.name ?? 'Destination'}
          </div>
        `,
        iconSize: [80, 24],
        iconAnchor: [40, 24],
      });

      const destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      destMarkerRef.current = destMarker;

      // Draw route line
      if (state.lastSample) {
        const poly = L.polyline(
          [
            [state.lastSample.lat, state.lastSample.lng],
            [destination.lat, destination.lng],
          ],
          {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.85,
            dashArray: '10, 8',
          }
        ).addTo(map);
        polylineRef.current = poly;

        const bounds = L.latLngBounds([
          [state.lastSample.lat, state.lastSample.lng],
          [destination.lat, destination.lng],
        ]);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [destination, state.lastSample]);

  return (
    <div style={{ position: 'relative', height, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#111' }} />


      {/* Map Controls */}
      {showControls && (
        <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => {
              setFollowing(true);
              if (state.lastSample && mapInstanceRef.current) {
                mapInstanceRef.current.panTo([state.lastSample.lat, state.lastSample.lng]);
              }
            }}
            title="Re-centre GPS"
            style={{ background: following ? 'var(--color-surface2)' : 'var(--color-surface)' }}
          >
            <Navigation size={18} color={following ? 'var(--color-accent)' : 'var(--color-text)'} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setTileMode((m) => (m === 'dark' ? 'osm' : 'dark'))}
            title="Toggle Map Style"
          >
            <Layers size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
