// ============================================================
// V-Strom Ride OS — Core TypeScript Types
// ============================================================

export interface UserProfile {
  id?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MotorcycleProfile {
  id: string;
  name: string;
  make: string;
  model: string;
  year?: number;
  fuelTankCapacity: number;       // litres
  expectedMileage: number;        // km/L (user-configured)
  fuelType: 'petrol' | 'diesel';
  odometerUnit: 'km' | 'miles';
  preferredDistanceUnit: 'km' | 'miles';
  fuelPricePerLitre?: number;     // local currency
  color?: string;
  vin?: string;
  notes?: string;
  updatedAt: number;
}

export interface GpsSample {
  id?: number;                    // IndexedDB key
  lat: number;
  lng: number;
  timestamp: number;              // Unix ms
  speed: number | null;           // m/s from GPS, null if unavailable
  accuracy: number;               // metres
  heading: number | null;         // degrees 0-360, null if unavailable
  altitude: number | null;        // metres, null if unavailable
  altitudeAccuracy: number | null;
  source: 'gps' | 'network' | 'fused';
  tripId?: string;
  isAccepted: boolean;
  rejectionReason?: string;
}

export type GpsStatus =
  | 'idle'
  | 'requesting'
  | 'denied'
  | 'unavailable'
  | 'waiting_fix'
  | 'poor_accuracy'
  | 'active'
  | 'lost';

export interface ActiveTrip {
  id: string;
  startTime: number;              // Unix ms
  pausedAt?: number;
  totalPausedMs: number;
  status: 'idle' | 'active' | 'paused' | 'ended';
  distanceMetres: number;
  maxSpeedKph: number;
  speedSamples: number[];         // kph, for average calc
  startLocation?: { lat: number; lng: number };
  lastSample?: GpsSample;
  destinationId?: string;
}

export interface SavedRide {
  id: string;
  startTime: number;
  endTime: number;
  distance: number;               // metres
  totalDurationMs: number;
  movingDurationMs: number;
  avgMovingSpeedKph: number;
  maxSpeedKph: number;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  routeCoordinates?: Array<[number, number]>; // [lat, lng]
  destinationName?: string;
  notes?: string;
  estimatedFuelUsedL?: number;
  estimatedFuelCost?: number;
  weather?: WeatherData;
  synced: boolean;
}

export interface FuelEntry {
  id: string;
  date: number;                   // Unix ms
  odometerReading: number;        // in user's preferred unit
  odometerUnit: 'km' | 'miles';
  litresFilled: number;
  pricePerLitre: number;
  totalCost: number;
  isFull: boolean;
  isPartial: boolean;
  fuelStation?: string;
  notes?: string;
  calculatedKmPerL?: number;      // only valid for full-to-full
  calculatedDistanceKm?: number;  // only valid for full-to-full
  createdAt: number;
}

export interface FuelSummary {
  totalEntries: number;
  totalLitres: number;
  totalCost: number;
  totalDistanceKm: number;
  aggregateKmPerL: number | null;   // null = insufficient data
  latestKmPerL: number | null;
  avgCostPerKm: number | null;
  entries: FuelEntry[];
}

export interface SavedPlace {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category: 'home' | 'work' | 'fuel' | 'food' | 'hotel' | 'custom';
  placeId?: string;               // Google Places ID
  notes?: string;
  lastVisited?: number;
  visitCount: number;
  createdAt: number;
}

export interface SavedRoute {
  id: string;
  name?: string;
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string; placeId?: string };
  distanceMetres: number;
  durationSeconds: number;
  polyline?: string;              // encoded polyline
  createdAt: number;
  lastUsed?: number;
}

export interface HourlyWeather {
  time: string;
  temp: number;
  precipitationProb: number;
  condition: string;
  windSpeed: number;
}

export interface WeatherData {
  temp: number;                   // °C
  feelsLike: number;
  condition: string;
  description: string;
  iconCode: string;
  humidity: number;               // %
  windSpeed: number;              // km/h
  windDeg: number;
  windGust?: number;
  visibility?: number;            // km
  precipitation?: number;         // mm/h
  uvIndex?: number;
  alerts?: WeatherAlert[];
  fetchedAt: number;
  lat: number;
  lng: number;
  provider?: 'open-meteo' | 'openweathermap' | 'weatherapi';
  hourlyForecast?: HourlyWeather[];
  motorcycleAdvisory?: {
    level: 'good' | 'caution' | 'warning';
    title: string;
    description: string;
  };
}

export interface WeatherAlert {
  event: string;
  description: string;
  start: number;
  end: number;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
}

export interface AppSettings {
  // Vehicle
  motorcycleProfile: MotorcycleProfile;
  // Dashboard
  speedometerStyle: 'circular' | 'digital' | 'minimal';
  accentColor: string;
  theme: 'dark' | 'light' | 'auto';
  speedUnit: 'kph' | 'mph';
  speedWarnThreshold: number;     // kph
  visibleWidgets: string[];
  // Tracking
  gpsAccuracyThreshold: number;   // metres; samples above this are flagged
  autoPauseSecs: number;          // seconds stationary before auto-pause
  keepLocalHistory: boolean;
  cloudSync: boolean;
  maxStoredRides: number;
  // Integrations
  googleMapsApiKey: string;
  weatherApiKey: string;          // OpenWeatherMap
  weatherProvider?: 'auto' | 'open-meteo' | 'openweathermap' | 'weatherapi';
  mapEngine?: 'auto' | 'google' | 'leaflet';
  weatherEnabled: boolean;
  musicEnabled: boolean;
  // Misc
  nightModeAuto: boolean;
  nightModeStartHour: number;
  nightModeEndHour: number;
  hapticFeedback: boolean;
  wakeLock: boolean;
  updatedAt: number;
}

export interface IntegrationStatus {
  gpsPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  googleMapsLoaded: boolean;
  googleMapsKeyPresent: boolean;
  weatherKeyPresent: boolean;
  supabaseConfigured: boolean;
  mediaSessionSupported: boolean;
  wakeLockSupported: boolean;
  orientationSupported: boolean;
  notificationsPermission: 'granted' | 'denied' | 'default' | 'unknown';
  isOnline: boolean;
  isPwa: boolean;
}

export interface RouteInfo {
  distanceMetres: number;
  durationSeconds: number;
  summary: string;
  steps: RouteStep[];
  polyline: string;
  warnings: string[];
  copyrights: string;
}

export interface RouteStep {
  instruction: string;
  distanceMetres: number;
  durationSeconds: number;
  maneuver?: string;
  lat: number;
  lng: number;
}

export interface NavigationState {
  isNavigating: boolean;
  destination?: SavedPlace | { lat: number; lng: number; name: string };
  route?: RouteInfo;
  currentStepIndex: number;
  distanceRemainingM: number;
  etaMs?: number;
  lastRecalcAt?: number;
}

export type Screen =
  | 'cockpit'
  | 'map'
  | 'trip'
  | 'history'
  | 'analytics'
  | 'fuel'
  | 'fuel-entry'
  | 'music'
  | 'compass'
  | 'weather'
  | 'places'
  | 'planner'
  | 'emergency'
  | 'profile'
  | 'settings'
  | 'diagnostics'
  | 'auth';
