"use client";

import { ExternalLink, ScanFace, Sparkles } from "lucide-react";
import {
  affiliateConfigured,
  affiliateLink,
  skincarePicks,
  type ProductPick,
} from "@/lib/picks";
import type { AnalysisReport } from "@/types/analysis";

interface SkincarePicksCardProps {
  report: AnalysisReport | null;
  profile: { goals?: string[] | null } | null;
}

const CATEGORY_TONE: Record<ProductPick["category"], string> = {
  Cleanse: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  Treat: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  Hydrate: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  Protect: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  Detail: "border-rose-400/25 bg-rose-400/10 text-rose-300",
};

/**
 * Smart skincare recommendations driven by the latest scan's complexion
 * metrics and weakspots, each with a direct Amazon purchase link.
 */
export function SkincarePicksCard({ report, profile }: SkincarePicksCardProps) {
  const picks = skincarePicks(report, profile);
  const hasScan = Boolean(report);

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Smart picks
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Recommended for your skin
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <Sparkles className="h-4 w-4" />
        </span>
      </div>

      {/* Source chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {hasScan ? (
          <span className="chip border-accent-400/25 bg-accent-500/10 text-accent-200">
            <ScanFace className="h-3 w-3" />
            Matched to your latest scan
          </span>
        ) : (
          <span className="chip border-white/10 bg-white/[0.03] text-white/55">
            Starter stack — scan to personalize
          </span>
        )}
        {profile?.goals?.includes("Overall grooming") && (
          <span className="chip border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            Overall grooming goal
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {picks.map((pick) => (
          <li
            key={pick.id}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3"
          >
            <span
              className={`chip shrink-0 ring-1 ${CATEGORY_TONE[pick.category]}`}
            >
              {pick.category}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{pick.name}</p>
                <span className="rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-accent-200 ring-1 ring-white/10">
                  {pick.metric}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-white/45">
                {pick.reason}
              </p>
            </div>
            <a
              href={affiliateLink(pick.query)}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="btn-primary shrink-0 !px-3 !py-1.5 text-xs"
              aria-label={`Buy ${pick.name} on Amazon`}
            >
              <ExternalLink className="mr-1 inline h-3 w-3" />
              Buy
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        {affiliateConfigured()
          ? "Buy links are Amazon search results; purchases made through them may earn the app a commission at no extra cost to you."
          : "Buy links open Amazon search results for each pick — set NEXT_PUBLIC_AMAZON_AFFILIATE_TAG to attach an affiliate tag."}
      </p>
      <p className="mt-2 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-[11px] leading-relaxed text-white/45 ring-1 ring-white/5">
        Picks are matched from how your skin reads on camera (complexion
        proxies from your scan), plus your goals — a starting point, not
        medical or skincare advice.
      </p>
    </section>
  );
}
