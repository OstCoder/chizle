"use client";

import { useId } from "react";

interface RingChartProps {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}

/**
 * Progress ring in the app's accent gradient. The stroke animates in over
 * ~1s when the value changes, giving the dashboard a calm, "measured" feel
 * rather than a clinical gauge.
 */
export function RingChart({
  value,
  size = 156,
  stroke = 13,
  label,
  sublabel,
}: RingChartProps) {
  const gradientId = useId();
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          {label && (
            <p className="text-4xl font-semibold tracking-tight text-white">
              {label}
            </p>
          )}
          {sublabel && (
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
              {sublabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}