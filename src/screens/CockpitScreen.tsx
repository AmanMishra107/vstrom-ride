import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Speedometer from '../components/Speedometer';
import MapView from '../components/MapView';
import TripControls from '../components/TripControls';
import QuickActions from '../components/QuickActions';
import { formatDurationMs, formatDistance } from '../utils/gpsUtils';

export default function CockpitScreen() {
  const { state } = useApp();
  const { activeTrip, currentSpeedKph, speedSource, settings } = state;
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight
  );

  useEffect(() => {
    const handler = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  const avgSpeed =
    activeTrip && activeTrip.speedSamples.length > 0
      ? activeTrip.speedSamples.reduce((a, b) => a + b, 0) / activeTrip.speedSamples.length
      : 0;

  const elapsedMs = activeTrip
    ? Date.now() - activeTrip.startTime - activeTrip.totalPausedMs
    : 0;

  if (isLandscape) {
    return <LandscapeCockpit />;
  }

  return (
    <div className="scrollable" style={{ height: '100%', padding: '8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Speedometer */}
      <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '12px 8px' }}>
        <Speedometer
          speedKph={currentSpeedKph}
          unit={settings.speedUnit}
          warnThreshold={settings.speedWarnThreshold}
          maxSpeedKph={activeTrip?.maxSpeedKph ?? 0}
          avgSpeedKph={avgSpeed}
          isReliable={speedSource !== 'unavailable' && state.gpsStatus === 'active'}
        />
      </div>

      {/* Map */}
      <div className="map-container" style={{ height: 200, flexShrink: 0 }}>
        <MapView height={200} showControls={false} isFullScreen={false} />
      </div>

      {/* Trip metrics */}
      {activeTrip ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <MetricTile label="Distance" value={formatDistance(activeTrip.distanceMetres, settings.motorcycleProfile.preferredDistanceUnit)} />
          <MetricTile label="Duration" value={formatDurationMs(elapsedMs)} />
          <MetricTile label="Max Speed" value={`${Math.round(activeTrip.maxSpeedKph)} ${settings.speedUnit}`} color="var(--color-speed)" />
          <MetricTile label="Avg Speed" value={`${Math.round(avgSpeed)} ${settings.speedUnit}`} color="var(--color-nav-blue)" />
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '12px', color: 'var(--color-text-muted)', fontSize: 13 }}>
          No active trip — tap <strong style={{ color: 'var(--color-accent)' }}>Start Ride</strong> to begin recording
        </div>
      )}

      {/* Trip Controls */}
      <TripControls />

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}

function MetricTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="metric-tile">
      <span className="metric-label">{label}</span>
      <span className="metric-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function LandscapeCockpit() {
  const { state } = useApp();
  const { activeTrip, currentSpeedKph, speedSource, settings } = state;

  const avgSpeed =
    activeTrip && activeTrip.speedSamples.length > 0
      ? activeTrip.speedSamples.reduce((a, b) => a + b, 0) / activeTrip.speedSamples.length
      : 0;

  const elapsedMs = activeTrip
    ? Date.now() - activeTrip.startTime - activeTrip.totalPausedMs
    : 0;

  return (
    <div style={{ display: 'flex', height: '100%', gap: 8, padding: 8 }}>
      {/* Left: Speedometer */}
      <div className="card" style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }}>
        <Speedometer
          speedKph={currentSpeedKph}
          unit={settings.speedUnit}
          warnThreshold={settings.speedWarnThreshold}
          maxSpeedKph={activeTrip?.maxSpeedKph ?? 0}
          avgSpeedKph={avgSpeed}
          isReliable={speedSource !== 'unavailable' && state.gpsStatus === 'active'}
        />
        <TripControls compact />
      </div>

      {/* Center: Map */}
      <div className="map-container" style={{ flex: 1 }}>
        <MapView height="100%" showControls isFullScreen={false} />
      </div>

      {/* Right: Trip info & Quick Actions */}
      <div
        className="scrollable"
        style={{
          width: 230,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
        }}
      >
        {activeTrip ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div className="metric-tile">
              <span className="metric-label">Distance</span>
              <span className="metric-value" style={{ fontSize: 13 }}>
                {formatDistance(activeTrip.distanceMetres, settings.motorcycleProfile.preferredDistanceUnit)}
              </span>
            </div>
            <div className="metric-tile">
              <span className="metric-label">Duration</span>
              <span className="metric-value" style={{ fontSize: 13 }}>
                {formatDurationMs(elapsedMs)}
              </span>
            </div>
            <div className="metric-tile">
              <span className="metric-label">Max</span>
              <span className="metric-value" style={{ fontSize: 13, color: 'var(--color-speed)' }}>
                {Math.round(activeTrip.maxSpeedKph)} {settings.speedUnit}
              </span>
            </div>
            <div className="metric-tile">
              <span className="metric-label">Avg</span>
              <span className="metric-value" style={{ fontSize: 13, color: 'var(--color-nav-blue)' }}>
                {Math.round(avgSpeed)} {settings.speedUnit}
              </span>
            </div>
          </div>
        ) : (
          <div className="card" style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px 6px' }}>
            No active trip
          </div>
        )}

        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-text-dim)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Quick Actions
          </div>
          <QuickActions columns={2} />
        </div>
      </div>
    </div>
  );
}
