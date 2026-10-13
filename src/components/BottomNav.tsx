import { useApp } from '../context/AppContext';
import { Home, Map, Route, Fuel, Settings } from 'lucide-react';
import type { Screen } from '../types';

const NAV_ITEMS: Array<{ screen: Screen; icon: React.ReactNode; label: string }> = [
  { screen: 'cockpit',  icon: <Home size={20} />,   label: 'Cockpit' },
  { screen: 'map',      icon: <Map size={20} />,    label: 'Map' },
  { screen: 'history',  icon: <Route size={20} />,  label: 'Rides' },
  { screen: 'fuel',     icon: <Fuel size={20} />,   label: 'Fuel' },
  { screen: 'settings', icon: <Settings size={20} />, label: 'Settings' },
];

import type React from 'react';

export default function BottomNav() {
  const { state, navigate } = useApp();

  return (
    <nav className="nav-bar">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.screen}
          className={`nav-item ${state.screen === item.screen ? 'active' : ''}`}
          onClick={() => navigate(item.screen)}
          aria-label={item.label}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
