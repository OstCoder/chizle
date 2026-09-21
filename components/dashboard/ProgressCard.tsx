"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, MoveRight, TrendingUp } from "lucide-react";
import { lastScanLabel, progressDeltas } from "@/lib/glow";
import type { PersistedAnalysis } from "@/lib/persistence";

interface ProgressCardProps {
  entries: PersistedAnalysis[]; // newest first
}

/**
 * Before vs Now: pick any two scans from history and drag a split-screen
 * divider to wipe between them. Metric deltas recompute for the chosen pair.
 */
export function ProgressCard({ entries }: ProgressCardProps) {
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [pct, setPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  // Defaults: oldest → newest. Re-seed whenever the selection is unset or no
  // longer valid (entry deleted, history changed).
  useEffect(() => {
    if (entries.length < 2) return;
    const validBefore = entries.some((e) => e.id === beforeId);
    const validAfter = entries.some((e) => e.id === afterId);
    if (!validBefore) setBeforeId(entries[entries.length - 1].id);
    if (!validAfter) setAfterId(entries[0].id);
  }, [entries, beforeId, afterId]);

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

  const before = entries.find((e) => e.id === beforeId) ?? entries[entries.length - 1];
  const after = entries.find((e) => e.id === afterId) ?? entries[0];
  const same = before.id === after.id;
  const deltas = same ? [] : progressDeltas(before.report, after.report);

  const setFromClientX = (clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = Math.round(((clientX - rect.left) / rect.width) * 100);
    setPct(Math.max(0, Math.min(100, next)));
  };

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Progress tracker
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Before vs. now
          </h2>
        </div>
        {/* Pair selection */}
        <div className="flex flex-wrap items-center gap-2">
          <Picker
            label="Before"
            entries={entries}
            value={beforeId}
            onChange={setBeforeId}
          />
          <MoveRight className="h-3.5 w-3.5 text-accent-400" />
          <Picker
            label="After"
            entries={entries}
            value={afterId}
            onChange={setAfterId}
          />
        </div>
      </div>

      <div className="mt-5">
        <div
          ref={frameRef}
          className="relative aspect-[16/9] w-full cursor-ew-resize select-none overflow-hidden rounded-2xl bg-ink-800"
          onPointerDown={(e) => {
            setDragging(true);
            setFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (dragging) setFromClientX(e.clientX);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          {/* Before — full bleed underneath */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before.image ?? before.thumb}
            alt={`Scan from ${lastScanLabel(before.savedAt)}`}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          {/* After — clipped to the right of the divider */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={after.image ?? after.thumb}
            alt={`Scan from ${lastScanLabel(after.savedAt)}`}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 0 0 ${pct}%)` }}
            draggable={false}
          />

          <div
            className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
            style={{ opacity: pct >= 96 ? 0 : 1 }}
          >
            Before · {lastScanLabel(before.savedAt)}
          </div>
          <div
            className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
            style={{ opacity: pct <= 4 ? 0 : 1 }}
          >
            Now · {lastScanLabel(after.savedAt)}
          </div>

          {/* Divider + grip */}
          <div
            className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-white/80"
            style={{ left: `${pct}%` }}
          />
          <div
            className="pointer-events-none absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/10 backdrop-blur-sm"
            style={{ left: `${pct}%` }}
          >
            <span className="flex items-center gap-0.5 text-white">
              <span className="h-2.5 w-[1.5px] rounded bg-white/90" />
              <span className="h-2.5 w-[1.5px] rounded bg-white/90" />
            </span>
          </div>
        </div>

        {/* Keyboard-accessible control mirroring the drag position */}
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          aria-label="Compare before and now scans"
          className="mt-4 w-full accent-orange-500"
        />

        {same ? (
          <p className="mt-5 text-sm text-amber-200/80">
            Pick two different scans to compare.
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {deltas.map((d) => {
                const diff = d.now - d.before;
                const improved = d.betterWhenHigher ? diff > 0 : diff < 0;
                const steady = diff === 0;
                return (
                  <div
                    key={d.label}
                    className="rounded-2xl bg-white/[0.03] px-3.5 py-3 text-center ring-1 ring-white/5"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">
                      {d.label}
                    </p>
                    <p className="score-value mt-1 text-lg text-white">
                      {d.format(d.before)}
                      <span className="mx-1 font-sans text-white/40">→</span>
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
              Drag the divider anywhere on the image, or tap to jump. Comparing
              scans shot in similar light keeps the read honest.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Picker({
  label,
  entries,
  value,
  onChange,
}: {
  label: string;
  entries: PersistedAnalysis[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-white/45">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs font-medium text-white outline-none transition focus:border-accent-400/60 [color-scheme:dark]"
      >
        {entries.map((e) => (
          <option key={e.id} value={e.id}>
            {lastScanLabel(e.savedAt)} · {e.report.shape}
          </option>
        ))}
      </select>
    </label>
  );
}
