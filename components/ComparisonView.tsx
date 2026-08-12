"use client";

import type { AnalysisReport, ComparisonReport } from "@/types/analysis";
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Sparkles,
  AlertTriangle,
  Info,
  Camera,
} from "lucide-react";

interface ComparisonViewProps {
  before: AnalysisReport;
  after: AnalysisReport;
  report: ComparisonReport;
  beforeImage?: HTMLImageElement | null;
  afterImage?: HTMLImageElement | null;
  /** True when either side was restored from a previous session. */
  restored?: boolean;
}

export function ComparisonView({
  before,
  after,
  report,
  beforeImage,
  afterImage,
  restored = false,
}: ComparisonViewProps) {
  const { scorecards } = report;
  const scoreDelta =
    Math.round((scorecards.after.overall - scorecards.before.overall) * 10) /
    10;

  return (
    <div className="space-y-6">
      {restored && (
        <p className="text-xs text-white/45">
          Restored from your last session — upload new photos or clear to start
          over.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoCard
          label="Then"
          src={beforeImage?.src}
          verdict={scorecards.before.verdict}
        />
        <PhotoCard
          label="Now"
          src={afterImage?.src}
          verdict={scorecards.after.verdict}
          accent
        />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            Summary
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-white/80">{report.summary}</p>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Camera className="h-4 w-4 text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            Dating score moved
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ScorePill
            label="Then"
            value={scorecards.before.overall}
            tone="text-white/70"
          />
          <ScorePill
            label="Now"
            value={scorecards.after.overall}
            tone="text-accent-300"
          />
          <span
            className={`chip ${
              scoreDelta > 0.05
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : scoreDelta < -0.05
                  ? "border-red-400/30 bg-red-500/10 text-red-200"
                  : "border-white/10 bg-white/5 text-white/60"
            }`}
          >
            <ArrowUp
              className={`h-3.5 w-3.5 ${scoreDelta < 0 ? "rotate-180" : scoreDelta === 0 ? "hidden" : ""}`}
            />
            {scoreDelta > 0 ? "+" : ""}
            {scoreDelta.toFixed(1)} / 10
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <BucketDelta label="Approachability" before={scorecards.before.buckets.approachability.score} after={scorecards.after.buckets.approachability.score} />
          <BucketDelta label="Photo Quality" before={scorecards.before.buckets.photoQuality.score} after={scorecards.after.buckets.photoQuality.score} />
          <BucketDelta label="Style" before={scorecards.before.buckets.style.score} after={scorecards.after.buckets.style.score} />
        </div>
        <p className="mt-3 text-xs text-white/45">
          Verdict:{" "}
          <span className="text-white/70">
            {scorecards.before.verdict.headline}
          </span>{" "}
          →{" "}
          <span className="text-accent-300">
            {scorecards.after.verdict.headline}
          </span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Bucket
          title="Improvements"
          items={report.improvements}
          icon={ArrowUp}
          tone="text-emerald-300"
          chipBg="bg-emerald-500/10"
        />
        <Bucket
          title="Regressions"
          items={report.regressions}
          icon={ArrowDown}
          tone="text-red-300"
          chipBg="bg-red-500/10"
        />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-white/50" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            Steady
          </h2>
        </div>
        {report.neutral.length === 0 ? (
          <p className="text-sm text-white/50">Nothing held steady — every measurement moved.</p>
        ) : (
          <ul className="space-y-2">
            {report.neutral.map((n, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-white/65">
                <Minus className="h-3.5 w-3.5 text-white/30" />
                {n}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            Metric deltas
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <DeltaRow label="Thirds balance" before={before.ratios.thirdsBalance * 100} after={after.ratios.thirdsBalance * 100} suffix="%" />
          <DeltaRow label="Symmetry" before={before.symmetry.overall} after={after.symmetry.overall} suffix="/100" />
          <DeltaRow label="Jawline angle" before={before.ratios.jawlineAngle} after={after.ratios.jawlineAngle} suffix="°" />
          <DeltaRow label="Chin alignment" before={before.posture.chinToCamera * 100} after={after.posture.chinToCamera * 100} suffix="%" />
          <DeltaRow label="Smile" before={before.smile.score} after={after.smile.score} suffix="/100" />
          <DeltaRow label="Brightness" before={before.light.brightness} after={after.light.brightness} suffix="" />
        </div>
      </div>
    </div>
  );
}

function PhotoCard({
  label,
  src,
  verdict,
  accent,
}: {
  label: string;
  src?: string;
  verdict: ComparisonReport["scorecards"]["before"]["verdict"];
  accent?: boolean;
}) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5">
        <span
          className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
            accent ? "text-accent-300" : "text-white/50"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${accent ? "bg-accent-500" : "bg-white/25"}`}
          />
          {label}
        </span>
        <span className="text-xs text-white/55">{verdict.headline}</span>
      </div>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={`${label} photo`}
          className="h-52 w-full bg-white/[0.03] object-contain"
        />
      ) : (
        <div className="grid h-52 w-full place-items-center text-xs text-white/30">
          Photo unavailable
        </div>
      )}
    </div>
  );
}

function ScorePill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-baseline gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
      <span className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      <span className={`text-xl font-semibold ${tone}`}>{value.toFixed(1)}</span>
      <span className="text-xs text-white/40">/10</span>
    </div>
  );
}

function BucketDelta({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  const delta = Math.round((after - before) * 10) / 10;
  const positive = delta > 0.05;
  const negative = delta < -0.05;
  const tone = positive
    ? "text-emerald-300"
    : negative
      ? "text-red-300"
      : "text-white/40";
  const Arrow = positive ? ArrowUp : negative ? ArrowDown : Minus;
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-white/90">
          {after.toFixed(1)}
          <span className="text-xs font-normal text-white/40"> /10</span>
        </span>
        <span className={`flex items-center gap-1 text-xs ${tone}`}>
          <Arrow className="h-3.5 w-3.5" />
          {positive ? "+" : ""}
          {delta.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function Bucket({
  title,
  items,
  icon: Icon,
  tone,
  chipBg,
}: {
  title: string;
  items: string[];
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  chipBg: string;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className={`chip ${chipBg} ${tone}`}>
          <Icon className="h-3.5 w-3.5" />
          {title}
        </span>
        <span className="text-xs text-white/40">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-white/40">Nothing here.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/75">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeltaRow({
  label,
  before,
  after,
  suffix,
}: {
  label: string;
  before: number;
  after: number;
  suffix: string;
}) {
  const delta = after - before;
  const positive = delta > 0.5;
  const negative = delta < -0.5;
  const tone = positive
    ? "text-emerald-300"
    : negative
      ? "text-red-300"
      : "text-white/40";
  const Arrow = positive ? ArrowUp : negative ? ArrowDown : Minus;
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5">
      <div>
        <div className="text-xs text-white/50">{label}</div>
        <div className="mt-0.5 text-sm">
          <span className="text-white/80">{Math.round(before)}</span>
          <span className="mx-1.5 text-white/30">→</span>
          <span className="text-white">{Math.round(after)}</span>
          <span className="text-xs text-white/40">{suffix}</span>
        </div>
      </div>
      <span className={`flex items-center gap-1 text-xs ${tone}`}>
        <Arrow className="h-3.5 w-3.5" />
        {positive ? "+" : ""}
        {Math.round(delta * 10) / 10}
        {suffix}
      </span>
    </div>
  );
}
