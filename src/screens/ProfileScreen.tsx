import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { MotorcycleProfile } from '../types';
import {
  Bike,
  ArrowLeft,
  Save,
  CheckCircle2,
  Wrench,
  Gauge,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface MaintenanceCheck {
  id: string;
  label: string;
  interval: string;
  detail: string;
  recommended: string;
}

const MAINTENANCE_ITEMS: MaintenanceCheck[] = [
  {
    id: 'oil',
    label: 'Engine Oil & Filter',
    interval: 'Every 4,000 km',
    detail: '1,200 ml Suzuki Ecstar 10W-40 JASO MA2 Full Synthetic',
    recommended: 'SOCS (Suzuki Oil Cooling System) requires clean oil for optimal engine thermal balance.',
  },
  {
    id: 'chain',
    label: 'Drive Chain Lube & Slack',
    interval: 'Every 500 km',
    detail: 'Slack tolerance: 20–30 mm measured midway on lower run',
    recommended: 'Clean with O-ring safe solvent and apply dedicated motorcycle chain lube.',
  },
  {
    id: 'tyres',
    label: 'Tyre Pressures (Cold)',
    interval: 'Weekly / Before Rides',
    detail: 'Front 100/90-19: 22 PSI | Rear 140/70-17: 29 PSI (33 PSI with pillion)',
    recommended: 'Check strictly when tyres are cold before starting a trip.',
  },
  {
    id: 'brakes',
    label: 'Brake Fluid & Pad Wear',
    interval: 'Every 3,000 km',
    detail: 'DOT 4 fluid; pad friction material > 1.5 mm minimum',
    recommended: 'ByBre dual-channel ABS setup — inspect reservoir fluid level.',
  },
];

export default function ProfileScreen() {
  const { state, dispatch, navigate } = useApp();
  const profile = state.settings.motorcycleProfile;

  const [form, setForm] = useState<MotorcycleProfile>({ ...profile });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        ...state.settings,
        motorcycleProfile: {
          ...form,
          updatedAt: Date.now(),
        },
      },
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('cockpit')}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Motorcycle Profile</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Vehicle specifications, fuel calibration & maintenance log
          </div>
        </div>
      </div>

      {/* Hero Vehicle Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #111e38 0%, #111111 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {form.make} SPORT ADVENTURE TOURER
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 2 }}>{form.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Model Year: {form.year ?? 2023} • Color Accent: {form.color ?? '#1a6cc4'}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              padding: 10,
              borderRadius: 12,
              color: 'var(--color-accent)',
            }}
          >
            <Bike size={32} />
          </div>
        </div>

        {/* OEM Technical Specs Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 8px', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>Engine</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>249cc SOHC</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 8px', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>Power</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-speed)' }}>26.5 PS</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 8px', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>Torque</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-nav-blue)' }}>22.2 Nm</div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gauge size={16} color="var(--color-accent)" /> Vehicle Telemetry & Calibration
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Bike Display Name</label>
            <input
              type="text"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Model Year</label>
            <input
              type="number"
              className="input"
              value={form.year ?? 2023}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 2023 })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Tank Capacity (Litres)</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={form.fuelTankCapacity}
              onChange={(e) => setForm({ ...form, fuelTankCapacity: parseFloat(e.target.value) || 12 })}
            />
          </div>
          <div>
            <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Expected Mileage (km/L)</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={form.expectedMileage}
              onChange={(e) => setForm({ ...form, expectedMileage: parseFloat(e.target.value) || 35 })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Fuel Price (INR/L)</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={form.fuelPricePerLitre ?? 103}
              onChange={(e) => setForm({ ...form, fuelPricePerLitre: parseFloat(e.target.value) || 103 })}
            />
          </div>
          <div>
            <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Distance Unit</label>
            <select
              className="input"
              value={form.preferredDistanceUnit}
              onChange={(e) => setForm({ ...form, preferredDistanceUnit: e.target.value as 'km' | 'miles' })}
            >
              <option value="km">Kilometers (km)</option>
              <option value="miles">Miles (mi)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="metric-label" style={{ display: 'block', marginBottom: 4 }}>Accent Color Hex</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={form.color ?? '#1a6cc4'}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              style={{ width: 44, height: 38, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }}
            />
            <input
              type="text"
              className="input"
              value={form.color ?? '#1a6cc4'}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}>
          <Save size={16} /> Save Vehicle Profile
        </button>

        {savedSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success)', fontSize: 12 }}>
            <CheckCircle2 size={16} /> Vehicle profile saved successfully!
          </div>
        )}
      </form>

      {/* Pre-Ride & Periodic Maintenance Tracker */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wrench size={16} color="var(--color-warn)" /> V-Strom SX 250 Maintenance Checklist
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setCheckedItems({})}
            title="Reset pre-ride checklist"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MAINTENANCE_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                background: checkedItems[item.id] ? 'rgba(34, 197, 94, 0.08)' : 'var(--color-surface2)',
                border: `1px solid ${checkedItems[item.id] ? 'var(--color-success)' : 'var(--color-border)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ marginTop: 2 }}>
                {checkedItems[item.id] ? (
                  <CheckCircle2 size={18} color="var(--color-success)" />
                ) : (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--color-border-bright)' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>{item.interval}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{item.detail}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>{item.recommended}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Notice */}
      <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textAlign: 'center', padding: '4px 8px' }}>
        <ShieldCheck size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        Always refer to the official Suzuki V-Strom SX 250 Owner's Manual for torque specifications and safety procedures.
      </div>
    </div>
  );
}
