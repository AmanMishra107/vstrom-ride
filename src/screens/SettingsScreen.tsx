import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { AppSettings, MotorcycleProfile } from '../types';
import { Bike, Palette, MapPin, Bell, ChevronRight } from 'lucide-react';
import ModuleHeader from '../components/ModuleHeader';

export default function SettingsScreen() {
  const { state, dispatch, navigate } = useApp();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const settings = state.settings;
  const set = (partial: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: { ...settings, ...partial, updatedAt: Date.now() } });
  };
  const setMoto = (partial: Partial<MotorcycleProfile>) => {
    set({ motorcycleProfile: { ...settings.motorcycleProfile, ...partial, updatedAt: Date.now() } });
  };

  const sections = [
    { id: 'vehicle', label: 'Motorcycle', icon: <Bike size={18} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <Palette size={18} /> },
    { id: 'tracking', label: 'Tracking & GPS', icon: <MapPin size={18} /> },
    { id: 'integrations', label: 'Integrations', icon: <Bell size={18} /> },
  ];

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ModuleHeader
        title="Settings"
        subtitle="System, telemetry & motorcycle configuration"
        fallbackScreen="cockpit"
      />

      {sections.map((s) => (
        <div key={s.id}>
          <button
            onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
              color: 'var(--color-text)', fontWeight: 600, fontSize: 14,
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>{s.icon}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{s.label}</span>
            <ChevronRight size={16} color="var(--color-text-dim)"
              style={{ transform: activeSection === s.id ? 'rotate(90deg)' : undefined, transition: 'transform 0.2s' }} />
          </button>

          {activeSection === s.id && (
            <div className="card fade-in" style={{ marginTop: 4, borderRadius: '0 0 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {s.id === 'vehicle' && <VehicleSection moto={settings.motorcycleProfile} setMoto={setMoto} />}
              {s.id === 'dashboard' && <DashboardSection settings={settings} set={set} />}
              {s.id === 'tracking' && <TrackingSection settings={settings} set={set} />}
              {s.id === 'integrations' && <IntegrationsSection settings={settings} set={set} navigate={navigate} />}
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('profile')}>
          🏍️ Full Motorcycle Profile & Maintenance
        </button>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('auth')}>
          ☁️ Cloud Sync & Account
        </button>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('diagnostics')}>
          🔍 Diagnostics & API Status
        </button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textAlign: 'center', marginTop: 8 }}>
        V-Strom Ride OS v1.0.0 · Not a certified motorcycle instrument
      </div>
    </div>
  );
}

function VehicleSection({ moto, setMoto }: { moto: MotorcycleProfile; setMoto: (p: Partial<MotorcycleProfile>) => void }) {
  return (
    <>
      <Field label="Bike Name">
        <input className="input" value={moto.name} onChange={(e) => setMoto({ name: e.target.value })} />
      </Field>
      <Field label="Make">
        <input className="input" value={moto.make} onChange={(e) => setMoto({ make: e.target.value })} />
      </Field>
      <Field label="Model">
        <input className="input" value={moto.model} onChange={(e) => setMoto({ model: e.target.value })} />
      </Field>
      <Field label="Year">
        <input className="input" type="number" value={moto.year ?? ''} onChange={(e) => setMoto({ year: parseInt(e.target.value) || undefined })} />
      </Field>
      <Field label="Tank Capacity (L)">
        <input className="input" type="number" step="0.5" value={moto.fuelTankCapacity} onChange={(e) => setMoto({ fuelTankCapacity: parseFloat(e.target.value) || 12 })} />
      </Field>
      <Field label="Expected Mileage (km/L)">
        <input className="input" type="number" step="0.5" value={moto.expectedMileage} onChange={(e) => setMoto({ expectedMileage: parseFloat(e.target.value) || 35 })} />
      </Field>
      <Field label="Fuel Price per Litre (₹)">
        <input className="input" type="number" step="0.5" value={moto.fuelPricePerLitre ?? ''} onChange={(e) => setMoto({ fuelPricePerLitre: parseFloat(e.target.value) || undefined })} />
      </Field>
      <Field label="Odometer Unit">
        <select className="input" value={moto.odometerUnit} onChange={(e) => setMoto({ odometerUnit: e.target.value as 'km' | 'miles' })}>
          <option value="km">km</option>
          <option value="miles">miles</option>
        </select>
      </Field>
    </>
  );
}

