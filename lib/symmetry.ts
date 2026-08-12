// Symmetry analysis.
// Computes a vertical axis of symmetry using the average of left/right
// landmark pairs, then mirrors each landmark and measures the absolute x-offset.
// Region weights (eye / cheek / lip) penalize asymmetries that read strongly.

import type { LandmarkPoint, SymmetryReport } from "@/types/analysis";
import { LM, mirrorX } from "./landmarks";

interface SymPair {
  left: number;
  right: number;
  weight: number;
  region: "eye" | "cheek" | "lip" | "jaw" | "brow" | "nose" | "chin";
}

const PAIRS: SymPair[] = [
  // Eyes - high weight
  { left: LM.LEFT_EYE_OUTER, right: LM.RIGHT_EYE_OUTER, weight: 1.4, region: "eye" },
  { left: LM.LEFT_EYE_INNER, right: LM.RIGHT_EYE_INNER, weight: 1.4, region: "eye" },
  { left: LM.LEFT_EYE_TOP, right: LM.RIGHT_EYE_TOP, weight: 1.0, region: "eye" },
  { left: LM.LEFT_EYE_BOTTOM, right: LM.RIGHT_EYE_BOTTOM, weight: 1.0, region: "eye" },
  // Brows
  { left: LM.LEFT_BROW_INNER, right: LM.RIGHT_BROW_INNER, weight: 1.2, region: "brow" },
  { left: LM.LEFT_BROW_OUTER, right: LM.RIGHT_BROW_OUTER, weight: 1.2, region: "brow" },
  // Cheeks
  { left: LM.LEFT_CHEEK, right: LM.RIGHT_CHEEK, weight: 1.1, region: "cheek" },
  // Lips
  { left: LM.MOUTH_LEFT, right: LM.MOUTH_RIGHT, weight: 1.3, region: "lip" },
  // Jaw
  { left: LM.LEFT_JAW, right: LM.RIGHT_JAW, weight: 1.0, region: "jaw" },
  { left: LM.LEFT_GONION, right: LM.RIGHT_GONION, weight: 1.1, region: "jaw" },
  // Temples
  { left: LM.LEFT_TEMPLE, right: LM.RIGHT_TEMPLE, weight: 0.7, region: "cheek" },
  // Nose base - naturally near axis, low weight
  { left: LM.NOSE_BASE, right: LM.NOSE_BASE, weight: 0.3, region: "nose" },
];

export function computeSymmetry(points: LandmarkPoint[]): SymmetryReport {
  // Un-tilt every landmark by the head's eye-line roll before computing
  // mirror diffs. Without this, a head rotated by θ produces a phantom
  // x-displacement on every landmark — y·tan(θ) for each landmark at height
  // y — which stacks into meanOffsetNorm and can collapse the symmetry score
  // to 0 even on near-mirror-symmetric faces (observed on a real test photo
  // with roll=5° → score=0/100 pre-fix). Match the angular convention used
  // by computeHeadTilt in lib/posture.ts so the two modules agree on roll.
  const leftEye = points[LM.LEFT_EYE_OUTER];
  const rightEye = points[LM.RIGHT_EYE_OUTER];
  let rollRad = 0;
  if (leftEye && rightEye) {
    rollRad = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  }
  const cos = Math.cos(rollRad);
  const sin = Math.sin(rollRad);
  const upoints: LandmarkPoint[] = points.map((p) =>
    p
      ? { x: p.x * cos + p.y * sin, y: -p.x * sin + p.y * cos, z: p.z }
      : p,
  );

  // Axis of symmetry from each pair's midpoint (in un-tilted coords)
  let axisSum = 0;
  let axisWeight = 0;
  for (const pair of PAIRS) {
    const l = upoints[pair.left];
    const r = upoints[pair.right];
    if (!l || !r) continue;
    axisSum += ((l.x + r.x) / 2) * pair.weight;
    axisWeight += pair.weight;
  }
  const axisX = axisWeight > 0 ? axisSum / axisWeight : 0.5;

  // Per-region offsets
  const regionAcc: Record<string, { sum: number; weight: number }> = {};
  let totalSum = 0;
  let totalWeight = 0;
  for (const pair of PAIRS) {
    const l = upoints[pair.left];
    const r = upoints[pair.right];
    if (!l || !r) continue;
    const m = mirrorX(r, axisX);
    const off = Math.abs(l.x - m.x);
    regionAcc[pair.region] = regionAcc[pair.region] || { sum: 0, weight: 0 };
    regionAcc[pair.region].sum += off * pair.weight;
    regionAcc[pair.region].weight += pair.weight;
    totalSum += off * pair.weight;
    totalWeight += pair.weight;
  }

  const meanOffset = totalWeight > 0 ? totalSum / totalWeight : 0;

  // Normalize by face width (cheekbone width via lm)
  const leftCheek = upoints[LM.LEFT_CHEEK];
  const rightCheek = upoints[LM.RIGHT_CHEEK];
  const faceWidth = Math.abs((leftCheek?.x ?? 0) - (rightCheek?.x ?? 1)) || 1;
  const meanOffsetNorm = meanOffset / faceWidth;

  // 0.05 normalized offset == 0; 0 == best (100)
  const overall = Math.max(0, Math.min(100, 100 * (1 - meanOffsetNorm / 0.05)));

  const regionScore = (region: string) => {
    const acc = regionAcc[region];
    if (!acc || acc.weight === 0) return 100;
    const off = acc.sum / acc.weight;
    const norm = off / faceWidth;
    return Math.max(0, Math.min(100, 100 * (1 - norm / 0.045)));
  };

  return {
    overall,
    eyeLevel: regionScore("eye"),
    cheekLevel: regionScore("cheek"),
    lipLevel: regionScore("lip"),
    meanOffsetNorm,
  };
}
