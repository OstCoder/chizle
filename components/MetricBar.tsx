"use client";

import { cn } from "@/lib/utils";

interface MetricBarProps {
  label: string;
  value: number; // 0..100
  detail?: string;
  className?: string;
  tone?: "default" | "warm" | "cool";
}

export function MetricBar({
  label,
  value,
  detail,
  className,
  tone = "default",
}: MetricBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const fill =
    tone === "warm"
      ? "from-accent-500 to-accent-300"
      : tone === "cool"
        ? "from-sky-500 to-sky-300"
        : "from-white/40 to-white/20";
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-white/70">{label}</span>
        <span className="font-mono text-xs text-white/50">
          {Math.round(pct)}{detail ? ` · ${detail}` : ""}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
