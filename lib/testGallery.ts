// Test gallery types + range evaluator.
//
// Each fixture has a JSON-like `expected` block. The evaluator in this file
// pulls the matching fields from the live AnalysisReport and renders an
// assertion (key + expected + actual + pass/fail). Tolerances are inclusive
// numeric ranges expressed as `[min, max]` tuples.

import type {
  AnalysisReport,
  FaceShape,
} from "@/types/analysis";

// Range tuple. The evaluator includes both endpoints.
export type Range = [number, number];
export type BooleanAssertion = boolean;

export interface LightExpectations {
  brightness?: Range;
  contrast?: Range;
  evenness?: Range;
  sharpness?: Range;
}

export interface SymmetryExpectations {
  overall?: Range;
  eyeLevel?: Range;
  lipLevel?: Range;
}

export interface SmileExpectations {
  score?: Range;
  detected?: BooleanAssertion;
  smileLeft?: Range;
  smileRight?: Range;
}

export interface RatioExpectations {
  facialIndex?: Range;
  jawlineAngle?: Range;
  thirdsBalance?: Range;
  chinProjection?: Range;
  midfaceProjection?: Range;
  landmarksConfidence?: Range;
}

export interface PostureExpectations {
  yawAbs?: Range;
  pitchAbs?: Range;
  rollAbs?: Range;
  headTiltAbs?: Range;
}

export interface FixtureExpected {
  hasFace: BooleanAssertion;
  light?: LightExpectations;
  symmetry?: SymmetryExpectations;
  smile?: SmileExpectations;
  ratios?: RatioExpectations;
  posture?: PostureExpectations;
  shape?: FaceShape;
  angle?: "front" | "45" | "profile" | "unknown";
  weakspotCount?: Range;
}

export interface Fixture {
  id: string;
  name: string;
  image: string;
  description: string;
  expected: FixtureExpected;
}

