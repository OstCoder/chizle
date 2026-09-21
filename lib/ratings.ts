// Detailed scoring metrics for the /analyze page.
//
// Everything here is derived deterministically from the AnalysisReport the
// scan pipeline already produces — no fabricated measurements. Where a metric
// is a proxy (e.g. "clarity" from image sharpness), the note copy says so.
//
// Structure:
//  - rateFace(report) -> current overall (0..10) + potential (0..10)
//  - three buckets: Skin Quality, Hair & Style Match, Facial Structure &
//    Symmetry — each with a score, a bucket potential, sub-observations, and
//    flagged issues
//  - an ordered action plan linking low-scoring areas to fixes, each with an
//    estimated overall gain. Potential = current + sum of plan gains (capped),
//    so the headline number and the checklist always agree.

import type {
  ActionTiming,
  AnalysisReport,
} from "@/types/analysis";
import { hairTextureLabel, HAIR_COLOR_LABEL, hairStyleAdvice } from "./hair";
import { scorecard } from "./scorecard";
import { clamp } from "./utils";

export type BucketKey = "skin" | "hair" | "structure";

export interface RatingBucket {
  key: BucketKey;
  label: string;
  score: number; // 0..10
  potential: number; // 0..10 — what targeted habits could reach
  /** Sub-observations backing the score. */
  notes: string[];
  /** Flagged issues (from scan weakspots + honest data limits). */
  flags: string[];
}

export interface PlanStep {
  id: string;
  title: string;
  fix: string;
  timing: ActionTiming;
  bucket: BucketKey | "presence";
  /** Estimated overall gain (in rating points) if this habit sticks. */
  gain: number;
}

export interface RatingResult {
  current: number; // 0..10, one decimal
  potential: number; // 0..10, one decimal
  buckets: RatingBucket[];
  plan: PlanStep[];
  totalGain: number;
}

// Gain per severity for a resolved weakspot. Conservative on purpose: these
// are habit-linked nudges, not medical promises.
const SEVERITY_GAIN: Record<"high" | "medium" | "low", number> = {
  high: 0.4,
  medium: 0.25,
  low: 0.1,
};

const AREA_BUCKET: Record<string, BucketKey | "presence"> = {
  skin: "skin",
  hair: "hair",
  jawline: "structure",
  symmetry: "structure",
  depth: "structure",
  brow: "structure",
  posture: "presence",
  expression: "presence",
  lighting: "presence",
  framing: "presence",
};

export function rateFace(report: AnalysisReport): RatingResult {
  // Overall: the "irl" scorecard (grooming + presence, no lighting) is the
  // honest "how the face reads" number; the app-mode scorecard measures the
  // photo, not the person.
  const current = scorecard(report, "irl").overall;

  const buckets = [skinBucket(report), hairBucket(report), structureBucket(report)];
  const plan = buildPlan(report);
  const totalGain = round1(plan.reduce((a, s) => a + s.gain, 0));
  const potential = Math.min(9.6, round1(current + totalGain));

  // Distribute plan gains back onto buckets so each bucket's potential is
  // its score plus the gains of the steps attributed to it.
  const withPotential = buckets.map((b) => {
    const bucketGain = plan
      .filter((s) => s.bucket === b.key)
      .reduce((a, s) => a + s.gain, 0);
    return { ...b, potential: Math.min(10, round1(b.score + bucketGain)) };
  });

  return { current, potential, buckets: withPotential, plan, totalGain };
}

// ---------------------------------------------------------------------------
// Buckets
// ---------------------------------------------------------------------------

function skinBucket(report: AnalysisReport): RatingBucket {
  const { light, imageQuality } = report;
  const evenness = light.evenness * 10; // tone evenness proxy
  const qualityBonus =
    imageQuality.quality === "good" ? 3 : imageQuality.quality === "ok" ? 2 : 1;
  const clarity = clamp(light.sharpness * 7 + qualityBonus, 0, 10); // texture read proxy

  const score = round1(clamp((evenness + clarity) / 2, 0, 10));

  const notes: string[] = [
    `Tone evenness reads ${Math.round(evenness * 10)}/100 under this lighting.`,
    `Clarity reads ${Math.round(clarity * 10)}/100 — how defined skin texture appears on camera.`,
  ];

  const flags: string[] = [];
  for (const spot of report.weakspots) {
    if (spot.area === "skin") flags.push(spot.title);
  }
  if (light.evenness < 0.6) {
    flags.push("Uneven light flattens tone — retake facing a window");
  }
  if (light.sharpness < 0.4) {
    flags.push("Soft focus hides texture detail");
  }

  return { key: "skin", label: "Skin Quality", score, potential: score, notes, flags };
}

