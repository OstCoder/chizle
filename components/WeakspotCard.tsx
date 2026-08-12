"use client";

import type { Weakspot } from "@/types/analysis";
import { Check, ListChecks } from "lucide-react";
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

export function WeakspotCard({ spot }: { spot: Weakspot }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-white/40">
            {AREA_LABEL[spot.area]}
          </span>
          <h3 className="text-base font-semibold leading-snug">{spot.title}</h3>
        </div>
        <SeverityBadge severity={spot.severity} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
            Observations
          </p>
          <ul className="space-y-1.5 text-sm text-white/65">
            {spot.findings.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent-400">
            <ListChecks className="h-3.5 w-3.5" />
            What to do
          </p>
          <ul className="space-y-1.5 text-sm leading-relaxed text-white/80">
            {spot.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
