// Expression analysis: blendshape-driven smile/eye/brow when MediaPipe provides
// face blendshapes, geometric fallback otherwise.
//
// Blendshape scores are 0..1 confidences straight from the model. They are
// far more reliable than geometric heuristics because the model has been
// trained against labelled ARKit-compatible face data.

import type {
  BlendshapeScores,
  EyeReport,
  LandmarkPoint,
  SmileReport,
} from "@/types/analysis";
import { LM } from "./landmarks";

interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

export function extractBlendshapes(
  categories: BlendshapeCategory[] | undefined | null,
): BlendshapeScores | null {
  if (!categories || !Array.isArray(categories)) return null;
  const map = new Map<string, number>();
  for (const c of categories) map.set(c.categoryName, c.score);
  const get = (name: string) => map.get(name) ?? 0;
  return {
    mouthSmileLeft: get("mouthSmileLeft"),
    mouthSmileRight: get("mouthSmileRight"),
    mouthFrown: get("mouthFrown"),
    mouthPucker: get("mouthPucker"),
    mouthStretch: get("mouthStretch"),
    browInnerUp: get("browInnerUp"),
    browOuterUpLeft: get("browOuterUpLeft"),
    browOuterUpRight: get("browOuterUpRight"),
    browDownLeft: get("browDownLeft"),
    browDownRight: get("browDownRight"),
    eyeBlinkLeft: get("eyeBlinkLeft"),
    eyeBlinkRight: get("eyeBlinkRight"),
    eyeWideLeft: get("eyeWideLeft"),
    eyeWideRight: get("eyeWideRight"),
    eyeSquintLeft: get("eyeSquintLeft"),
    eyeSquintRight: get("eyeSquintRight"),
    eyeLookInLeft: get("eyeLookInLeft"),
    eyeLookInRight: get("eyeLookInRight"),
    eyeLookOutLeft: get("eyeLookOutLeft"),
    eyeLookOutRight: get("eyeLookOutRight"),
    eyeLookUpLeft: get("eyeLookUpLeft"),
    eyeLookUpRight: get("eyeLookUpRight"),
    eyeLookDownLeft: get("eyeLookDownLeft"),
    eyeLookDownRight: get("eyeLookDownRight"),
    cheekSquintLeft: get("cheekSquintLeft"),
    cheekSquintRight: get("cheekSquintRight"),
    cheekPuff: get("cheekPuff"),
    noseSneerLeft: get("noseSneerLeft"),
    noseSneerRight: get("noseSneerRight"),
    jawOpen: get("jawOpen"),
    jawLeft: get("jawLeft"),
    jawRight: get("jawRight"),
    jawForward: get("jawForward"),
  };
}

export function computeSmile(
  points: LandmarkPoint[],
  faceLength: number,
  blendshapes: BlendshapeScores | null,
): SmileReport {
  if (blendshapes) {
    const left = blendshapes.mouthSmileLeft;
    const right = blendshapes.mouthSmileRight;
    const lift = Math.max(left, right);
    const score = Math.round(100 * lift);
    const detected = lift > 0.4;
    return {
      score,
      detected,
      mouthOpen: blendshapes.jawOpen,
      lipCornerLift: lift,
      smileLeft: left,
      smileRight: right,
      smileAsymmetry: Math.abs(left - right),
      mouthFrown: blendshapes.mouthFrown,
    };
  }
  return geometricSmile(points, faceLength);
}

function geometricSmile(points: LandmarkPoint[], faceLength: number): SmileReport {
  const len = faceLength || 1;
  const upper = points[LM.UPPER_LIP_TOP];
  const lower = points[LM.LOWER_LIP_BOTTOM];
  const leftCorner = points[LM.MOUTH_LEFT];
  const rightCorner = points[LM.MOUTH_RIGHT];
  const upperLipBottom = points[LM.UPPER_LIP_BOTTOM];
  const lowerLipTop = points[LM.LOWER_LIP_TOP];

  const mouthOpen = upper && lower ? Math.abs(lower.y - upper.y) / len : 0;
  const lipCornerLift =
    leftCorner && rightCorner && upperLipBottom && lowerLipTop
      ? Math.max(
          0,
          ((upperLipBottom.y + lowerLipTop.y) / 2 -
            (leftCorner.y + rightCorner.y) / 2) /
            len,
        )
      : 0;

  const liftNorm = Math.min(1, lipCornerLift / 0.05);
  const openNorm = Math.min(1, mouthOpen / 0.12);
  const score = Math.round(100 * (0.7 * liftNorm + 0.3 * openNorm));
  return {
    score,
    detected: liftNorm > 0.15 || openNorm > 0.2,
    mouthOpen,
    lipCornerLift,
    smileLeft: liftNorm,
    smileRight: liftNorm,
    smileAsymmetry: 0,
    mouthFrown: 0,
  };
}

