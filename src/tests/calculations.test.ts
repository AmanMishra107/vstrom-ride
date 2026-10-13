import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  calculateSpeedMps,
  mpsToKph,
  mpsToMph,
  kphToMph,
  mphToKph,
  metresToKm,
  metresToMiles,
  validateCoords,
  checkJumpPlausibility,
  formatDuration,
  formatDistance,
} from '../utils/gpsUtils';
import {
  calcIntervalKmPerL,
  calcAggregateKmPerL,
  estimateFuelUsed,
  estimateFuelCost,
  estimateRemainingRange,
} from '../utils/fuelUtils';
import type { FuelEntry } from '../types';

// ============================================================
// Haversine distance
// ============================================================
describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(20, 77, 20, 77)).toBe(0);
  });

  it('gives ~111 km between 1 degree latitude', () => {
    const d = haversineDistance(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('calculates well-known coordinate pair correctly', () => {
    // Delhi to Mumbai rough check: ~1150 km
    const d = haversineDistance(28.6139, 77.2090, 19.0760, 72.8777);
    expect(d).toBeGreaterThan(1_100_000);
    expect(d).toBeLessThan(1_200_000);
  });
});

// ============================================================
// Speed calculation
// ============================================================
describe('calculateSpeedMps', () => {
  it('returns null for zero time delta', () => {
    expect(calculateSpeedMps(0, 0, 100, 0, 0, 100)).toBeNull();
  });

  it('returns null for negative time delta', () => {
    expect(calculateSpeedMps(0, 0, 200, 0, 0, 100)).toBeNull();
  });

  it('calculates speed correctly', () => {
    // ~111 m in 1 second, expect a positive non-null speed
    const t1 = 0, t2 = 1000; // 1 second
    const speed = calculateSpeedMps(0, 0, t1, 0.001, 0, t2);
    expect(speed).not.toBeNull();
    expect(speed!).toBeGreaterThan(0);
  });
});

// ============================================================
// Unit conversions
// ============================================================
describe('unit conversions', () => {
  it('mpsToKph: 1 m/s = 3.6 kph', () => {
    expect(mpsToKph(1)).toBeCloseTo(3.6);
  });
  it('mpsToMph: 1 m/s ≈ 2.237 mph', () => {
    expect(mpsToMph(1)).toBeCloseTo(2.23694, 3);
  });
  it('kphToMph round-trip', () => {
    expect(mphToKph(kphToMph(100))).toBeCloseTo(100, 1);
  });
  it('metresToKm: 1000 m = 1 km', () => {
    expect(metresToKm(1000)).toBe(1);
  });
  it('metresToMiles: 1609.344 m = 1 mile', () => {
    expect(metresToMiles(1609.344)).toBeCloseTo(1);
  });
});

// ============================================================
// GPS validation
// ============================================================
describe('validateCoords', () => {
  it('accepts valid coords', () => {
    expect(validateCoords(20, 77, 10)).toBeNull();
  });
  it('rejects out-of-range latitude', () => {
    expect(validateCoords(91, 0, 10)).not.toBeNull();
  });
  it('rejects out-of-range longitude', () => {
    expect(validateCoords(0, 181, 10)).not.toBeNull();
  });
  it('rejects non-finite values', () => {
    expect(validateCoords(NaN, 0, 10)).not.toBeNull();
    expect(validateCoords(0, Infinity, 10)).not.toBeNull();
  });
  it('rejects negative accuracy', () => {
    expect(validateCoords(20, 77, -1)).not.toBeNull();
  });
});

// ============================================================
// Jump plausibility
// ============================================================
describe('checkJumpPlausibility', () => {
  it('accepts normal motorcycle speeds', () => {
    // 60 kph over 1 second = 16.67 m
    const err = checkJumpPlausibility(20, 77, 0, 20.00015, 77, 1000);
    expect(err).toBeNull();
  });
  it('rejects teleportation', () => {
    // 1000 km in 1 second
    const err = checkJumpPlausibility(0, 0, 0, 10, 0, 1000);
    expect(err).not.toBeNull();
  });
  it('rejects non-monotonic timestamp', () => {
    const err = checkJumpPlausibility(0, 0, 1000, 0, 0, 500);
    expect(err).not.toBeNull();
  });
});

// ============================================================
// Duration formatting
// ============================================================
describe('formatDuration', () => {
  it('formats seconds correctly', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(0)).toBe('00:00');
  });
});

