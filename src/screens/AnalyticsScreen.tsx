import { useEffect, useState } from 'react';
import { getAllRides } from '../services/storage';
import type { SavedRide } from '../types';
import { useApp } from '../context/AppContext';
import { formatDistance } from '../utils/gpsUtils';

export default function AnalyticsScreen() {
  const { state, navigate } = useApp();
  const [rides, setRides] = useState<SavedRide[]>([]);
  const unit = state.settings.motorcycleProfile.preferredDistanceUnit;

  useEffect(() => { getAllRides().then(setRides); }, []);

  if (rides.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>📊</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>No Data Yet</div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Complete rides to see analytics.</div>
        <button className="btn btn-primary" onClick={() => navigate('cockpit')}>Go Ride!</button>
      </div>
    );
  }

  const totalDist = rides.reduce((s, r) => s + r.distance, 0);
  const allSpeeds = rides.map((r) => r.maxSpeedKph);
  const maxEver = Math.max(...allSpeeds);
  const longest = rides.reduce((a, b) => a.distance > b.distance ? a : b);
  const avgDist = totalDist / rides.length;
  const avgSpeed = rides.reduce((s, r) => s + r.avgMovingSpeedKph, 0) / rides.length;
  const totalFuelCost = rides.reduce((s, r) => s + (r.estimatedFuelCost ?? 0), 0);

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Analytics</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatTile label="Total Rides" value={String(rides.length)} />
        <StatTile label="Total Distance" value={formatDistance(totalDist, unit)} />
        <StatTile label="Top Speed Ever" value={`${Math.round(maxEver)} kph`} accent="var(--color-speed)" />
        <StatTile label="Avg Speed" value={`${Math.round(avgSpeed)} kph`} accent="var(--color-nav-blue)" />
        <StatTile label="Avg Ride Dist" value={formatDistance(avgDist, unit)} />
        <StatTile label="Longest Ride" value={formatDistance(longest.distance, unit)} accent="var(--color-success)" />
        {totalFuelCost > 0 && (
          <StatTile label="Est. Fuel Cost" value={`₹${Math.round(totalFuelCost)}`} accent="var(--color-warn)" />
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>RECENT SPEEDS</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
          {rides.slice(0, 14).reverse().map((r, i) => {
            const pct = maxEver > 0 ? (r.maxSpeedKph / maxEver) : 0;
            return (
              <div key={i} style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(pct * 100, 8)}%`,
                  background: `hsl(${220 + pct * 60}, 80%, 60%)`,
                  borderRadius: '3px 3px 0 0',
                }} title={`${Math.round(r.maxSpeedKph)} kph`} />
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 4 }}>Max speed per ride (last 14)</div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="metric-tile" style={{ padding: 14 }}>
      <span className="metric-label">{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: accent ?? 'var(--color-text)', lineHeight: 1, marginTop: 4 }}>
        {value}
      </span>
    </div>
  );
}
