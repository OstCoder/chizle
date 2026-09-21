// Smart product recommendations driven by the latest scan's complexion
// metrics + weakspots and the profile's onboarding goals. Every pick carries
// a search query that renders as a direct Amazon purchase link; when an
// affiliate tag is configured (NEXT_PUBLIC_AMAZON_AFFILIATE_TAG), links are
// attributed. The complexion metrics are camera-based proxies (see
// lib/glow.ts skinMetrics), so copy frames picks around "how your skin
// reads on camera", never medical claims.

import type { AnalysisReport } from "@/types/analysis";
import { skinMetrics } from "./glow";

// ---------------------------------------------------------------------------
// Purchase links (Amazon search; attributed when an affiliate tag is set)
// ---------------------------------------------------------------------------

/** Non-secret, browser-safe affiliate tag. Absent = plain search links. */
export function affiliateTag(): string | null {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  return tag && tag.trim() ? tag.trim() : null;
}

export function affiliateConfigured(): boolean {
  return affiliateTag() !== null;
}

/** Amazon search URL for a query, attributed when a tag is configured. */
export function affiliateLink(query: string): string {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  const tag = affiliateTag();
  return tag ? `${base}&tag=${encodeURIComponent(tag)}` : base;
}

// ---------------------------------------------------------------------------
// Picks
// ---------------------------------------------------------------------------

export type PickCategory =
  | "Cleanse"
  | "Treat"
  | "Hydrate"
  | "Protect"
  | "Detail";

export interface ProductPick {
  id: string;
  name: string;
  /** Search terms the Buy link opens on Amazon. */
  query: string;
  category: PickCategory;
  /** Why this pick — tied to a metric reading, weakspot, or goal. */
  reason: string;
  /** Human chip, e.g. "Radiance 42" or "From your scan". */
  metric: string;
}

export interface PicksProfile {
  goals?: string[] | null;
}

const BASE_CLEANSER: ProductPick = {
  id: "gentle-cleanser",
  name: "Gentle face cleanser",
  query: "gentle face cleanser",
  category: "Cleanse",
  reason:
    "The twice-daily base every routine stands on — clean, calm skin reads sharper on camera.",
  metric: "Daily staple",
};

const BASE_SPF: ProductPick = {
  id: "spf-moisturizer",
  name: "SPF 30 face moisturizer",
  query: "spf 30 face moisturizer",
  category: "Protect",
  reason:
    "Sun protection is what preserves the evenness and texture you're tracking between scans.",
  metric: "Daily staple",
};

/**
 * Personalized skincare picks, ordered most-relevant first (metric-driven,
 * then scan weakspots, then goals, then the universal staples). Capped at 7.
 */
export function skincarePicks(
  report: AnalysisReport | null,
  profile: PicksProfile | null,
): ProductPick[] {
  const picks: ProductPick[] = [];

  if (!report) {
    // No scan yet — the start-here stack until the first read exists.
    return [BASE_CLEANSER, BASE_SPF];
  }

  // --- Metric-driven (complexion proxies, same numbers as the dashboard) ---
  const metrics = skinMetrics(report);
  const m = (key: string) => metrics.find((x) => x.key === key)?.value ?? 0;
  const radiance = m("radiance");
  const evenness = m("evenness");
  const clarity = m("clarity");

  if (radiance < 60) {
    picks.push({
      id: "vitamin-c-serum",
      name: "Vitamin C brightening serum",
      query: "vitamin c brightening face serum",
      category: "Treat",
      reason:
        "Radiance is your lowest complexion reading — vitamin C is the classic brightener for a lit-from-within look on camera.",
      metric: `Radiance ${radiance}`,
    });
  }
  if (evenness < 70) {
    picks.push({
      id: "niacinamide-serum",
      name: "Niacinamide tone serum",
      query: "niacinamide serum even skin tone",
      category: "Treat",
      reason:
        "Evenness sits below the comfortable band — niacinamide gently evens tone over a few weeks.",
      metric: `Evenness ${evenness}`,
    });
  }
  if (clarity < 65) {
    picks.push({
      id: "bha-exfoliant",
      name: "BHA liquid exfoliant",
      query: "2% bha salicylic acid liquid exfoliant",
      category: "Treat",
      reason:
        "Texture is what blurs clarity in photos — a BHA two nights a week keeps the surface smooth.",
      metric: `Clarity ${clarity}`,
    });
  }

  // --- Scan weakspots (actionable purchase analogues of the scan's advice) ---
  const ids = new Set(report.weakspots.map((w) => w.id));
  if (ids.has("eyes-squint")) {
    picks.push({
      id: "caffeine-eye-serum",
      name: "Caffeine eye serum",
      query: "caffeine eye serum depuffing",
      category: "Detail",
      reason:
        "Your eye area read tired in the last scan — a caffeine serum de-puffs and lifts the eye read.",
      metric: "From your scan",
    });
  }
  if (ids.has("jawline-soft")) {
    picks.push({
      id: "precision-trimmer",
      name: "Precision beard trimmer",
      query: "precision beard trimmer stubble detailer",
      category: "Detail",
      reason:
        "Your scan suggests 3-day stubble reads sharper at the jaw — a precision trimmer keeps the line clean.",
      metric: "From your scan",
    });
  }
  if (ids.has("expression-neutral") || ids.has("smile-asymmetry")) {
    picks.push({
      id: "lip-balm",
      name: "Hydrating lip balm",
      query: "hydrating lip balm",
      category: "Detail",
      reason:
        "A subtle half-smile reads warmest — conditioned lips help the expression land.",
      metric: "From your scan",
    });
  }

  // --- Goal-driven ---
  const goals = profile?.goals ?? [];
  if (goals.includes("Dating profile improvement")) {
    picks.push({
      id: "whitening-strips",
      name: "Teeth whitening strips",
      query: "teeth whitening strips",
      category: "Detail",
      reason:
        "You flagged dating photos — a brighter smile is the single highest-return photo upgrade.",
      metric: "Your goal",
    });
  }

  // --- Universal staples (always last, never dropped) ---
  picks.push(BASE_CLEANSER, BASE_SPF);

  return picks.slice(0, 7);
}
