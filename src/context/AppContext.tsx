// ============================================================
// App Context — Global state management via React Context
// ============================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type {
  AppSettings,
  ActiveTrip,
  GpsSample,
  GpsStatus,
  NavigationState,
  WeatherData,
  Screen,
} from '../types';
import { loadSettings, saveSettings } from '../services/settings';
import {
  persistActiveTrip,
  loadActiveTrip,
  clearActiveTrip,
} from '../services/storage';
import { gpsService, deriveSpeed } from '../services/gpsService';

import { haversineDistance } from '../utils/gpsUtils';
import { generateId } from '../utils/idUtils';

// ---- State Shape ----
interface AppState {
  settings: AppSettings;
  screen: Screen;
  screenHistory: Screen[];
  activeTrip: ActiveTrip | null;
  currentSpeedKph: number;
  speedSource: 'reported' | 'calculated' | 'unavailable';
  lastSample: GpsSample | null;
  gpsStatus: GpsStatus;
  gpsAccuracy: number | null;
  heading: number | null;
  navigation: NavigationState;
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  isOnline: boolean;
  mapsLoaded: boolean;
}

// ---- Actions ----
type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'GO_BACK'; fallback?: Screen }
  | { type: 'UPDATE_SETTINGS'; settings: AppSettings }
  | { type: 'GPS_SAMPLE'; sample: GpsSample; speedKph: number; speedSource: string }
  | { type: 'GPS_STATUS'; status: GpsStatus }
  | { type: 'GPS_ACCURACY'; accuracy: number }
  | { type: 'SET_HEADING'; heading: number | null }
  | { type: 'START_TRIP'; trip: ActiveTrip }
  | { type: 'PAUSE_TRIP' }
  | { type: 'RESUME_TRIP' }
  | { type: 'END_TRIP' }
  | { type: 'UPDATE_TRIP_DIST'; distanceMetres: number; speedKph: number }
  | { type: 'SET_NAVIGATION'; nav: NavigationState }
  | { type: 'SET_WEATHER'; weather: WeatherData }
  | { type: 'SET_WEATHER_LOADING'; loading: boolean }
  | { type: 'SET_WEATHER_ERROR'; error: string | null }
  | { type: 'SET_ONLINE'; online: boolean }
  | { type: 'SET_MAPS_LOADED'; loaded: boolean }
  | { type: 'RESTORE_TRIP'; trip: ActiveTrip };

const nav0: NavigationState = {
  isNavigating: false,
  currentStepIndex: 0,
  distanceRemainingM: 0,
};

function createInitialState(): AppState {
  const settings = loadSettings();
  return {
    settings,
    screen: 'cockpit',
    screenHistory: [],
    activeTrip: null,
    currentSpeedKph: 0,
    speedSource: 'unavailable',
    lastSample: null,
    gpsStatus: 'idle',
    gpsAccuracy: null,
    heading: null,
    navigation: nav0,
    weather: null,
    weatherLoading: false,
    weatherError: null,
    isOnline: navigator.onLine,
    mapsLoaded: false,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN':
      if (state.screen === action.screen) return state;
      return {
        ...state,
        screen: action.screen,
        screenHistory: [...state.screenHistory, state.screen],
      };

    case 'GO_BACK': {
      if (state.screenHistory.length > 0) {
        const prev = state.screenHistory[state.screenHistory.length - 1];
        return {
          ...state,
          screen: prev,
          screenHistory: state.screenHistory.slice(0, -1),
        };
      }
      return {
        ...state,
        screen: action.fallback ?? 'cockpit',
        screenHistory: [],
      };
    }

    case 'UPDATE_SETTINGS':
      saveSettings(action.settings);
      return { ...state, settings: action.settings };

    case 'GPS_STATUS':
      return { ...state, gpsStatus: action.status };

    case 'GPS_ACCURACY':
      return { ...state, gpsAccuracy: action.accuracy };

    case 'SET_HEADING':
      return { ...state, heading: action.heading };

    case 'GPS_SAMPLE': {
      const { sample, speedKph, speedSource } = action;
      let trip = state.activeTrip;

      if (trip && trip.status === 'active' && state.lastSample?.isAccepted && sample.isAccepted) {
        const dist = haversineDistance(
          state.lastSample.lat, state.lastSample.lng,
          sample.lat, sample.lng
        );
        // Only count if plausible (> 0.5 m, < 5000 m per sample)
        const addDist = dist > 0.5 && dist < 5000 ? dist : 0;
        const newMax = Math.max(trip.maxSpeedKph, speedKph);
        const newSamples =
          speedKph > 1 ? [...trip.speedSamples, speedKph] : trip.speedSamples;

        trip = {
          ...trip,
          distanceMetres: trip.distanceMetres + addDist,
          maxSpeedKph: newMax,
          speedSamples: newSamples,
          lastSample: sample,
        };
      }

      return {
        ...state,
        lastSample: sample,
        currentSpeedKph: speedKph,
        speedSource: speedSource as 'reported' | 'calculated' | 'unavailable',
        gpsAccuracy: sample.accuracy,
        heading: sample.heading ?? state.heading,
        activeTrip: trip,
      };
    }

    case 'START_TRIP':
      return { ...state, activeTrip: action.trip };

    case 'PAUSE_TRIP': {
      if (!state.activeTrip) return state;
      const paused = {
        ...state.activeTrip,
        status: 'paused' as const,
        pausedAt: Date.now(),
      };
      return { ...state, activeTrip: paused };
    }

    case 'RESUME_TRIP': {
      if (!state.activeTrip || state.activeTrip.status !== 'paused') return state;
      const pausedDuration = state.activeTrip.pausedAt
        ? Date.now() - state.activeTrip.pausedAt
        : 0;
      const resumed = {
        ...state.activeTrip,
        status: 'active' as const,
        pausedAt: undefined,
        totalPausedMs: state.activeTrip.totalPausedMs + pausedDuration,
      };
      return { ...state, activeTrip: resumed };
    }

    case 'END_TRIP': {
      if (!state.activeTrip) return state;
      return { ...state, activeTrip: { ...state.activeTrip, status: 'ended' } };
    }

    case 'UPDATE_TRIP_DIST':
      if (!state.activeTrip) return state;
      return {
        ...state,
        activeTrip: {
          ...state.activeTrip,
          distanceMetres: state.activeTrip.distanceMetres + action.distanceMetres,
          maxSpeedKph: Math.max(state.activeTrip.maxSpeedKph, action.speedKph),
        },
      };

    case 'SET_NAVIGATION':
      return { ...state, navigation: action.nav };

    case 'SET_WEATHER':
      return { ...state, weather: action.weather, weatherLoading: false, weatherError: null };

    case 'SET_WEATHER_LOADING':
      return { ...state, weatherLoading: action.loading };

    case 'SET_WEATHER_ERROR':
      return { ...state, weatherError: action.error, weatherLoading: false };

    case 'SET_ONLINE':
      return { ...state, isOnline: action.online };

    case 'SET_MAPS_LOADED':
      return { ...state, mapsLoaded: action.loaded };

    case 'RESTORE_TRIP':
      return { ...state, activeTrip: action.trip };

    default:
      return state;
  }
}

