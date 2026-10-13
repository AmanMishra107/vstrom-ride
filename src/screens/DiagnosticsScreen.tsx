import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft, Smartphone } from 'lucide-react';
import MobileConnectModal from '../components/MobileConnectModal';

export default function DiagnosticsScreen() {
  const { state, navigate } = useApp();
  const { settings, gpsStatus, isOnline, mapsLoaded } = state;
  const [showMobileModal, setShowMobileModal] = useState(false);

  const checks: Array<{ label: string; status: 'ok' | 'warn' | 'error'; detail: string }> = [
    {
      label: 'GPS Permission',
      status: (['active', 'poor_accuracy'].includes(gpsStatus)) ? 'ok' : gpsStatus === 'denied' ? 'error' : 'warn',
      detail: gpsStatus,
    },
    {
      label: 'Internet Connection',
      status: isOnline ? 'ok' : 'error',
      detail: isOnline ? 'Online' : 'Offline',
    },
    {
      label: 'Google Maps API Key',
      status: settings.googleMapsApiKey ? 'ok' : 'error',
      detail: settings.googleMapsApiKey ? 'Configured' : 'Missing — set VITE_GOOGLE_MAPS_API_KEY in .env',
    },
    {
      label: 'Google Maps Loaded',
      status: mapsLoaded ? 'ok' : settings.googleMapsApiKey ? 'warn' : 'error',
      detail: mapsLoaded ? 'Loaded' : 'Not yet loaded — visit the Map screen to trigger load',
    },
    {
      label: 'Weather API Key',
      status: settings.weatherApiKey ? 'ok' : 'warn',
      detail: settings.weatherApiKey ? 'Configured' : 'Not configured — weather unavailable',
    },
    {
      label: 'Media Session API',
      status: 'mediaSession' in navigator ? 'ok' : 'warn',
      detail: 'mediaSession' in navigator ? 'Supported' : 'Not supported in this browser',
    },
    {
      label: 'Wake Lock API',
      status: 'wakeLock' in navigator ? 'ok' : 'warn',
      detail: 'wakeLock' in navigator ? 'Supported' : 'Not supported — screen may sleep during ride',
    },
    {
      label: 'Geolocation API',
      status: 'geolocation' in navigator ? 'ok' : 'error',
      detail: 'geolocation' in navigator ? 'Supported' : 'Not supported — GPS unavailable',
    },
    {
      label: 'Device Orientation',
      status: 'DeviceOrientationEvent' in window ? 'ok' : 'warn',
      detail: 'DeviceOrientationEvent' in window ? 'Supported' : 'Not supported — compass may be unavailable',
    },
    {
      label: 'IndexedDB',
      status: 'indexedDB' in window ? 'ok' : 'error',
      detail: 'indexedDB' in window ? 'Available' : 'Not available — ride data cannot be saved',
    },
    {
      label: 'Service Worker / PWA',
      status: 'serviceWorker' in navigator ? 'ok' : 'warn',
      detail: 'serviceWorker' in navigator ? 'Supported (install from browser menu)' : 'Not supported',
    },
    {
      label: 'Https / Secure Context',
      status: window.isSecureContext ? 'ok' : 'warn',
      detail: window.isSecureContext ? 'Secure context' : 'Not HTTPS — some APIs may be blocked',
    },
  ];

  const StatusIcon = ({ status }: { status: 'ok' | 'warn' | 'error' }) => {
    if (status === 'ok') return <CheckCircle size={16} color="var(--color-success)" />;
    if (status === 'warn') return <AlertCircle size={16} color="var(--color-warn)" />;
    return <XCircle size={16} color="var(--color-danger)" />;
  };

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('settings')}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Diagnostics & Mobile Link</div>
      </div>

      <div
        className="card"
        onClick={() => setShowMobileModal(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '12px 14px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, var(--color-surface) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Smartphone size={22} color="var(--color-accent)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>
              Open on Phone via Local Wi-Fi IP
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Scan QR code to view cockpit on phone (192.168.29.122)
            </div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 700 }}>Open QR →</span>
      </div>

      {showMobileModal && <MobileConnectModal onClose={() => setShowMobileModal(false)} />}

      {checks.map((c) => (
        <div key={c.label} className="card card-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <StatusIcon status={c.status} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.detail}</div>
          </div>
        </div>
      ))}

      <div className="card" style={{ background: '#0d1a0d', border: '1px solid #1a3d1a', marginTop: 4 }}>
        <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginBottom: 6 }}>API Setup Checklist</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          1. Create a <code>.env</code> file in the project root.<br />
          2. Add <code>VITE_GOOGLE_MAPS_API_KEY=your_key</code><br />
          3. Add <code>VITE_WEATHER_API_KEY=your_owm_key</code><br />
          4. Enable: Maps JavaScript API, Places API, Directions API on Google Cloud Console.<br />
          5. Restrict browser key to your domain.<br />
          6. Restart dev server after changing .env.
        </div>
      </div>
    </div>
  );
}
