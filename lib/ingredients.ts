// Ingredient Safety & Synergy engine.
//
// Reads skin signals from the latest scan report (localized redness proxy,
// tone evenness, texture/clarity, lighting artifacts) and produces:
//   - a set of skin flags ("Sensitive read", "Active acne read", ...)
//   - ingredients to look for, each tied to the flag that triggered it
//   - ingredients to go easy on, each with the reason it can aggravate
//   - a synergy check across the full routine (conflicts + power pairs)
//
// Everything is derived deterministically from camera-based proxies — the
// copy carefully frames reads as "how your skin photographs", never a
// medical diagnosis or treatment claim.

import type { AnalysisReport } from "@/types/analysis";
import { skinMetrics } from "./glow";

// ---------------------------------------------------------------------------
// Skin flags
// ---------------------------------------------------------------------------

export type SkinFlagKey =
  | "redness"
  | "acne"
  | "dryness"
  | "oily"
  | "dullness"
  | "texture"
  | "dark-circles";

export interface SkinFlag {
  key: SkinFlagKey;
  label: string;
  /** Why the scan flagged it — cites the actual reading. */
  evidence: string;
  severity: "high" | "medium" | "low";
}

// Thresholds in the camera-proxy space (0..100 complexion metrics).
const REDNESS_HIGH = 0.32; // localized flush/irritation strongly indicated
const REDNESS_MED = 0.2;
const EVENNESS_LOW = 55;
const CLARITY_LOW = 45; // texture-heavy read
const CLARITY_VLOW = 32; // very rough / breakout-prone texture read
const RADIANCE_LOW = 50;

export function skinFlags(report: AnalysisReport): SkinFlag[] {
  const flags: SkinFlag[] = [];
  const redness = report.light.redness ?? 0;
  const metrics = skinMetrics(report);
  const m = (key: string) => metrics.find((x) => x.key === key)?.value ?? 0;
  const evenness = m("evenness");
  const clarity = m("clarity");
  const radiance = m("radiance");

  // Localized redness (flushing, irritation, active-breakout edges).
  if (redness >= REDNESS_HIGH) {
    flags.push({
      key: "redness",
      label: "Sensitive / flushed read",
      evidence: `Localized redness reads ${Math.round(redness * 100)}/100 in this scan — some patches flush well above your skin's own baseline.`,
      severity: "high",
    });
  } else if (redness >= REDNESS_MED) {
    flags.push({
      key: "redness",
      label: "Mild redness read",
      evidence: `Localized redness reads ${Math.round(redness * 100)}/100 — a low-level flush is visible on camera.`,
      severity: "medium",
    });
  }

  // Active acne read: rough texture + localized inflammation together.
  if (redness >= REDNESS_MED && clarity < CLARITY_LOW) {
    flags.push({
      key: "acne",
      label: "Active breakout read",
      evidence: `Texture (${Math.round(clarity)}/100 clarity) and localized redness (${Math.round(redness * 100)}/100) both read elevated — consistent with active breakouts on camera.`,
      severity: "high",
    });
  }

  // Dryness read: uneven tone + soft focus (moisture-depleted skin blurs).
  if (evenness < EVENNESS_LOW && report.light.sharpness < 0.45) {
    flags.push({
      key: "dryness",
      label: "Dehydrated / tight read",
      evidence: `Tone reads uneven (${evenness}/100) with a soft surface read — often how dehydration photographs.`,
      severity: "medium",
    });
  }

  // Oily read: bright specular evenness with strong contrast on the T-zone —
  // approximated here as high evenness + high clarity but low radiance
  // (light bouncing off oil flattens the lit-from-within read).
  if (evenness >= 80 && clarity >= 75 && radiance < 60) {
    flags.push({
      key: "oily",
      label: "Oily / shine-prone read",
      evidence: `Surface reads crisp (${clarity}/100) but radiance sits low (${radiance}/100) — the classic shine-flattens-glow signature.`,
      severity: "low",
    });
  }

  // Dullness read.
  if (radiance < RADIANCE_LOW && redness < REDNESS_MED) {
    flags.push({
      key: "dullness",
      label: "Dull / tired read",
      evidence: `Radiance reads ${radiance}/100 — skin photographs flat even in decent light.`,
      severity: "low",
    });
  }

  // Texture-only read (no inflammation).
  if (clarity < CLARITY_VLOW && redness < REDNESS_MED) {
    flags.push({
      key: "texture",
      label: "Rough texture read",
      evidence: `Clarity reads ${clarity}/100 — surface texture dominates the camera read.`,
      severity: "medium",
    });
  }

  // Dark circles: the scan's eye-area weakspot when present.
  if (report.weakspots.some((w) => w.id === "eyes-squint")) {
    flags.push({
      key: "dark-circles",
      label: "Tired eye area",
      evidence: "Your scan flagged the eye area reading tired — often puffiness or shadowing under the eyes.",
      severity: "low",
    });
  }

  const sevOrder = { high: 0, medium: 1, low: 2 } as const;
  return flags.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
}

