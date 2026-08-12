// Plain-text formatters for sharing a report via the copy button. Each
// produces a compact, notes-app-friendly block (headers, bullet lists, blank
// lines) with the key numbers and the actionable content. Deliberately
// moderate-length: stats condensed to a single line, one objective finding
// per weakspot, and the top recommendations — not the full wall of text.

import type {
  ActionTiming,
  AnalysisReport,
  ComparisonReport,
  FaceShape,
  HairProfile,
  ScorecardBucket,
  ScorecardReport,
  Weakspot,
} from "@/types/analysis";
import { HAIR_COLOR_LABEL, hairStyleAdvice, hairTextureLabel } from "./hair";
import { cap } from "./utils";

function when(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const SEVERITY_LABEL: Record<Weakspot["severity"], string> = {
  high: "High priority",
  medium: "Worth fixing",
  low: "Small polish",
};

const TIMING_LABEL: Record<ActionTiming, string> = {
  now: "Do this now",
  soon: "This week",
  later: "Over time",
};

/** One finding + top 2 recommendations keeps each entry readable. */
const MAX_FINDINGS = 1;
const MAX_RECOMMENDATIONS = 2;

export function formatAnalysisReport(r: AnalysisReport): string {
  const lines: string[] = [];
  lines.push("Chizle · Face Analysis");
  lines.push(`Generated: ${when(r.generatedAt)}`);
  lines.push("");
  const hairStats =
    r.hair?.visible && r.hair.color !== "unknown"
      ? ` · Hair: ${hairTextureLabel(r.hair)} · ${HAIR_COLOR_LABEL[r.hair.color]}`
      : "";
  lines.push(
    `${cap(r.shape)} · Symmetry ${Math.round(r.symmetry.overall)}/100 · ` +
      `Smile ${r.smile.score}/100${hairStats}`,
  );
  lines.push("");
  lines.push(r.summary);
  if (r.hair?.visible && r.hair.color !== "unknown") {
    lines.push("");
    lines.push("Hair & Style:");
    lines.push(
      `   Reads as ${hairTextureLabel(r.hair).toLowerCase()}, ${HAIR_COLOR_LABEL[r.hair.color].toLowerCase()} — styles for your ${r.shape} face:`,
    );
    for (const rec of hairStyleAdvice(r.shape, r.hair).slice(0, 2)) {
      lines.push(`   → ${rec}`);
    }
  }
  if (r.weakspots.length > 0) {
    lines.push("");
    lines.push("What to work on:");
    r.weakspots.forEach((w, i) => {
      lines.push("");
      lines.push(
        `${i + 1}. [${TIMING_LABEL[w.timing ?? "soon"]}] ${w.title} — ${SEVERITY_LABEL[w.severity]}`,
      );
      for (const f of w.findings.slice(0, MAX_FINDINGS)) lines.push(`   ${f}`);
      for (const rec of w.recommendations.slice(0, MAX_RECOMMENDATIONS)) {
        lines.push(`   → ${rec}`);
      }
    });
  }
  lines.push("");
  lines.push("Analyzed entirely on-device with Chizle.");
  return lines.join("\n");
}

const VERDICT_LABEL: Record<ScorecardReport["verdict"]["bucket"], string> = {
  primary: "Primary photo",
  secondary: "Secondary",
  fix: "Worth fixing",
  reframe: "Recapture",
};

/** Single source of truth for the scorecard mode label (app vs real life). */
export function scorecardModeLabel(mode: ScorecardReport["mode"]): string {
  return mode === "app" ? "Dating app" : "Real life";
}

export function formatScorecardReport(r: ScorecardReport): string {
  const lines: string[] = [];
  lines.push("Chizle · Dating Profile Scorecard");
  lines.push("");
  lines.push(
    `Mode: ${scorecardModeLabel(r.mode)} · Overall: ${r.overall.toFixed(1)}/10 — ${VERDICT_LABEL[r.verdict.bucket]}`,
  );
  lines.push(r.verdict.headline);
  lines.push("");
  lines.push(r.verdict.reason);
  lines.push("");
  for (const key of ["approachability", "photoQuality", "style"] as const) {
    const b = r.buckets[key];
    lines.push(`${b.label}: ${b.score.toFixed(1)}/10 (${cap(b.band)})`);
    for (const note of b.notes.slice(0, 2)) lines.push(`   - ${note}`);
    lines.push("");
  }
  if (r.mode === "irl") {
    lines.push("Scored for real life — lighting deliberately excluded.");
    lines.push("");
  }
  if (r.tips.length > 0) {
    lines.push("Tips:");
    r.tips.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
    lines.push("");
  }
  lines.push("Scored entirely on-device with Chizle.");
  return lines.join("\n");
}

/**
 * Hair-only block for the Hair & Style card's "Copy hair advice" button.
 * Includes the detected read (when visible) plus the style recommendations
 * for the face shape. No other analysis content.
 */
export function formatHairAdvice(shape: FaceShape, hair: HairProfile): string {
  const lines: string[] = [];
  lines.push(`Chizle · Hair advice (${cap(shape)} face)`);
  lines.push("");
  if (hair.visible && hair.color !== "unknown") {
    const tex =
      hair.texture !== "unknown"
        ? `${hairTextureLabel(hair).toLowerCase()}, `
        : "";
    lines.push(`Reads as ${tex}${HAIR_COLOR_LABEL[hair.color].toLowerCase()}.`);
    lines.push("");
  }
  const advice = hairStyleAdvice(shape, hair);
  if (advice.length === 0) {
    lines.push("No style advice available for this read.");
  } else {
    advice.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  lines.push("");
  lines.push("Analyzed entirely on-device with Chizle.");
  return lines.join("\n");
}

/**
 * Tips-only block for the scorecard's "Copy tips" button — a compact,
 * notes-app-friendly list with just the improvement tips and the mode they
 * were scored for. No stats, no verdict, no buckets.
 */
export function formatScorecardTips(r: ScorecardReport): string {
  const lines: string[] = [];
  lines.push(`Chizle · Scorecard tips (${scorecardModeLabel(r.mode)})`);
  lines.push("");
  // buildTips always returns at least one fallback tip, so no empty branch.
  r.tips.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  lines.push("");
  lines.push("Scored entirely on-device with Chizle.");
  return lines.join("\n");
}

function bucketLine(label: string, b: ScorecardBucket): string {
  return `${label}: ${b.score.toFixed(1)}/10`;
}

export function formatComparisonReport(r: ComparisonReport): string {
  const lines: string[] = [];
  lines.push("Chizle · Then vs Now");
  lines.push(`Generated: ${when(new Date().toISOString())}`);
  lines.push("");
  lines.push(r.summary);
  lines.push("");
  if (r.improvements.length > 0) {
    lines.push("Improvements:");
    for (const item of r.improvements) lines.push(`   ↑ ${item}`);
    lines.push("");
  }
  if (r.regressions.length > 0) {
    lines.push("Regressions:");
    for (const item of r.regressions) lines.push(`   ↓ ${item}`);
    lines.push("");
  }
  if (r.neutral.length > 0) {
    lines.push("Steady:");
    for (const item of r.neutral) lines.push(`   = ${item}`);
    lines.push("");
  }
  const { scorecards } = r;
  lines.push(
    `Dating score: ${scorecards.before.overall.toFixed(
      1,
    )} → ${scorecards.after.overall.toFixed(1)} / 10`,
  );
  lines.push(
    `   ${bucketLine("Approachability", scorecards.before.buckets.approachability)} → ${bucketLine(
      "Approachability",
      scorecards.after.buckets.approachability,
    )}`,
  );
  lines.push(
    `   ${bucketLine("Photo Quality", scorecards.before.buckets.photoQuality)} → ${bucketLine(
      "Photo Quality",
      scorecards.after.buckets.photoQuality,
    )}`,
  );
  lines.push(
    `   ${bucketLine("Style", scorecards.before.buckets.style)} → ${bucketLine(
      "Style",
      scorecards.after.buckets.style,
    )}`,
  );
  lines.push("");
  lines.push("Compared entirely on-device with Chizle.");
  return lines.join("\n");
}
