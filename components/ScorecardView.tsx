"use client";

import type { ScorecardReport } from "@/types/analysis";
import {
  ShieldCheck,
  Sparkles,
  Camera,
  Heart,
  Wrench,
  Smartphone,
  Users,
} from "lucide-react";
import { CopyButton } from "./CopyButton";
import { formatScorecardTips, scorecardModeLabel } from "@/lib/share";

const ICON_BY_VERDICT = {
  primary: ShieldCheck,
  secondary: Sparkles,
  fix: Wrench,
  reframe: Sparkles,
} as const;

const TONE_BY_VERDICT = {
  primary: "text-emerald-300 bg-emerald-500/10",
  secondary: "text-sky-300 bg-sky-500/10",
  fix: "text-amber-300 bg-amber-500/10",
  reframe: "text-violet-300 bg-violet-500/10",
} as const;

export function ScorecardView({
  report,
  image,
  copyText,
}: {
  report: ScorecardReport;
  image?: HTMLImageElement | null;
  /** When provided, a "Copy report" button is rendered in the header. */
  copyText?: string;
}) {
  const Icon = ICON_BY_VERDICT[report.verdict.bucket];
  const ModeIcon = report.mode === "app" ? Smartphone : Users;
  const modeLabel = scorecardModeLabel(report.mode);
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`chip ${TONE_BY_VERDICT[report.verdict.bucket]} ring-1 ring-inset ring-white/5`}>
                <Icon className="h-3.5 w-3.5" />
                {report.verdict.bucket === "primary"
                  ? "Primary photo"
                  : report.verdict.bucket === "secondary"
                    ? "Secondary"
                    : report.verdict.bucket === "fix"
                      ? "Worth fixing"
                      : "Recapture"}
              </span>
              <span className="chip bg-white/5 text-white/55 ring-1 ring-inset ring-white/10">
                <ModeIcon className="h-3.5 w-3.5" />
                {modeLabel}
              </span>
              {copyText && (
                <CopyButton
                  text={copyText}
                  label="Copy report"
                  className="ml-auto"
                />
              )}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {report.verdict.headline}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-white/60">
              {report.verdict.reason}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={image.src}
                alt="Scored photo"
                className="h-24 w-24 rounded-2xl border border-white/10 bg-white/[0.03] object-cover"
              />
            )}
            <div className="grid h-24 w-24 place-items-center rounded-2xl border border-white/10 bg-white/5">
              <div className="text-center">
                <div className="text-3xl font-semibold tracking-tight">
                  {report.overall.toFixed(1)}
                </div>
                <div className="text-xs text-white/50">/10</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <BucketCard icon={Heart} title={report.buckets.approachability.label} bucket={report.buckets.approachability} />
        <BucketCard icon={Camera} title={report.buckets.photoQuality.label} bucket={report.buckets.photoQuality} />
        <BucketCard icon={Sparkles} title={report.buckets.style.label} bucket={report.buckets.style} />
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-accent-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            Tips
          </h2>
          <CopyButton
            text={formatScorecardTips(report)}
            label="Copy tips"
            className="ml-auto"
          />
        </div>
        <ul className="space-y-2">
          {report.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/75">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BucketCard({
  icon: Icon,
  title,
  bucket,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  bucket: ScorecardReport["buckets"]["approachability"];
}) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">{bucket.score.toFixed(1)}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            {bucket.band}
          </div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300"
          style={{ width: `${(bucket.score / 10) * 100}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {bucket.notes.map((note, i) => (
          <li key={i} className="text-xs text-white/55">
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}
