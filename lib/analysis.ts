// Main analysis aggregator. Takes a FaceLandmarkerResult + ImageData and
// returns a single AnalysisReport with everything downstream needs.
//
// We now also pull MediaPipe's Face Blendshapes (52 ARKit-style scores) and
// feed them into the expression pipeline. Geometry-only fallback is preserved
// for callers that didn't get blendshapes.

import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type {
  AnalysisReport,
  BlendshapeScores,
  LandmarkPoint,
  PostureReport,
} from "@/types/analysis";
import { computeRatios } from "./ratios";
import { classifyFaceShape } from "./faceShape";
import { computeSymmetry } from "./symmetry";
import { computePosture } from "./posture";
import { computeSmile, computeEyes, extractBlendshapes } from "./expression";
import { computeLightQuality, assessImageQuality } from "./imageQuality";
import { analyzeHair, hairTextureLabel, UNKNOWN_HAIR } from "./hair";
import { generateWeakspots } from "./recommendations";

export function analyze(
  result: FaceLandmarkerResult | null,
  imageData: ImageData,
): AnalysisReport {
  const faceLandmarks = result?.faceLandmarks?.[0];
  const points = (faceLandmarks ?? []) as LandmarkPoint[];
  const hasFace = points.length >= 468;

  const light = computeLightQuality(imageData);
  const checks = assessImageQuality(imageData, hasFace);

  if (!hasFace) {
    return emptyReport(light, checks);
  }

  const blendshapes = extractBlendshapes(result?.faceBlendshapes?.[0]?.categories);

  const ratios = computeRatios(points);
  const shape = classifyFaceShape(ratios);
  const symmetry = computeSymmetry(points);
  const posture = computePosture(
    points,
    result?.facialTransformationMatrixes?.[0]?.data as number[] | undefined,
  );
  const smile = computeSmile(points, ratios.faceLength, blendshapes);
  const eyes = computeEyes(points, blendshapes);
  const hair = analyzeHair(imageData, points);

  const weakspots = generateWeakspots({
    ratios,
    symmetry,
    posture,
    smile,
    eyes,
    shape,
    angle: posture.angle,
  });

  const summary = buildSummary(shape, ratios, symmetry, posture, smile, hair, blendshapes);

  return {
    angle: posture.angle,
    shape,
    ratios,
    symmetry,
    posture,
    smile,
    eyes,
    light,
    hair,
    weakspots,
    imageQuality: checks,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

function emptyReport(
  light: ReturnType<typeof computeLightQuality>,
  checks: ReturnType<typeof assessImageQuality>,
): AnalysisReport {
  const placeholder: PostureReport = {
    headTiltDeg: 0,
    yawDeg: 0,
    pitchDeg: 0,
    rollDeg: 0,
    orientationSource: "heuristic",
    shoulderVisible: false,
    chinToCamera: 0,
    angle: "unknown",
  };
  return {
    angle: "unknown",
    shape: "oval",
    ratios: {
      faceLength: 0,
      foreheadWidth: 0,
      cheekboneWidth: 0,
      jawWidth: 0,
      upperThird: 0,
      middleThird: 0,
      lowerThird: 0,
      thirdsBalance: 0,
      facialIndex: 0,
      jawlineAngle: 0,
      cheekToJawRatio: 0,
      foreheadToJawRatio: 0,
      chinProjection: 0,
      midfaceProjection: 0,
      landmarksConfidence: 0,
    },
    symmetry: {
      overall: 0,
      eyeLevel: 0,
      cheekLevel: 0,
      lipLevel: 0,
      meanOffsetNorm: 0,
    },
    posture: placeholder,
    smile: {
      score: 0,
      detected: false,
      mouthOpen: 0,
      lipCornerLift: 0,
      smileLeft: 0,
      smileRight: 0,
      smileAsymmetry: 0,
      mouthFrown: 0,
    },
    eyes: {
      leftOpen: 0,
      rightOpen: 0,
      gazeForward: 0,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
      eyeWideLeft: 0,
      eyeWideRight: 0,
      eyeSquintLeft: 0,
      eyeSquintRight: 0,
      browInnerUp: 0,
      browOuterUpLeft: 0,
      browOuterUpRight: 0,
    },
    light,
    hair: UNKNOWN_HAIR,
    weakspots: [],
    imageQuality: checks,
    summary: checks.reason
      ? `Could not analyze: ${checks.reason}. Please re-upload a clearer front-facing photo.`
      : "No face detected. Please upload a front-facing photo with the face clearly visible.",
    generatedAt: new Date().toISOString(),
  };
}

function buildSummary(
  shape: AnalysisReport["shape"],
  ratios: AnalysisReport["ratios"],
  symmetry: AnalysisReport["symmetry"],
  posture: AnalysisReport["posture"],
  smile: AnalysisReport["smile"],
  hair: AnalysisReport["hair"],
  blendshapes: BlendshapeScores | null,
): string {
  const thirdsPct = Math.round(ratios.thirdsBalance * 100);
  const symPct = Math.round(symmetry.overall);
  const balanceMsg =
    ratios.thirdsBalance > 0.75
      ? "Facial thirds are well balanced"
      : ratios.thirdsBalance > 0.5
        ? "Facial thirds are slightly unbalanced"
        : "Facial thirds are noticeably unbalanced";
  const symmetryMsg =
    symmetry.overall > 90
      ? "your face is highly symmetrical"
      : symmetry.overall > 78
        ? "your face reads as evenly symmetrical"
        : "your face has some asymmetry, which is normal";

  // Smile description flip/flops between blendshape-driven and geometric. The
  // blendshape path uses lift peaks; the geometric path uses the same phrasing
  // as before for backward compatibility.
  let smileMsg: string;
  if (blendshapes) {
    const lift = Math.max(
      blendshapes.mouthSmileLeft,
      blendshapes.mouthSmileRight,
    );
    smileMsg =
      lift > 0.7
        ? "you have a warm, full smile"
        : lift > 0.4
          ? "you have a subtle half-smile, which reads as approachable"
          : blendshapes.mouthFrown > 0.4
            ? "your mouth corners are turned down slightly"
            : "you have a relaxed, neutral expression";
  } else {
    smileMsg = smile.detected
      ? smile.score > 70
        ? "you have a warm, lifted smile"
        : "you have a hint of a smile, which reads as approachable"
      : "you have a relaxed, neutral expression";
  }

  // 3D depth context line when we have model confidence.
  let depthMsg = "";
  if (ratios.landmarksConfidence > 0.5) {
    if (ratios.chinProjection > 0.04) {
      depthMsg = " Your chin sits a little further back than your nose base in profile.";
    } else if (ratios.chinProjection < -0.04) {
      depthMsg = " Your chin projects slightly forward relative to your nose base.";
    }
  }

  // Brow lift: the model tells us if your forehead is engaged. Useful as a
  // "looks surprised" vs "looks relaxed" tell.
  let browMsg = "";
  if (blendshapes && blendshapes.browInnerUp > 0.6) {
    browMsg = " Your inner brows are raised — try relaxing them for a calmer read.";
  }

  // Hair read (approximate, pixel-based) — replaces the old lighting clause.
  // Lighting is deliberately absent from the analyze summary: it is not an
  // improvement area here, only a scorecard (dating-photo) concern.
  const hairMsg =
    hair.visible && hair.color !== "unknown"
      ? ` Your hair reads as ${hairTextureLabel(hair).toLowerCase()}, ${hair.color}.`
      : "";
  return `Your face shape reads as ${shape}. ${balanceMsg} (${thirdsPct}% balance), and ${symmetryMsg} (${symPct}/100). In this shot, ${smileMsg}.${hairMsg}${depthMsg}${browMsg}`;
}