// ---- Context ----
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  startGps: () => void;
  stopGps: () => void;
  startTrip: () => void;
  pauseTrip: () => void;
  resumeTrip: () => void;
  endTrip: () => void;
  navigate: (screen: Screen) => void;
  goBack: (fallback?: Screen) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const lastSampleRef = useRef<GpsSample | null>(null);

  // Restore active trip from IndexedDB
  useEffect(() => {
    loadActiveTrip().then((trip) => {
      if (trip && trip.status !== 'ended') {
        dispatch({ type: 'RESTORE_TRIP', trip });
      }
    });
  }, []);

  // Persist trip changes
  useEffect(() => {
    if (state.activeTrip) {
      persistActiveTrip(state.activeTrip);
    }
  }, [state.activeTrip]);

  // Online/offline
  useEffect(() => {
    const on = () => dispatch({ type: 'SET_ONLINE', online: true });
    const off = () => dispatch({ type: 'SET_ONLINE', online: false });
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const startGps = useCallback(() => {
    gpsService.configure({
      accuracyThreshold: state.settings.gpsAccuracyThreshold,
      onStatus: (status) => dispatch({ type: 'GPS_STATUS', status }),
      onSample: (sample) => {
        const prev = lastSampleRef.current;
        lastSampleRef.current = sample;
        const speedResult = deriveSpeed(sample, prev);
        dispatch({
          type: 'GPS_SAMPLE',
          sample,
          speedKph: speedResult.kph,
          speedSource: speedResult.source,
        });
      },
      onError: (msg) => console.warn('[GPS]', msg),
    });
    gpsService.start();
    dispatch({ type: 'GPS_STATUS', status: 'requesting' });
  }, [state.settings.gpsAccuracyThreshold]);

  const stopGps = useCallback(() => {
    gpsService.stop();
  }, []);

  const startTrip = useCallback(() => {
    const id = generateId();
    const trip: ActiveTrip = {
      id,
      startTime: Date.now(),
      totalPausedMs: 0,
      status: 'active',
      distanceMetres: 0,
      maxSpeedKph: 0,
      speedSamples: [],
      startLocation: state.lastSample
        ? { lat: state.lastSample.lat, lng: state.lastSample.lng }
        : undefined,
    };
    gpsService.setTripId(id);
    dispatch({ type: 'START_TRIP', trip });
  }, [state.lastSample]);

  const pauseTrip = useCallback(() => {
    dispatch({ type: 'PAUSE_TRIP' });
  }, []);

  const resumeTrip = useCallback(() => {
    dispatch({ type: 'RESUME_TRIP' });
  }, []);

  const endTrip = useCallback(() => {
    dispatch({ type: 'END_TRIP' });
    gpsService.setTripId(null);
    clearActiveTrip();
  }, []);

  const navigate = useCallback((screen: Screen) => {
    dispatch({ type: 'SET_SCREEN', screen });
  }, []);

  const goBack = useCallback((fallback?: Screen) => {
    dispatch({ type: 'GO_BACK', fallback });
  }, []);

  const value: AppContextValue = {
    state,
    dispatch,
    startGps,
    stopGps,
    startTrip,
    pauseTrip,
    resumeTrip,
    endTrip,
    navigate,
    goBack,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
