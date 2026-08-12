// Ratio computation from face landmarks.
//
// Two layers of measurement now:
//   1. 2D ratios (lengths divided by face length so they're distance-invariant).
//   2. 3D depth metrics (chin projection relative to nose base, midface
//      projection vs cheekbones) derived from MediaPipe's signed z-coordinate
//      (smaller z = closer to camera). These tell us about the actual 3D
//      structure of the face, not just its silhouette.
//
// A confidence score (mean landmark visibility across the canonical set) lets
// downstream code discount measurements when hair or a hand occludes key points.

import type { FaceRatios, LandmarkPoint } from "@/types/analysis";
import { LM } from "./landmarks";
import { distance2D } from "./utils";

export function computeRatios(points: LandmarkPoint[]): FaceRatios {
  const fore = points[LM.FOREHEAD_TOP];
  const chin = points[LM.CHIN];
  const leftTemple = points[LM.LEFT_TEMPLE];
  const rightTemple = points[LM.RIGHT_TEMPLE];
  const leftCheek = points[LM.LEFT_CHEEK];
  const rightCheek = points[LM.RIGHT_CHEEK];
  const leftGonion = points[LM.LEFT_GONION];
  const rightGonion = points[LM.RIGHT_GONION];
  const leftBrowInner = points[LM.LEFT_BROW_INNER];
  const rightBrowInner = points[LM.RIGHT_BROW_INNER];
  const noseBridge = points[LM.NOSE_BRIDGE];
  const noseBase = points[LM.NOSE_BASE];

  const faceLength = distance2D(fore, chin);
  const safeLen = faceLength || 1;

  // Widths (always positive distances)
  const foreheadWidth = distance2D(leftTemple, rightTemple);
  const cheekboneWidth = distance2D(leftCheek, rightCheek);
  const jawWidth = distance2D(leftGonion, rightGonion);

  // Thirds measured along the vertical axis
  const browY = (leftBrowInner.y + rightBrowInner.y) / 2;
  const upperThird = Math.abs(browY - fore.y) / safeLen;
  const middleThird = Math.abs(noseBase.y - browY) / safeLen;
  const lowerThird = Math.abs(chin.y - noseBase.y) / safeLen;

  // Balance: 1.0 means all three thirds are equal, lower = more unbalanced
  const ideal = 1 / 3;
  const deviations = [
    Math.abs(upperThird - ideal),
    Math.abs(middleThird - ideal),
    Math.abs(lowerThird - ideal),
  ];
  const avgDev = deviations.reduce((a, b) => a + b, 0) / 3;
  const thirdsBalance = Math.max(0, 1 - avgDev / 0.2); // 0.2 dev -> 0

  const facialIndex = faceLength / (cheekboneWidth || 1);

  const jawlineAngle = computeJawlineAngle(leftGonion, rightGonion, chin);

  const cheekToJawRatio = cheekboneWidth / (jawWidth || 1);
  const foreheadToJawRatio = foreheadWidth / (jawWidth || 1);

  // 3D depth metrics. MediaPipe's z is signed (smaller = closer to camera) and
  // is measured in roughly metric units relative to a face-centered origin.
  const chinProjection = (chin?.z ?? 0) - (noseBase?.z ?? 0);
  const midfaceProjection =
    (noseBridge?.z ?? 0) - meanZ(leftCheek, rightCheek);

  const landmarksConfidence = computeConfidence(
    fore,
    chin,
    leftCheek,
    rightCheek,
    noseBase,
    leftBrowInner,
    rightBrowInner,
  );

  return {
    faceLength,
    foreheadWidth,
    cheekboneWidth,
    jawWidth,
    upperThird,
    middleThird,
    lowerThird,
    thirdsBalance,
    facialIndex,
    jawlineAngle,
    cheekToJawRatio,
    foreheadToJawRatio,
    chinProjection,
    midfaceProjection,
    landmarksConfidence,
  };
}

// MediaPipe z convention (smaller = closer to camera).
function meanZ(a: LandmarkPoint, b: LandmarkPoint): number {
  return ((a?.z ?? 0) + (b?.z ?? 0)) / 2;
}

// Visibility is only emitted by MediaPipe when the model is confident enough
// to estimate it. Newer MediaPipe builds emit `visibility: 0` (rather than
// dropping the field entirely) when the model is unconfident — we should
// treat BOTH `undefined` and `0` as missing, not as a real zero signal that
// drags the average confidence down to 0. Default missing values to 1.0
// (legacy callers and tests don't supply the field).
function computeConfidence(...pts: LandmarkPoint[]): number {
  let sum = 0;
  let count = 0;
  for (const p of pts) {
    if (!p) continue;
    const v = p.visibility;
    sum += v && v > 0 ? v : 1;
    count++;
  }
  return count === 0 ? 0 : sum / count;
}

// Angle at the gonion: formed by chin -> left/right gonion -> opposite side.
// A tight angle (<90°) reads as a sharp, defined jawline; a wide angle (>130°)
// reads as a softer / rounder lower third.
function computeJawlineAngle(
  left: LandmarkPoint,
  right: LandmarkPoint,
  chin: LandmarkPoint,
): number {
  const a1 = angleAt(chin, left, right);
  const a2 = angleAt(chin, right, left);
  return (a1 + a2) / 2;
}

function angleAt(
  vertex: LandmarkPoint,
  a: LandmarkPoint,
  b: LandmarkPoint,
): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (m1 === 0 || m2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}
