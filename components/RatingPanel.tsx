"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Flag, Sparkles, Target, TrendingUp } from "lucide-react";
import type { RatingResult } from "@/lib/ratings";
import { cn } from "@/lib/utils";
import { MetricBar } from "./MetricBar";
import { RingChart } from "./dashboard/RingChart";

const BUCKET_ORDER = ["skin", "hair", "structure"] as const;

const BUCKET_ICON: Record<string, string> = {
  skin: "✦",
  hair: "✂",
  structure: "◈",
};

const TIMING_LABEL: Record<string, string> = {
  now: "In your next shot",
  soon: "This week",
  later: "Over time",
};

const TIMING_ACCENT: Record<string, string> = {
  now: "text-amber-300",
  soon: "text-sky-300",
  later: "text-emerald-300",
};

interface RatingPanelProps {
  rating: RatingResult;
  /** Gates the full breakdown — matches the detailed-analysis collapse on the page. */
  expanded: boolean;
  onToggle: () => void;
}

export function RatingPanel({ rating, expanded, onToggle }: RatingPanelProps) {
  const { current, potential, buckets, plan, totalGain } = rating;
  const gainPct = Math.round((potential - current) * 10) / 10;
  const ringValue = current * 10;
  const ringLabel = current.toFixed(1);

  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b])) as Record<
    (typeof BUCKET_ORDER)[number],
    (typeof buckets)[number]
  >;
  const ordered = BUCKET_ORDER.map((k) => byKey[k]).filter(Boolean);

  return (
    <div className="card p-5">
      {/* Headline: overall + potential */}
      <div className="grid items-center gap-5 sm:grid-cols-[auto,1fr]">
        <div className="flex items-center justify-center gap-4">
          <RingChart
            value={ringValue}
            size={132}
            stroke={11}
            label={ringLabel}
            sublabel="Overall"
          />
          <div className="relative hidden h-[104px] w-[3px] rounded-full bg-white/8 sm:block">
            {/* Potential marker sits on the same visual scale as the ring. */}
            <span
              className="absolute -left-[5px] h-3.5 w-3.5 rotate-45 rounded-[3px] bg-accent-400 shadow-[0_0_12px_rgba(249,115,22,0.55)]"
              style={{ top: `${(1 - potential / 10) * 100}%` }}
              title={`Potential ${potential.toFixed(1)}`}
            />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-300">
              Current → Potential
            </p>
            <p className="score-value mt-1 text-2xl text-white">
              {current.toFixed(1)}
              <span className="mx-1.5 font-sans text-white/35">/10</span>
              <span className="text-accent-300">→</span>
              <span className="ml-1.5 text-accent-200">{potential.toFixed(1)}</span>
              <span className="ml-1 font-sans text-sm text-white/40">/10</span>
            </p>
            <p className="mt-1.5 max-w-[34ch] text-xs leading-relaxed text-white/50">
              The gap is what targeted grooming, skincare, and posture habits
              can realistically close — {totalGain > 0 ? `${gainPct} points` : "you're near your ceiling"} from this photo.
            </p>
          </div>
        </div>
      </div>

      {/* Feature-by-feature breakdown */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60 transition-colors hover:text-white"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              expanded && "rotate-180",
            )}
          />
          {expanded ? "Hide feature breakdown" : "Feature-by-feature breakdown"}
        </button>

        {expanded && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ordered.map((bucket) => (
              <div
                key={bucket.key}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-white/85">
                    <span className="text-accent-300">{BUCKET_ICON[bucket.key]}</span>
                    {bucket.label}
                  </p>
                  <p className="score-value text-xs text-white/50">
                    {bucket.score.toFixed(1)}
                    <span className="text-white/30"> → {bucket.potential.toFixed(1)}</span>
                  </p>
                </div>
                <div className="mt-3">
                  <MetricBar
                    label=""
                    value={bucket.score * 10}
                    detail={`potential ${bucket.potential.toFixed(1)}`}
                    tone="warm"
                  />
                </div>
                <ul className="mt-3 space-y-1.5">
                  {bucket.notes.map((n) => (
                    <li key={n} className="text-[13px] leading-relaxed text-white/60">
                      {n}
                    </li>
                  ))}
                </ul>
                {bucket.flags.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                    {bucket.flags.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs leading-relaxed text-amber-200/80">
                        <Flag className="mt-0.5 h-3 w-3 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action plan */}
      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            How to reach your potential
          </h3>
        </div>
        {plan.length === 0 ? (
          <p className="mt-3 text-sm text-emerald-200/85">
            Nothing flagged on this scan — your habits are already at work. Keep the routine steady.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {plan.map((step, i) => (
              <li
                key={step.id}
                className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-500/15 font-mono text-xs font-semibold text-accent-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-medium text-white/90">{step.title}</p>
                    <span className={cn("text-[11px] font-medium", TIMING_ACCENT[step.timing])}>
                      {TIMING_LABEL[step.timing]}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/55">{step.fix}</p>
                </div>
                <span className="ml-1 shrink-0 self-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 font-mono text-[11px] font-medium tabular-nums text-emerald-300">
                  +{step.gain.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-white/40">
            <TrendingUp className="h-3.5 w-3.5" />
            Estimates are cumulative habit nudges, not promises — rescan after a few weeks to measure.
          </p>
          <Link
            href="/habits"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-300 transition-colors hover:text-accent-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Track these habits in your routine
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
