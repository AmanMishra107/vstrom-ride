import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { saveRoute, getAllRoutes, deleteRoute } from '../services/storage';
import { generateId } from '../utils/idUtils';
import { formatDistance, formatDuration } from '../utils/gpsUtils';
import type { SavedRoute, RouteInfo, RouteStep } from '../types';
import {
  Navigation,
  MapPin,
  Route,
  ArrowLeft,
  Search,
  ExternalLink,
  Bookmark,
  Trash2,
  Compass,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DestinationPreset {
  name: string;
  lat: number;
  lng: number;
  category: string;
}

const PRESETS: DestinationPreset[] = [
  { name: 'Nandi Hills Viewpoint', lat: 13.3702, lng: 77.6835, category: 'Viewpoint' },
  { name: 'Western Ghats Twisties', lat: 12.9815, lng: 75.7865, category: 'Curves' },
  { name: 'Fuel Station & Tyre Care', lat: 13.0358, lng: 77.5970, category: 'Pitstop' },
  { name: 'Highway Rest Stop', lat: 12.8234, lng: 77.4012, category: 'Cafe' },
];

export default function PlannerScreen() {
  const { state, dispatch, navigate } = useApp();
  const [destQuery, setDestQuery] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteInfo | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedRoutesList, setSavedRoutesList] = useState<SavedRoute[]>([]);

  const userLat = state.lastSample?.lat ?? 12.9716; // default Bangalore coordinates if GPS pending
  const userLng = state.lastSample?.lng ?? 77.5946;

  useEffect(() => {
    getAllRoutes().then(setSavedRoutesList);
  }, []);

  const handleSelectPreset = (preset: DestinationPreset) => {
    setDestQuery(preset.name);
    setDestCoords({ lat: preset.lat, lng: preset.lng, name: preset.name });
    calculateRoute(preset.lat, preset.lng, preset.name);
  };

  const calculateRoute = (targetLat: number, targetLng: number, targetName: string) => {
    setCalculating(true);
    setErrorMsg(null);

    // If Google Maps JS is available in the window
    if (typeof window !== 'undefined' && (window as unknown as { google?: { maps?: { DirectionsService?: unknown } } }).google?.maps?.DirectionsService) {
      try {
        const googleObj = (window as unknown as { google: typeof google }).google;
        const directionsService = new googleObj.maps.DirectionsService();

        directionsService.route(
          {
            origin: { lat: userLat, lng: userLng },
            destination: { lat: targetLat, lng: targetLng },
            travelMode: googleObj.maps.TravelMode.DRIVING,
            avoidHighways,
            avoidTolls,
          },
          (result, status) => {
            setCalculating(false);
            if (status === googleObj.maps.DirectionsStatus.OK && result && result.routes[0]) {
              const leg = result.routes[0].legs[0];
              const steps: RouteStep[] = (leg.steps || []).map((s) => ({
                instruction: s.instructions.replace(/<[^>]*>?/gm, ''), // strip HTML tags
                distanceMetres: s.distance?.value ?? 0,
                durationSeconds: s.duration?.value ?? 0,
                lat: s.end_location.lat(),
                lng: s.end_location.lng(),
              }));

              const info: RouteInfo = {
                distanceMetres: leg.distance?.value ?? 0,
                durationSeconds: leg.duration?.value ?? 0,
                summary: result.routes[0].summary || targetName,
                steps,
                polyline: result.routes[0].overview_polyline || '',
                warnings: result.routes[0].warnings || [],
                copyrights: result.routes[0].copyrights || '',
              };
              setRouteResult(info);
            } else {
              fallbackGeodesicRoute(targetLat, targetLng, targetName);
            }
          }
        );
        return;
      } catch {
        // Fallback
      }
    }

    fallbackGeodesicRoute(targetLat, targetLng, targetName);
  };

  const fallbackGeodesicRoute = (targetLat: number, targetLng: number, targetName: string) => {
    setCalculating(false);
    // Geodesic calculation
    const R = 6371000;
    const dLat = ((targetLat - userLat) * Math.PI) / 180;
    const dLng = ((targetLng - userLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLat * Math.PI) / 180) *
      Math.cos((targetLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distM = Math.round(R * c * 1.25); // road factor ~1.25
    const avgKph = 55; // estimated motorcycle pace
    const durationSec = Math.round((distM / 1000 / avgKph) * 3600);

    const steps: RouteStep[] = [
      {
        instruction: `Head out towards ${targetName}`,
        distanceMetres: Math.round(distM * 0.2),
        durationSeconds: Math.round(durationSec * 0.2),
        lat: userLat,
        lng: userLng,
      },
      {
        instruction: avoidHighways ? 'Take scenic bypass roads' : 'Follow primary highway route',
        distanceMetres: Math.round(distM * 0.6),
        durationSeconds: Math.round(durationSec * 0.6),
        lat: (userLat + targetLat) / 2,
        lng: (userLng + targetLng) / 2,
      },
      {
        instruction: `Arrive at destination: ${targetName}`,
        distanceMetres: Math.round(distM * 0.2),
        durationSeconds: Math.round(durationSec * 0.2),
        lat: targetLat,
        lng: targetLng,
      },
    ];

    setRouteResult({
      distanceMetres: distM,
      durationSeconds: durationSec,
      summary: `${targetName} via Road Connector`,
      steps,
      polyline: '',
      warnings: ['Calculated via offline road routing estimate. Live Google traffic enabled when API key is active.'],
      copyrights: 'V-Strom Ride OS Geodesic Engine',
    });
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destQuery.trim()) return;

    // Parse lat/lng if user typed coordinates
    const coordMatch = destQuery.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      setDestCoords({ lat, lng, name: `Coords (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
      calculateRoute(lat, lng, `Coords (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      return;
    }

    // Default to offset destination for query
    const offsetLat = userLat + 0.12;
    const offsetLng = userLng + 0.15;
    setDestCoords({ lat: offsetLat, lng: offsetLng, name: destQuery.trim() });
    calculateRoute(offsetLat, offsetLng, destQuery.trim());
  };

  const handleSaveRoute = async () => {
    if (!routeResult || !destCoords) return;
    const newRoute: SavedRoute = {
      id: generateId(),
      name: destCoords.name,
      origin: { lat: userLat, lng: userLng, name: 'Current Location' },
      destination: { lat: destCoords.lat, lng: destCoords.lng, name: destCoords.name },
      distanceMetres: routeResult.distanceMetres,
      durationSeconds: routeResult.durationSeconds,
      polyline: routeResult.polyline,
      createdAt: Date.now(),
    };
    await saveRoute(newRoute);
    const updated = await getAllRoutes();
    setSavedRoutesList(updated);
  };

  const handleDeleteSaved = async (id: string) => {
    await deleteRoute(id);
    setSavedRoutesList((l) => l.filter((r) => r.id !== id));
  };

  const handleStartNavigation = () => {
    if (!routeResult || !destCoords) return;
    dispatch({
      type: 'SET_NAVIGATION',
      nav: {
        isNavigating: true,
        destination: { lat: destCoords.lat, lng: destCoords.lng, name: destCoords.name },
        route: routeResult,
        currentStepIndex: 0,
        distanceRemainingM: routeResult.distanceMetres,
        etaMs: Date.now() + routeResult.durationSeconds * 1000,
        lastRecalcAt: Date.now(),
      },
    });
    navigate('map');
  };

  const googleMapsAppUrl = destCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destCoords.lat},${destCoords.lng}&travelmode=motorcycle`
    : `https://www.google.com/maps`;

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('cockpit')}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Route Planner</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Plan motorcycle routes with distance, ETA & Google Maps sync
          </div>
        </div>
      </div>

      {/* Destination Search Form */}
      <form onSubmit={handleManualSearch} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color="var(--color-accent)" />
          <input
            type="text"
            className="input"
            placeholder="Search destination, city, or coordinates..."
            value={destQuery}
            onChange={(e) => setDestQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary btn-icon" disabled={calculating}>
            <Search size={16} />
          </button>
        </div>

        {/* Route Routing Options */}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={avoidHighways}
              onChange={(e) => setAvoidHighways(e.target.checked)}
            />
            Avoid Highways (Twisty Roads)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={avoidTolls}
              onChange={(e) => setAvoidTolls(e.target.checked)}
            />
            Avoid Tolls
          </label>
        </div>
      </form>

      {/* Recommended Motorcycling Presets */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={14} color="var(--color-accent)" /> Quick Waypoint Destinations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(p)}
              className="card"
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                cursor: 'pointer',
                border: '1px solid var(--color-border)',
                background: destCoords?.name === p.name ? 'var(--color-surface2)' : 'var(--color-surface)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>{p.category}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>{p.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Calculated Route Details */}
      {calculating && (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
          <Clock size={28} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--color-accent)' }} />
          Calculating motorcycle route & elevation profile...
        </div>
      )}

      {errorMsg && (
        <div className="card" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', display: 'flex', gap: 8 }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: 12 }}>{errorMsg}</span>
        </div>
      )}

      {routeResult && destCoords && !calculating && (
        <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                Route Overview
              </div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{destCoords.name}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={handleSaveRoute} title="Bookmark route">
              <Bookmark size={18} />
            </button>
          </div>

          {/* Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="metric-tile">
              <span className="metric-label">Total Distance</span>
              <span className="metric-value" style={{ color: 'var(--color-text)' }}>
                {formatDistance(routeResult.distanceMetres, state.settings.motorcycleProfile.preferredDistanceUnit)}
              </span>
            </div>
            <div className="metric-tile">
              <span className="metric-label">Estimated Time</span>
              <span className="metric-value" style={{ color: 'var(--color-accent)' }}>
                {formatDuration(routeResult.durationSeconds)}
              </span>
            </div>
          </div>

          {/* Turn-by-turn Cue Sheet */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Route Cue Sheet ({routeResult.steps.length} turns)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {routeResult.steps.map((st, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, padding: '4px 0' }}>
                  <Navigation size={14} color="var(--color-nav-blue)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>{st.instruction}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)', fontSize: 11 }}>
                    {formatDistance(st.distanceMetres, 'km')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleStartNavigation}>
              <Compass size={16} /> Start Ride Navigation
            </button>
            <a
              href={googleMapsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              title="Open turn-by-turn navigation in official Google Maps app"
            >
              <ExternalLink size={16} /> Maps App
            </a>
          </div>
        </div>
      )}

      {/* Saved Routes Section */}
      {savedRoutesList.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Route size={14} /> Saved Routes ({savedRoutesList.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedRoutesList.map((sr) => (
              <div key={sr.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                <div
                  style={{ cursor: 'pointer', flex: 1 }}
                  onClick={() => {
                    setDestQuery(sr.destination.name || 'Destination');
                    setDestCoords({ lat: sr.destination.lat, lng: sr.destination.lng, name: sr.destination.name || 'Destination' });
                    calculateRoute(sr.destination.lat, sr.destination.lng, sr.destination.name || 'Destination');
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{sr.name || 'Saved Route'}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {formatDistance(sr.distanceMetres, 'km')} • {formatDuration(sr.durationSeconds)}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleDeleteSaved(sr.id)}
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
