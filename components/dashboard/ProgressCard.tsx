"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MoveRight, TrendingUp } from "lucide-react";
import { lastScanLabel, progressDeltas } from "@/lib/glow";
import type { PersistedAnalysis } from "@/lib/persistence";

interface ProgressCardProps {
  entries: PersistedAnalysis[]; // newest first
}

/**
 * Before vs Now: a draggable slider crossfades between the oldest and newest
 * scan, with per-metric deltas underneath. Encourages a "watch it move"
 * mindset instead of comparison anxiety.
 */
export function ProgressCard({ entries }: ProgressCardProps) {
  const [slider, setSlider] = useState(0);

  if (entries.length < 2) {
    const count = entries.length;
    return (
      <section className="card animate-fade-up p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
          Progress tracker
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Before vs. now
        </h2>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
            <TrendingUp className="h-5 w-5" />
          </span>
          <p className="max-w-sm text-sm leading-relaxed text-white/55">
            {count === 1
              ? "Your first scan is captured. Scan again in 2–4 weeks under similar light to see how your progress is moving."
              : "Your progress story starts with your first scan. Take one now and we'll track every step from here."}
          </p>
          <Link href="/analyze" className="btn-primary">
            {count === 1 ? "Scan again" : "Take your first scan"}{" "}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  const before = entries[entries.length - 1];
  const now = entries[0];
  const deltas = progressDeltas(before.report, now.report);
  const pct = slider; // 0 = before, 100 = now

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Progress tracker
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Before vs. now
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/50">
          <span>{lastScanLabel(before.savedAt)}</span>
          <MoveRight className="h-3.5 w-3.5 text-accent-400" />
          <span className="text-white">{lastScanLabel(now.savedAt)}</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-ink-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before.image ?? before.thumb}
            alt="Earlier scan"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={now.image ?? now.thumb}
            alt="Latest scan"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: pct / 100 }}
          />
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            Before
          </div>
          <div
            className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
            style={{ opacity: pct / 100 }}
          >
            Now
          </div>
          {/* Divider line following the slider */}
          <div
            className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-white/70"
            style={{ left: `${pct}%` }}
          />
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={slider}
          onChange={(e) => setSlider(Number(e.target.value))}
          aria-label="Compare before and now scans"
          className="mt-4 w-full accent-orange-500"
        />

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {deltas.map((d) => {
            const diff = d.now - d.before;
            const improved = diff > 0;
            const steady = diff === 0;
            return (
              <div
                key={d.label}
                className="rounded-2xl bg-white/[0.03] px-3.5 py-3 text-center ring-1 ring-white/5"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">
                  {d.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {d.format(d.before)}
                  <span className="mx-1 text-white/40">→</span>
                  {d.format(d.now)}
                </p>
                <p
                  className={`mt-0.5 text-xs font-medium ${
                    steady
                      ? "text-white/40"
                      : improved
                        ? "text-accent-300"
                        : "text-rose-300/80"
                  }`}
                >
                  {steady
                    ? "steady"
                    : `${improved ? "+" : ""}${d.format(Math.abs(diff))}`}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-white/45">
          Progress moves in weeks, not days. Re-scanning in similar light keeps
          the comparison honest — small consistent steps are what compound.
        </p>
      </div>
    </section>
  );
}