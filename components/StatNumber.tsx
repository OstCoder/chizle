"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated, formatted number. Counts up (or down) to `value` with an ease-out
 * curve, renders with tabular figures so digits don't jiggle while counting,
 * and formats with a thousands separator. Re-animates whenever `value`
 * changes — used by the water tracker and anywhere a counter needs to feel
 * alive.
 */
export function StatNumber({
  value,
  format = "int",
  suffix,
  className = "",
  durationMs = 700,
}: {
  value: number;
  /** "int" = 1,234 · "1dp" = 1.2 · "compact" = 1.2 L vs 850 ml handled by caller */
  format?: "int" | "1dp";
  suffix?: string;
  className?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, durationMs]);

  const shown =
    format === "1dp"
      ? display.toFixed(1)
      : Math.round(display).toLocaleString();

  return (
    <span className={`font-mono tabular-nums ${className}`.trim()}>
      {shown}
      {suffix ? (
        <span className="ml-1 text-sm font-normal text-white/40">{suffix}</span>
      ) : null}
    </span>
  );
}
