"use client";

import { useId } from "react";

interface SparklineProps {
  values: number[]; // oldest -> newest
  width?: number;
  height?: number;
  className?: string;
}

/** Minimal trend line in the app's accent colors. Flat/single-point series render as a dot. */
export function Sparkline({
  values,
  width = 104,
  height = 30,
  className,
}: SparklineProps) {
  const gradientId = useId();
  const padded = [4, 4];
  const innerW = width - padded[0] * 2;
  const innerH = height - padded[1] * 2;

  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x =
      values.length === 1
        ? padded[0] + innerW / 2
        : padded[0] + (i / (values.length - 1)) * innerW;
    const y = padded[1] + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fdba74" />
        </linearGradient>
      </defs>
      {values.length === 1 ? (
        <circle cx={points[0].x} cy={points[0].y} r="2.5" fill="#f97316" />
      ) : (
        <polyline
          points={line}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}