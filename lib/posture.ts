// Posture analysis from landmarks + the optional 4x4 facialTransformationMatrix.
// The matrix uses the standard row-major layout documented for MediaPipe Tasks
// Vision. We extract yaw/pitch/roll via ZYX Tait-Bryan Euler decomposition:
//
//   R = Rz(γ) · Ry(β) · Rx(α)
//
//   sin β = R[0][2]    →    yaw   = asin(R[0][2])
//   sin α = -R[1][2] / cos β   → pitch = asin(-R[1][2] / cos β)
//   tan γ = -R[0][1] / R[0][0] →  roll = atan2(-R[0][1], R[0][0])
//
// In the row-major flat array m[i + j*4] = M[i][j]: R[0][2] = m[2], R[1][2] =
// m[6], R[0][0] = m[0], R[0][1] = m[1].

import type {
  Angle,
  LandmarkPoint,
  OrientationSource,
  PostureReport,
} from "@/types/analysis";
import { LM } from "./landmarks";

export function computePosture(
  points: LandmarkPoint[],
  transform: number[] | undefined,
): PostureReport {
  const headTiltDeg = computeHeadTilt(points);
  const orient = extractOrientation(transform, points);
  const chinToCamera = computeChinLevel(points);
  const angle = classifyAngle(orient.yawDeg);
  const shoulderVisible = detectShoulders(points);

  return {
    headTiltDeg,
    yawDeg: orient.yawDeg,
    pitchDeg: orient.pitchDeg,
    rollDeg: orient.rollDeg,
    orientationSource: orient.source,
    shoulderVisible,
    chinToCamera,
    angle,
  };
}

function computeHeadTilt(points: LandmarkPoint[]): number {
  const leftEye = points[LM.LEFT_EYE_OUTER];
  const rightEye = points[LM.RIGHT_EYE_OUTER];
  if (!leftEye || !rightEye) return 0;
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

interface Orientation {
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
  source: OrientationSource;
}

function extractOrientation(
  transform: number[] | undefined,
  points: LandmarkPoint[],
): Orientation {
  if (transform && transform.length === 16) {
    try {
      return { ...matrixToEuler(transform), source: "matrix" };
    } catch (err) {
      console.warn("[chizle] failed to extract Euler from transform", err);
    }
  }
  return { ...fallbackYaw(points), source: "heuristic" };
}

function matrixToEuler(m: number[]): Orientation {
  const r02 = clamp(m[2], -1, 1); // M[0][2]
  const r12 = m[6]; // M[1][2]
  const r22 = m[10]; // M[2][2]
  const r00 = m[0]; // M[0][0]
  const r01 = m[1]; // M[0][1]

  const yawRad = Math.asin(r02);
  // Pitch via atan2(-R[1][2], R[2][2]) is defined everywhere — including the
  // yaw = ±90° gimbal-lock region — and is mathematically equivalent to
  // asin(-R[1][2] / cos β) when not in lock.
  const pitchRad = Math.atan2(-r12, r22);
  const rollRad = Math.atan2(-r01, r00);

  return {
    yawDeg: radToDeg(yawRad),
    pitchDeg: radToDeg(pitchRad),
    rollDeg: radToDeg(rollRad),
    source: "matrix",
  };
}

// Coarse 2D heuristic when MediaPipe didn't ship the transform matrix. We
// classify using a cheekbone asymmetry in MediaPipe's z-coordinate (which is
// signed: closer-to-camera features have smaller z). The returned values are
// aligned with classifyAngle's thresholds but should be treated as guidance.
function fallbackYaw(points: LandmarkPoint[]): Orientation {
  const l = points[LM.LEFT_CHEEK];
  const r = points[LM.RIGHT_CHEEK];
  if (!l || !r) {
    return { yawDeg: 0, pitchDeg: 0, rollDeg: 0, source: "heuristic" };
  }
  // When the face turns toward +x, the +x cheek rides closer to the camera and
  // its z becomes smaller (more negative) than the other cheek's z.
  const zDelta = (l.z ?? 0) - (r.z ?? 0);
  const width = Math.abs((r.x ?? 0) - (l.x ?? 1)) || 1;
  const ratio = zDelta / width;
  let yawDeg = 0;
  if (Math.abs(ratio) > 0.15) yawDeg = 75;
  else if (Math.abs(ratio) > 0.05) yawDeg = 40;
  return { yawDeg, pitchDeg: 0, rollDeg: 0, source: "heuristic" };
}

function classifyAngle(yawDeg: number): Angle {
  const a = Math.abs(yawDeg);
  if (a < 15) return "front";
  if (a < 55) return "45";
  return "profile";
}

function computeChinLevel(points: LandmarkPoint[]): number {
  const leftEye = points[LM.LEFT_EYE_OUTER];
  const rightEye = points[LM.RIGHT_EYE_OUTER];
  const noseBase = points[LM.NOSE_BASE];
  const chin = points[LM.CHIN];
  if (!leftEye || !rightEye || !noseBase || !chin) return 0.5;
  const browY = (leftEye.y + rightEye.y) / 2;
  const upper = Math.abs(noseBase.y - browY);
  const lower = Math.abs(chin.y - noseBase.y);
  const ratio = lower / (upper || 1);
  const centered = 1 - Math.min(1, Math.abs(1 - ratio) / 0.3);
  return Math.max(0, Math.min(1, centered));
}

function detectShoulders(points: LandmarkPoint[]): boolean {
  const chin = points[LM.CHIN];
  if (!chin) return false;
  return chin.y > 0.7;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}