// ---------------------------------------------------------------------------
// Ingredient database
// ---------------------------------------------------------------------------

export interface Ingredient {
  name: string;
  /** Common INN / INCI-style name as printed on packaging. */
  alsoKnownAs?: string;
  /** What it does for the flagged concern. */
  why: string;
  /** How to slot it into a routine (AM/PM, frequency). */
  usage: string;
  /** Synergy notes — which flags/ingredients this pairs well with. */
  pairsWith: string[];
}

export interface AvoidIngredient {
  name: string;
  /** Why it can aggravate this flag. */
  caution: string;
}

// Look-for ingredients, keyed by the skin flag they address.
export const INGREDIENTS_FOR_FLAG: Record<SkinFlagKey, Ingredient[]> = {
  redness: [
    {
      name: "Niacinamide",
      alsoKnownAs: "Vitamin B3",
      why: "The most-studied calming active — strengthens the skin barrier and visibly reduces diffuse redness within weeks.",
      usage: "AM + PM, after cleansing. 4–5% is plenty; layer under moisturizer.",
      pairsWith: ["Hyaluronic acid", "Ceramides", "Azelaic acid"],
    },
    {
      name: "Azelaic acid",
      alsoKnownAs: "10% OTC",
      why: "Calms redness AND smooths texture — the rare two-for-one when flushing and roughness show together.",
      usage: "PM. Start every other night; it layers safely with niacinamide.",
      pairsWith: ["Niacinamide", "SPF"],
    },
    {
      name: "Centella asiatica",
      alsoKnownAs: "Cica",
      why: "Soothing botanical that reduces the tight, flushed feeling — a gentle gateway actives for a stressed barrier.",
      usage: "Anytime. Creams or serums; no conflict with anything.",
      pairsWith: ["All actives", "Ceramides"],
    },
  ],
  acne: [
    {
      name: "Salicylic acid",
      alsoKnownAs: "BHA 2%",
      why: "Oil-soluble, so it gets inside the pore and clears the gunk other exfoliants can't reach — first-line for breakout texture.",
      usage: "PM, 2–3 nights a week (not nightly). Liquid or 2% cleanser.",
      pairsWith: ["Niacinamide", "Hyaluronic acid"],
    },
    {
      name: "Benzoyl peroxide",
      alsoKnownAs: "2.5–5%",
      why: "Kills C. acnes bacteria directly — strongest OTC option for inflamed spots. Lower % works as well with less irritation.",
      usage: "PM as a thin spot layer. Do NOT layer with retinol in the same session.",
      pairsWith: ["Moisturizer buffer"],
    },
    {
      name: "Niacinamide",
      alsoKnownAs: "Vitamin B3",
      why: "Regulates the oil production that feeds breakouts while calming the redness they leave behind.",
      usage: "AM + PM. The backbone of any breakout routine.",
      pairsWith: ["Salicylic acid", "Zinc PCA"],
    },
    {
      name: "Zinc PCA",
      why: "Gentle sebum regulator — a good evening partner for stronger actives.",
      usage: "AM under sunscreen or PM alongside salicylic acid.",
      pairsWith: ["Niacinamide", "Salicylic acid"],
    },
  ],
  dryness: [
    {
      name: "Hyaluronic acid",
      why: "Binds up to 1000× its weight in water — plumps the fine, tight look dehydration causes.",
      usage: "AM + PM on damp skin, then seal with moisturizer within 60 seconds.",
      pairsWith: ["Ceramides", "Squalane", "Niacinamide"],
    },
    {
      name: "Ceramides",
      why: "Rebuilds the lipid barrier that keeps water in — the actual fix for chronically tight skin.",
      usage: "AM + PM as your moisturizer's key actives. Look for it high in the ingredient list.",
      pairsWith: ["Hyaluronic acid", "Panthenol", "SPF"],
    },
    {
      name: "Squalane",
      why: "Lightweight oil that mimics skin's own sebum — seals hydration without clogging.",
      usage: "PM, as the last step (a few drops). Occludes without shine.",
      pairsWith: ["Everything — it layers over any routine"],
    },
  ],
  oily: [
    {
      name: "Niacinamide",
      alsoKnownAs: "Vitamin B3",
      why: "Dial down sebum production over weeks — also slightly tightens the look of pores.",
      usage: "AM + PM. The single best long-term shine fix.",
      pairsWith: ["Salicylic acid", "Zinc PCA"],
    },
    {
      name: "Salicylic acid",
      alsoKnownAs: "BHA 2%",
      why: "Dissolves the oil plugs that turn shine into blackheads.",
      usage: "PM, 2 nights a week, on clean dry skin.",
      pairsWith: ["Niacinamide", "Gel moisturizer"],
    },
  ],
  dullness: [
    {
      name: "Vitamin C",
      alsoKnownAs: "L-ascorbic acid 10–15%",
      why: "Brightens and evens tone — the canonical radiance active.",
      usage: "AM, before SPF. If it tingles, drop to a derivative.",
      pairsWith: ["SPF (they supercharge each other)", "Vitamin E", "Ferulic acid"],
    },
    {
      name: "AHAs (glycolic/lactic)",
      why: "Sweep away the dull, dead surface layer so light reflects evenly.",
      usage: "PM, 1–2 nights a week. Start with lactic (gentler) if you're new.",
      pairsWith: ["Hyaluronic acid", "Niacinamide"],
    },
  ],
  texture: [
    {
      name: "Salicylic acid",
      alsoKnownAs: "BHA 2%",
      why: "The texture specialist — gets into pores and smooths from within.",
      usage: "PM, 2–3 nights a week.",
      pairsWith: ["Niacinamide", "Hyaluronic acid"],
    },
    {
      name: "Retinol",
      alsoKnownAs: "0.25–0.5%",
      why: "Speeds up cell turnover — the long-game texture and tone fixer.",
      usage: "PM, 2 nights a week to start. Always with SPF the next morning.",
      pairsWith: ["Peptides", "Hyaluronic acid"],
    },
  ],
  "dark-circles": [
    {
      name: "Caffeine",
      why: "Constricts the puffy vessels under the eye — the de-puff standard.",
      usage: "AM, on cold skin (fridge-stored works even better).",
      pairsWith: ["Peptides", "SPF"],
    },
    {
      name: "Peptides",
      why: "Support the thin under-eye skin over time — helps with fine-line shadowing.",
      usage: "AM + PM, gentle tapping — never rub the eye area.",
      pairsWith: ["Caffeine", "Ceramides"],
    },
  ],
};