function DashboardSection({ settings, set }: { settings: AppSettings; set: (p: Partial<AppSettings>) => void }) {
  return (
    <>
      <Field label="Speed Unit">
        <select className="input" value={settings.speedUnit} onChange={(e) => set({ speedUnit: e.target.value as 'kph' | 'mph' })}>
          <option value="kph">km/h</option>
          <option value="mph">mph</option>
        </select>
      </Field>
      <Field label="Speedometer Style">
        <select className="input" value={settings.speedometerStyle} onChange={(e) => set({ speedometerStyle: e.target.value as AppSettings['speedometerStyle'] })}>
          <option value="circular">Circular Gauge</option>
          <option value="digital">Digital</option>
          <option value="minimal">Minimal</option>
        </select>
      </Field>
      <Field label={`Speed Warn Threshold (${settings.speedUnit})`}>
        <input className="input" type="number" value={settings.speedWarnThreshold} onChange={(e) => set({ speedWarnThreshold: parseInt(e.target.value) || 120 })} />
      </Field>
      <Field label="Theme Mode">
        <select
          className="input"
          value={settings.nightModeAuto ? 'auto' : settings.theme === 'light' ? 'night' : 'day'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'auto') {
              set({ nightModeAuto: true });
            } else if (v === 'night') {
              set({ nightModeAuto: false, theme: 'light' });
            } else {
              set({ nightModeAuto: false, theme: 'dark' });
            }
          }}
        >
          <option value="auto">Auto (Day = Dark UI, Night = Light Neumorphic)</option>
          <option value="day">Day Mode (Dark UI)</option>
          <option value="night">Night Mode (Light Neumorphism)</option>
        </select>
      </Field>
      <ToggleRow label="Night Mode Auto" description="Auto-switch based on time of day (19:00 - 06:00)" checked={settings.nightModeAuto} onChange={(v) => set({ nightModeAuto: v })} />
      <ToggleRow label="Screen Wake Lock" description="Keep screen on while riding" checked={settings.wakeLock} onChange={(v) => set({ wakeLock: v })} />
    </>
  );
}

function TrackingSection({ settings, set }: { settings: AppSettings; set: (p: Partial<AppSettings>) => void }) {
  return (
    <>
      <Field label="GPS Accuracy Threshold (m)">
        <input className="input" type="number" value={settings.gpsAccuracyThreshold} onChange={(e) => set({ gpsAccuracyThreshold: parseInt(e.target.value) || 50 })} />
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 4 }}>
          Samples with accuracy worse than this are flagged as poor quality.
        </div>
      </Field>
      <Field label="Auto-pause after (seconds stationary)">
        <input className="input" type="number" value={settings.autoPauseSecs} onChange={(e) => set({ autoPauseSecs: parseInt(e.target.value) || 120 })} />
      </Field>
      <ToggleRow label="Keep Local History" description="Store rides on this device" checked={settings.keepLocalHistory} onChange={(v) => set({ keepLocalHistory: v })} />
      <ToggleRow label="Weather" description="Enable weather fetching" checked={settings.weatherEnabled} onChange={(v) => set({ weatherEnabled: v })} />
    </>
  );
}

function IntegrationsSection({ settings, set, navigate }: { settings: AppSettings; set: (p: Partial<AppSettings>) => void; navigate: (s: string) => void }) {
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [showWeatherKey, setShowWeatherKey] = useState(false);

  return (
    <>
      <Field label="Google Maps Platform API Key">
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input"
            type={showMapsKey ? 'text' : 'password'}
            placeholder="AIzaSy..."
            value={settings.googleMapsApiKey || ''}
            onChange={(e) => set({ googleMapsApiKey: e.target.value })}
            style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowMapsKey(!showMapsKey)}
            style={{ fontSize: 11, padding: '0 8px' }}
          >
            {showMapsKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: settings.googleMapsApiKey ? 'var(--color-success)' : 'var(--color-text-dim)', marginTop: 4 }}>
          {settings.googleMapsApiKey
            ? '✓ Google Maps Platform configured. OpenStreetMap available as instant backup.'
            : 'Using OpenStreetMap Adventure Engine. Paste key above to activate Google Maps.'}
        </div>
      </Field>

      <Field label="Weather Engine Provider">
        <select
          className="input"
          value={settings.weatherProvider ?? 'auto'}
          onChange={(e) => set({ weatherProvider: e.target.value as 'auto' | 'open-meteo' | 'openweathermap' })}
        >
          <option value="auto">Auto (OpenWeatherMap if key set, else Open-Meteo)</option>
          <option value="open-meteo">Open-Meteo (Free & Live — No API key needed)</option>
          <option value="openweathermap">OpenWeatherMap (Requires API Key)</option>
        </select>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 4 }}>
          Open-Meteo provides real-time global weather, wind gusts, and rain without requiring sign-up or keys.
        </div>
      </Field>

      <Field label="OpenWeatherMap API Key (Optional)">
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input"
            type={showWeatherKey ? 'text' : 'password'}
            placeholder="e.g. 8a3f..."
            value={settings.weatherApiKey || ''}
            onChange={(e) => set({ weatherApiKey: e.target.value })}
            style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowWeatherKey(!showWeatherKey)}
            style={{ fontSize: 11, padding: '0 8px' }}
          >
            {showWeatherKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 4 }}>
          Get an optional key at <strong>openweathermap.org/api</strong>
        </div>
      </Field>

      <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => navigate('diagnostics')}>
        View API Diagnostics →
      </button>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{description}</div>
      </div>
      <div className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} />
    </div>
  );
}

import type React from 'react';
