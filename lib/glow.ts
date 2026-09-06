// Dashboard domain logic for the Glow experience. Everything here is derived
// from real scan reports + the user's onboarding profile — no fabricated
// measurements. Where a metric is a proxy (e.g. "clarity" from image
// sharpness), the UI copy says so.
//
// All functions are pure so they stay easy to reason about and test.

import type { AnalysisReport } from "@/types/analysis";
import { HAIR_COLOR_LABEL, hairStyleAdvice, hairTextureLabel } from "./hair";
import { scorecard } from "./scorecard";
import { clamp } from "./utils";
import type { PersistedAnalysis } from "./persistence";

// ---------------------------------------------------------------------------
// Identity & greeting
// ---------------------------------------------------------------------------

/** First-name guess from the account email ("sarah.m@x.com" -> "Sarah"). */
export function greetingName(email?: string | null): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._\-+0-9]/)[0];
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Warm time-of-day line, e.g. "Ready to start your morning check-in?" */
export function greetingTagline(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night self-care counts double. Let's keep it gentle.";
  if (h < 12) return "Ready to start your morning check-in?";
  if (h < 18) return "A quick check-in keeps the day on track.";
  return "Evening is prime recovery time — let's review today.";
}

// ---------------------------------------------------------------------------
// Glow score
// ---------------------------------------------------------------------------

/** 0..100 overall harmony metric — the dashboard's headline number. */
export function glowScore(report: AnalysisReport): number {
  return Math.round(scorecard(report, "app").overall * 10);
}

export interface GlowBand {
  label: string;
  blurb: string;
}

export function glowBand(score: number): GlowBand {
  if (score >= 85) {
    return {
      label: "Radiant",
      blurb: "Your read is strong across the board. Consistency now protects this level.",
    };
  }
  if (score >= 70) {
    return {
      label: "Glowing",
      blurb: "A really solid baseline — a couple of small habits will lift it further.",
    };
  }
  if (score >= 55) {
    return {
      label: "Warming up",
      blurb: "Good foundations are showing. Focus on one area this week and watch it move.",
    };
  }
  return {
    label: "Day one",
    blurb: "Every journey starts here. Your first scans build the baseline everything improves from.",
  };
}

// ---------------------------------------------------------------------------
// Skin health (proxy metrics from lighting / image-quality signals)
// ---------------------------------------------------------------------------

export interface SkinMetric {
  key: string;
  label: string;
  value: number; // 0..100
  note: string;
}

export function skinMetrics(report: AnalysisReport): SkinMetric[] {
  const evenness = clamp(Math.round(report.light.evenness * 100), 0, 100);
  const sharpness = clamp(Math.round(report.light.sharpness * 100), 0, 100);
  const qualityBonus =
    report.imageQuality.quality === "good"
      ? 30
      : report.imageQuality.quality === "ok"
        ? 20
        : 10;
  const clarity = clamp(
    Math.round(sharpness * 0.7 + qualityBonus),
    0,
    100,
  );
  const radiance = clamp(
    Math.round((1 - Math.abs(report.light.brightness - 155) / 50) * 100),
    0,
    100,
  );
  return [
    {
      key: "evenness",
      label: "Evenness",
      value: evenness,
      note:
        "How evenly light falls across your face — the base of a smooth-looking complexion.",
    },
    {
      key: "clarity",
      label: "Clarity",
      value: clarity,
      note:
        "Crispness of the scan — a proxy for how defined your skin texture reads.",
    },
    {
      key: "radiance",
      label: "Radiance",
      value: radiance,
      note:
        "Balanced exposure is what makes skin look lit from within on camera.",
    },
  ];
}

/** Sparkline series per skin metric across history (oldest -> newest). */
export function skinTrends(
  entries: PersistedAnalysis[],
): Array<SkinMetric & { history: number[] }> {
  const chronological = [...entries].reverse();
  const keys = ["evenness", "clarity", "radiance"] as const;
  return keys.map((key) => {
    const latest = chronological[chronological.length - 1];
    const history = chronological.map((e) => {
      const m = skinMetrics(e.report).find((x) => x.key === key);
      return m ? m.value : 0;
    });
    const metric = latest
      ? skinMetrics(latest.report).find((m) => m.key === key)!
      : { key, label: key, value: 0, note: "" };
    return { ...metric, history };
  });
}

// ---------------------------------------------------------------------------
// Symmetry & geometry
// ---------------------------------------------------------------------------

export interface SymmetryMetric {
  label: string;
  value: number; // 0..100
  note: string;
}

