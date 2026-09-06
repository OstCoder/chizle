"use client";

import type {
  ActionTiming,
  AnalysisReport,
  LandmarkPoint,
  Weakspot,
} from "@/types/analysis";
import { CalendarDays, TrendingUp, Zap } from "lucide-react";
import { MeshOverlay } from "./MeshOverlay";
import { MetricBar } from "./MetricBar";
import { WeakspotCard } from "./WeakspotCard";
import { HairCard } from "./HairCard";
import { UNKNOWN_HAIR } from "@/lib/hair";
import { Meter, Tags, Brain, Smile, Sparkles } from "./icons";

interface AnalysisViewProps {
  report: AnalysisReport;
  image: HTMLImageElement | null;
  landmarks: LandmarkPoint[] | null;
}

export function AnalysisView({ report, image, landmarks }: AnalysisViewProps) {
  const width = image?.naturalWidth ?? 0;
  const height = image?.naturalHeight ?? 0;
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[460px,minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="card overflow-hidden p-1">
          <MeshOverlay
            image={image}
            landmarks={landmarks}
            width={width}
            height={height}
          />
        </div>
        <div className="card p-4">
          <Summary report={report} />
        </div>
      </div>
      <div className="min-w-0 space-y-6">
        <HairCard shape={report.shape} hair={report.hair ?? UNKNOWN_HAIR} />
        <HighlightsCard report={report} />
      </div>
    </div>
  );
}

function Summary({ report }: { report: AnalysisReport }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="chip bg-white/5 text-white/70">
          {report.angle === "front"
            ? "Front view"
            : report.angle === "45"
              ? "45°"
              : report.angle === "profile"
                ? "Profile"
                : "Unknown angle"}
        </span>
        <span className="chip bg-accent-500/10 text-accent-300">
          {report.shape.charAt(0).toUpperCase() + report.shape.slice(1)} face
        </span>
      </div>
      <p className="text-sm leading-relaxed text-white/75">{report.summary}</p>
    </div>
  );
}

interface HighlightMeter {
  id: string;
  label: string;
  value: number;
  detail: string;
}

// Strength threshold: a meter has to clear ~70/100 before we celebrate it
// as "already working well". Below that we still show the top readings but
// label them as plain "top measurements" instead of a strength callout.
const STRENGTH_THRESHOLD = 70;

// Each meter maps to the Weakspot.id values whose presence would conflict
// with the meter being shown as a strength. We use Weakspot.id (granular:
// "expression-neutral", "smile-asymmetry", "eyes-squint", "posture-chin",
// etc.) instead of Weakspot.area (too coarse: e.g. every "expression"-area
// weakspot would otherwise exclude both the smile and eyes meters). A photo
// with symmetry 73 would trigger the symmetry weakspot (<75) AND a strength
// callout (>=70) without this filter, producing a contradictory left/right
// column.
// Tighten the key type to HighlightMeter["id"] so a typo like "Symmetry"
// surfaces as a TS error instead of silently making the meter permanently
// un-conflicted.
const METER_CONFLICT_IDS: Record<HighlightMeter["id"], string[]> = {
  symmetry: ["symmetry"],
  thirds: [],
  chin: ["posture-chin"],
  smile: ["expression-neutral", "smile-asymmetry"],
  eyes: ["eyes-squint"],
};