// Ingredients to go easy on, keyed by the skin flag that triggers the caution.
export const INGREDIENTS_TO_AVOID: Record<SkinFlagKey, AvoidIngredient[]> = {
  redness: [
    {
      name: "Alcohol denat.",
      caution: "High on many toners' ingredient lists — evaporates fast and strips the barrier, which reads as MORE redness on camera.",
    },
    {
      name: "Fragrance / essential oils",
      caution: "The most common sensitivity trigger. On a flushed read, choose fragrance-free everything for a few weeks.",
    },
    {
      name: "High-% AHAs (glycolic 10%+)",
      caution: "Strong chemical exfoliation on an already-irritated barrier compounds the flush. Pause until calm.",
    },
    {
      name: "Witch hazel",
      caution: "Often paired with alcohol — feels cooling but dries tight, then rebounds red.",
    },
  ],
  acne: [
    {
      name: "Coconut oil / isopropyl myristate",
      caution: "Heavy comedogenic oils that clog pores — the classic breakout feeders.",
    },
    {
      name: "Retinol + BPO (same session)",
      caution: "Layering these two in one routine is the #1 cause of the 'purge that won't quit' — alternate nights instead.",
    },
    {
      name: "Alcohol-heavy toners",
      caution: "Strip the surface, so skin overcompensates with more oil.",
    },
  ],
  dryness: [
    {
      name: "Daily strong acids",
      caution: "AHAs/BHAs more than 2× a week on a dry read keeps the barrier from recovering.",
    },
    {
      name: "Foaming sulfate cleansers",
      caution: "That squeaky feeling is your barrier being stripped. Switch to a cream or gel-cream cleanser.",
    },
    {
      name: "Retinol (for now)",
      caution: "Dehydrated skin won't tolerate it — rebuild hydration for 2–3 weeks before introducing.",
    },
  ],
  oily: [
    {
      name: "Heavy oils & butters",
      caution: "Coconut oil, shea-heavy creams — shine-prone skin doesn't need more occlusion.",
    },
    {
      name: "Over-washing (>2×/day)",
      caution: "Stripping triggers rebound oil. Cleanse AM + PM only, no matter how greasy it feels midday.",
    },
  ],
  dullness: [
    {
      name: "Skipping SPF",
      caution: "UV drives the uneven tone that reads dull. Vitamin C without SPF is half a strategy.",
    },
  ],
  texture: [
    {
      name: "Physical scrubs (walnut, sugar)",
      caution: "Micro-tears worsen texture long-term — chemical exfoliation (BHA/AHA) is the smarter tool.",
    },
    {
      name: "Heavy occlusives nightly",
      caution: "Petroleum-heavy layers trap debris on textured skin — keep them for the eye area or winter nights only.",
    },
  ],
  "dark-circles": [],
};

