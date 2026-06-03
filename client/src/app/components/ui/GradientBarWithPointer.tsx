// GradientBarWithPointer.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';

interface GradientBarWithPointerProps {
  value: number; // -1 to 1
  /** Sentiment word shown in the readout (e.g. "Positive"). */
  label?: string;
  height?: number;
  pointerSize?: number;
  className?: string;
}

// Five ticks (every 0.5) instead of 21 — far less clutter, still readable.
const TICKS = [-1, -0.5, 0, 0.5, 1];

export const GradientBarWithPointer: React.FC<GradientBarWithPointerProps> = ({
  value,
  label,
  height = 24,
  pointerSize = 20,
  className = '',
}) => {
  const { isDark, t } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(0);

  const clamped = Math.max(-1, Math.min(1, value));
  const percent = ((clamped + 1) / 2) * 100;
  const signedValue = `${clamped >= 0 ? '+' : ''}${clamped.toFixed(2)}`;

  // Readout / zone colours follow the same thresholds the gradient implies.
  const readoutColor =
    clamped >= 0.1 ? 'text-emerald-500' : clamped <= -0.1 ? 'text-rose-500' : isDark ? 'text-amber-400' : 'text-amber-500';
  const tickLabelColor = isDark ? '#94a3b8' : '#64748b';
  const boundaryLabelColor = isDark ? '#e2e8f0' : '#1e293b';
  const zoneTextClass = isDark ? 'text-slate-500' : 'text-gray-400';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => setBarWidth(container.clientWidth);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver((entries) => {
      setBarWidth(entries[0]?.contentRect.width ?? container.clientWidth);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const pointerLeft = useMemo(() => {
    if (!barWidth) return `calc(${percent}% - ${pointerSize / 2}px)`;
    const rawX = (percent / 100) * barWidth;
    const clampedX = Math.max(pointerSize / 2, Math.min(barWidth - pointerSize / 2, rawX));
    return `${clampedX - pointerSize / 2}px`;
  }, [barWidth, percent, pointerSize]);

  // On very narrow bars, show only the -1 / 0 / +1 labels.
  const labelTicks = barWidth > 0 && barWidth < 280 ? [-1, 0, 1] : TICKS;
  const labelFontSize = barWidth < 320 ? 10 : 11;

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {/* Readout: sentiment word + signed polarity value */}
      <div className="flex items-center justify-between mb-1">
        {label ? <span className={`text-sm font-semibold ${readoutColor}`}>{label}</span> : <span />}
        <span className={`text-sm font-semibold tabular-nums ${readoutColor}`}>{signedValue}</span>
      </div>

      {/* Pointer Triangle (above bar) */}
      <div className="relative mb-1.5" style={{ height: pointerSize + 2 }}>
        <div
          className="absolute"
          style={{ left: pointerLeft, top: 2, width: pointerSize, height: pointerSize, pointerEvents: 'none' }}
        >
          <svg width={pointerSize} height={pointerSize} viewBox={`0 0 ${pointerSize} ${pointerSize}`}>
            {/* Triangle pointing down — indigo accent reads on both themes */}
            <polygon
              points={`${pointerSize / 2},${pointerSize} 0,0 ${pointerSize},0`}
              fill="#6366f1"
              stroke="#ffffff"
              strokeWidth="1.5"
              filter="drop-shadow(0 2px 3px rgba(0,0,0,0.35))"
            />
          </svg>
        </div>
      </div>

      {/* Bar with tick marks */}
      <div className="relative w-full flex items-center" style={{ height }}>
        {/* Gradient: rose (negative) -> amber (neutral) -> emerald (positive) */}
        <div
          className="w-full rounded-full shadow-md"
          style={{
            height: height - 4,
            background: 'linear-gradient(90deg, #f43f5e 0%, #f59e0b 50%, #10b981 100%)',
          }}
        />

        {/* Tick marks (vertical lines) */}
        <div className="absolute inset-0 w-full" style={{ pointerEvents: 'none' }}>
          {TICKS.map((tick) => {
            const tickPercent = ((tick + 1) / 2) * 100;
            const isBoundary = Math.abs(tick) === 1 || tick === 0;
            return (
              <div
                key={tick}
                className="absolute"
                style={{
                  left: `${tickPercent}%`,
                  top: 0,
                  width: isBoundary ? '2.5px' : '1.5px',
                  height: '100%',
                  backgroundColor: isBoundary ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                  transform: 'translateX(-50%)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Numeric labels below the bar */}
      <div className="relative w-full mt-2" style={{ height: 16 }}>
        {labelTicks.map((tick) => {
          const tickPercent = ((tick + 1) / 2) * 100;
          const isBoundary = Math.abs(tick) === 1;
          const positionStyle =
            tick === -1
              ? { left: '0%', transform: 'none' as const }
              : tick === 1
                ? { left: '100%', transform: 'translateX(-100%)' as const }
                : { left: `${tickPercent}%`, transform: 'translateX(-50%)' as const };
          return (
            <div
              key={tick}
              className="absolute text-center whitespace-nowrap tabular-nums"
              style={{
                top: 0,
                color: isBoundary ? boundaryLabelColor : tickLabelColor,
                fontWeight: isBoundary ? 700 : 500,
                fontSize: `${labelFontSize}px`,
                lineHeight: 1,
                ...positionStyle,
              }}
            >
              {tick.toFixed(1)}
            </div>
          );
        })}
      </div>

      {/* Zone words: negative | neutral | positive */}
      <div className={`flex justify-between mt-1 text-[10px] font-mono uppercase tracking-wide ${zoneTextClass}`}>
        <span>{t.negative}</span>
        <span>{t.neutral}</span>
        <span>{t.positive}</span>
      </div>
    </div>
  );
};
