// ============================================================
// GPS Utility Functions — Haversine, Speed, Validation
// ============================================================

const EARTH_RADIUS_M = 6371000;

/**
 * Haversine great-circle distance between two coordinates in metres.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Calculate speed in m/s from two GPS samples.
 * Returns null if timestamps are identical or insufficient time has elapsed.
 */
export function calculateSpeedMps(
  lat1: number, lng1: number, t1: number,
  lat2: number, lng2: number, t2: number
): number | null {
  const dtMs = t2 - t1;
  if (dtMs <= 0) return null;
  const dist = haversineDistance(lat1, lng1, lat2, lng2);
  return dist / (dtMs / 1000);
}

/** Convert m/s to km/h */
export function mpsToKph(mps: number): number {
  return mps * 3.6;
}

/** Convert m/s to mph */
export function mpsToMph(mps: number): number {
  return mps * 2.23694;
}

/** Convert km/h to mph */
export function kphToMph(kph: number): number {
  return kph * 0.621371;
}

/** Convert mph to km/h */
export function mphToKph(mph: number): number {
  return mph * 1.60934;
}

/** Convert metres to kilometres */
export function metresToKm(m: number): number {
  return m / 1000;
}

/** Convert metres to miles */
export function metresToMiles(m: number): number {
  return m / 1609.344;
}

/** Convert km to miles */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Validate a raw GeolocationCoordinates.
 * Returns a reason string if invalid, null if valid.
 */
export function validateCoords(
  lat: number, lng: number, accuracy: number
): string | null {
  if (!isFinite(lat) || !isFinite(lng)) return 'Non-finite coordinates';
  if (lat < -90 || lat > 90) return 'Latitude out of range';
  if (lng < -180 || lng > 180) return 'Longitude out of range';
  if (accuracy < 0) return 'Negative accuracy';
  return null;
}

/**
 * Check whether a GPS jump between two samples is plausible.
 * Returns a reason string if implausible, null if ok.
 * maxJumpKph defaults to 350 kph (higher than any motorcycle legally can).
 */
export function checkJumpPlausibility(
  lat1: number, lng1: number, t1: number,
  lat2: number, lng2: number, t2: number,
  maxJumpKph = 350
): string | null {
  const dtMs = t2 - t1;
  if (dtMs <= 0) return 'Non-monotonic timestamp';
  const dist = haversineDistance(lat1, lng1, lat2, lng2);
  const speedMps = dist / (dtMs / 1000);
  const speedKph = mpsToKph(speedMps);
  if (speedKph > maxJumpKph) {
    return `Implausible jump: ${speedKph.toFixed(0)} kph over ${dist.toFixed(0)} m in ${dtMs} ms`;
  }
  return null;
}

/** Format elapsed seconds as HH:MM:SS */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format milliseconds as HH:MM:SS */
export function formatDurationMs(ms: number): string {
  return formatDuration(Math.floor(ms / 1000));
}

/** Format distance: smart unit selection */
export function formatDistance(metres: number, unit: 'km' | 'miles' = 'km'): string {
  if (unit === 'miles') {
    const miles = metresToMiles(metres);
    return miles < 0.1 ? `${Math.round(metres)} m` : `${miles.toFixed(1)} mi`;
  }
  const km = metresToKm(metres);
  return km < 0.1 ? `${Math.round(metres)} m` : `${km.toFixed(2)} km`;
}

/** Format speed value */
export function formatSpeed(kph: number, unit: 'kph' | 'mph' = 'kph'): string {
  if (unit === 'mph') return `${Math.round(kphToMph(kph))}`;
  return `${Math.round(kph)}`;
}

/** Cardinal direction from degrees */
export function degreesToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/** ETA formatted as local time string */
export function formatEta(durationSeconds: number): string {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Simple moving average over last N values */
export function movingAverage(values: number[], windowSize: number): number {
  if (values.length === 0) return 0;
  const window = values.slice(-windowSize);
  return window.reduce((a, b) => a + b, 0) / window.length;
}
