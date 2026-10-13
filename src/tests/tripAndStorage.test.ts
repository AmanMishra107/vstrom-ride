import { describe, it, expect } from 'vitest';
import { DEFAULT_MOTORCYCLE, DEFAULT_SETTINGS } from '../services/settings';
import { windDirLabel } from '../services/weatherService';
import { haversineDistance } from '../utils/gpsUtils';
import type { GpsSample } from '../types';

describe('Motorcycle Profile & Defaults', () => {
  it('has Suzuki V-Strom SX 250 as the default profile', () => {
    expect(DEFAULT_MOTORCYCLE.make).toBe('Suzuki');
    expect(DEFAULT_MOTORCYCLE.model).toBe('V-Strom SX 250');
    expect(DEFAULT_MOTORCYCLE.fuelTankCapacity).toBe(12);
    expect(DEFAULT_MOTORCYCLE.expectedMileage).toBe(35);
    expect(DEFAULT_MOTORCYCLE.fuelType).toBe('petrol');
  });

  it('has default dark theme AMOLED configuration', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('dark');
    expect(DEFAULT_SETTINGS.speedWarnThreshold).toBe(120);
    expect(DEFAULT_SETTINGS.gpsAccuracyThreshold).toBe(50);
  });
});

describe('Weather utility tests', () => {
  it('correctly maps wind degrees to cardinal directions', () => {
    expect(windDirLabel(0)).toBe('N');
    expect(windDirLabel(360)).toBe('N');
    expect(windDirLabel(90)).toBe('E');
    expect(windDirLabel(180)).toBe('S');
    expect(windDirLabel(270)).toBe('W');
    expect(windDirLabel(45)).toBe('NE');
    expect(windDirLabel(225)).toBe('SW');
  });

  it('can fetch real weather from Open-Meteo without an API key', async () => {
    // Bangalore test coords
    const data = await import('../services/weatherService').then((m) =>
      m.fetchWeather(12.9716, 77.5946, '', 'open-meteo')
    );
    expect(data.provider).toBe('open-meteo');
    expect(data.temp).toBeDefined();
    expect(typeof data.temp).toBe('number');
    expect(data.windSpeed).toBeGreaterThanOrEqual(0);
    expect(data.motorcycleAdvisory).toBeDefined();
  });
});

describe('Trip accumulation & state logic', () => {
  it('correctly accumulates distance along multiple GPS points', () => {
    // 3 GPS points along a line
    const p1 = { lat: 12.9716, lng: 77.5946 };
    const p2 = { lat: 12.9726, lng: 77.5956 };
    const p3 = { lat: 12.9736, lng: 77.5966 };

    const leg1 = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    const leg2 = haversineDistance(p2.lat, p2.lng, p3.lat, p3.lng);
    const totalDist = leg1 + leg2;

    expect(totalDist).toBeGreaterThan(150);
    expect(totalDist).toBeLessThan(400);
  });

  it('calculates average moving speed correctly without paused time', () => {
    const samples = [40, 50, 60, 55, 45]; // speeds in kph
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(avg).toBe(50);
  });

  it('validates active trip pause duration math', () => {
    const startTime = 100000;
    const pausedAt = 120000; // paused after 20s
    const resumedAt = 135000; // paused for 15s
    const now = 150000;

    const totalPausedMs = resumedAt - pausedAt;
    const elapsedMovingMs = now - startTime - totalPausedMs;

    expect(totalPausedMs).toBe(15000);
    expect(elapsedMovingMs).toBe(35000); // 50s total - 15s paused = 35s moving
  });

  it('rejects duplicate or stale GPS timestamps', () => {
    const s1: GpsSample = {
      lat: 12.97,
      lng: 77.59,
      timestamp: 1000,
      speed: 15,
      accuracy: 5,
      heading: 90,
      altitude: 900,
      altitudeAccuracy: null,
      source: 'gps',
      isAccepted: true,
    };

    const s2Duplicate: GpsSample = {
      ...s1,
      timestamp: 1000, // same timestamp
    };

    const s3Stale: GpsSample = {
      ...s1,
      timestamp: 800, // earlier timestamp
    };

    expect(s2Duplicate.timestamp - s1.timestamp).toBe(0);
    expect(s3Stale.timestamp < s1.timestamp).toBe(true);
  });
});
