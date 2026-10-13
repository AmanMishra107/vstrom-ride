import { useMemo } from 'react';

interface SpeedometerProps {
  speedKph: number;
  maxKph?: number;
  unit: 'kph' | 'mph';
  warnThreshold?: number;
  maxSpeedKph?: number;
  avgSpeedKph?: number;
  isReliable?: boolean;
}

const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 88;
const STROKE = 14;

// Arc: 230° sweep, starting at 155° (bottom-left)
const START_DEG = 135;
const SWEEP_DEG = 270;
const MAX_SPEED_KPH = 200;

function degToRad(d: number) { return (d * Math.PI) / 180; }

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = degToRad(startDeg);
  const e = degToRad(endDeg);
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function Speedometer({
  speedKph,
  unit = 'kph',
  warnThreshold = 120,
  maxSpeedKph = 0,
  avgSpeedKph = 0,
  isReliable = true,
}: SpeedometerProps) {
  const displaySpeed = unit === 'mph' ? Math.round(speedKph * 0.621371) : Math.round(speedKph);
  const displayMax = unit === 'mph' ? Math.round(maxSpeedKph * 0.621371) : Math.round(maxSpeedKph);
  const displayAvg = unit === 'mph' ? Math.round(avgSpeedKph * 0.621371) : Math.round(avgSpeedKph);

  const fraction = Math.min(speedKph / MAX_SPEED_KPH, 1);
  const isWarning = speedKph >= warnThreshold && isReliable;
  const arcColor = isWarning ? 'var(--color-danger)' : 'var(--color-accent)';

  // Tick marks
  const ticks = useMemo(() => {
    const result = [];
    const major = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
    for (const v of major) {
      const angle = START_DEG + (v / MAX_SPEED_KPH) * SWEEP_DEG;
      const rad = degToRad(angle);
      const outerR = RADIUS + 4;
      const innerR = RADIUS - 6;
      result.push({
        x1: CX + innerR * Math.cos(rad),
        y1: CY + innerR * Math.sin(rad),
        x2: CX + outerR * Math.cos(rad),
        y2: CY + outerR * Math.sin(rad),
        label: v,
        labelX: CX + (RADIUS - 20) * Math.cos(rad),
        labelY: CY + (RADIUS - 20) * Math.sin(rad),
      });
    }
    return result;
  }, []);

  // Needle
  const needleAngle = START_DEG + fraction * SWEEP_DEG;
  const needleRad = degToRad(needleAngle);
  const needleLen = RADIUS - 18;
  const nx = CX + needleLen * Math.cos(needleRad);
  const ny = CY + needleLen * Math.sin(needleRad);

  // Background arc (full track)
  const trackPath = arcPath(CX, CY, RADIUS, START_DEG, START_DEG + SWEEP_DEG);
  // Active arc
  const activePath = arcPath(CX, CY, RADIUS, START_DEG, START_DEG + fraction * SWEEP_DEG);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          position: 'relative',
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          background: 'var(--color-surface)',
          boxShadow: 'var(--neu-shadow-in)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Background track */}
          <path d={trackPath} fill="none" stroke="var(--color-surface3)" strokeWidth={STROKE}
            strokeLinecap="round" />
          {/* Active arc */}
          {fraction > 0.003 && (
            <path d={activePath} fill="none" stroke={arcColor} strokeWidth={STROKE}
              strokeLinecap="round"
              style={{ transition: 'stroke 0.3s, d 0.25s ease-out' }}
            />
          )}
          {/* Glow */}
          {fraction > 0.003 && (
            <path d={activePath} fill="none" stroke={arcColor} strokeWidth={STROKE + 8}
              strokeLinecap="round" opacity={0.12} />
          )}
          {/* Ticks */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke="var(--color-border-bright)" strokeWidth={1.5} />
              {t.label % 40 === 0 && (
                <text x={t.labelX} y={t.labelY} textAnchor="middle" dominantBaseline="middle"
                  fill="var(--color-text-dim)" fontSize={9} fontFamily="var(--font-mono)">
                  {t.label}
                </text>
              )}
            </g>
          ))}
          {/* Needle */}
          {isReliable && (
            <line x1={CX} y1={CY} x2={nx} y2={ny}
              stroke={isWarning ? 'var(--color-danger)' : 'var(--color-text)'}
              strokeWidth={2.5} strokeLinecap="round"
              style={{ transition: 'x2 0.25s ease-out, y2 0.25s ease-out' }}
            />
          )}
          {/* Center dot */}
          <circle cx={CX} cy={CY} r={6} fill={isWarning ? 'var(--color-danger)' : 'var(--color-accent)'} />
          <circle cx={CX} cy={CY} r={3} fill="var(--color-bg)" />
        </svg>

        {/* Speed digital display */}
        <div style={{
          position: 'absolute', top: '52%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          background: 'var(--color-surface)',
          padding: '6px 12px',
          borderRadius: 14,
          boxShadow: 'var(--neu-shadow-out)',
          minWidth: 92,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: isReliable ? 48 : 38,
            fontWeight: 900,
            lineHeight: 1,
            color: isWarning ? 'var(--color-danger)' : 'var(--color-text)',
            letterSpacing: -2,
            transition: 'color 0.3s',
          }}>
            {isReliable ? displaySpeed : '--'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2, letterSpacing: 1 }}>
            {unit.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Sub metrics */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="metric-label">Max</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--color-speed)' }}>
            {displayMax} <span className="metric-unit">{unit}</span>
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--color-border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div className="metric-label">Avg</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--color-nav-blue)' }}>
            {displayAvg} <span className="metric-unit">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
