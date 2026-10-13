import { useEffect, useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { degreesToCardinal } from '../utils/gpsUtils';
import {
  Compass as CompassIcon,
  Navigation,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';
import ModuleHeader from '../components/ModuleHeader';

/**
 * 3D Tilt-compensated compass heading from Euler angles (alpha, beta, gamma).
 * Critical for motorcycle handlebar phone mounts where the phone is tilted at 45°-80°.
 */
function computeTiltCompensatedHeading(alpha: number, beta: number, gamma: number): number {
  const toRad = Math.PI / 180;
  const _x = (beta ?? 0) * toRad;   // pitch (incline)
  const _y = (gamma ?? 0) * toRad;  // roll (lean)
  const _z = (alpha ?? 0) * toRad;  // yaw

  const cX = Math.cos(_x);
  const cY = Math.cos(_y);
  const cZ = Math.cos(_z);
  const sX = Math.sin(_x);
  const sY = Math.sin(_y);
  const sZ = Math.sin(_z);

  // Projection onto horizontal plane
  const Vx = -cZ * sY - sZ * sX * cY;
  const Vy = -sZ * sY + cZ * sX * cY;

  let heading = Math.atan2(Vx, Vy) * (180 / Math.PI);
  if (heading < 0) heading += 360;
  return heading;
}

export default function CompassScreen() {
  const { state } = useApp();
  const { heading: gpsHeading, gpsStatus, currentSpeedKph } = state;

  const [rawSensorHeading, setRawSensorHeading] = useState<number | null>(null);
  const [smoothedHeading, setSmoothedHeading] = useState<number>(0);
  const [leanAngle, setLeanAngle] = useState<number>(0);   // gamma (-90 to +90)
  const [pitchAngle, setPitchAngle] = useState<number>(0); // beta (-180 to +180)
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [mode, setMode] = useState<'auto' | 'sensor' | 'gps'>('auto');
  const [manualHeading, setManualHeading] = useState<number>(45);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [showCalibModal, setShowCalibModal] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const targetHeadingRef = useRef<number>(0);
  const currentSmoothedRef = useRef<number>(0);

  // Normalize angle to [0, 360)
  const normalize = (deg: number) => ((deg % 360) + 360) % 360;

  // Process orientation event from Android / mobile sensors
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    let headingVal: number | null = null;

    const alpha = e.alpha;
    const beta = e.beta;
    const gamma = e.gamma;

    // 1. Check iOS webkitCompassHeading if ever present
    const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof webkitHeading === 'number' && !isNaN(webkitHeading)) {
      headingVal = webkitHeading;
    }
    // 2. Android 3D tilt compensation
    else if (alpha !== null && !isNaN(alpha)) {
      if (beta !== null && gamma !== null && Math.abs(beta) > 15) {
        // Phone is tilted upright on motorcycle handlebar mount
        headingVal = computeTiltCompensatedHeading(alpha, beta, gamma);
      } else {
        // Flat phone fallback
        headingVal = 360 - alpha;
      }
    }

    if (headingVal !== null) {
      // Screen orientation correction (landscape vs portrait handlebar mount)
      let screenAngle = 0;
      if (window.screen?.orientation?.angle != null) {
        screenAngle = window.screen.orientation.angle;
      } else if (typeof (window as unknown as { orientation?: number }).orientation === 'number') {
        screenAngle = (window as unknown as { orientation: number }).orientation;
      }

      const finalBearing = normalize(headingVal + screenAngle);
      setRawSensorHeading(finalBearing);
      setSensorActive(true);
    }

    // Motorcycle Lean Angle (Roll) and Incline (Pitch)
    if (gamma !== null && !isNaN(gamma)) setLeanAngle(Math.round(gamma));
    if (beta !== null && !isNaN(beta)) setPitchAngle(Math.round(beta));
  }, []);

  // Attach Android sensor listeners
  useEffect(() => {
    // 1. Android Chrome absolute orientation event (highest priority on Android)
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    }
    // 2. Standard device orientation event
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      }
    };
  }, [handleOrientation]);

  // Determine active target heading based on mode
  useEffect(() => {
    if (isSimulated) {
      targetHeadingRef.current = manualHeading;
      return;
    }

    if (mode === 'gps' && gpsHeading !== null) {
      targetHeadingRef.current = gpsHeading;
    } else if (mode === 'sensor' && rawSensorHeading !== null) {
      targetHeadingRef.current = rawSensorHeading;
    } else {
      // 'auto' mode: Use GPS track when bike is moving (> 4 km/h), otherwise use magnetic sensor
      if (gpsHeading !== null && gpsStatus === 'active' && currentSpeedKph > 4) {
        targetHeadingRef.current = gpsHeading;
      } else if (rawSensorHeading !== null) {
        targetHeadingRef.current = rawSensorHeading;
      } else if (gpsHeading !== null) {
        targetHeadingRef.current = gpsHeading;
      }
    }
  }, [isSimulated, manualHeading, mode, gpsHeading, gpsStatus, currentSpeedKph, rawSensorHeading]);

  // Smooth circular needle animation loop
  useEffect(() => {
    let active = true;

    const animate = () => {
      if (!active) return;
      const target = targetHeadingRef.current;
      const current = currentSmoothedRef.current;

      // Circular shortest-distance interpolation
      const diff = (target - current + 180) % 360 - 180;
      if (Math.abs(diff) > 0.1) {
        const next = normalize(current + diff * 0.18);
        currentSmoothedRef.current = next;
        setSmoothedHeading(next);
      } else {
        currentSmoothedRef.current = target;
        setSmoothedHeading(target);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const displayDegrees = Math.round(smoothedHeading);
  const cardinal = degreesToCardinal(displayDegrees);

  const activeSourceLabel = isSimulated
    ? 'Manual Test'
    : mode === 'gps' || (mode === 'auto' && currentSpeedKph > 4 && gpsHeading !== null)
    ? 'GPS Satellite Course'
    : sensorActive
    ? 'Android Magnetic Sensor'
    : 'Waiting for Motion / GPS';

  return (
    <div className="scrollable" style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <ModuleHeader
        title="Adventure Compass"
        subtitle="Tilt-compensated magnetic bearing & motorcycle lean angle"
        fallbackScreen="cockpit"
        rightAction={
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowCalibModal(true)}
            title="Calibration Info"
            style={{ width: 42, height: 42 }}
          >
            <Info size={18} color="var(--color-accent)" />
          </button>
        }
      />

      {/* Mode Switcher Tabs */}
      <div
        className="card-inset"
        style={{
          display: 'flex',
          padding: 4,
          borderRadius: 14,
          gap: 4,
          background: 'var(--color-surface2)',
        }}
      >
        {(['auto', 'sensor', 'gps'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setIsSimulated(false);
            }}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: mode === m && !isSimulated ? 'var(--color-accent)' : 'transparent',
              color: mode === m && !isSimulated ? '#ffffff' : 'var(--color-text-muted)',
              transition: 'all 0.18s ease',
              textAlign: 'center',
            }}
          >
            {m === 'auto' ? 'Auto (Smart)' : m === 'sensor' ? 'Magnetometer' : 'GPS Course'}
          </button>
        ))}
      </div>

      {/* Main Compass Rose Display */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          gap: 14,
          background: 'var(--color-surface)',
          boxShadow: 'var(--neu-shadow-out)',
        }}
      >
        {/* Large Degree & Cardinal Readout */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 54,
              fontWeight: 900,
              lineHeight: 1,
              color: 'var(--color-text)',
              letterSpacing: -1,
            }}
          >
            {String(displayDegrees).padStart(3, '0')}°
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--color-accent)',
              marginTop: 4,
              letterSpacing: 2,
            }}
          >
            {cardinal}
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>Source:</span>
            <span
              style={{
                color:
                  activeSourceLabel.includes('GPS')
                    ? 'var(--color-nav-blue)'
                    : activeSourceLabel.includes('Android')
                    ? 'var(--color-success)'
                    : 'var(--color-warn)',
                fontWeight: 700,
              }}
            >
              {activeSourceLabel}
            </span>
          </div>
        </div>

        {/* Circular SVG Compass Rose */}
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          {/* Radial Backing Plate */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              boxShadow: 'inset 0 0 18px rgba(0,0,0,0.7), var(--neu-shadow-btn)',
              background: 'radial-gradient(circle, #1a1a20 55%, #0e0e12 100%)',
            }}
          />

          {/* Rotating Compass Dial */}
          <svg
            width={220}
            height={220}
            viewBox="0 0 220 220"
            style={{
              position: 'relative',
              transform: `rotate(${-smoothedHeading}deg)`,
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
            }}
          >
            {/* Outer Rings */}
            <circle cx={110} cy={110} r={100} fill="none" stroke="var(--color-border-bright)" strokeWidth={2} />
            <circle cx={110} cy={110} r={92} fill="none" stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3,3" />

            {/* 36 Tick Marks (every 10°) */}
            {Array.from({ length: 36 }, (_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const isMajor = i % 9 === 0; // 0, 90, 180, 270
              const isSub = i % 3 === 0;   // 30 degrees
              const r1 = isMajor ? 80 : isSub ? 87 : 91;
              const r2 = 98;
              return (
                <line
                  key={i}
                  x1={110 + r1 * Math.sin(angle)}
                  y1={110 - r1 * Math.cos(angle)}
                  x2={110 + r2 * Math.sin(angle)}
                  y2={110 - r2 * Math.cos(angle)}
                  stroke={isMajor ? 'var(--color-text)' : isSub ? 'var(--color-text-muted)' : 'var(--color-border-bright)'}
                  strokeWidth={isMajor ? 2.5 : isSub ? 1.5 : 1}
                />
              );
            })}

            {/* 8 Cardinal & Intercardinal Labels */}
            {[
              ['N', 0, 'var(--color-danger)', 16, 900],
              ['NE', 45, 'var(--color-text-dim)', 10, 700],
              ['E', 90, 'var(--color-text-muted)', 14, 700],
              ['SE', 135, 'var(--color-text-dim)', 10, 700],
              ['S', 180, 'var(--color-text-muted)', 14, 700],
              ['SW', 225, 'var(--color-text-dim)', 10, 700],
              ['W', 270, 'var(--color-text-muted)', 14, 700],
              ['NW', 315, 'var(--color-text-dim)', 10, 700],
            ].map(([label, angle, color, size, weight]) => {
              const rad = (Number(angle) * Math.PI) / 180;
              const r = 70;
              return (
                <text
                  key={String(label)}
                  x={110 + r * Math.sin(rad)}
                  y={110 - r * Math.cos(rad)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={String(color)}
                  fontSize={Number(size)}
                  fontWeight={Number(weight)}
                  fontFamily="var(--font-sans)"
                >
                  {label}
                </text>
              );
            })}

            {/* Vibrant Red North Arrow Pointer */}
            <polygon
              points="110,22 103,110 110,95 117,110"
              fill="var(--color-danger)"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={1}
            />

            {/* Silver South Arrow Tail */}
            <polygon
              points="110,198 103,110 110,125 117,110"
              fill="var(--color-text-muted)"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={1}
            />

            {/* Center Pivot Bezel */}
            <circle cx={110} cy={110} r={10} fill="var(--color-bg)" stroke="var(--color-border-bright)" strokeWidth={2.5} />
            <circle cx={110} cy={110} r={4} fill="var(--color-accent)" />
          </svg>

          {/* Fixed Top Motorcycle Heading Index Arrow (Lubber Line) */}
          <div
            style={{
              position: 'absolute',
              top: 3,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '11px solid var(--color-accent)',
              zIndex: 10,
            }}
          />
        </div>

        {/* Suzuki V-Strom SX 250 Lean Angle & Incline Telemetry */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            width: '100%',
            maxWidth: 320,
          }}
        >
          <div className="card-inset" style={{ textAlign: 'center', padding: '10px 12px' }}>
            <span className="metric-label" style={{ fontSize: 10 }}>MOTO LEAN ANGLE</span>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 800,
                color: Math.abs(leanAngle) > 28 ? 'var(--color-warn)' : 'var(--color-text)',
                marginTop: 2,
              }}
            >
              {Math.abs(leanAngle)}° {leanAngle > 0 ? 'Right' : leanAngle < 0 ? 'Left' : 'Level'}
            </div>
          </div>

          <div className="card-inset" style={{ textAlign: 'center', padding: '10px 12px' }}>
            <span className="metric-label" style={{ fontSize: 10 }}>PITCH / GRADE</span>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--color-text)',
                marginTop: 2,
              }}
            >
              {pitchAngle > 0 ? `+${pitchAngle}°` : `${pitchAngle}°`}
            </div>
          </div>
        </div>
      </div>

      {/* Manual / Testing Slider Drawer */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sliders size={14} color="var(--color-accent)" />
            <span>Desktop / Room Testing Mode</span>
          </div>

          <button
            className={isSimulated ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setIsSimulated(!isSimulated)}
            style={{ fontSize: 11, padding: '3px 10px', minHeight: 28 }}
          >
            {isSimulated ? 'Active' : 'Test Slider'}
          </button>
        </div>

        {isSimulated && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>Manual Degree: {manualHeading}°</span>
              <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{degreesToCardinal(manualHeading)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={359}
              value={manualHeading}
              onChange={(e) => setManualHeading(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
            />
          </div>
        )}
      </div>

      {/* Calibration Modal */}
      {showCalibModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowCalibModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 360, width: '100%', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RotateCcw size={18} color="var(--color-accent)" />
              Android Compass Calibration
            </div>

            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              1. <strong>Figure-8 Motion:</strong> Wave your phone in the air in a slow figure-8 pattern (∞) for 5 seconds to calibrate the magnetometer sensor.<br/><br/>
              2. <strong>Avoid Magnets:</strong> Magnetic tank bags and strong steel handlebars can deflect magnetic North. In <strong>Auto mode</strong>, your GPS course automatically overrides magnetic drift as soon as you ride above 4 km/h.<br/><br/>
              3. <strong>Mount Angle:</strong> This compass automatically compensates for phone tilt when mounted in upright or angled handlebar phone mounts.
            </div>

            <button className="btn btn-primary" onClick={() => setShowCalibModal(false)} style={{ width: '100%' }}>
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
