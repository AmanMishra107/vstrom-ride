import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAllFuelEntries } from '../services/storage';
import { buildFuelSummary, estimateRemainingRange } from '../utils/fuelUtils';
import type { FuelEntry } from '../types';
import { Plus, Fuel } from 'lucide-react';

export default function FuelScreen() {
  const { state, navigate } = useApp();
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const moto = state.settings.motorcycleProfile;

  useEffect(() => {
    getAllFuelEntries().then((e) => { setEntries(e); setLoading(false); });
  }, []);

  const summary = buildFuelSummary(entries);
  const remainingLitres = moto.fuelTankCapacity; // user must manually estimate current level
  const range = estimateRemainingRange(remainingLitres, moto.expectedMileage);

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Fuel & Mileage</div>
        <button className="btn btn-primary btn-icon" onClick={() => navigate('fuel-entry')} title="Add fuel entry">
          <Plus size={18} />
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="metric-tile">
          <span className="metric-label">Latest km/L</span>
          <span className="metric-value" style={{ fontSize: 22, color: 'var(--color-success)' }}>
            {summary.latestKmPerL != null ? summary.latestKmPerL.toFixed(1) : '—'}
          </span>
        </div>
        <div className="metric-tile">
          <span className="metric-label">Aggregate km/L</span>
          <span className="metric-value" style={{ fontSize: 22, color: 'var(--color-nav-blue)' }}>
            {summary.aggregateKmPerL != null ? summary.aggregateKmPerL.toFixed(1) : '—'}
          </span>
        </div>
        <div className="metric-tile">
          <span className="metric-label">Total Spent</span>
          <span className="metric-value" style={{ fontSize: 20 }}>
            ₹{Math.round(summary.totalCost)}
          </span>
        </div>
        <div className="metric-tile">
          <span className="metric-label">Est. Range (full)</span>
          <span className="metric-value" style={{ fontSize: 20, color: 'var(--color-warn)' }}>
            {Math.round(range)} km
          </span>
        </div>
      </div>

      {summary.aggregateKmPerL == null && (
        <div className="card" style={{ background: '#1c1700', border: '1px solid #3d2e00' }}>
          <div style={{ fontSize: 12, color: 'var(--color-warn)' }}>
            ⚠ Insufficient data for aggregate mileage. Log at least two consecutive full-tank fills to calculate.
          </div>
        </div>
      )}

      {/* Config reminder */}
      <div className="card" style={{ background: 'var(--color-surface2)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6 }}>VEHICLE CONFIG ({moto.name})</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Info label="Tank" value={`${moto.fuelTankCapacity} L`} />
          <Info label="Expected km/L" value={String(moto.expectedMileage)} />
          {moto.fuelPricePerLitre && <Info label="Fuel price" value={`₹${moto.fuelPricePerLitre}/L`} />}
        </div>
      </div>

      {/* Entry list */}
      <div style={{ fontWeight: 600, fontSize: 14 }}>Fill History ({summary.totalEntries})</div>
      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          No fuel entries yet. Tap <strong>+</strong> to log a fill.
        </div>
      ) : (
        entries.map((e) => <FuelEntryCard key={e.id} entry={e} />)
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="metric-label">{label}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function FuelEntryCard({ entry }: { entry: FuelEntry }) {
  const date = new Date(entry.date);
  return (
    <div className="card card-sm" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Fuel size={18} color="var(--color-warn)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>
          {date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
          {entry.isFull && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-success)', fontWeight: 700 }}>FULL</span>}
          {entry.isPartial && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-warn)', fontWeight: 700 }}>PARTIAL</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{entry.litresFilled.toFixed(2)} L</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>₹{entry.totalCost.toFixed(0)}</span>
          {entry.calculatedKmPerL && (
            <span style={{ fontSize: 12, color: 'var(--color-success)' }}>{entry.calculatedKmPerL.toFixed(1)} km/L</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{entry.odometerReading.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{entry.odometerUnit}</div>
      </div>
    </div>
  );
}
