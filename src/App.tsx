import { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import StatusStrip from './components/StatusStrip';
import BottomNav from './components/BottomNav';
import CockpitScreen from './screens/CockpitScreen';
import MapScreen from './screens/MapScreen';
import TripScreen from './screens/TripScreen';
import HistoryScreen from './screens/HistoryScreen';
import FuelScreen from './screens/FuelScreen';
import FuelEntryScreen from './screens/FuelEntryScreen';
import MusicScreen from './screens/MusicScreen';
import CompassScreen from './screens/CompassScreen';
import WeatherScreen from './screens/WeatherScreen';
import PlacesScreen from './screens/PlacesScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import SettingsScreen from './screens/SettingsScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import PlannerScreen from './screens/PlannerScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';

// ──────────────────────────────────────────────────────────
// Auto Day/Night Neumorphism theme
// Night hours (default 19–06) → [data-theme="night"] → Light Neumorphism
// Day hours                   → [data-theme="day"]   → Dark UI
// ──────────────────────────────────────────────────────────
function useAutoTheme() {
  const { state } = useApp();
  const { nightModeAuto, nightModeStartHour, nightModeEndHour, theme } = state.settings;

  useEffect(() => {
    const apply = () => {
      const hour = new Date().getHours();
      let isNight: boolean;

      if (nightModeAuto) {
        const start = nightModeStartHour; // e.g. 19
        const end = nightModeEndHour;     // e.g. 6
        // Wraps midnight: night if hour >= start OR hour < end
        isNight = start > end
          ? hour >= start || hour < end
          : hour >= start && hour < end;
      } else {
        isNight = theme === 'light';
      }

      document.documentElement.setAttribute('data-theme', isNight ? 'night' : 'day');
    };

    apply();
    const timer = setInterval(apply, 60_000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightModeAuto, nightModeStartHour, nightModeEndHour, theme]);
}

function AppInner() {
  const { state, startGps } = useApp();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useAutoTheme();

  // Auto-start GPS on mount
  useEffect(() => {
    startGps();
  }, [startGps]);

  // Wake lock — keep screen on while riding
  useEffect(() => {
    if (!state.settings.wakeLock) return;
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Not critical
      }
    };
    acquire();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, [state.settings.wakeLock]);

  const renderScreen = () => {
    switch (state.screen) {
      case 'cockpit':     return <CockpitScreen />;
      case 'map':         return <MapScreen />;
      case 'trip':        return <TripScreen />;
      case 'history':     return <HistoryScreen />;
      case 'analytics':   return <AnalyticsScreen />;
      case 'fuel':        return <FuelScreen />;
      case 'fuel-entry':  return <FuelEntryScreen />;
      case 'music':       return <MusicScreen />;
      case 'compass':     return <CompassScreen />;
      case 'weather':     return <WeatherScreen />;
      case 'places':      return <PlacesScreen />;
      case 'planner':     return <PlannerScreen />;
      case 'emergency':   return <EmergencyScreen />;
      case 'profile':     return <ProfileScreen />;
      case 'settings':    return <SettingsScreen />;
      case 'diagnostics': return <DiagnosticsScreen />;
      case 'auth':        return <AuthScreen />;
      default:            return <CockpitScreen />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <StatusStrip />
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {renderScreen()}
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