export function computeEyes(
  points: LandmarkPoint[],
  blendshapes: BlendshapeScores | null,
): EyeReport {
  if (blendshapes) {
    const blinkL = blendshapes.eyeBlinkLeft;
    const blinkR = blendshapes.eyeBlinkRight;
    const wideL = blendshapes.eyeWideLeft;
    const wideR = blendshapes.eyeWideRight;
    const squintL = blendshapes.eyeSquintLeft;
    const squintR = blendshapes.eyeSquintRight;
    // Blend blink and squint (both reduce openness) to model "how open" the eye is.
    const leftOpen = clamp(1 - 0.7 * blinkL - 0.3 * squintL, 0, 1);
    const rightOpen = clamp(1 - 0.7 * blinkR - 0.3 * squintR, 0, 1);
    // Gaze-forward proxy: equal left/right + balanced in/out + look level.
    const inL = blendshapes.eyeLookInLeft;
    const outL = blendshapes.eyeLookOutLeft;
    const inR = blendshapes.eyeLookInRight;
    const outR = blendshapes.eyeLookOutRight;
    const upL = blendshapes.eyeLookUpLeft;
    const upR = blendshapes.eyeLookUpRight;
    const dnL = blendshapes.eyeLookDownLeft;
    const dnR = blendshapes.eyeLookDownRight;
    const gazeForward = clamp(
      1 -
        0.4 * (Math.abs(inL - outR) + Math.abs(inR - outL)) / 2 -
        0.3 * (Math.abs(upL - dnL) + Math.abs(upR - dnR)) / 2,
      0,
      1,
    );
    return {
      leftOpen,
      rightOpen,
      gazeForward,
      eyeBlinkLeft: blinkL,
      eyeBlinkRight: blinkR,
      eyeWideLeft: wideL,
      eyeWideRight: wideR,
      eyeSquintLeft: squintL,
      eyeSquintRight: squintR,
      browInnerUp: blendshapes.browInnerUp,
      browOuterUpLeft: blendshapes.browOuterUpLeft,
      browOuterUpRight: blendshapes.browOuterUpRight,
    };
  }
  return geometricEyes(points);
}

function geometricEyes(points: LandmarkPoint[]): EyeReport {
  const lo = points[LM.LEFT_EYE_OUTER];
  const li = points[LM.LEFT_EYE_INNER];
  const lt = points[LM.LEFT_EYE_TOP];
  const lb = points[LM.LEFT_EYE_BOTTOM];
  const ro = points[LM.RIGHT_EYE_OUTER];
  const ri = points[LM.RIGHT_EYE_INNER];
  const rt = points[LM.RIGHT_EYE_TOP];
  const rb = points[LM.RIGHT_EYE_BOTTOM];

  const leftOpen = ear(lo, li, lt, lb);
  const rightOpen = ear(ro, ri, rt, rb);
  const gazeForward = clamp(1 - Math.abs((leftOpen + rightOpen) / 2 - 0.32) / 0.32, 0, 1);

  return {
    leftOpen,
    rightOpen,
    gazeForward,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    eyeSquintLeft: 0,
    eyeSquintRight: 0,
    browInnerUp: 0,
    browOuterUpLeft: 0,
    browOuterUpRight: 0,
  };
}

function ear(
  outer: LandmarkPoint,
  inner: LandmarkPoint,
  top: LandmarkPoint,
  bottom: LandmarkPoint,
): number {
  if (!outer || !inner || !top || !bottom) return 0;
  const horiz = Math.sqrt(
    (outer.x - inner.x) ** 2 + (outer.y - inner.y) ** 2,
  );
  const vert = Math.abs(top.y - bottom.y);
  return horiz > 0 ? vert / horiz : 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
