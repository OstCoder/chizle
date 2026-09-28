"use client";

import { useMemo, useState } from "react";
import { Info, LineChart as LineChartIcon } from "lucide-react";
import type { PersistedAnalysis } from "@/lib/persistence";
import { rateFace } from "@/lib/ratings";
import { cn } from "@/lib/utils";
import type { ImageQuality } from "@/types/analysis";

interface TrackerPoint {
  savedAt: string;
  date: string;
  thumb: string; // small data-URL preview shown in the hover tooltip card
  shape: string; // face shape recorded by that scan (FaceShape)
  quality: ImageQuality; // photo-quality verdict recorded with that scan
  overall: number; // 0..10 face rating
  symmetry: number; // 0..100
  jawline: number; // 0..100 (sharpness, inverted angle read)
  clarity: number; // 0..100 (skin clarity proxy)
}

interface SeriesDef {
  key: keyof Pick<TrackerPoint, "symmetry" | "jawline" | "clarity">;
  label: string;
  color: string; // tailwind text color class for the legend
  stroke: string; // svg stroke
}

const SERIES: SeriesDef[] = [
  {
    key: "symmetry",
    label: "Symmetry",
    color: "text-sky-300",
    stroke: "#7dd3fc",
  },
  {
    key: "jawline",
    label: "Jawline sharpness",
    color: "text-accent-300",
    stroke: "#fb923c",
  },
  {
    key: "clarity",
    label: "Skin clarity",
    color: "text-emerald-300",
    stroke: "#6ee7b7",
  },
];

const W = 640;
const H = 240;
const PAD = { top: 16, right: 14, bottom: 26, left: 30 };

/** Map a 0..100 value to an SVG y coordinate. */
function yFor(v: number): number {
  const inner = H - PAD.top - PAD.bottom;
  return PAD.top + inner * (1 - Math.max(0, Math.min(100, v)) / 100);
}