export function symmetryMetrics(report: AnalysisReport): SymmetryMetric[] {
  const overall = Math.round(report.symmetry.overall);
  const eye = Math.round(report.symmetry.eyeLevel);
  const cheek = Math.round(report.symmetry.cheekLevel);
  const lip = Math.round(report.symmetry.lipLevel);
  return [
    {
      label: "Overall harmony",
      value: overall,
      note:
        overall > 85
          ? "Beautifully balanced — your features sit in calm, even alignment."
          : overall > 75
            ? "Strong harmony with only the natural, human variation everyone has."
            : "A little asymmetry is completely normal — a slight angle flatters most faces.",
    },
    {
      label: "Eye level",
      value: eye,
      note:
        eye > 85
          ? "Eyes sit evenly — the strongest symmetry cue there is."
          : "A tiny difference here is invisible to almost everyone but you.",
    },
    {
      label: "Cheek level",
      value: cheek,
      note:
        cheek > 85
          ? "Cheekbones read evenly across the face."
          : "Sleep and hydration both soften cheek asymmetry within days.",
    },
    {
      label: "Lip level",
      value: lip,
      note:
        lip > 85
          ? "Smile line is even — very flattering in photos."
          : "Practicing a mirrored, even smile helps train this gently.",
    },
  ];
}

/** One-line geometry insight from thirds balance + face shape. */
export function geometryInsight(report: AnalysisReport): string {
  const balance = Math.round(report.ratios.thirdsBalance * 100);
  const shape = report.shape;
  if (balance >= 75) {
    return `Your facial thirds are well balanced (${balance}%) — the ${shape} shape reads harmonious and easy to style for.`;
  }
  if (balance >= 55) {
    return `Your facial thirds are gently balanced (${balance}%). For a ${shape} shape, styling hair with a little height or width does most of the work.`;
  }
  return `Your facial thirds are still finding balance (${balance}%). Your ${shape} shape looks best with soft volume on top and clean lines at the jaw.`;
}

// ---------------------------------------------------------------------------
// Daily motivation / focus tip
// ---------------------------------------------------------------------------

export interface DailyTip {
  headline: string;
  body: string;
}

export function dailyTip(
  report: AnalysisReport | null,
  firstName: string,
): DailyTip {
  if (!report) {
    return {
      headline: "Your baseline starts with one scan",
      body: "Take a front-facing photo in soft, even light — today's read becomes the baseline every future score is measured against.",
    };
  }
  const focus = report.weakspots[0];
  if (focus) {
    const rec =
      focus.recommendations[0] ?? focus.findings[0] ?? "Keep the routine steady.";
    return {
      headline: `Today's focus: ${focus.title.toLowerCase()}`,
      body: `${rec} A little progress here ${firstName ? firstName + ", " : ""}moves your whole read.`,
    };
  }
  if (report.hair?.visible) {
    return {
      headline: "A small style moment today",
      body: `Your hair reads as ${hairTextureLabel(report.hair).toLowerCase()}, ${
        HAIR_COLOR_LABEL[report.hair.color] ?? report.hair.color
      } — a quick refresh of the ${report.shape} shape styling keeps that read sharp.`,
    };
  }
  return {
    headline: "Consistency beats intensity",
    body: "Hydration, sleep, and a calm expression do more for your read than any single fix. Keep showing up.",
  };
}

// ---------------------------------------------------------------------------
// Personalized daily routine
// ---------------------------------------------------------------------------

export interface RoutineItem {
  id: string;
  label: string;
  detail: string;
  category: "Skin" | "Face" | "Hydration" | "Presence" | "Hair" | "Rest";
}

/** Water target in ml from the profile's weight (imperial lbs -> kg). */
export function waterTarget(profile: {
  weight?: number | null;
  weight_unit?: string | null;
}): number {
  const kg = profile?.weight
    ? profile.weight_unit === "imperial"
      ? profile.weight * 0.4536
      : profile.weight
    : null;
  const target = kg ? kg * 35 : 2000;
  return Math.max(1500, Math.round(target / 250) * 250);
}

