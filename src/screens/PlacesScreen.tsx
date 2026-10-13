import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAllPlaces, savePlace, deletePlace } from '../services/storage';
import type { SavedPlace } from '../types';
import { MapPin, Plus, Trash2, Home, Briefcase, Fuel, Coffee } from 'lucide-react';
import { generateId } from '../utils/idUtils';

import ModuleHeader from '../components/ModuleHeader';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  home:   <Home size={16} />,
  work:   <Briefcase size={16} />,
  fuel:   <Fuel size={16} />,
  food:   <Coffee size={16} />,
  custom: <MapPin size={16} />,
};

export default function PlacesScreen() {
  const { state } = useApp();
  const [places, setPlaces] = useState<SavedPlace[]>([]);

  useEffect(() => { getAllPlaces().then(setPlaces); }, []);

  const handleDelete = async (id: string) => {
    await deletePlace(id);
    setPlaces((p) => p.filter((x) => x.id !== id));
  };

  const handleAddCurrent = async () => {
    if (!state.lastSample) return;
    const place: SavedPlace = {
      id: generateId(),
      name: `Place ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      lat: state.lastSample.lat,
      lng: state.lastSample.lng,
      category: 'custom',
      visitCount: 0,
      createdAt: Date.now(),
    };
    await savePlace(place);
    setPlaces((p) => [place, ...p]);
  };

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ModuleHeader
        title="Saved Places"
        subtitle="Waypoints, pitstops & favorite locations"
        fallbackScreen="cockpit"
        rightAction={
          <button
            className="btn btn-primary btn-icon"
            onClick={handleAddCurrent}
            disabled={!state.lastSample}
            title="Save current location"
          >
            <Plus size={18} />
          </button>
        }
      />

      {!state.lastSample && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          GPS active location required to save current position.
        </div>
      )}

      {places.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <MapPin size={36} color="var(--color-text-dim)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600 }}>No Saved Places</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Tap + to save your current GPS location.
          </div>
        </div>
      ) : (
        places.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: 'var(--color-accent)', flexShrink: 0 }}>
              {CATEGORY_ICONS[p.category] ?? <MapPin size={16} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
                {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              </div>
              {p.address && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.address}</div>}
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-accent)', padding: 8, display: 'flex' }}
              title="Open in Google Maps"
            >
              <MapPin size={16} />
            </a>
            <button
              onClick={() => handleDelete(p.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 8 }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textAlign: 'center', padding: '4px 0' }}>
        Full route planning with Google Maps directions is available by opening locations in the Maps app.
      </div>
    </div>
  );
}

import type React from 'react';
