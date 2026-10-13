import { useApp } from '../context/AppContext';
import { Music, Compass, CloudSun, MapPin, Fuel, Zap, Phone, Route } from 'lucide-react';
import type { Screen } from '../types';

const ACTIONS: Array<{ screen: Screen; icon: React.ReactNode; label: string; color?: string }> = [
  { screen: 'planner',   icon: <Route size={20} />,    label: 'Route',    color: '#38bdf8' },
  { screen: 'music',     icon: <Music size={20} />,    label: 'Music',    color: 'var(--color-accent)' },
  { screen: 'compass',   icon: <Compass size={20} />,  label: 'Compass',  color: 'var(--color-nav-blue)' },
  { screen: 'weather',   icon: <CloudSun size={20} />, label: 'Weather',  color: '#22d3ee' },
  { screen: 'places',    icon: <MapPin size={20} />,   label: 'Places',   color: 'var(--color-success)' },
  { screen: 'fuel',      icon: <Fuel size={20} />,     label: 'Fuel',     color: 'var(--color-warn)' },
  { screen: 'analytics', icon: <Zap size={20} />,      label: 'Stats',    color: '#a855f7' },
  { screen: 'emergency', icon: <Phone size={20} />,    label: 'SOS',      color: 'var(--color-danger)' },
];

import type React from 'react';

interface QuickActionsProps {
  columns?: number;
}

export default function QuickActions({ columns = 4 }: QuickActionsProps) {
  const { navigate } = useApp();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }}>
      {ACTIONS.map((a) => (
        <button
          key={a.screen}
          onClick={() => navigate(a.screen)}
          className="quick-action-btn"
          style={{ color: a.color ?? 'var(--color-text)' }}
        >
          {a.icon}
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>
            {a.label}
          </span>
        </button>
      ))}
    </div>
  );
}