/** Tailored checklist from scan + profile. Deterministic and capped at 6. */
export function buildRoutine(
  report: AnalysisReport | null,
  profile: {
    weight?: number | null;
    weight_unit?: string | null;
    hair_type?: string | null;
  } | null,
): RoutineItem[] {
  const items: RoutineItem[] = [];
  const water = waterTarget(profile ?? {});
  const waterLabel = water >= 1000 ? `${(water / 1000).toFixed(1)} L` : `${water} ml`;
  items.push({
    id: "hydration",
    label: `Drink ${waterLabel} of water today`,
    detail: "Tailored to your body stats — hydration shows up in skin within days.",
    category: "Hydration",
  });

  items.push({
    id: "am-skin",
    label: "Gentle cleanse + SPF this morning",
    detail: "The two-step base that keeps clarity readings steady between scans.",
    category: "Skin",
  });

  if (report && report.light.evenness < 0.75) {
    items.push({
      id: "even-light",
      label: "Do one 'window light' photo check",
      detail: "Face a window for 60 seconds — even light is the fastest radiance win.",
      category: "Skin",
    });
  } else if (report && report.light.sharpness < 0.45) {
    items.push({
      id: "focus",
      label: "Practice a steady, focused camera hold",
      detail: "Tap to focus on the eyes and hold still — crisp reads look clearer.",
      category: "Skin",
    });
  }

  if (report && report.symmetry.overall < 78) {
    items.push({
      id: "massage",
      label: "2-minute jawline sweep",
      detail: "Gentle upward massage from chin to ear — relaxing, de-puffing, calming.",
      category: "Face",
    });
  }

  if (report && report.posture.chinToCamera < 0.7) {
    items.push({
      id: "posture",
      label: "3-minute level-chin reset",
      detail: "Chin level, shoulders back, soft gaze — posture shifts the whole read.",
      category: "Presence",
    });
  } else if (report && !report.smile.detected) {
    items.push({
      id: "smile",
      label: "30-second relaxed smile practice",
      detail: "Eyes engaged, lips closed, soft lift — warmth is your fastest win.",
      category: "Presence",
    });
  }

  if (report?.hair?.visible) {
    const advice = hairStyleAdvice(report.shape, report.hair)[0];
    items.push({
      id: "hair",
      label: `Style for your ${report.shape} face shape`,
      detail: advice ?? "Refresh the cut and keep the style tidy today.",
      category: "Hair",
    });
  } else if (profile?.hair_type) {
    items.push({
      id: "hair",
      label: `${profile.hair_type} hair — give it a gentle refresh`,
      detail: "A light product + clean lines reads as intentional grooming.",
      category: "Hair",
    });
  }

  items.push({
    id: "rest",
    label: "Aim for 7–8 hours of sleep tonight",
    detail: "Rest is when skin repairs and puffiness fades — it shows in the next scan.",
    category: "Rest",
  });

  return items.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Progress (before vs now)
// ---------------------------------------------------------------------------

export interface ProgressDelta {
  label: string;
  before: number;
  now: number;
  betterWhenHigher: boolean;
  format: (n: number) => string;
}

/** Key metrics to compare between two scans, oldest -> newest. */
export function progressDeltas(
  beforeReport: AnalysisReport,
  nowReport: AnalysisReport,
): ProgressDelta[] {
  return [
    {
      label: "Chizle score",
      before: glowScore(beforeReport),
      now: glowScore(nowReport),
      betterWhenHigher: true,
      format: (n) => `${n}`,
    },
    {
      label: "Harmony",
      before: Math.round(beforeReport.symmetry.overall),
      now: Math.round(nowReport.symmetry.overall),
      betterWhenHigher: true,
      format: (n) => `${n}`,
    },
    {
      label: "Balance",
      before: Math.round(beforeReport.ratios.thirdsBalance * 100),
      now: Math.round(nowReport.ratios.thirdsBalance * 100),
      betterWhenHigher: true,
      format: (n) => `${n}%`,
    },
    {
      label: "Warmth",
      before: Math.round(beforeReport.smile.score),
      now: Math.round(nowReport.smile.score),
      betterWhenHigher: true,
      format: (n) => `${n}`,
    },
  ];
}

/** Friendly "last scan" label from an ISO timestamp. */
export function lastScanLabel(savedAt: string | undefined): string {
  if (!savedAt) return "No scan yet";
  const then = new Date(savedAt).getTime();
  if (Number.isNaN(then)) return "Recently";
  const mins = Math.max(1, Math.round((Date.now() - then) / 60_000));
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(savedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sculpt list (facial fitness checklist)
// ---------------------------------------------------------------------------

export interface SculptItem {
  id: string;
  label: string;
  detail: string;
  duration: string;
  category: "Jawline" | "Face yoga" | "Mewing" | "Eyes";
}

/** Daily facial-fitness practice, lightly tailored to the latest read. */
export function sculptList(report: AnalysisReport | null): SculptItem[] {
  const items: SculptItem[] = [
    {
      id: "jawline-tracking",
      label: "Jawline tracking set",
      detail:
        "3 slow sets: open, glide, hold — chin level, tongue resting on the palate.",
      duration: "3 min",
      category: "Jawline",
    },
    {
      id: "mewing-timer",
      label: "Mewing posture timer",
      detail:
        "Nasal breathing, tongue on the roof of the mouth, lips sealed, jaw relaxed.",
      duration: "10 min",
      category: "Mewing",
    },
    {
      id: "face-yoga",
      label: "Face yoga flow",
      detail: "Cheek lifts + forehead smoothing, 10 slow reps each, light pressure only.",
      duration: "4 min",
      category: "Face yoga",
    },
    {
      id: "de-puff",
      label: "Eye & temple refresh",
      detail:
        "Gentle lymphatic sweep from inner eye to temple, then down the neck.",
      duration: "2 min",
      category: "Eyes",
    },
  ];
  if (report && report.ratios.jawlineAngle > 115) {
    items.push({
      id: "jawline-definition",
      label: "Jawline definition reps",
      detail:
        "Chin-up holds + neck stretch — visible definition builds over weeks, not days.",
      duration: "5 min",
      category: "Jawline",
    });
  }
  if (report && report.symmetry.overall < 78) {
    items.push({
      id: "balance-work",
      label: "Balance & alignment work",
      detail: "Mirror practice — gentle corrective holds toward your even side.",
      duration: "3 min",
      category: "Face yoga",
    });
  }
  return items.slice(0, 6);
}