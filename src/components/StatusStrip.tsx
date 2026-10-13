import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Wifi, WifiOff, Battery, Sun, Moon } from 'lucide-react';

const GPS_LABELS: Record<string, { label: string; color: string; dotClass: string }> = {
  idle:          { label: 'GPS Off',     color: 'var(--color-text-dim)',   dotClass: 'idle' },
  requesting:    { label: 'Requesting…', color: 'var(--color-warn)',       dotClass: 'warn' },
  denied:        { label: 'GPS Denied',  color: 'var(--color-danger)',     dotClass: 'error' },
  unavailable:   { label: 'GPS N/A',    color: 'var(--color-danger)',     dotClass: 'error' },
  waiting_fix:   { label: 'Acquiring…', color: 'var(--color-warn)',       dotClass: 'warn' },
  poor_accuracy: { label: 'Weak GPS',   color: 'var(--color-warn)',       dotClass: 'warn' },
  active:        { label: 'GPS Active', color: 'var(--color-success)',    dotClass: 'active' },
  lost:          { label: 'GPS Lost',   color: 'var(--color-danger)',     dotClass: 'error' },
};

function ThemeToggle() {
  const { state, dispatch } = useApp();
  const [isNight, setIsNight] = useState(
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'night'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsNight(document.documentElement.getAttribute('data-theme') === 'night');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const nextIsNight = !isNight;
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        ...state.settings,
        nightModeAuto: false,
        theme: nextIsNight ? 'light' : 'dark',
      },
    });
  };

  return (
    <button
      onClick={toggleTheme}
      title={isNight ? 'Night: Light Neumorphism (Tap for Day: Dark UI)' : 'Day: Dark UI (Tap for Night: Light Neumorphism)'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--color-surface)',
        border: 'none',
        borderRadius: 8,
        padding: '3px 7px',
        cursor: 'pointer',
        boxShadow: 'var(--neu-shadow-btn)',
        color: 'var(--color-text)',
        fontSize: 10,
        fontWeight: 700,
        outline: 'none',
      }}
    >
      {isNight ? <Moon size={11} color="var(--color-accent)" /> : <Sun size={11} color="var(--color-warn)" />}
      <span>{isNight ? 'Night' : 'Day'}</span>
    </button>
  );
}

export default function StatusStrip() {
  const { state } = useApp();
  const { gpsStatus, gpsAccuracy, isOnline } = state;

  const gpsInfo = GPS_LABELS[gpsStatus] ?? GPS_LABELS.idle;

  const now = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Update time
  const [time, setTime] = useState(now);
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 12px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
        height: 36,
      }}>
        {/* Left: Time */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', minWidth: 48 }}>
          {time}
        </span>

        {/* Center: GPS status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className={`status-dot ${gpsInfo.dotClass}`} />
          <span style={{ fontSize: 11, color: gpsInfo.color, fontWeight: 600 }}>
            {gpsInfo.label}
          </span>
          {gpsAccuracy !== null && gpsStatus === 'active' && (
            <span style={{ fontSize: 10, color: 'var(--color-text-dim)', marginLeft: 2 }}>
              ±{Math.round(gpsAccuracy)}m
            </span>
          )}
        </div>

        {/* Right: Theme + Online + optional battery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          {isOnline
            ? <Wifi size={13} color="var(--color-success)" />
            : <WifiOff size={13} color="var(--color-danger)" />
          }
          <BatteryIndicator />
        </div>
      </div>

    </>
  );
}

function BatteryIndicator() {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    let bat: { level: number; charging: boolean; addEventListener: Function; removeEventListener: Function } | null = null;
    const update = () => {
      if (bat) {
        setLevel(Math.round(bat.level * 100));
      }
    };
    (navigator as Navigator & { getBattery?: () => Promise<typeof bat> })
      .getBattery?.()
      .then((b) => {
        bat = b as typeof bat;
        update();
        bat?.addEventListener('levelchange', update);
        bat?.addEventListener('chargingchange', update);
      })
      .catch(() => {});
    return () => {
      bat?.removeEventListener('levelchange', update);
      bat?.removeEventListener('chargingchange', update);
    };
  }, []);

  if (level === null) return null;

  const color = level <= 15 ? 'var(--color-danger)' : level <= 30 ? 'var(--color-warn)' : 'var(--color-text-muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Battery size={13} color={color} />
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{level}%</span>
    </div>
  );
}