// ---------------------------------------------------------------------------
// Synergy engine
// ---------------------------------------------------------------------------

export interface SynergyPair {
  a: string;
  b: string;
  /** What the combo does well together. */
  benefit: string;
}

export interface ConflictPair {
  a: string;
  b: string;
  /** Why the combo misbehaves, and the fix. */
  conflict: string;
  fix: string;
}

// Pairs that work better together — surfaced when both sides appear in the
// look-for set.
const POWER_PAIRS: SynergyPair[] = [
  {
    a: "Vitamin C",
    b: "SPF",
    benefit: "Vitamin C boosts your sunscreen's photoprotection — the classic AM duo.",
  },
  {
    a: "Vitamin C",
    b: "Vitamin E",
    benefit: "Vitamin E regenerates oxidized vitamin C, extending its brightening window.",
  },
  {
    a: "Niacinamide",
    b: "Salicylic acid",
    benefit: "Niacinamide buffers the BHA tingle while doubling down on pores — a comfortable pairing.",
  },
  {
    a: "Hyaluronic acid",
    b: "Ceramides",
    benefit: "HA pulls water in, ceramides lock it there — the hydrating one-two.",
  },
  {
    a: "Salicylic acid",
    b: "Hyaluronic acid",
    benefit: "BHA dries; HA re-plumps. Apply HA after the BHA layer to offset tightness.",
  },
  {
    a: "Niacinamide",
    b: "Hyaluronic acid",
    benefit: "Barrier support + water-binding — calmer, plumper skin in one layer stack.",
  },
  {
    a: "Caffeine",
    b: "Peptides",
    benefit: "De-puff now, firm over months — the eye-area pairing.",
  },
  {
    a: "Niacinamide",
    b: "Azelaic acid",
    benefit: "Both calm redness by different mechanisms — a gentle, high-impact combo.",
  },
];

// Pairs that conflict — surfaced when both sides appear in the look-for set.
const CONFLICTS: ConflictPair[] = [
  {
    a: "Retinol",
    b: "Salicylic acid",
    conflict: "Both increase turnover — stacking them the same night invites irritation and flaking.",
    fix: "Alternate nights: BHA Mon/Wed/Fri, retinol Tue/Thu.",
  },
  {
    a: "Retinol",
    b: "Benzoyl peroxide",
    conflict: "BPO oxidizes and deactivates retinoids; the combo is also harsh.",
    fix: "Different sessions entirely — BPO in the AM if needed, retinol PM.",
  },
  {
    a: "Retinol",
    b: "Vitamin C",
    conflict: "Both are potent pH-sensitive actives; layering can destabilize both.",
    fix: "Vitamin C in the AM, retinol in the PM.",
  },
  {
    a: "Benzoyl peroxide",
    b: "Vitamin C",
    conflict: "BPO oxidizes vitamin C on contact, canceling the brightening.",
    fix: "Keep BPO in the PM, vitamin C in the AM.",
  },
  {
    a: "AHAs (glycolic/lactic)",
    b: "Salicylic acid",
    conflict: "Two exfoliants in one session over-exfoliates fast.",
    fix: "Pick one per night — AHA for surface dullness, BHA for pore texture.",
  },
];

