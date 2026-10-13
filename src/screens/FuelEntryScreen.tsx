import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { saveFuelEntry } from '../services/storage';
import { generateId } from '../utils/idUtils';
import type { FuelEntry } from '../types';
import { Check } from 'lucide-react';
import ModuleHeader from '../components/ModuleHeader';

export default function FuelEntryScreen() {
  const { state, navigate } = useApp();
  const moto = state.settings.motorcycleProfile;
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    odometer: '',
    litres: '',
    pricePerLitre: String(moto.fuelPricePerLitre ?? ''),
    totalCost: '',
    isFull: true,
    fuelStation: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError('');
  };

  // Auto-calculate total cost from litres × price
  const calcTotal = () => {
    const l = parseFloat(form.litres);
    const p = parseFloat(form.pricePerLitre);
    if (l > 0 && p > 0) set('totalCost', (l * p).toFixed(2));
  };

  const handleSave = async () => {
    const odometer = parseFloat(form.odometer);
    const litresFilled = parseFloat(form.litres);
    const pricePerLitre = parseFloat(form.pricePerLitre);
    const totalCost = parseFloat(form.totalCost);

    if (!odometer || odometer <= 0) { setError('Enter a valid odometer reading.'); return; }
    if (!litresFilled || litresFilled <= 0) { setError('Enter litres filled.'); return; }
    if (!pricePerLitre || pricePerLitre <= 0) { setError('Enter price per litre.'); return; }
    if (!totalCost || totalCost <= 0) { setError('Enter total amount paid.'); return; }

    setSaving(true);
    const entry: FuelEntry = {
      id: generateId(),
      date: new Date(form.date).getTime(),
      odometerReading: odometer,
      odometerUnit: moto.odometerUnit,
      litresFilled,
      pricePerLitre,
      totalCost,
      isFull: form.isFull,
      isPartial: !form.isFull,
      fuelStation: form.fuelStation || undefined,
      notes: form.notes || undefined,
      createdAt: Date.now(),
    };

    await saveFuelEntry(entry);
    setSaving(false);
    navigate('fuel');
  };

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ModuleHeader
        title="Log Fuel Fill"
        subtitle="Record odometer & fuel quantity"
        fallbackScreen="fuel"
      />

      <FormField label="Date & Time">
        <input type="datetime-local" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
      </FormField>

      <FormField label={`Odometer (${moto.odometerUnit})`}>
        <input type="number" className="input" placeholder="e.g. 12450" value={form.odometer}
          onChange={(e) => set('odometer', e.target.value)} />
      </FormField>

      <FormField label="Litres Filled">
        <input type="number" className="input" placeholder="e.g. 8.5" step="0.01" value={form.litres}
          onChange={(e) => set('litres', e.target.value)}
          onBlur={calcTotal} />
      </FormField>

      <FormField label="Price per Litre (₹)">
        <input type="number" className="input" placeholder="e.g. 103.50" step="0.01" value={form.pricePerLitre}
          onChange={(e) => set('pricePerLitre', e.target.value)}
          onBlur={calcTotal} />
      </FormField>

      <FormField label="Total Amount Paid (₹)">
        <input type="number" className="input" placeholder="Auto-calculated" step="0.01" value={form.totalCost}
          onChange={(e) => set('totalCost', e.target.value)} />
      </FormField>

      {/* Full tank toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Full tank fill?</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Required for accurate km/L calculation</div>
        </div>
        <div className={`toggle ${form.isFull ? 'on' : ''}`} onClick={() => set('isFull', !form.isFull)} />
      </div>

      <FormField label="Fuel Station (optional)">
        <input type="text" className="input" placeholder="Station name or location" value={form.fuelStation}
          onChange={(e) => set('fuelStation', e.target.value)} />
      </FormField>

      <FormField label="Notes (optional)">
        <input type="text" className="input" placeholder="Any notes" value={form.notes}
          onChange={(e) => set('notes', e.target.value)} />
      </FormField>

      {error && (
        <div style={{ background: '#2d0000', border: '1px solid var(--color-danger)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ width: '100%', fontSize: 16, minHeight: 52 }}
        onClick={handleSave}
        disabled={saving}
      >
        <Check size={18} /> {saving ? 'Saving…' : 'Save Fuel Entry'}
      </button>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

import type React from 'react';
