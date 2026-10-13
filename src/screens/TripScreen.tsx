import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDurationMs, formatDistance } from '../utils/gpsUtils';
import { ArrowLeft } from 'lucide-react';

export default function TripScreen() {
  const { state, navigate } = useApp();
  const { activeTrip, settings } = state;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      if (activeTrip?.status === 'active') {
        setElapsed(Date.now() - activeTrip.startTime - activeTrip.totalPausedMs);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [activeTrip]);

  const unit = settings.motorcycleProfile.preferredDistanceUnit;
  const speedUnit = settings.speedUnit;

  if (!activeTrip) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <div style={{ fontSize: 36 }}>🏍️</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>No Active Trip</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14, textAlign: 'center' }}>
          Go back to the cockpit and press <strong>Start Ride</strong> to begin a trip.
        </div>
        <button className="btn btn-primary" onClick={() => navigate('cockpit')}>Go to Cockpit</button>
      </div>
    );
  }

  const avg =
    activeTrip.speedSamples.length > 0
      ? activeTrip.speedSamples.reduce((a, b) => a + b, 0) / activeTrip.speedSamples.length
      : 0;

  const distKm = activeTrip.distanceMetres / 1000;
  const kmPerL = settings.motorcycleProfile.expectedMileage;
  const pricePerL = settings.motorcycleProfile.fuelPricePerLitre ?? 0;
  const fuelUsed = distKm / kmPerL;
  const fuelCost = fuelUsed * pricePerL;

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('cockpit')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Current Trip</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {activeTrip.status === 'active' ? '🟢 Recording' : '🟡 Paused'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <BigMetric label="Distance" value={formatDistance(activeTrip.distanceMetres, unit)} />
        <BigMetric label="Duration" value={formatDurationMs(elapsed)} />
        <BigMetric label="Max Speed" value={`${Math.round(activeTrip.maxSpeedKph)} ${speedUnit}`} accent="var(--color-speed)" />
        <BigMetric label="Avg Speed" value={`${Math.round(avg)} ${speedUnit}`} accent="var(--color-nav-blue)" />
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--color-text-muted)' }}>
          ESTIMATED FUEL (based on {kmPerL} km/L config)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div className="metric-label">Used (est.)</div>
            <div className="metric-value" style={{ fontSize: 18, color: 'var(--color-warn)' }}>{fuelUsed.toFixed(2)} L</div>
          </div>
          {pricePerL > 0 && (
            <div>
              <div className="metric-label">Cost (est.)</div>
              <div className="metric-value" style={{ fontSize: 18 }}>₹{fuelCost.toFixed(0)}</div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 6 }}>
          ⚠ GPS-estimated figures only. Configure actual mileage in Settings.
        </div>
      </div>

      <div className="card">
        <div className="metric-label" style={{ marginBottom: 6 }}>Started at</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          {new Date(activeTrip.startTime).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function BigMetric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="metric-tile" style={{ padding: 14 }}>
      <span className="metric-label">{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: accent ?? 'var(--color-text)', lineHeight: 1, marginTop: 4 }}>
        {value}
      </span>
    </div>
  );
}
