"use client";

import Link from "next/link";
import { ArrowRight, Camera, GitCompareArrows } from "lucide-react";
import { ScanPhoto } from "./ScanPhoto";
import { RingChart } from "./RingChart";
import { glowBand, glowScore } from "@/lib/glow";
import type { PersistedAnalysis } from "@/lib/persistence";

interface GlowCardProps {
  entry: PersistedAnalysis | null;
}

/**
 * Central overview: the latest analyzed photo with scanning overlays on the
 * left, the Chizle Score ring + summary on the right. Empty state invites the
 * first scan.
 */
export function GlowCard({ entry }: GlowCardProps) {
  if (!entry) {
    return (
      <section className="card animate-fade-up p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
          Face analysis
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
            <Camera className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Your Chizle journey starts with one scan
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/50">
              Upload a front-facing photo in soft, even light. Everything runs
              in your browser — nothing is uploaded, and the scan becomes the
              baseline for your Chizle Score, trends, and routine.
            </p>
          </div>
          <Link href="/analyze" className="btn-primary">
            Take your first scan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  const report = entry.report;
  const score = glowScore(report);
  const band = glowBand(score);
  const src = entry.image ?? entry.thumb;

  return (
    <section className="card animate-fade-up p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Face analysis
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Your latest scan
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/analyze" className="btn-primary !px-3.5 !py-2 text-xs">
            <Camera className="h-3.5 w-3.5" /> New scan
          </Link>
          <Link
            href="/compare"
            className="btn-secondary !px-3.5 !py-2 text-xs"
          >
            <GitCompareArrows className="h-3.5 w-3.5" /> Compare
          </Link>
        </div>
      </div>

      <div className="mt-5 grid items-center gap-6 md:grid-cols-[minmax(0,5fr),minmax(0,4fr)]">
        <ScanPhoto src={src} alt="Your latest analyzed photo" />

        <div className="flex flex-col items-center text-center">
          <RingChart
            value={score}
            label={String(score)}
            sublabel="Chizle Score"
          />
          <p className="mt-3 text-base font-semibold text-white">
            {band.label}
          </p>
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/50">
            {band.blurb}
          </p>
          <p className="mt-4 max-w-sm rounded-xl bg-white/[0.03] px-4 py-3 text-left text-[13px] leading-relaxed text-white/60 ring-1 ring-white/5">
            {report.summary}
          </p>
        </div>
      </div>
    </section>
  );
}