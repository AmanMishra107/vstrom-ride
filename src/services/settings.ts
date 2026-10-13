// ============================================================
// Default Application Settings
// ============================================================

import type { AppSettings, MotorcycleProfile } from '../types';

export const DEFAULT_MOTORCYCLE: MotorcycleProfile = {
  id: 'vstrom-sx-250',
  name: 'V-Strom SX 250',
  make: 'Suzuki',
  model: 'V-Strom SX 250',
  year: 2023,
  fuelTankCapacity: 12,       // litres
  expectedMileage: 35,        // km/L (typical for V-Strom SX 250)
  fuelType: 'petrol',
  odometerUnit: 'km',
  preferredDistanceUnit: 'km',
  fuelPricePerLitre: 103,     // INR per litre (approximate)
  color: '#1a6cc4',
  updatedAt: Date.now(),
};

export const DEFAULT_SETTINGS: AppSettings = {
  motorcycleProfile: DEFAULT_MOTORCYCLE,
  speedometerStyle: 'circular',
  accentColor: '#3b82f6',
  theme: 'dark',
  speedUnit: 'kph',
  speedWarnThreshold: 120,
  visibleWidgets: ['speed', 'map', 'trip', 'fuel', 'weather'],
  gpsAccuracyThreshold: 50,   // metres
  autoPauseSecs: 120,
  keepLocalHistory: true,
  cloudSync: false,
  maxStoredRides: 500,
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  weatherApiKey: import.meta.env.VITE_WEATHER_API_KEY || '',
  weatherEnabled: true,
  musicEnabled: true,
  nightModeAuto: true,
  nightModeStartHour: 19,
  nightModeEndHour: 6,
  hapticFeedback: true,
  wakeLock: true,
  updatedAt: Date.now(),
};

const SETTINGS_KEY = 'vstrom-settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const loaded: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      motorcycleProfile: {
        ...DEFAULT_MOTORCYCLE,
        ...(parsed.motorcycleProfile ?? {}),
      },
    };
    if (!loaded.weatherApiKey && DEFAULT_SETTINGS.weatherApiKey) {
      loaded.weatherApiKey = DEFAULT_SETTINGS.weatherApiKey;
    }
    if (!loaded.googleMapsApiKey && DEFAULT_SETTINGS.googleMapsApiKey) {
      loaded.googleMapsApiKey = DEFAULT_SETTINGS.googleMapsApiKey;
    }
    return loaded;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, updatedAt: Date.now() }));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
