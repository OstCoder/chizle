// Face shape classification from ratios.
//
// Primary scoring still uses the four 2D ratios (facial index, cheek-to-jaw,
// forehead-to-jaw, jawline angle) against ideal profiles per shape. A
// secondary depth signal (chin projection + midface projection) nudges the
// score so a recessed-chin face reads as round/oblong even if its silhouette
// alone could pass for square.

import type { FaceRatios, FaceShape } from "@/types/analysis";

interface ShapeProfile {
  shape: FaceShape;
  facialIndexIdeal: number;
  facialIndexTolerance: number;
  cheekToJawIdeal: number;
  cheekToJawTolerance: number;
  foreheadToJawIdeal: number;
  foreheadToJawTolerance: number;
  jawlineAngleIdeal: number;
  jawlineAngleTolerance: number;
}

const PROFILES: ShapeProfile[] = [
  {
    shape: "oval",
    facialIndexIdeal: 1.45,
    facialIndexTolerance: 0.18,
    cheekToJawIdeal: 1.25,
    cheekToJawTolerance: 0.18,
    foreheadToJawIdeal: 1.05,
    foreheadToJawTolerance: 0.2,
    jawlineAngleIdeal: 110,
    jawlineAngleTolerance: 20,
  },
  {
    shape: "square",
    facialIndexIdeal: 1.22,
    facialIndexTolerance: 0.12,
    cheekToJawIdeal: 1.05,
    cheekToJawTolerance: 0.12,
    foreheadToJawIdeal: 1.0,
    foreheadToJawTolerance: 0.15,
    jawlineAngleIdeal: 92,
    jawlineAngleTolerance: 14,
  },
  {
    shape: "round",
    facialIndexIdeal: 1.18,
    facialIndexTolerance: 0.12,
    cheekToJawIdeal: 1.32,
    cheekToJawTolerance: 0.18,
    foreheadToJawIdeal: 1.05,
    foreheadToJawTolerance: 0.2,
    jawlineAngleIdeal: 138,
    jawlineAngleTolerance: 18,
  },
  {
    shape: "heart",
    facialIndexIdeal: 1.35,
    facialIndexTolerance: 0.18,
    cheekToJawIdeal: 1.12,
    cheekToJawTolerance: 0.18,
    foreheadToJawIdeal: 1.22,
    foreheadToJawTolerance: 0.15,
    jawlineAngleIdeal: 105,
    jawlineAngleTolerance: 20,
  },
  {
    shape: "oblong",
    facialIndexIdeal: 1.65,
    facialIndexTolerance: 0.15,
    cheekToJawIdeal: 1.1,
    cheekToJawTolerance: 0.15,
    foreheadToJawIdeal: 1.0,
    foreheadToJawTolerance: 0.15,
    jawlineAngleIdeal: 110,
    jawlineAngleTolerance: 20,
  },
  {
    shape: "diamond",
    facialIndexIdeal: 1.35,
    facialIndexTolerance: 0.15,
    cheekToJawIdeal: 1.4,
    cheekToJawTolerance: 0.18,
    foreheadToJawIdeal: 0.82,
    foreheadToJawTolerance: 0.15,
    jawlineAngleIdeal: 108,
    jawlineAngleTolerance: 20,
  },
];

export function classifyFaceShape(r: FaceRatios): FaceShape {
  // Discount the classifier if landmarks were low-confidence — modeled in 3D
  // by the visibility average — so we don't make confident calls on noisy input.
  const confidence = clamp(r.landmarksConfidence ?? 1, 0.3, 1);

  let best: FaceShape = "oval";
  let bestScore = -Infinity;
  let bestDistance = Infinity;
  for (const p of PROFILES) {
    const score =
      closeness(r.facialIndex, p.facialIndexIdeal, p.facialIndexTolerance) * 1.4 +
      closeness(r.cheekToJawRatio, p.cheekToJawIdeal, p.cheekToJawTolerance) * 1.2 +
      closeness(r.foreheadToJawRatio, p.foreheadToJawIdeal, p.foreheadToJawTolerance) * 1.0 +
      closeness(r.jawlineAngle, p.jawlineAngleIdeal, p.jawlineAngleTolerance) * 0.8;
    const distance =
      Math.abs(r.facialIndex - p.facialIndexIdeal) / p.facialIndexTolerance +
      Math.abs(r.cheekToJawRatio - p.cheekToJawIdeal) / p.cheekToJawTolerance;
    const biased = score * confidence + depthBias(p.shape, r);
    if (
      biased > bestScore ||
      (biased === bestScore && distance < bestDistance)
    ) {
      bestScore = biased;
      bestDistance = distance;
      best = p.shape;
    }
  }
  return best;
}

// Secondary depth signal: large positive chinProjection means the chin sits
// behind the nose base in 3D — i.e. recessed. That aligns more with round /
// oblong. Large positive midfaceProjection (cheekbones closer to the camera
// than the nose bridge, the typical high-cheekbone signature) leans toward
// diamond / heart.
//
// z convention (MediaPipe): smaller z = closer to camera.
function depthBias(shape: FaceShape, r: FaceRatios): number {
  const chinBias = Math.max(0, (r.chinProjection ?? 0) - 0.005) * 25;
  const cheekBias = Math.max(0, (r.midfaceProjection ?? 0) - 0.005) * 25;
  switch (shape) {
    case "round":
    case "oblong":
      return chinBias * 0.8;
    case "diamond":
    case "heart":
      return cheekBias * 0.8;
    case "square":
      return -chinBias * 0.4; // small penalty: a recessed chin is not a square jaw
    default:
      return 0;
  }
}

function closeness(actual: number, ideal: number, tol: number): number {
  const diff = Math.abs(actual - ideal);
  return Math.max(0, 1 - diff / tol);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
