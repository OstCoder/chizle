// Canonical MediaPipe FaceMesh landmark indices - referenced throughout the
// analysis pipeline. Names are common to the official face mesh topology.

import type { LandmarkPoint } from "@/types/analysis";

export const LM = {
  // Face oval
  FOREHEAD_TOP: 10,
  CHIN: 152,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  LEFT_JAW: 172,
  RIGHT_JAW: 397,
  LEFT_GONION: 58, // jaw corner
  RIGHT_GONION: 288,
  // Mouth
  UPPER_LIP_TOP: 0,
  UPPER_LIP_BOTTOM: 13,
  LOWER_LIP_TOP: 14,
  LOWER_LIP_BOTTOM: 17,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
  // Nose
  NOSE_TIP: 1,
  NOSE_BRIDGE: 168,
  NOSE_BASE: 2,
  // Eyes
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  // Brows
  LEFT_BROW_INNER: 107,
  RIGHT_BROW_INNER: 336,
  LEFT_BROW_OUTER: 105,
  RIGHT_BROW_OUTER: 334,
  // Temples (forehead width)
  LEFT_TEMPLE: 21,
  RIGHT_TEMPLE: 251,
} as const;

export function getPoint(points: LandmarkPoint[], idx: number): LandmarkPoint {
  const p = points[idx];
  if (!p) {
    return { x: 0, y: 0, z: 0 };
  }
  return p;
}

// A few small helpers for landmark math
export function avgPoint(points: LandmarkPoint[], indices: number[]): LandmarkPoint {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const i of indices) {
    const p = points[i];
    if (!p) continue;
    x += p.x;
    y += p.y;
    z += p.z;
  }
  const n = indices.length || 1;
  return { x: x / n, y: y / n, z: z / n };
}

export function mirrorX(p: LandmarkPoint, axisX: number): LandmarkPoint {
  return { x: 2 * axisX - p.x, y: p.y, z: -p.z };
}
