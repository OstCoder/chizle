"use client";

import { useState } from "react";
import { ScanFace, FlaskConical, ShieldCheck, TriangleAlert, ChevronDown, Sparkles } from "lucide-react";
import { MiniNudge } from "@/components/EmptyState";
import { analyzeIngredients, type Ingredient } from "@/lib/ingredients";
import type { AnalysisReport } from "@/types/analysis";

interface IngredientSafetyCardProps {
  report: AnalysisReport | null;
  profile: { age?: number | null } | null;
}

const SEVERITY_TONE: Record<string, string> = {
  high: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  medium: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  low: "border-sky-400/25 bg-sky-400/10 text-sky-300",
};

function IngredientRow({ ing }: { ing: Ingredient & { flagLabel: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {ing.name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-emerald-300/80">
            For: {ing.flagLabel}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/10 px-3.5 py-3">
          {ing.alsoKnownAs && (
            <p className="text-[11px] font-mono uppercase tracking-wide text-white/40">
              a.k.a. {ing.alsoKnownAs}
            </p>
          )}
          <p className="text-xs leading-relaxed text-white/60">{ing.why}</p>
          <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-accent-200/90 ring-1 ring-white/5">
            <span className="font-semibold">How to use:</span> {ing.usage}
          </p>
          {ing.pairsWith.length > 0 && (
            <p className="text-[11px] leading-relaxed text-white/45">
              <span className="font-semibold text-white/55">Pairs well with:</span>{" "}
              {ing.pairsWith.join(" · ")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Ingredient Safety & Synergy — reads skin flags from the latest scan
 * (localized redness, breakout-prone texture, dehydration, shine, dullness,
 * tired eye area) and surfaces ingredients to look for, ingredients to go
 * easy on, and how the resulting actives interact with each other.
 */
export function IngredientSafetyCard({ report, profile }: IngredientSafetyCardProps) {
  const analysis = analyzeIngredients(report, { age: profile?.age ?? null });
  const { flags, lookFor, avoid, synergy, hasScan } = analysis;

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Ingredient safety &amp; synergy
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            What to look for — and what to skip
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <FlaskConical className="h-4 w-4" />
        </span>
      </div>

      {/* Detected skin flags — the "why" for everything below */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {hasScan ? (
          <span className="chip border-accent-400/25 bg-accent-500/10 text-accent-200">
            <ScanFace className="h-3 w-3" />
            Read from your latest scan
          </span>
        ) : (
          <span className="chip border-white/10 bg-white/[0.03] text-white/55">
            Scan to unlock — matched to your skin read
          </span>
        )}
        {flags.map((f) => (
          <span
            key={f.key}
            className={`chip ring-1 ${SEVERITY_TONE[f.severity]}`}
            title={f.evidence}
          >
            {f.label}
          </span>
        ))}
      </div>

      {!hasScan ? (
        <MiniNudge
          className="mt-4"
          icon={<ScanFace className="h-4 w-4" />}
          title="Map your skin's needs"
          body="Take a scan and this card maps your skin's flags to the right ingredients — and the ones to avoid."
          ctaLabel="Take the scan"
          ctaHref="/analyze"
        />
      ) : lookFor.length === 0 && avoid.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs leading-relaxed text-white/45">
          Your scan read clean — no skin concerns flagged. Keep the staples:
          gentle cleanse, moisturize, SPF.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Look for */}
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <h3 className="text-sm font-semibold text-emerald-200">
                Look for
              </h3>
              <span className="chip ml-auto border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                {lookFor.length}
              </span>
            </div>
            <ul className="mt-2.5 space-y-2">
              {lookFor.map((ing) => (
                <IngredientRow key={ing.name} ing={ing} />
              ))}
            </ul>
          </div>

          {/* Go easy on */}
          <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.04] p-3.5">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-rose-300" />
              <h3 className="text-sm font-semibold text-rose-200">
                Go easy on
              </h3>
              <span className="chip ml-auto border-rose-400/20 bg-rose-400/10 text-rose-300">
                {avoid.length}
              </span>
            </div>
            <ul className="mt-2.5 space-y-2">
              {avoid.map((a) => (
                <li
                  key={a.name}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5"
                >
                  <p className="text-sm font-semibold text-white">{a.name}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
                    {a.caution}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-rose-300/60">
                    Because: {a.flagLabel}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Synergy section — only meaningful with actives on the list */}
      {hasScan && (synergy.pairs.length > 0 || synergy.conflicts.length > 0) && (
        <div className="mt-4 rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <h3 className="text-sm font-semibold text-violet-200">
              How your actives interact
            </h3>
          </div>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {synergy.pairs.map((p) => (
              <div
                key={`${p.a}+${p.b}`}
                className="rounded-xl border border-emerald-400/15 bg-white/[0.02] px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-white">
                  {p.a} <span className="text-emerald-300">+</span> {p.b}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
                  {p.benefit}
                </p>
              </div>
            ))}
            {synergy.conflicts.map((c) => (
              <div
                key={`${c.a}×${c.b}`}
                className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-white">
                  {c.a} <span className="text-amber-300">≠</span> {c.b}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
                  {c.conflict}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-200/80">
                  Fix: {c.fix}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-[11px] leading-relaxed text-white/45 ring-1 ring-white/5">
        Flags come from how your skin photographs — localized redness, texture,
        and tone proxies from your scan — not a medical assessment. Introduce
        one new active at a time, and patch-test first.
      </p>
    </section>
  );
}
