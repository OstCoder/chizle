"use client";

import { useEffect, useMemo, useState } from "react";
import { ScanFace, Scissors, Shirt, Sparkles } from "lucide-react";
import {
  beardTryOnOptions,
  deriveTips,
  readGrooming,
  recommendProducts,
  type BeardStyle,
  type GroomingReads,
} from "@/lib/grooming";
import type { AnalysisReport, LandmarkPoint } from "@/types/analysis";

interface GroomingScanCardProps {
  userId: string;
  report: AnalysisReport | null;
  landmarks: LandmarkPoint[] | null;
  /** Full image (or thumb) of the latest scan, as a data URL. */
  image: string | null;
}

function readLabel(luminance: number): string {
  if (luminance < 90) return "Dense";
  if (luminance < 140) return "Medium";
  return "Light";
}

/**
 * Scan-driven grooming: samples beard / brow / neckline pixels from the
 * latest scan, turns them into tips, product recommendations, and a beard
 * try-on preview. Replaces per-day product logging — the scan does the work.
 */
export function GroomingScanCard({
  userId,
  report,
  landmarks,
  image,
}: GroomingScanCardProps) {
  const [reads, setReads] = useState<GroomingReads | null>(null);
  const [scanned, setScanned] = useState(false);
  const [style, setStyle] = useState<BeardStyle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReads(null);
    setScanned(false);
    readGrooming(report, landmarks, image).then((r) => {
      if (cancelled) return;
      setReads(r);
      setScanned(true);
    });
    return () => {
      cancelled = true;
    };
  }, [report, landmarks, image]);

  const tips = useMemo(() => deriveTips(reads, report), [reads, report]);
  const recs = useMemo(() => recommendProducts(reads, report), [reads, report]);
  const tryOn = useMemo(() => beardTryOnOptions(reads, report), [reads, report]);

  const areaChips: Array<{ label: string; value: string }> = reads
    ? [
        { label: "Beard", value: readLabel(reads.beard.luminance) },
        { label: "Brows", value: readLabel(reads.brow.luminance) },
        {
          label: "Bridge",
          value:
            reads.glabella.luminance < reads.brow.luminance * 0.82
              ? "Dark — tidy"
              : "Clean",
        },
        { label: "Neckline", value: readLabel(reads.neckline.luminance) },
      ]
    : [];

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Grooming scan
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Reads from your latest scan
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <ScanFace className="h-4 w-4" />
        </span>
      </div>

      {!scanned ? (
        <p className="mt-4 text-xs text-white/45">Reading your scan…</p>
      ) : !reads ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <ScanFace className="mx-auto h-5 w-5 text-white/40" />
          <p className="mt-2 text-sm font-medium text-white/80">
            No usable scan yet
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-white/45">
            Run a front-facing Analyze scan and this card will sample your
            beard, brows, and neckline from it automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {areaChips.map((chip) => (
              <div
                key={chip.label}
                className="rounded-xl border border-white/5 bg-white/[0.02] px-2 py-2 text-center"
              >
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  {chip.label}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white/85">
                  {chip.value}
                </p>
              </div>
            ))}
          </div>

          {/* Tips */}
          <ul className="mt-4 space-y-2">
            {tips.map((tip) => (
              <li
                key={tip.id}
                className="rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-3"
              >
                <p className="flex items-center gap-1.5 text-sm font-medium text-white/85">
                  <Scissors className="h-3.5 w-3.5 shrink-0 text-accent-300" />
                  {tip.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                  {tip.detail}
                </p>
              </li>
            ))}
          </ul>

          {/* Beard try-on */}
          <div className="mt-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
              <Shirt className="h-3.5 w-3.5 text-accent-300" />
              Beard try-on
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {tryOn.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() =>
                    setStyle((cur) => (cur === option ? null : option))
                  }
                  aria-pressed={style === option}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                    style === option
                      ? "border-accent-400/50 bg-accent-500/10 text-accent-100"
                      : "border-white/5 bg-white/[0.02] text-white/65 hover:border-accent-400/25 hover:text-white"
                  }`}
                >
                  {option.name}
                </button>
              ))}
            </div>
            {style && (
              <div className="mt-2 rounded-xl border border-accent-400/25 bg-accent-500/[0.06] px-3.5 py-3">
                <p className="text-xs leading-relaxed text-white/75">
                  {style.rationale}
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-accent-300">
                  Upkeep: {style.upkeep}
                </p>
              </div>
            )}
          </div>

          {/* Product recommendations */}
          <div className="mt-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
              <Sparkles className="h-3.5 w-3.5 text-accent-300" />
              Recommended for your read
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {recs.map((rec) => (
                <div
                  key={rec.name}
                  className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
                >
                  <p className="text-xs font-semibold text-white/85">
                    {rec.name}
                    <span className="ml-1.5 font-normal text-white/35">
                      {rec.category}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
                    {rec.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-white/40">
            Reads are photographic estimates from your scan, refreshed each time
            you analyze a new front-facing photo.
          </p>
        </>
      )}
    </section>
  );
}
