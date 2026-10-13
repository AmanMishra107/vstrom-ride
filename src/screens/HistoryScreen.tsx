import { useEffect, useState } from 'react';
import { getAllRides, deleteRide } from '../services/storage';
import type { SavedRide } from '../types';
import { useApp } from '../context/AppContext';
import { formatDistance, formatDurationMs } from '../utils/gpsUtils';
import { Trash2 } from 'lucide-react';

export default function HistoryScreen() {
  const { state } = useApp();
  const [rides, setRides] = useState<SavedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const unit = state.settings.motorcycleProfile.preferredDistanceUnit;

  useEffect(() => {
    getAllRides().then((r) => { setRides(r); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ride?')) return;
    await deleteRide(id);
    setRides((r) => r.filter((x) => x.id !== id));
  };

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading rides…</div>;
  }

  if (rides.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <div style={{ fontSize: 40 }}>🏍️</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>No Rides Yet</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14, textAlign: 'center' }}>
          Complete your first ride to see it here.
        </div>
      </div>
    );
  }

  const totalDist = rides.reduce((s, r) => s + r.distance, 0);
  const totalTime = rides.reduce((s, r) => s + r.movingDurationMs, 0);

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Ride History</div>

      {/* Summary banner */}
      <div className="card" style={{ background: 'var(--color-surface2)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="metric-label">Rides</div>
          <div className="metric-value" style={{ fontSize: 20 }}>{rides.length}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="metric-label">Total Dist</div>
          <div className="metric-value" style={{ fontSize: 20 }}>{formatDistance(totalDist, unit)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="metric-label">Total Time</div>
          <div className="metric-value" style={{ fontSize: 20 }}>{formatDurationMs(totalTime)}</div>
        </div>
      </div>

      {/* Ride list */}
      {rides.map((ride) => (
        <RideCard key={ride.id} ride={ride} unit={unit} onDelete={handleDelete} />
      ))}
    </div>
  );
}

function RideCard({ ride, unit, onDelete }: { ride: SavedRide; unit: 'km' | 'miles'; onDelete: (id: string) => void }) {
  const date = new Date(ride.startTime);
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>
          {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          &nbsp;·&nbsp;
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            📏 {formatDistance(ride.distance, unit)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            ⏱ {formatDurationMs(ride.movingDurationMs)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-speed)' }}>
            ↑ {Math.round(ride.maxSpeedKph)} kph
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(ride.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 8 }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