/** Map index to an SVG x coordinate. */
function xFor(i: number, count: number): number {
  const inner = W - PAD.left - PAD.right;
  if (count <= 1) return PAD.left + inner / 2;
  return PAD.left + inner * (i / (count - 1));
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Exact calendar date for the tooltip card, e.g. "Sep 24, 2026". */
function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Clock time the scan was saved, e.g. "7:42 PM". */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Tone + label for the photo-quality chip in the tooltip card. */
const QUALITY_META: Record<ImageQuality, { label: string; className: string }> = {
  good: {
    label: "Good photo",
    className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  },
  ok: {
    label: "Fair photo",
    className: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  },
  poor: {
    label: "Poor photo",
    className: "border-red-400/25 bg-red-500/10 text-red-200",
  },
};

/**
 * Trend vs the previous scan on the timeline: ▲3 / ▼2 (or ▲0.4 for the
 * 0..10 overall), colored by direction. The first scan has nothing to
 * compare against and renders an em dash.
 */
function Delta({
  value,
  prev,
  digits = 0,
}: {
  value: number;
  prev?: number;
  digits?: number;
}) {
  if (prev === undefined) return <span className="text-white/30">—</span>;
  const d = Number((value - prev).toFixed(digits));
  if (d === 0) return <span className="text-white/35">·0</span>;
  return (
    <span className={d > 0 ? "text-emerald-300" : "text-red-300"}>
      {d > 0 ? "▲" : "▼"}
      {Math.abs(d).toFixed(digits)}
    </span>
  );
}

/**
 * Glow-Up Progress Tracker: plots the scan history (newest → oldest, shown
 * oldest → newest) as interactive lines for symmetry, jawline sharpness, and
 * skin clarity. Hovering (or tapping, on touch) a point on the timeline opens
 * a rich tooltip card with that day's scan thumbnail, exact date, and the
 * metrics recorded at that time.
 */
export function ProgressTracker({ history }: { history: PersistedAnalysis[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);

  // Oldest → newest for left-to-right charting; requires a detected face so
  // legacy/no-face entries don't plot zeros.
  const points = useMemo<TrackerPoint[]>(
    () =>
      [...history]
        .reverse()
        .filter((e) => e.report.imageQuality.hasFace)
        .map((e) => {
          const rating = rateFace(e.report);
          return {
            savedAt: e.savedAt,
            date: shortDate(e.savedAt),
            thumb: e.thumb,
            shape: e.report.shape,
            quality: e.report.imageQuality.quality,
            overall: rating.current,
            symmetry: Math.round(e.report.symmetry.overall),
            // Jawline sharpness: angle reads sharper when smaller, so invert
            // into a 0..100 "sharpness" score (bell around the ~100° ideal).
            jawline: Math.round(
              Math.max(0, 1 - Math.abs(e.report.ratios.jawlineAngle - 100) / 30) * 100,
            ),
            clarity: Math.round(
              Math.min(
                100,
                e.report.light.sharpness * 70 +
                  (e.report.imageQuality.quality === "good"
                    ? 30
                    : e.report.imageQuality.quality === "ok"
                      ? 20
                      : 10),
              ),
            ),
          };
        }),
    [history],
  );

  const visible = SERIES.filter((s) => !hidden.has(s.key));

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (points.length === 0) {
    return (
      <div className="card flex min-h-[180px] flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/5">
          <LineChartIcon className="h-5 w-5 text-white/45" />
        </span>
        <p className="text-sm font-medium">No trend yet</p>
        <p className="max-w-sm text-xs leading-relaxed text-white/45">
          Scan a couple of photos over the next weeks and your symmetry,
          jawline, and clarity lines will appear here automatically — each scan
          is saved with its date and scores.
        </p>
      </div>
    );
  }

  // With one point there is no line to draw — show the baseline as dots.
  const multi = points.length > 1;
  const innerW = W - PAD.left - PAD.right;

  // Floating tooltip state: the hovered point plus a clamped horizontal
  // offset so the card never spills past the chart's left/right edges.
  const hoverIdx = hover !== null && points[hover] ? hover : null;
  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;
  // The scan just before the hovered one (timeline is oldest → newest), so
  // the card can show how each metric moved since the last visit.
  const prevPoint =
    hoverIdx !== null && hoverIdx > 0 ? points[hoverIdx - 1] : null;
  const hoverPct = hoverIdx !== null ? xFor(hoverIdx, points.length) / W : 0;
  const tooltipTx = hoverPct < 0.22 ? "0%" : hoverPct > 0.78 ? "-100%" : "-50%";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Glow-Up Progress Tracker
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Your trends over time
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {SERIES.map((s) => {
            const off = hidden.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                aria-pressed={!off}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  off
                    ? "border-white/10 bg-white/[0.02] text-white/35"
                    : "border-white/15 bg-white/[0.05] text-white/80",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", off ? "bg-white/25" : "")} style={!off ? { background: s.stroke } : undefined} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="relative w-full min-w-[520px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Line chart of symmetry, jawline sharpness, and skin clarity across your scans"
          onPointerLeave={(e) => {
            // Touch keeps the card up until the next tap; mouse clears on exit.
            if (e.pointerType !== "touch") setHover(null);
          }}
        >
          {/* Horizontal gridlines */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={yFor(v) + 3}
                textAnchor="end"
                className="fill-white/30"
                fontSize="9"
              >
                {v}
              </text>
            </g>
          ))}

          {/* X labels: first / middle / last scan dates */}
          {points.length > 1 && (
            <>
              <text x={PAD.left} y={H - 8} className="fill-white/35" fontSize="9">
                {points[0].date}
              </text>
              <text
                x={W - PAD.right}
                y={H - 8}
                textAnchor="end"
                className="fill-white/35"
                fontSize="9"
              >
                {points[points.length - 1].date}
              </text>
            </>
          )}

          {/* Series lines + dots */}
          {visible.map((s) => {
            const path = points
              .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i, points.length)},${yFor(p[s.key])}`)
              .join(" ");
            return (
              <g key={s.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={s.stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={xFor(i, points.length)}
                    cy={yFor(p[s.key])}
                    r={hover === i ? 4.5 : 2.5}
                    fill={s.stroke}
                    className="transition-[r] duration-150"
                  />
                ))}
              </g>
            );
          })}

          {/* Hover targets + vertical guide */}
          {points.map((p, i) => (
            <g key={p.savedAt + i}>
              <rect
                x={xFor(i, points.length) - innerW / points.length / 2}
                y={0}
                width={innerW / points.length}
                height={H - PAD.bottom}
                fill="transparent"
                onPointerEnter={(e) => {
                  // Touch selects on pointerdown instead, so a second tap on
                  // the same column can dismiss the card again.
                  if (e.pointerType !== "touch") setHover(i);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === "touch") {
                    setHover((prev) => (prev === i ? null : i));
                  } else {
                    setHover(i);
                  }
                }}
              />
              {hover === i && (
                <line
                  x1={xFor(i, points.length)}
                  x2={xFor(i, points.length)}
                  y1={PAD.top - 4}
                  y2={H - PAD.bottom}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Rich tooltip card: follows the hovered/tapped column across the
            timeline and shows that day's exact scan thumbnail, date, and
            recorded metrics. Pinned to the top of the plot so it never gets
            clipped by the horizontal scroll container. Pointer-events-none so
            it can't steal hover from the column targets underneath. */}
        {hoverPoint && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-60 rounded-xl border border-white/15 bg-ink-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl transition-[left] duration-150 ease-out"
            style={{
              left: `${hoverPct * 100}%`,
              transform: `translate(${tooltipTx}, 0)`,
            }}
          >
            <div className="flex items-start gap-2.5">
              {hoverPoint.thumb ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={hoverPoint.thumb}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-white/15"
                />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10">
                  <LineChartIcon className="h-5 w-5 text-white/35" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-snug text-white">
                  {dateLabel(hoverPoint.savedAt)}
                </p>
                <p className="mt-0.5 text-[10px] text-white/45">
                  {timeLabel(hoverPoint.savedAt)} ·{" "}
                  <span className="capitalize">{hoverPoint.shape}</span> face
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs text-white/60">
                  <span>Overall</span>
                  <span className="font-mono text-sm font-semibold text-accent-300">
                    {hoverPoint.overall.toFixed(1)}
                  </span>
                  <span className="text-white/40">/10</span>
                  <Delta
                    value={hoverPoint.overall}
                    prev={prevPoint?.overall}
                    digits={1}
                  />
                  {prevPoint && (
                    <span className="text-[10px] text-white/35">vs prev</span>
                  )}
                </p>
                {/* Photo quality recorded with this scan — a poor photo
                    explains an otherwise mysterious dip in the lines. */}
                <span
                  className={cn(
                    "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    QUALITY_META[hoverPoint.quality].className,
                  )}
                >
                  {QUALITY_META[hoverPoint.quality].label}
                </span>
              </div>
            </div>
            <div className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2.5">
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: s.stroke }}
                  />
                  <span className="w-[84px] shrink-0 truncate text-[10px] text-white/55">
                    {s.label}
                  </span>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${hoverPoint[s.key]}%`,
                        background: s.stroke,
                      }}
                    />
                  </span>
                  <span className="w-5 text-right font-mono text-[11px] font-semibold text-white/85">
                    {hoverPoint[s.key]}
                  </span>
                  <span className="w-7 text-right font-mono text-[10px] font-medium">
                    <Delta value={hoverPoint[s.key]} prev={prevPoint?.[s.key]} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Hint + screen-reader equivalent of the floating tooltip */}
      <div className="mt-2 min-h-[20px]">
        <p className="flex items-center gap-1.5 text-xs text-white/35">
          <Info className="h-3.5 w-3.5" />
          {multi
            ? "Hover or tap a point on the timeline to see that day's scan, date, and scores — tap it again to dismiss."
            : "One scan saved so far — tap it to see the recorded scores."}
        </p>
        {hoverPoint && (
          <p className="sr-only" role="status">
            Scan from {dateLabel(hoverPoint.savedAt)} at{" "}
            {timeLabel(hoverPoint.savedAt)}. Overall{" "}
            {hoverPoint.overall.toFixed(1)} out of 10. Symmetry{" "}
            {hoverPoint.symmetry}. Jawline sharpness {hoverPoint.jawline}. Skin
            clarity {hoverPoint.clarity}. Photo quality {hoverPoint.quality}.
          </p>
        )}
      </div>
    </div>
  );
}
