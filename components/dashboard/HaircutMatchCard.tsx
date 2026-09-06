"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plus, ScanFace, Scissors, Sparkles } from "lucide-react";
import {
  haircareMatches,
  type ProductRec,
} from "@/lib/haircare";
import {
  EMPTY_HAIR_STATUS,
  hubGet,
  hubSet,
  makeId,
  type GroomingProduct,
  type HairStatus,
} from "@/lib/hub";
import type { AnalysisReport } from "@/types/analysis";
import type { HaircareProfile } from "@/lib/haircare";

interface HaircutMatchCardProps {
  userId: string;
  report: AnalysisReport | null;
  profile: HaircareProfile | null;
}

/**
 * Haircut match: combines the face analysis (shape + hair read) with the
 * profile and maintenance tracker to recommend cuts and a daily product
 * stack. Products can be dropped straight into the regimen card.
 */
export function HaircutMatchCard({
  userId,
  report,
  profile,
}: HaircutMatchCardProps) {
  const [haircare, setHaircare] = useState<HairStatus>(EMPTY_HAIR_STATUS);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHaircare(hubGet<HairStatus>(userId, "haircare", EMPTY_HAIR_STATUS));
  }, [userId]);

  const match = haircareMatches(report, profile, haircare);

  const addToRegimen = (p: ProductRec) => {
    const current = hubGet<GroomingProduct[]>(userId, "products", []);
    if (!current.some((x) => x.name.toLowerCase() === p.name.toLowerCase())) {
      const next: GroomingProduct[] = [
        ...current,
        { id: makeId(), name: p.name, category: p.category },
      ];
      hubSet(userId, "products", next);
    }
    setAdded((prev) => new Set(prev).add(p.id));
    setTimeout(() => {
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }, 1600);
  };

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Hair &amp; grooming
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Your haircut match
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <Scissors className="h-4 w-4" />
        </span>
      </div>

      {/* Source chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {match.shape ? (
          <span className="chip border-accent-400/25 bg-accent-500/10 text-accent-200">
            <ScanFace className="h-3 w-3" />
            Face shape · {match.shape}
          </span>
        ) : null}
        {match.textureLabel ? (
          <span className="chip border-white/10 bg-white/[0.03] text-white/60">
            Hair · {match.textureLabel.toLowerCase()}
            {match.colorLabel ? `, ${match.colorLabel.toLowerCase()}` : ""}
          </span>
        ) : null}
        {match.beardGoal && (
          <span className="chip border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            Beard goal
          </span>
        )}
      </div>

      {/* Scan nudge when there is no face read yet */}
      {!match.shape && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3.5">
          <ScanFace className="h-4 w-4 shrink-0 text-white/40" />
          <p className="text-xs leading-relaxed text-white/55">
            Scan a front-facing photo to unlock cuts matched to your actual
            face shape and hair.
          </p>
          <Link
            href="/analyze"
            className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
          >
            Scan now
          </Link>
        </div>
      )}

      {/* Recommended cuts */}
      {match.cuts.length > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-accent-400" />
            Cuts that suit your shape
          </p>
          <ul className="mt-2.5 space-y-2">
            {match.cuts.map((cut, i) => (
              <li
                key={cut.id}
                className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-3"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-500/15 font-mono text-[10px] font-semibold text-accent-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{cut.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/45">
                    {cut.why}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended products */}
      {match.products.length > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-accent-400" />
            Products worth a shot
          </p>
          <ul className="mt-2.5 space-y-2">
            {match.products.map((p) => {
              const isAdded = added.has(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5"
                >
                  <span className="chip shrink-0 ring-1 border-white/10 bg-white/[0.03] text-white/50">
                    {p.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/85">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/45">
                      {p.note}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToRegimen(p)}
                    aria-label={`Add ${p.name} to your regimen`}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isAdded
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/[0.05] text-white/70 ring-1 ring-white/10 hover:bg-accent-500/15 hover:text-accent-200"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="mr-1 inline h-3 w-3" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 inline h-3 w-3" />
                        Add
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-white/40">
            Added products land in your Product Regimen card below — tap to log
            them each day.
          </p>
        </div>
      )}

      <p className="mt-4 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-[11px] leading-relaxed text-white/45 ring-1 ring-white/5">
        Matched from your scan&apos;s face shape and hair read, your profile,
        and your maintenance goal — a starting point to bring to your barber,
        not a guarantee.
      </p>
    </section>
  );
}