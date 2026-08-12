"use client";

import type { Weakspot } from "@/types/analysis";
import { cn } from "@/lib/utils";

const STYLES: Record<Weakspot["severity"], string> = {
  high: "bg-red-500/15 text-red-300 ring-red-400/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  low: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
};

const LABEL: Record<Weakspot["severity"], string> = {
  high: "High priority",
  medium: "Worth fixing",
  low: "Small polish",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Weakspot["severity"];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "chip ring-1 ring-inset",
        STYLES[severity],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABEL[severity]}
    </span>
  );
}
