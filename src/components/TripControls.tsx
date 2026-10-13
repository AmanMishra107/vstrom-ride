import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { formatDistance } from '../utils/gpsUtils';
import { saveRide } from '../services/storage';
import { generateId } from '../utils/idUtils';
import type { SavedRide } from '../types';

interface TripControlsProps {
  compact?: boolean;
}

export default function TripControls({ compact = false }: TripControlsProps) {
  const { state, startTrip, pauseTrip, resumeTrip, endTrip, navigate } = useApp();
  const { activeTrip, settings } = state;
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handleEnd = async () => {
    if (!activeTrip) return;
    const now = Date.now();
    const totalMs = now - activeTrip.startTime - activeTrip.totalPausedMs;
    const movingMs = totalMs; // simplified (paused time already subtracted)

    const speedSamples = activeTrip.speedSamples;
    const avg = speedSamples.length
      ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
      : 0;

    const distKm = activeTrip.distanceMetres / 1000;
    const kmPerL = settings.motorcycleProfile.expectedMileage;
    const pricePerL = settings.motorcycleProfile.fuelPricePerLitre ?? 0;
    const fuelUsed = distKm / kmPerL;
    const fuelCost = fuelUsed * pricePerL;

    const ride: SavedRide = {
      id: generateId(),
      startTime: activeTrip.startTime,
      endTime: now,
      distance: activeTrip.distanceMetres,
      totalDurationMs: now - activeTrip.startTime,
      movingDurationMs: movingMs,
      avgMovingSpeedKph: avg,
      maxSpeedKph: activeTrip.maxSpeedKph,
      startLat: activeTrip.startLocation?.lat,
      startLng: activeTrip.startLocation?.lng,
      endLat: state.lastSample?.lat,
      endLng: state.lastSample?.lng,
      estimatedFuelUsedL: fuelUsed,
      estimatedFuelCost: fuelCost,
      synced: false,
    };

    await saveRide(ride);
    endTrip();
    setShowEndConfirm(false);
    navigate('trip');
  };

  if (!activeTrip || activeTrip.status === 'idle') {
    return (
      <button
        className="btn btn-success"
        style={{ width: '100%', fontSize: compact ? 14 : 16, minHeight: compact ? 42 : 52 }}
        onClick={startTrip}
      >
        <Play size={compact ? 16 : 20} /> Start Ride
      </button>
    );
  }

  if (showEndConfirm) {
    const dist = formatDistance(activeTrip.distanceMetres, settings.motorcycleProfile.preferredDistanceUnit);
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          End ride? Distance recorded: <strong style={{ color: 'var(--color-text)' }}>{dist}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowEndConfirm(false)}>
            Cancel
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleEnd}>
            <Square size={14} /> End & Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {activeTrip.status === 'active' ? (
        <button
          className="btn btn-warn"
          style={{ flex: 1, minHeight: compact ? 42 : 48 }}
          onClick={pauseTrip}
        >
          <Pause size={16} /> Pause
        </button>
      ) : (
        <button
          className="btn btn-success"
          style={{ flex: 1, minHeight: compact ? 42 : 48 }}
          onClick={resumeTrip}
        >
          <RotateCcw size={16} /> Resume
        </button>
      )}
      <button
        className="btn btn-danger"
        style={{ flex: 1, minHeight: compact ? 42 : 48 }}
        onClick={() => setShowEndConfirm(true)}
      >
        <Square size={16} /> End
      </button>
    </div>
  );
}