// ============================================================
// Distance formatting
// ============================================================
describe('formatDistance', () => {
  it('shows metres for short distances', () => {
    expect(formatDistance(50)).toContain('m');
  });
  it('shows km for long distances', () => {
    expect(formatDistance(5000)).toContain('km');
  });
  it('shows miles when unit is miles', () => {
    expect(formatDistance(5000, 'miles')).toContain('mi');
  });
});

// ============================================================
// Fuel calculations
// ============================================================
function makeFuelEntry(overrides: Partial<FuelEntry>): FuelEntry {
  return {
    id: 'test',
    date: Date.now(),
    odometerReading: 1000,
    odometerUnit: 'km',
    litresFilled: 8,
    pricePerLitre: 100,
    totalCost: 800,
    isFull: true,
    isPartial: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('calcIntervalKmPerL', () => {
  it('returns null if either fill is not full', () => {
    const prev = makeFuelEntry({ isFull: false, odometerReading: 1000 });
    const curr = makeFuelEntry({ odometerReading: 1350, litresFilled: 10 });
    expect(calcIntervalKmPerL(prev, curr)).toBeNull();
  });

  it('calculates correctly: 350 km / 10 L = 35 km/L', () => {
    const prev = makeFuelEntry({ odometerReading: 1000 });
    const curr = makeFuelEntry({ odometerReading: 1350, litresFilled: 10 });
    expect(calcIntervalKmPerL(prev, curr)).toBeCloseTo(35, 1);
  });

  it('returns null for zero litres', () => {
    const prev = makeFuelEntry({ odometerReading: 1000 });
    const curr = makeFuelEntry({ odometerReading: 1350, litresFilled: 0 });
    expect(calcIntervalKmPerL(prev, curr)).toBeNull();
  });

  it('returns null for negative distance (odometer went backward)', () => {
    const prev = makeFuelEntry({ odometerReading: 1500 });
    const curr = makeFuelEntry({ odometerReading: 1350, litresFilled: 10 });
    expect(calcIntervalKmPerL(prev, curr)).toBeNull();
  });
});

describe('calcAggregateKmPerL', () => {
  it('returns null with fewer than 2 full fills', () => {
    const entries = [makeFuelEntry({ odometerReading: 1000 })];
    expect(calcAggregateKmPerL(entries)).toBeNull();
  });

  it('calculates aggregate correctly', () => {
    const entries = [
      makeFuelEntry({ date: 1000, odometerReading: 1000, litresFilled: 0, isFull: true }),
      makeFuelEntry({ date: 2000, odometerReading: 1350, litresFilled: 10, isFull: true }),
      makeFuelEntry({ date: 3000, odometerReading: 1700, litresFilled: 10, isFull: true }),
    ];
    // 700 km / 20 L = 35 km/L
    expect(calcAggregateKmPerL(entries)).toBeCloseTo(35, 1);
  });
});

describe('fuel estimates', () => {
  it('estimateFuelUsed: 350 km at 35 km/L = 10 L', () => {
    expect(estimateFuelUsed(350, 35)).toBeCloseTo(10);
  });
  it('estimateFuelCost: 10 L × ₹100 = ₹1000', () => {
    expect(estimateFuelCost(10, 100)).toBe(1000);
  });
  it('estimateRemainingRange: 5 L × 35 km/L = 175 km', () => {
    expect(estimateRemainingRange(5, 35)).toBe(175);
  });
  it('estimateFuelUsed handles zero mileage gracefully', () => {
    expect(estimateFuelUsed(100, 0)).toBe(0);
  });
});
