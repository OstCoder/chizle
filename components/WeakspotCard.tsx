"use client";

import type { Weakspot } from "@/types/analysis";
import { Check, ChevronDown, ListChecks } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";

const AREA_LABEL: Record<Weakspot["area"], string> = {
  skin: "Skin",
  jawline: "Jawline",
  hair: "Hair & Style",
  posture: "Posture",
  expression: "Expression",
  lighting: "Lighting",
  symmetry: "Symmetry",
  framing: "Framing",
  brow: "Brows",
  depth: "Facial Depth",
};

/**
 * Collapsible weakspot row. Collapsed it shows just the area, title, and
 * severity — observations and fixes expand underneath so the Highlights
 * section stays scannable instead of stacking every bullet on the page.
 */
export function WeakspotCard({ spot }: { spot: Weakspot }) {
  return (
    <details className="card group overflow-hidden p-0">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2.5 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">
          {AREA_LABEL[spot.area]}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
          {spot.title}
        </h3>
        <SeverityBadge severity={spot.severity} />
        <ChevronDown className="h-4 w-4 shrink-0 text-white/35 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
            Observations
          </p>
          <ul className="space-y-1 text-[13px] text-white/60">
            {spot.findings.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-accent-400">
            <ListChecks className="h-3 w-3" />
            What to do
          </p>
          <ul className="space-y-1 text-[13px] leading-relaxed text-white/75">
            {spot.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-accent-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
