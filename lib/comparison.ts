// Then vs Now comparison engine.
// Aligns two AnalysisReports and produces a ComparisonReport with deltas and
// bucketed improvements / regressions / neutral bullets, plus the dating-
// profile scorecard for each side so the comparison can show score movement.

import type { AnalysisReport, ComparisonReport } from "@/types/analysis";
import { scorecard } from "./scorecard";

export function compareImages(
  before: AnalysisReport,
  after: AnalysisReport,
): ComparisonReport {
  const deltas = {
    thirdsBalance: roundPct(after.ratios.thirdsBalance - before.ratios.thirdsBalance),
    symmetry: round(after.symmetry.overall - before.symmetry.overall),
    jawlineAngle: round(after.ratios.jawlineAngle - before.ratios.jawlineAngle),
    posture: round((after.posture.chinToCamera - before.posture.chinToCamera) * 100),
    smile: round(after.smile.score - before.smile.score),
    brightness: round(after.light.brightness - before.light.brightness),
  };

  const improvements: string[] = [];
  const regressions: string[] = [];
  const neutral: string[] = [];

  if (deltas.thirdsBalance >= 3) {
    improvements.push(
      `Facial thirds balance improved by ${deltas.thirdsBalance}% (grooming, posture, or shape changes).`,
    );
  } else if (deltas.thirdsBalance <= -3) {
    regressions.push(
      `Facial thirds balance dropped by ${-deltas.thirdsBalance}% — check posture and camera angle.`,
    );
  } else {
    neutral.push("Facial thirds balance is roughly the same.");
  }

  if (deltas.symmetry >= 3) {
    improvements.push(`Symmetry score improved by ${deltas.symmetry} points.`);
  } else if (deltas.symmetry <= -3) {
    regressions.push(
      `Symmetry score dropped by ${-deltas.symmetry} points — usually a posture or angle difference, not a structural change.`,
    );
  } else {
    neutral.push("Symmetry is consistent between the two shots.");
  }

  if (deltas.jawlineAngle <= -3) {
    improvements.push(
      `Jawline reads more defined (angle tightened by ${-deltas.jawlineAngle}°).`,
    );
  } else if (deltas.jawlineAngle >= 3) {
    regressions.push(
      `Jawline angle loosened by ${deltas.jawlineAngle}° — likely weight or posture, not bone structure.`,
    );
  } else {
    neutral.push("Jawline definition is steady.");
  }

  if (deltas.posture >= 4) {
    improvements.push(`Head/chin alignment improved by ${deltas.posture}%.`);
  } else if (deltas.posture <= -4) {
    regressions.push(
      `Head/chin alignment dropped by ${-deltas.posture}% — shoot at eye level next time.`,
    );
  } else {
    neutral.push("Posture in the frame is consistent.");
  }

  if (deltas.smile >= 5) {
    improvements.push(`Expression warmed up — smile score up by ${deltas.smile}.`);
  } else if (deltas.smile <= -5) {
    regressions.push(
      `Smile score is down by ${-deltas.smile} — a relaxed half-smile lands best.`,
    );
  } else {
    neutral.push("Expression is similar in both shots.");
  }

  if (deltas.brightness >= 15) {
    improvements.push(`Photo is ${deltas.brightness} units brighter — better exposure.`);
  } else if (deltas.brightness <= -15) {
    regressions.push(
      `Photo is ${-deltas.brightness} units darker — try to use more even lighting.`,
    );
  } else {
    neutral.push("Lighting is comparable between the two images.");
  }

  const summary = buildSummary(improvements, regressions);

  return {
    deltas,
    improvements,
    regressions,
    neutral,
    summary,
    scorecards: {
      before: scorecard(before),
      after: scorecard(after),
    },
  };
}

// Build the narrative summary from the actual bucketed bullets rather than
// re-deriving polarity from raw deltas. The old implementation listed every
// positive delta as an "improvement" — but for some metrics a positive delta
// is a regression (e.g. jawlineAngle loosening by +3°), so the summary could
// contradict the bullets below it.
function buildSummary(
  improvements: string[],
  regressions: string[],
): string {
  if (improvements.length === 0 && regressions.length === 0) {
    return "The two photos are very close on every measured axis — focus on whatever feels different to your eye.";
  }
  if (improvements.length > regressions.length) {
    const topics = improvements.map(bulletTopic).join(", ");
    return `Measurable improvements: ${topics}. Keep the habits that produced those gains.`;
  }
  const topics = regressions.map(bulletTopic).join(", ");
  return `Regressions on ${topics}. Most of these are easy to reverse with lighting, posture, and a relaxed half-smile.`;
}

// Map a bucketed bullet to a short human topic for the narrative summary.
// Falls back to the first word if no mapping matches.
function bulletTopic(bullet: string): string {
  if (bullet.startsWith("Facial thirds")) return "facial thirds";
  if (bullet.startsWith("Symmetry")) return "symmetry";
  if (bullet.startsWith("Jawline")) return "jawline definition";
  if (bullet.startsWith("Head/chin")) return "head alignment";
  if (bullet.startsWith("Expression")) return "expression";
  if (bullet.startsWith("Photo is")) return "exposure";
  return bullet.split(" ")[0].toLowerCase();
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundPct(n: number): number {
  return Math.round(n * 100);
}
