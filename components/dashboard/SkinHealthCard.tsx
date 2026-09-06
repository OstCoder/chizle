"use client";

import { ArrowDownRight, ArrowUpRight, Leaf } from "lucide-react";
import { skinTrends } from "@/lib/glow";
import type { PersistedAnalysis } from "@/lib/persistence";
import { Sparkline } from "./Sparkline";

interface SkinHealthCardProps {
  entries: PersistedAnalysis[]; // newest first
}

/**
 * Skin health module: evenness / clarity / radiance with per-metric trend
 * lines and a gentle delta vs the previous scan. The metrics are derived
 * from lighting + image-quality signals in the scan — the footnote says so.
 */
export function SkinHealthCard({ entries }: SkinHealthCardProps) {
  const trends = skinTrends(entries);
  const latest = entries[0];

  if (!latest) return null;

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Skincare &amp; facial fitness
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Complexion metrics
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <Leaf className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {trends.map((metric) => {
          const prev =
            entries.length > 1
              ? skinTrends(entries.slice(1))[0].history.at(-1)
              : undefined;
          const delta =
            prev === undefined ? null : metric.value - (prev ?? 0);
          const improved = delta !== null && delta > 0;
          const steady = delta === null || delta === 0;
          return (
            <div key={metric.key}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/80">
                    {metric.label}
                  </span>
                  {delta !== null && !steady && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                        improved ? "text-accent-300" : "text-rose-300/80"
                      }`}
                    >
                      {improved ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {improved ? "+" : ""}
                      {delta}
                    </span>
                  )}
                </div>
                <span className="font-mono text-sm font-semibold text-white">
                  {metric.value}
                  <span className="ml-0.5 text-xs font-normal text-white/40">
                    /100
                  </span>
                </span>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-[width] duration-700"
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
                <Sparkline
                  values={metric.history}
                  className="shrink-0 opacity-80"
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                {metric.note}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-5 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-[11px] leading-relaxed text-white/45 ring-1 ring-white/5">
        Derived from the lighting and image-quality signals in your scan — a
        supportive reflection of how your skin photographs, not a medical or
        dermatological assessment.
      </p>
    </section>
  );
}