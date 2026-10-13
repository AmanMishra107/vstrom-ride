import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  fallbackScreen?: Screen;
  icon?: React.ReactNode;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export default function ModuleHeader({
  title,
  subtitle,
  fallbackScreen = 'cockpit',
  icon,
  rightAction,
  onBack,
}: ModuleHeaderProps) {
  const { goBack } = useApp();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack(fallbackScreen);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginBottom: 6 }}>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={handleBack}
        aria-label="Back"
        title="Go Back"
        style={{ flexShrink: 0 }}
      >
        <ArrowLeft size={20} />
      </button>

      {icon && <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</div>}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: 'var(--color-text)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {rightAction && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {rightAction}
        </div>
      )}
    </div>
  );
}
