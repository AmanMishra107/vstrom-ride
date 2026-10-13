// ============================================================
// Fuel Calculation Utilities
// ============================================================

import type { FuelEntry, FuelSummary } from '../types';

/**
 * Calculate km/L for a full-tank interval.
 * Both entries must be "full" fills to produce a valid result.
 * Returns null if data is insufficient.
 */
export function calcIntervalKmPerL(
  prev: FuelEntry,
  curr: FuelEntry
): number | null {
  if (!prev.isFull || !curr.isFull) return null;
  if (curr.litresFilled <= 0) return null;

  const prevOdoKm = odometerToKm(prev.odometerReading, prev.odometerUnit);
  const currOdoKm = odometerToKm(curr.odometerReading, curr.odometerUnit);
  const distKm = currOdoKm - prevOdoKm;

  if (distKm <= 0) return null;
  return distKm / curr.litresFilled;
}

/** Convert odometer reading to km */
export function odometerToKm(reading: number, unit: 'km' | 'miles'): number {
  return unit === 'miles' ? reading * 1.60934 : reading;
}

/**
 * Aggregate km/L across all valid full-tank intervals.
 * Uses total distance / total litres (weighted harmonic mean is implicit).
 */
export function calcAggregateKmPerL(entries: FuelEntry[]): number | null {
  const fullFills = entries
    .filter((e) => e.isFull)
    .sort((a, b) => a.date - b.date);

  if (fullFills.length < 2) return null;

  let totalDist = 0;
  let totalLitres = 0;

  for (let i = 1; i < fullFills.length; i++) {
    const prev = fullFills[i - 1];
    const curr = fullFills[i];
    const prevKm = odometerToKm(prev.odometerReading, prev.odometerUnit);
    const currKm = odometerToKm(curr.odometerReading, curr.odometerUnit);
    const dist = currKm - prevKm;
    if (dist > 0 && curr.litresFilled > 0) {
      totalDist += dist;
      totalLitres += curr.litresFilled;
    }
  }

  if (totalLitres <= 0) return null;
  return totalDist / totalLitres;
}

/** Estimate GPS-based fuel used for a trip */
export function estimateFuelUsed(distanceKm: number, kmPerL: number): number {
  if (kmPerL <= 0) return 0;
  return distanceKm / kmPerL;
}

/** Estimate trip fuel cost */
export function estimateFuelCost(
  litres: number,
  pricePerLitre: number
): number {
  return litres * pricePerLitre;
}

/** Estimate remaining range in km */
export function estimateRemainingRange(
  remainingLitres: number,
  kmPerL: number
): number {
  return remainingLitres * kmPerL;
}

/** Cost per km */
export function calcCostPerKm(totalCost: number, distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return totalCost / distanceKm;
}

/** Produce a complete fuel summary from entry list */
export function buildFuelSummary(entries: FuelEntry[]): FuelSummary {
  const sorted = [...entries].sort((a, b) => a.date - b.date);
  const totalLitres = sorted.reduce((s, e) => s + e.litresFilled, 0);
  const totalCost = sorted.reduce((s, e) => s + e.totalCost, 0);

  // calculate distance from full intervals
  const fullFills = sorted.filter((e) => e.isFull);
  let totalDistKm = 0;
  const enriched = sorted.map((e) => ({ ...e }));

  for (let i = 1; i < fullFills.length; i++) {
    const prev = fullFills[i - 1];
    const curr = fullFills[i];
    const d = odometerToKm(curr.odometerReading, curr.odometerUnit) -
              odometerToKm(prev.odometerReading, prev.odometerUnit);
    if (d > 0) {
      totalDistKm += d;
      const idx = enriched.findIndex((e) => e.id === curr.id);
      if (idx >= 0) {
        enriched[idx].calculatedDistanceKm = d;
        if (curr.litresFilled > 0) {
          enriched[idx].calculatedKmPerL = d / curr.litresFilled;
        }
      }
    }
  }

  const aggregate = calcAggregateKmPerL(sorted);
  const latest = enriched.filter((e) => e.calculatedKmPerL != null).slice(-1)[0];

  return {
    totalEntries: sorted.length,
    totalLitres,
    totalCost,
    totalDistanceKm: totalDistKm,
    aggregateKmPerL: aggregate,
    latestKmPerL: latest?.calculatedKmPerL ?? null,
    avgCostPerKm: totalDistKm > 0 ? calcCostPerKm(totalCost, totalDistKm) : null,
    entries: enriched,
  };
}