export interface SynergyReport {
  /** Power pairs present in the current look-for set. */
  pairs: SynergyPair[];
  /** Conflicting pairs present in the current look-for set. */
  conflicts: ConflictPair[];
  /** Conflicts relevant because of the user's flags (even if not both actives are picked). */
  flagWarnings: ConflictPair[];
}

function findPowerPairs(lookFor: Ingredient[]): SynergyPair[] {
  const names = new Set(lookFor.map((i) => i.name));
  const out: SynergyPair[] = [];
  for (const p of POWER_PAIRS) {
    if (names.has(p.a) && names.has(p.b)) out.push(p);
  }
  // The "SPF" side of the vitamin-C pair comes from the universal staple, so
  // treat SPF as always present.
  if (names.has("Vitamin C") && !out.some((p) => p.b === "SPF")) {
    const vc = POWER_PAIRS.find((p) => p.a === "Vitamin C" && p.b === "SPF");
    if (vc) out.push(vc);
  }
  return out;
}

function findConflicts(lookFor: Ingredient[]): ConflictPair[] {
  const names = new Set(lookFor.map((i) => i.name));
  return CONFLICTS.filter(
    (c) => names.has(c.a) && names.has(c.b),
  );
}

/**
 * Full synergy analysis for a report: the look-for set, avoid set, and
 * synergy read in one deterministic pass. `age` (from the profile) gates
 * retinol — under 18, the copy steers to gentler actives.
 */
export function analyzeIngredients(
  report: AnalysisReport | null,
  opts?: { age?: number | null },
): {
  flags: SkinFlag[];
  lookFor: Array<Ingredient & { flag: SkinFlagKey; flagLabel: string }>;
  avoid: Array<AvoidIngredient & { flagKey: SkinFlagKey; flagLabel: string }>;
  synergy: SynergyReport;
  hasScan: boolean;
} {
  if (!report) {
    return {
      flags: [],
      lookFor: [],
      avoid: [],
      synergy: { pairs: [], conflicts: [], flagWarnings: [] },
      hasScan: false,
    };
  }

  const flags = skinFlags(report);

  // Look-for: dedupe by ingredient name across flags (first flag wins the
  // attribution), cap the list.
  const byName = new Map<string, { ing: Ingredient; flag: SkinFlagKey; flagLabel: string }>();
  for (const flag of flags) {
    for (const ing of INGREDIENTS_FOR_FLAG[flag.key] ?? []) {
      if (!byName.has(ing.name)) {
        byName.set(ing.name, { ing, flag: flag.key, flagLabel: flag.label });
      }
    }
  }
  const lookFor = [...byName.values()].slice(0, 6).map((v) => ({
    ...v.ing,
    flag: v.flag,
    flagLabel: v.flagLabel,
  }));

  // Avoid: from every flag, deduped, retinol-caution swapped for minors.
  const avoidByName = new Map<string, AvoidIngredient & { flagKey: SkinFlagKey; flagLabel: string }>();
  for (const flag of flags) {
    for (const a of INGREDIENTS_TO_AVOID[flag.key] ?? []) {
      if (!avoidByName.has(a.name)) {
        avoidByName.set(a.name, { ...a, flagKey: flag.key, flagLabel: flag.label });
      }
    }
  }
  const avoid = [...avoidByName.values()];

  // Under 18: swap the retinol entry for a gentler steer.
  if ((opts?.age ?? null) !== null && (opts?.age ?? 99) < 18) {
    const idx = avoid.findIndex((a) => a.name.startsWith("Retinol"));
    if (idx >= 0) {
      avoid[idx] = {
        name: "Retinol (under 18)",
        caution:
          "At your age a gentle routine (niacinamide + SPF) does the job — prescription-strength actives can wait.",
        flagKey: avoid[idx].flagKey,
        flagLabel: avoid[idx].flagLabel,
      };
    }
    // Also pull the retinol ingredient out of the look-for set.
    const lookIdx = lookFor.findIndex((i) => i.name === "Retinol");
    if (lookIdx >= 0) lookFor.splice(lookIdx, 1);
  }

  const synergy: SynergyReport = {
    pairs: findPowerPairs(lookFor),
    conflicts: findConflicts(lookFor),
    flagWarnings: flags.some((f) => f.key === "acne")
      ? CONFLICTS.filter((c) => c.a === "Retinol")
      : [],
  };

  return { flags, lookFor, avoid, synergy, hasScan: true };
}