function hairBucket(report: AnalysisReport): RatingBucket {
  const hair = report.hair;
  const notes: string[] = [];
  const flags: string[] = [];

  if (!hair.visible) {
    notes.push(
      "Hair isn't clearly in frame, so health and styling can't be assessed from this photo.",
    );
    flags.push("Hair out of frame — include it in the next scan");
    return { key: "hair", label: "Hair & Style Match", score: 4, potential: 4, notes, flags };
  }

  // Presentation proxy: signal strength of the read + how decisive the
  // texture classification was. A confident, clearly-presented style scores
  // high; a borderline read leaves room for a styling win.
  const score = round1(clamp(5 + hair.confidence * 3 + (hair.textureConfidence ?? 0.5) * 2, 0, 10));
  notes.push(
    `Hair reads as ${hairTextureLabel(hair).toLowerCase()}, ${HAIR_COLOR_LABEL[hair.color]}.`,
  );
  notes.push(
    `Top cut for your ${report.shape} shape: ${hairStyleAdvice(report.shape, hair)[0]}`,
  );
  if ((hair.textureConfidence ?? 1) < 0.45) {
    flags.push("Borderline texture read — style it deliberately next scan");
  }

  return { key: "hair", label: "Hair & Style Match", score, potential: score, notes, flags };
}

function structureBucket(report: AnalysisReport): RatingBucket {
  const { ratios, symmetry } = report;

  // Jawline sharpness: same ideal the scorecard's grooming bucket uses.
  const jawline = bell(ratios.jawlineAngle, 100, 30) * 10;
  // Cheekbone prominence: cheek-to-jaw width ratio around 1.35 reads prominent.
  const cheeks = bell(ratios.cheekToJawRatio, 1.35, 0.4) * 10;
  const sym = symmetry.overall / 10;
  const thirds = ratios.thirdsBalance * 10;

  const score = round1(clamp(sym * 0.4 + jawline * 0.25 + cheeks * 0.2 + thirds * 0.15, 0, 10));

  const notes: string[] = [
    `Symmetry ${Math.round(symmetry.overall)}/100 (eyes ${Math.round(symmetry.eyeLevel)}, cheeks ${Math.round(symmetry.cheekLevel)}, lips ${Math.round(symmetry.lipLevel)}).`,
    `Jawline angle ~${Math.round(ratios.jawlineAngle)}° — ${jawline >= 7 ? "reads defined" : "reads soft"}.`,
    `Cheekbone-to-jaw ratio ${ratios.cheekToJawRatio.toFixed(2)} — ${cheeks >= 7 ? "prominent" : "gentle"} contour.`,
    `Facial thirds balance ${Math.round(ratios.thirdsBalance * 100)}%.`,
  ];

  const flags: string[] = report.weakspots
    .filter((s) => s.area === "jawline" || s.area === "symmetry" || s.area === "depth")
    .map((s) => s.title);

  return { key: "structure", label: "Facial Structure & Symmetry", score, potential: score, notes, flags };
}

// ---------------------------------------------------------------------------
// Action plan
// ---------------------------------------------------------------------------

function buildPlan(report: AnalysisReport): PlanStep[] {
  const steps: PlanStep[] = report.weakspots.map((spot) => ({
    id: spot.id,
    title: spot.title,
    fix: spot.recommendations[0] ?? spot.findings[0] ?? "Keep the routine steady.",
    timing: spot.timing ?? "soon",
    bucket: AREA_BUCKET[spot.area] ?? "presence",
    gain: SEVERITY_GAIN[spot.severity],
  }));

  // Hair-specific step when the scan couldn't read the hair at all.
  if (!report.hair.visible && !steps.some((s) => s.bucket === "hair")) {
    steps.push({
      id: "hair-style-match",
      title: "Style hair for your face shape",
      fix: hairStyleAdvice(report.shape, report.hair)[0],
      timing: "soon",
      bucket: "hair",
      gain: 0.3,
    });
  }

  // Priority: highest estimated gain first, then now → soon → later.
  const timingOrder: Record<ActionTiming, number> = { now: 0, soon: 1, later: 2 };
  steps.sort(
    (a, b) =>
      b.gain - a.gain || timingOrder[a.timing] - timingOrder[b.timing],
  );

  return steps.slice(0, 6);
}

function severityOf(gain: number): "high" | "medium" | "low" {
  if (gain >= 0.4) return "high";
  if (gain >= 0.25) return "medium";
  return "low";
}

function bell(x: number, ideal: number, spread: number): number {
  const d = Math.abs(x - ideal);
  return Math.max(0, 1 - d / spread);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
