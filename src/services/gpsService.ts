// ============================================================
// GPS Service — watchPosition, validation, trip accumulation
// ============================================================

import {
  haversineDistance,
  mpsToKph,
  validateCoords,
  checkJumpPlausibility,
} from '../utils/gpsUtils';
import type { GpsSample, GpsStatus } from '../types';

export type GpsCallback = (sample: GpsSample) => void;
export type StatusCallback = (status: GpsStatus) => void;

interface GpsServiceOptions {
  accuracyThreshold?: number;         // metres; flag if above
  maxJumpKph?: number;                // reject if above
  onSample?: GpsCallback;
  onStatus?: StatusCallback;
  onError?: (msg: string) => void;
}

class GpsService {
  private watchId: number | null = null;
  private lastAccepted: GpsSample | null = null;
  private status: GpsStatus = 'idle';
  private options: GpsServiceOptions = {};
  private tripId: string | null = null;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly STALE_TIMEOUT_MS = 8000;

  configure(opts: GpsServiceOptions): void {
    this.options = opts;
  }

  setTripId(id: string | null): void {
    this.tripId = id;
  }

  getStatus(): GpsStatus {
    return this.status;
  }

  start(): void {
    if (!navigator.geolocation) {
      this.setStatus('unavailable');
      this.options.onError?.('Geolocation not supported by this browser');
      return;
    }

    this.setStatus('requesting');

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.clearStaleTimer();
    this.setStatus('idle');
  }

  private handlePosition(pos: GeolocationPosition): void {
    this.clearStaleTimer();
    this.resetStaleTimer();

    const { latitude, longitude, accuracy, speed, heading, altitude, altitudeAccuracy } =
      pos.coords;
    const timestamp = pos.timestamp;

    // Validate coords
    const coordErr = validateCoords(latitude, longitude, accuracy);
    if (coordErr) {
      this.setStatus('poor_accuracy');
      this.options.onError?.(`Invalid GPS sample: ${coordErr}`);
      return;
    }

    // Check accuracy threshold
    const threshold = this.options.accuracyThreshold ?? 50;
    if (accuracy > threshold) {
      this.setStatus('poor_accuracy');
    } else {
      this.setStatus('active');
    }

    const sample: GpsSample = {
      lat: latitude,
      lng: longitude,
      timestamp,
      speed: speed ?? null,
      accuracy,
      heading: heading ?? null,
      altitude: altitude ?? null,
      altitudeAccuracy: altitudeAccuracy ?? null,
      source: 'gps',
      tripId: this.tripId ?? undefined,
      isAccepted: true,
    };

    // Jump plausibility check against last accepted sample
    if (this.lastAccepted) {
      const jumpErr = checkJumpPlausibility(
        this.lastAccepted.lat, this.lastAccepted.lng, this.lastAccepted.timestamp,
        latitude, longitude, timestamp,
        this.options.maxJumpKph ?? 350
      );
      if (jumpErr) {
        sample.isAccepted = false;
        sample.rejectionReason = jumpErr;
        this.options.onError?.(`GPS jump rejected: ${jumpErr}`);
        // still emit but flagged
        this.options.onSample?.(sample);
        return;
      }
    }

    this.lastAccepted = sample;
    this.options.onSample?.(sample);
  }

  private handleError(err: GeolocationPositionError): void {
    this.clearStaleTimer();
    switch (err.code) {
      case GeolocationPositionError.PERMISSION_DENIED:
        this.setStatus('denied');
        this.options.onError?.('GPS permission denied');
        break;
      case GeolocationPositionError.POSITION_UNAVAILABLE:
        this.setStatus('unavailable');
        this.options.onError?.('GPS position unavailable');
        break;
      case GeolocationPositionError.TIMEOUT:
        this.setStatus('waiting_fix');
        this.options.onError?.('GPS timeout — waiting for fix');
        break;
      default:
        this.setStatus('unavailable');
    }
  }

  private setStatus(s: GpsStatus): void {
    if (this.status !== s) {
      this.status = s;
      this.options.onStatus?.(s);
    }
  }

  private resetStaleTimer(): void {
    this.staleTimer = setTimeout(() => {
      if (this.status === 'active' || this.status === 'poor_accuracy') {
        this.setStatus('lost');
      }
    }, this.STALE_TIMEOUT_MS);
  }

  private clearStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
  }
}

// ---- Speed calculator: uses GPS reported speed or derives from samples ----
export interface SpeedResult {
  kph: number;
  source: 'reported' | 'calculated' | 'unavailable';
  isReliable: boolean;
}

export function deriveSpeed(
  current: GpsSample,
  previous: GpsSample | null
): SpeedResult {
  // Prefer reported GPS speed
  if (current.speed !== null && current.speed >= 0 && current.accuracy <= 25) {
    return {
      kph: mpsToKph(current.speed),
      source: 'reported',
      isReliable: true,
    };
  }

  if (!previous) {
    return { kph: 0, source: 'unavailable', isReliable: false };
  }

  const dtMs = current.timestamp - previous.timestamp;
  if (dtMs < 500) {
    return { kph: 0, source: 'unavailable', isReliable: false };
  }

  const dist = haversineDistance(
    previous.lat, previous.lng,
    current.lat, current.lng
  );
  const mps = dist / (dtMs / 1000);
  const kph = mpsToKph(mps);

  // Sanity check
  if (kph > 350) {
    return { kph: 0, source: 'unavailable', isReliable: false };
  }

  return {
    kph,
    source: 'calculated',
    isReliable: current.accuracy <= 30 && dtMs >= 1000,
  };
}

export const gpsService = new GpsService();
