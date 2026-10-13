import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { degreesToCardinal } from '../utils/gpsUtils';
import { AlertCircle } from 'lucide-react';
import ModuleHeader from '../components/ModuleHeader';

interface OrientationData {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;
}

export default function CompassScreen() {
  const { state } = useApp();
  const { heading, gpsStatus } = state;
  const [orientation, setOrientation] = useState<OrientationData | null>(null);
  const [orientationPermission, setOrientationPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      setOrientationPermission('granted');
      setOrientation({
        alpha: e.alpha,
        beta: e.beta,
        gamma: e.gamma,
        absolute: (e as DeviceOrientationEvent & { absolute?: boolean }).absolute ?? false,
      });
    };

    const requestPermission = async () => {
      type DOEWithPermission = typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      const DOE = DeviceOrientationEvent as unknown as DOEWithPermission;
      if (typeof DOE.requestPermission === 'function') {
        try {
          const res = await DOE.requestPermission();
          setOrientationPermission(res);
          if (res === 'granted') {
            window.addEventListener('deviceorientation', handler);
          }
        } catch {
          setOrientationPermission('denied');
        }
      } else {
        // Android / non-iOS: no permission needed
        window.addEventListener('deviceorientation', handler);
      }
    };

    requestPermission();
    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  // Use GPS heading if GPS is active, else use device orientation
  const compassHeading = (() => {
    if (heading !== null && gpsStatus === 'active') return heading;
    if (orientation?.alpha != null) {
      // On iOS, alpha from deviceorientation is magnetic heading (when absolute=true)
      // On Android, alpha is unreliable for absolute bearing — treat as relative
      return orientation.alpha;
    }
    return null;
  })();

  const headingSource = heading !== null && gpsStatus === 'active'
    ? 'GPS course'
    : orientation?.alpha != null ? 'device sensor' : null;

  const cardinal = compassHeading !== null ? degreesToCardinal(compassHeading) : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 12 }}>
      <ModuleHeader
        title="Compass"
        subtitle="Real-time bearing & magnetic heading"
        fallbackScreen="cockpit"
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>

      {compassHeading === null ? (
        <div className="card" style={{ textAlign: 'center', padding: 24, maxWidth: 300 }}>
          <AlertCircle size={36} color="var(--color-warn)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>Heading Unavailable</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>
            {orientationPermission === 'denied'
              ? 'Device orientation permission denied. Enable it in browser settings.'
              : 'Move the device or start a GPS session to get heading data.'}
          </div>
        </div>
      ) : (
        <>
          {/* Compass rose */}
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <svg width={200} height={200} viewBox="0 0 200 200"
              style={{ transform: `rotate(${-compassHeading}deg)`, transition: 'transform 0.3s ease-out' }}>
              {/* Outer circle */}
              <circle cx={100} cy={100} r={90} fill="none" stroke="var(--color-border-bright)" strokeWidth={2} />
              {/* Tick marks */}
              {Array.from({ length: 36 }, (_, i) => {
                const angle = (i * 10 * Math.PI) / 180;
                const major = i % 9 === 0;
                const r1 = major ? 80 : 84;
                const r2 = 90;
                return (
                  <line key={i}
                    x1={100 + r1 * Math.sin(angle)} y1={100 - r1 * Math.cos(angle)}
                    x2={100 + r2 * Math.sin(angle)} y2={100 - r2 * Math.cos(angle)}
                    stroke={major ? 'var(--color-text-muted)' : 'var(--color-border-bright)'}
                    strokeWidth={major ? 2 : 1}
                  />
                );
              })}
              {/* Cardinal labels */}
              {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([label, angle]) => {
                const rad = (Number(angle) * Math.PI) / 180;
                const r = 68;
                return (
                  <text key={String(label)}
                    x={100 + r * Math.sin(rad)} y={100 - r * Math.cos(rad)}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={label === 'N' ? 'var(--color-danger)' : 'var(--color-text-muted)'}
                    fontSize={label === 'N' ? 16 : 13}
                    fontWeight={700}
                    fontFamily="var(--font-sans)"
                  >
                    {label}
                  </text>
                );
              })}
              {/* Needle */}
              <polygon
                points="100,18 94,100 100,105 106,100"
                fill="var(--color-danger)"
              />
              <polygon
                points="100,182 94,100 100,105 106,100"
                fill="var(--color-text-muted)"
              />
              <circle cx={100} cy={100} r={7} fill="var(--color-bg)" stroke="var(--color-border-bright)" strokeWidth={2} />
            </svg>
          </div>

          {/* Heading values */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 900, lineHeight: 1 }}>
              {Math.round(compassHeading)}°
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-accent)' }}>
              {cardinal}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
              Source: {headingSource}
            </div>
            {heading === null && (
              <div style={{ fontSize: 11, color: 'var(--color-warn)', marginTop: 4 }}>
                ⚠ Sensor bearing may not match true north. Use GPS heading while moving for accuracy.
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