export interface FixtureAssertion {
  key: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface FixtureResult {
  fixture: Fixture;
  passed: boolean;
  assertions: FixtureAssertion[];
  report: AnalysisReport;
}

export function evaluateFixture(
  fixture: Fixture,
  report: AnalysisReport,
): FixtureResult {
  const assertions: FixtureAssertion[] = [];
  const exp = fixture.expected;

  // hasFace
  const actualHasFace = report.ratios.faceLength > 0;
  assertions.push({
    key: "hasFace",
    expected: String(exp.hasFace),
    actual: String(actualHasFace),
    passed: actualHasFace === exp.hasFace,
  });

  pushLightAssertions(assertions, exp.light, report);
  pushSymmetryAssertions(assertions, exp.symmetry, report);
  pushSmileAssertions(assertions, exp.smile, report);
  pushRatiosAssertions(assertions, exp.ratios, report);
  pushPostureAssertions(assertions, exp.posture, report);

  if (exp.shape) {
    assertions.push({
      key: "shape",
      expected: exp.shape,
      actual: report.shape,
      passed: report.shape === exp.shape,
    });
  }

  if (exp.angle) {
    assertions.push({
      key: "angle",
      expected: exp.angle,
      actual: report.angle,
      passed: report.angle === exp.angle,
    });
  }

  if (exp.weakspotCount) {
    assertions.push({
      key: "weakspotCount",
      expected: rangeStr(exp.weakspotCount),
      actual: String(report.weakspots.length),
      passed: inRange(report.weakspots.length, exp.weakspotCount),
    });
  }

  return {
    fixture,
    passed: assertions.every((a) => a.passed),
    assertions,
    report,
  };
}

// Helpers ----------------------------------------------------------------

function pushLightAssertions(
  out: FixtureAssertion[],
  exp: LightExpectations | undefined,
  report: AnalysisReport,
): void {
  if (!exp) return;
  pushNum(out, "light.brightness", exp.brightness, report.light.brightness);
  pushNum(out, "light.contrast", exp.contrast, report.light.contrast);
  pushNum(out, "light.evenness", exp.evenness, report.light.evenness);
  pushNum(out, "light.sharpness", exp.sharpness, report.light.sharpness);
}

function pushSymmetryAssertions(
  out: FixtureAssertion[],
  exp: SymmetryExpectations | undefined,
  report: AnalysisReport,
): void {
  if (!exp) return;
  pushNum(out, "symmetry.overall", exp.overall, report.symmetry.overall);
  pushNum(out, "symmetry.eyeLevel", exp.eyeLevel, report.symmetry.eyeLevel);
  pushNum(out, "symmetry.lipLevel", exp.lipLevel, report.symmetry.lipLevel);
}

function pushSmileAssertions(
  out: FixtureAssertion[],
  exp: SmileExpectations | undefined,
  report: AnalysisReport,
): void {
  if (!exp) return;
  pushNum(out, "smile.score", exp.score, report.smile.score);
  pushNum(out, "smile.smileLeft", exp.smileLeft, report.smile.smileLeft);
  pushNum(out, "smile.smileRight", exp.smileRight, report.smile.smileRight);
  if (exp.detected !== undefined) {
    out.push({
      key: "smile.detected",
      expected: String(exp.detected),
      actual: String(report.smile.detected),
      passed: report.smile.detected === exp.detected,
    });
  }
}

function pushRatiosAssertions(
  out: FixtureAssertion[],
  exp: RatioExpectations | undefined,
  report: AnalysisReport,
): void {
  if (!exp) return;
  pushNum(out, "ratios.facialIndex", exp.facialIndex, report.ratios.facialIndex);
  pushNum(out, "ratios.jawlineAngle", exp.jawlineAngle, report.ratios.jawlineAngle);
  pushNum(out, "ratios.thirdsBalance", exp.thirdsBalance, report.ratios.thirdsBalance);
  pushNum(out, "ratios.chinProjection", exp.chinProjection, report.ratios.chinProjection);
  pushNum(out, "ratios.midfaceProjection", exp.midfaceProjection, report.ratios.midfaceProjection);
  pushNum(out, "ratios.landmarksConfidence", exp.landmarksConfidence, report.ratios.landmarksConfidence);
}

function pushPostureAssertions(
  out: FixtureAssertion[],
  exp: PostureExpectations | undefined,
  report: AnalysisReport,
): void {
  if (!exp) return;
  pushNum(out, "posture.yawAbs", exp.yawAbs, Math.abs(report.posture.yawDeg));
  pushNum(out, "posture.pitchAbs", exp.pitchAbs, Math.abs(report.posture.pitchDeg));
  pushNum(out, "posture.rollAbs", exp.rollAbs, Math.abs(report.posture.rollDeg));
  pushNum(out, "posture.headTiltAbs", exp.headTiltAbs, Math.abs(report.posture.headTiltDeg));
}

function pushNum(
  out: FixtureAssertion[],
  key: string,
  range: Range | undefined,
  actual: number,
): void {
  if (!range) return;
  out.push({
    key,
    expected: rangeStr(range),
    actual: actual.toFixed(2),
    passed: inRange(actual, range),
  });
}

function inRange(n: number, [min, max]: Range): boolean {
  return n >= min && n <= max;
}

function rangeStr([min, max]: Range): string {
  return `${min}…${max}`;
}

// ---- Calibration: build a fixture's `expected` block from a live report ----
//
// Used by the /test-gallery "Calibrate on your photo" section. Wraps every
// metric in a [actual - tol, actual + tol] range so the user can drop the
// JSON into data/test-gallery.ts and have a fixture that the harness can
// immediately assert against. Tighten afterwards.

export interface CalibrationTolerance {
  /** ± for absolute 0..255 brightness metric. */
  brightness?: number;
  /** ± for 0..1 normalized lighting/depth metric. */
  fraction?: number;
  /** ± for smileshape sub-scores (smileLeft/Right); MediaPipe blendshapes are noisier than Earth metrics, so wider than `fraction`. */
  smileFraction?: number;
  /** ± for 0..100 percentage scores (symmetry, smile.score). */
  pctScore?: number;
  /** ± in degrees for posture yaw/pitch/roll. Wide enough that mild 3/4-view photos don't flicker. */
  degrees?: number;
  /** ± for head-tilt degrees (typically tighter than yaw/pitch). */
  headTilt?: number;
  /** ± for facial index ratio. */
  facialIndex?: number;
}

export const DEFAULT_CALIBRATION_TOLERANCE: Required<CalibrationTolerance> = {
  brightness: 8,
  fraction: 0.05,
  smileFraction: 0.10,
  pctScore: 3,
  degrees: 5,
  headTilt: 1,
  facialIndex: 0.05,
};

// Clamp range without forcing the lower bound to 0. Metrics like
// `midfaceProjection` are geometrically negative (noseBridge.z - meanZ(cheeks)
// is signed and inverted) and the previous Math.max(0, ...) floor produced
// inverted ranges like [0, -0.037] that the validator rejects. For positive
// metrics (brightness, contrast, facialIndex, …) the floor was redundant
// anyway since they're always ≥ 0, so dropping it is a clean simplification.
function clampRange(min: number, max: number): Range {
  return [Math.min(min, max), Math.max(min, max)];
}

export function buildExpectedRanges(
  report: AnalysisReport,
  tol: CalibrationTolerance = {},
): FixtureExpected {
  const t = { ...DEFAULT_CALIBRATION_TOLERANCE, ...tol };

  const r = (val: number, k: keyof CalibrationTolerance): Range =>
    clampRange(val - (t[k] ?? 0), val + (t[k] ?? 0));

  // When no face is detected, the analyzer emits shape="unknown" / angle="unknown"
  // by default. Including those in the output would let an emptyReport fixture
  // "pass" on the shape/angle assertion by accident, so we omit them and let the
  // user focus on what was actually measured (light quality).
  const hasFace = report.ratios.faceLength > 0;

  return {
    hasFace,
    ...(hasFace && { shape: report.shape }),
    ...(hasFace && { angle: report.angle }),
    light: {
      brightness: r(report.light.brightness, "brightness"),
      evenness: r(report.light.evenness, "fraction"),
      contrast: r(report.light.contrast, "fraction"),
      sharpness: r(report.light.sharpness, "fraction"),
    },
    symmetry: {
      overall: r(report.symmetry.overall, "pctScore"),
      eyeLevel: r(report.symmetry.eyeLevel, "pctScore"),
      lipLevel: r(report.symmetry.lipLevel, "pctScore"),
    },
    smile: {
      detected: report.smile.detected,
      score: r(report.smile.score, "pctScore"),
      smileLeft: r(report.smile.smileLeft, "smileFraction"),
      smileRight: r(report.smile.smileRight, "smileFraction"),
    },
    ratios: {
      facialIndex: r(report.ratios.facialIndex, "facialIndex"),
      jawlineAngle: r(report.ratios.jawlineAngle, "degrees"),
      thirdsBalance: r(report.ratios.thirdsBalance, "fraction"),
      chinProjection: r(report.ratios.chinProjection, "fraction"),
      midfaceProjection: r(report.ratios.midfaceProjection, "fraction"),
      landmarksConfidence: r(
        report.ratios.landmarksConfidence,
        "fraction",
      ),
    },
    posture: {
      yawAbs: r(Math.abs(report.posture.yawDeg), "degrees"),
      pitchAbs: r(Math.abs(report.posture.pitchDeg), "degrees"),
      rollAbs: r(Math.abs(report.posture.rollDeg), "degrees"),
      headTiltAbs: r(Math.abs(report.posture.headTiltDeg), "headTilt"),
    },
  };
}

// Serialize a FixtureExpected into a JSON snippet the user can paste into
// data/test-gallery.ts. Compact, two-space indent, in the same order the
// type lists blocks so the diff is easy to read.
export function serializeExpected(exp: FixtureExpected): string {
  return JSON.stringify(exp, null, 2);
}
