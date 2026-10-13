import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Phone, AlertTriangle, Share2, Navigation } from 'lucide-react';

export default function EmergencyScreen() {
  const { state } = useApp();
  const { lastSample } = state;
  const [confirmCall, setConfirmCall] = useState<string | null>(null);

  const lat = lastSample?.lat;
  const lng = lastSample?.lng;
  const coordStr = lat != null && lng != null
    ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    : 'GPS location unavailable';

  const mapsUrl = lat != null && lng != null
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null;

  const handleShare = async () => {
    const text = `I need assistance. My location: ${coordStr}${mapsUrl ? `\n${mapsUrl}` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Location', text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Location copied to clipboard.');
    }
  };

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={22} color="var(--color-danger)" />
        <div style={{ fontWeight: 700, fontSize: 18 }}>Emergency & Roadside</div>
      </div>

      <div className="card" style={{ background: '#1a0000', border: '1px solid #4d0000' }}>
        <div style={{ fontSize: 12, color: '#ff6b6b' }}>
          ⚠ This screen is for emergencies only. Make all calls manually. The app does not dial automatically.
        </div>
      </div>

      {/* Location */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>📍 Current Location</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: lat != null ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
          {coordStr}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ flex: 1, textDecoration: 'none', fontSize: 13 }}
            >
              <Navigation size={14} /> Open in Maps
            </a>
          )}
          <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={handleShare}>
            <Share2 size={14} /> Share Location
          </button>
        </div>
        {lat == null && (
          <div style={{ fontSize: 11, color: 'var(--color-warn)', marginTop: 8 }}>
            GPS unavailable — enable GPS permissions for location sharing.
          </div>
        )}
      </div>

      {/* Emergency numbers */}
      <EmergencyContact
        label="Emergency Services"
        number="112"
        description="All India Emergency Number"
        onConfirm={() => setConfirmCall('112')}
        color="var(--color-danger)"
      />
      <EmergencyContact
        label="Police"
        number="100"
        description="Indian Police"
        onConfirm={() => setConfirmCall('100')}
        color="var(--color-danger)"
      />
      <EmergencyContact
        label="Ambulance"
        number="108"
        description="Emergency Ambulance"
        onConfirm={() => setConfirmCall('108')}
        color="#ef4444"
      />
      <EmergencyContact
        label="Roadside Assist"
        number="1800-233-9999"
        description="Suzuki Helpline (NEXA/Maruti Suzuki helpline — verify with your dealer)"
        onConfirm={() => setConfirmCall('18002339999')}
        color="var(--color-warn)"
      />

      {/* Call confirmation */}
      {confirmCall && (
        <div className="card" style={{ background: '#1a0000', border: '1px solid var(--color-danger)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-danger)' }}>Call {confirmCall}?</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Confirm to open your phone dialler with this number. You must manually place the call.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmCall(null)}>Cancel</button>
            <a
              href={`tel:${confirmCall}`}
              className="btn btn-danger"
              style={{ flex: 1, textDecoration: 'none' }}
              onClick={() => setConfirmCall(null)}
            >
              <Phone size={14} /> Call Now
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function EmergencyContact({
  label, number, description, onConfirm, color,
}: {
  label: string; number: string; description: string; onConfirm: () => void; color: string;
}) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, margin: '2px 0' }}>{number}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{description}</div>
      </div>
      <button
        className="btn btn-ghost btn-icon"
        style={{ borderColor: color, color }}
        onClick={onConfirm}
      >
        <Phone size={18} />
      </button>
    </div>
  );
}