function HighlightsCard({ report }: { report: AnalysisReport }) {
  const eyeAvg = (report.eyes.leftOpen + report.eyes.rightOpen) / 2;
  // Lighting is intentionally not a highlight meter here: it's not an
  // improvement area for the analyze view (it belongs to the dating scorecard).
  const meters: HighlightMeter[] = [
    { id: "symmetry", label: "Symmetry", value: report.symmetry.overall, detail: "/100" },
    { id: "thirds", label: "Thirds balance", value: report.ratios.thirdsBalance * 100, detail: "%" },
    { id: "chin", label: "Chin level", value: report.posture.chinToCamera * 100, detail: "%" },
    { id: "eyes", label: "Eye openness", value: (eyeAvg / 0.32) * 100, detail: "%" },
    { id: "smile", label: "Smile", value: report.smile.score, detail: "/100" },
  ];

  // Cross-reference meters to currently-flagged weakspot ids. A meter is
  // "conflicted" if any of its conflict ids is already a weakspot. Using
  // Set<string> also lets us accept the `string` literals from the conflict
  // map without forcing a cast on every .has() call.
  const flaggedIds = new Set(report.weakspots.map((s) => s.id));
  const isConflicted = (m: HighlightMeter) =>
    (METER_CONFLICT_IDS[m.id] ?? []).some((id) => flaggedIds.has(id));

  // Three-tier selection so the section is never empty AND so the section
  // header never disagrees with the cards inside it. Every tier sorts by
  // raw value (no hard-coded priority) and takes the top 2.
  const allConflicted = meters.every(isConflicted);
  const nonConflictedMeters = meters.filter((m) => !isConflicted(m));
  const strengthCandidates = nonConflictedMeters.filter(
    (m) => m.value >= STRENGTH_THRESHOLD,
  );
  const isStrengthsSet = strengthCandidates.length > 0;

  const displayedStrengths = isStrengthsSet
    ? [...strengthCandidates].sort((a, b) => b.value - a.value).slice(0, 2)
    : allConflicted
      ? [...meters].sort((a, b) => b.value - a.value).slice(0, 2)
      : [...nonConflictedMeters]
          .sort((a, b) => b.value - a.value)
          .slice(0, 2);

  const strengthsLabel = isStrengthsSet ? "Already working well" : "Top measurements";
  const strengthsCaption = isStrengthsSet
    ? "The metrics this photo already scores well on."
    : allConflicted
      ? "This photo has flags across the board — focus on the cards on the left for actionable fixes."
      : "No unflagged metric crossed the strength bar yet, but these are your highest readings.";

  // Card styling — tied to the section label, NOT per-card threshold. This
  // is how we ensure the header never disagrees with the cards inside it.
  const cardShell = isStrengthsSet
    ? "border-emerald-500/20 bg-emerald-500/[0.04]"
    : "border-white/10 bg-white/[0.03]";
  const cardLabelCls = isStrengthsSet ? "text-emerald-200/70" : "text-white/40";

  // Group actions from immediate to long-term so the page reads as a
  // prioritized plan rather than a flat list.
  const TIMING_GROUPS: {
    timing: ActionTiming;
    label: string;
    caption: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }[] = [
    {
      timing: "now",
      label: "Do this now",
      caption: "Fix it in the next shot",
      icon: Zap,
      accent: "text-amber-300",
    },
    {
      timing: "soon",
      label: "This week",
      caption: "Grooming & habits",
      icon: CalendarDays,
      accent: "text-sky-300",
    },
    {
      timing: "later",
      label: "Over time",
      caption: "Slow, consistent work",
      icon: TrendingUp,
      accent: "text-emerald-300",
    },
  ];

  // Legacy persisted reports predate the timing field — default them to
  // "soon" so they still land in a group instead of vanishing.
  const timingOf = (s: Weakspot): ActionTiming => s.timing ?? "soon";
  const groupedSpots = TIMING_GROUPS.map((g) => ({
    ...g,
    spots: report.weakspots.filter((s) => timingOf(s) === g.timing),
  })).filter((g) => g.spots.length > 0);
  const totalSpots = report.weakspots.length;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-accent-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
          Highlights
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Areas to focus on — worst stats with practical fixes, ordered now → later */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
              What to work on
            </h3>
          </div>
          {totalSpots === 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200/85">
              Nothing flagged — this photo checks out cleanly.
              <span className="mt-1 block text-xs text-emerald-200/55">
                Try <code>/compare</code> for an A/B before/after view.
              </span>
            </div>
          ) : (
            groupedSpots.map((g) => (
              <div key={g.timing} className="space-y-2">
                <div className="flex items-baseline gap-2 pt-1">
                  <g.icon className={`h-3.5 w-3.5 ${g.accent}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {g.label}
                  </span>
                  <span className="text-[10px] text-white/35">{g.caption}</span>
                </div>
                {g.spots.slice(0, 2).map((s: Weakspot) => (
                  <WeakspotCard key={s.id} spot={s} />
                ))}
                {g.spots.length > 2 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer select-none text-white/45 transition-colors hover:text-white/75">
                      + {g.spots.length - 2} more
                    </summary>
                    <div className="mt-2 grid gap-2">
                      {g.spots.slice(2).map((s: Weakspot) => (
                        <WeakspotCard key={s.id} spot={s} />
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))
          )}
        </section>

        {/* Best stats — top unflagged readings */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles
              className={`h-3.5 w-3.5 ${
                isStrengthsSet ? "text-emerald-300" : "text-white/40"
              }`}
            />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
              {strengthsLabel}
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-white/45">
            {strengthsCaption}
          </p>
          {!allConflicted && (
            <ul className="space-y-2">
              {displayedStrengths.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl border px-3 py-2.5 ${cardShell}`}
                >
                  <div className={`text-[11px] uppercase tracking-wider ${cardLabelCls}`}>
                    {m.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-sm font-medium text-white/90">
                      {Math.round(m.value)}
                    </span>
                    <span className="text-xs text-white/45">{m.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Full measurements disclosure — opt-in raw data */}
      <details className="mt-5 group">
        <summary className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/45 transition-colors hover:text-white/75">
          View all measurements
          <span className="text-[10px] text-white/30 transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
          {meters.map((m) => (
            <MetricBar
              key={m.id}
              label={m.label}
              value={m.value}
              detail={m.detail}
            />
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            icon={<Tags className="h-3.5 w-3.5" />}
            label="Face shape"
            value={report.shape}
          />
          <Stat
            icon={<Meter className="h-3.5 w-3.5" />}
            label="Facial index"
            value={report.ratios.facialIndex.toFixed(2)}
          />
          <Stat
            icon={<Smile className="h-3.5 w-3.5" />}
            label="Jawline angle"
            value={`${Math.round(report.ratios.jawlineAngle)}°`}
          />
        </div>
      </details>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-medium capitalize text-white/85">
        {value}
      </div>
    </div>
  );
}
