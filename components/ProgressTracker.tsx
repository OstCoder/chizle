"use client";

import { useMemo, useState } from "react";
import { Info, LineChart as LineChartIcon } from "lucide-react";
import type { PersistedAnalysis } from "@/lib/persistence";
import { rateFace } from "@/lib/ratings";
import { cn } from "@/lib/utils";

interface TrackerPoint {
  savedAt: string;
  date: string;
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

/**
 * Glow-Up Progress Tracker: plots the scan history (newest → oldest, shown
 * oldest → newest) as interactive lines for symmetry, jawline sharpness, and
 * skin clarity, with the overall face rating as a small sparkline row.
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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label="Line chart of symmetry, jawline sharpness, and skin clarity across your scans"
          onMouseLeave={() => setHover(null)}
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
                onMouseEnter={() => setHover(i)}
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
      </div>

      {/* Hover readout */}
      <div className="mt-2 min-h-[52px]">
        {hover !== null && points[hover] ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-xs font-medium text-white/80">
                {new Date(points[hover].savedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-white/50">
                Overall <span className="font-mono text-white/85">{points[hover].overall.toFixed(1)}</span>/10
              </p>
              {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
                <p key={s.key} className={cn("text-xs", s.color)}>
                  {s.label} <span className="font-mono text-white/85">{points[hover][s.key]}</span>
                </p>
              ))}
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-white/35">
            <Info className="h-3.5 w-3.5" />
            Hover over the chart to inspect a scan {multi ? "" : "— one scan saved so far"}
          </p>
        )}
      </div>
    </div>
  );
}
