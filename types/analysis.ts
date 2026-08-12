// Shared types for Chizle analysis pipeline.

export type FaceShape = "oval" | "square" | "round" | "heart" | "oblong" | "diamond";

export type Angle = "front" | "45" | "profile" | "unknown";

export type HairColor =
  | "black"
  | "dark-brown"
  | "brown"
  | "light-brown"
  | "blonde"
  | "auburn"
  | "gray"
  | "unknown";

export type HairTexture = "straight" | "wavy" | "curly" | "coily" | "unknown";

// Pixel-based estimate of the wearer's hair (color + texture) sampled from
// the band of pixels above the face landmarks. `visible` is false when the
// region is empty, cropped, or too uniform to read — e.g. hair pulled back,
// a hat, or the top of the head out of frame. This is an approximate read,
// not a trichoscopy.
export interface HairProfile {
  visible: boolean;
  color: HairColor;
  texture: HairTexture;
  /** 0..1 — how much signal the region actually contained. */
  confidence: number;
  /**
   * 0..1 — how decisive the texture read is (1 = clearly inside the class
   * band, 0 = right on a boundary). Low values mean the label should be
   * hedged ("roughly wavy") rather than stated as fact. Optional for legacy
   * persisted reports.
   */
  textureConfidence?: number;
}

/** When an action should realistically be done: now = in the next shot, soon = this week, later = over time. */
export type ActionTiming = "now" | "soon" | "later";

export type ImageQuality = "good" | "ok" | "poor";

export interface ImageChecks {
  quality: ImageQuality;
  hasFace: boolean;
  reason?: string;
}

// MediaPipe NormalizedLandmark: x, y, z normalized to image; visibility and
// presence are confidence scores in [0, 1] emitted by FaceLandmarker.
export interface LandmarkPoint {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  z: number;
  visibility?: number;
  presence?: number;
}

export interface LandmarkSet {
  points: LandmarkPoint[]; // 468 entries when valid
  width: number;
  height: number;
}

// Apple ARKit-compatible Face Blendshape scores (52 in total; we use a
// focused subset). Each value is a [0, 1] confidence from the model.
export interface BlendshapeScores {
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthFrown: number;
  mouthPucker: number;
  mouthStretch: number;
  browInnerUp: number;
  browOuterUpLeft: number;
  browOuterUpRight: number;
  browDownLeft: number;
  browDownRight: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeWideLeft: number;
  eyeWideRight: number;
  eyeSquintLeft: number;
  eyeSquintRight: number;
  eyeLookInLeft: number;
  eyeLookInRight: number;
  eyeLookOutLeft: number;
  eyeLookOutRight: number;
  eyeLookUpLeft: number;
  eyeLookUpRight: number;
  eyeLookDownLeft: number;
  eyeLookDownRight: number;
  cheekSquintLeft: number;
  cheekSquintRight: number;
  cheekPuff: number;
  noseSneerLeft: number;
  noseSneerRight: number;
  jawOpen: number;
  jawLeft: number;
  jawRight: number;
  jawForward: number;
}

export type OrientationSource = "matrix" | "heuristic";

export interface FaceRatios {
  faceLength: number;
  foreheadWidth: number;
  cheekboneWidth: number;
  jawWidth: number;
  upperThird: number; // hairline -> brow
  middleThird: number; // brow -> nose base
  lowerThird: number; // nose base -> chin
  thirdsBalance: number; // 0..1, higher = more balanced
  facialIndex: number; // length / cheekbone width
  jawlineAngle: number; // degrees at gonion
  cheekToJawRatio: number; // cheekbone / jaw
  foreheadToJawRatio: number; // forehead / jaw
  // 3D depth metrics (MediaPipe z is in metric units, smaller z = closer to camera)
  chinProjection: number; // chin.z - noseBase.z; > 0 = chin recessed relative to nose base
  midfaceProjection: number; // noseBridge.z - mean(cheek.z); > 0 = midface projects forward of cheekbones
  // Pipeline confidence: average landmark visibility across the canonical set
  landmarksConfidence: number; // 0..1
}

export interface SymmetryReport {
  overall: number; // 0..100
  eyeLevel: number; // 0..100
  cheekLevel: number; // 0..100
  lipLevel: number; // 0..100
  meanOffsetNorm: number; // mean |x - mirror x|, normalized
}

export interface PostureReport {
  headTiltDeg: number; // positive = tilted right
  yawDeg: number; // positive = facing right
  pitchDeg: number; // positive = chin tipped up
  rollDeg: number; // positive = camera-side clockwise tilt
  orientationSource: OrientationSource;
  shoulderVisible: boolean;
  chinToCamera: number; // 0..1 (1 = perfect level)
  angle: Angle;
}

export interface SmileReport {
  score: number; // 0..100
  detected: boolean;
  mouthOpen: number; // 0..1 (from jawOpen blendshape)
  lipCornerLift: number; // 0..1
  smileLeft: number; // 0..1
  smileRight: number; // 0..1
  smileAsymmetry: number; // |left - right| 0..1
  mouthFrown: number; // 0..1
}

export interface EyeReport {
  leftOpen: number; // 0..1
  rightOpen: number; // 0..1
  gazeForward: number; // 0..1
  eyeBlinkLeft: number; // 0..1 (blendshape)
  eyeBlinkRight: number; // 0..1
  eyeWideLeft: number; // 0..1
  eyeWideRight: number; // 0..1
  eyeSquintLeft: number; // 0..1
  eyeSquintRight: number; // 0..1
  browInnerUp: number; // 0..1
  browOuterUpLeft: number; // 0..1
  browOuterUpRight: number; // 0..1
}

export interface LightQualityReport {
  brightness: number; // 0..255
  contrast: number; // 0..1
  evenness: number; // 0..1 (1 = even lighting)
  sharpness: number; // 0..1 proxy
}

export interface Weakspot {
  id: string;
  area:
    | "skin"
    | "jawline"
    | "hair"
    | "posture"
    | "expression"
    | "lighting"
    | "symmetry"
    | "framing"
    | "brow"
    | "depth";
  severity: "low" | "medium" | "high";
  /** Urgency of the fix: now (next shot) / soon (this week) / later (over time). */
  timing: ActionTiming;
  title: string;
  findings: string[]; // objective observations
  recommendations: string[]; // actionable habits / style
}

export interface AnalysisReport {
  angle: Angle;
  shape: FaceShape;
  ratios: FaceRatios;
  symmetry: SymmetryReport;
  posture: PostureReport;
  smile: SmileReport;
  eyes: EyeReport;
  light: LightQualityReport;
  /** Pixel-based hair read (color + texture) — approximate, may be invisible. */
  hair: HairProfile;
  weakspots: Weakspot[];
  /**
   * Quality assessment from assessImageQuality. Always populated. When the
   * photo has issues, `reason` is a semicolon-separated list of specific
   * findings ("Image is too dark; Image is blurry"), and `tipsForReason` in
   * lib/diagnostics turns each into an actionable fix.
   */
  imageQuality: ImageChecks;
  summary: string;
  generatedAt: string;
}

export interface ComparisonReport {
  deltas: {
    thirdsBalance: number;
    symmetry: number;
    jawlineAngle: number;
    posture: number;
    smile: number;
    brightness: number;
  };
  improvements: string[];
  regressions: string[];
  neutral: string[];
  summary: string;
  /**
   * Dating-profile scorecards for both photos (via lib/scorecard). Lets the
   * comparison surface how the overall score, verdict, and per-bucket scores
   * moved between the two shots.
   */
  scorecards: {
    before: ScorecardReport;
    after: ScorecardReport;
  };
}

export type ScorecardBand = "excellent" | "strong" | "good" | "fair" | "weak";

/**
 * Scoring context: "app" = the photo will be seen on a dating app (lighting,
 * filters, and technical quality matter); "irl" = real-life first impression
 * (grooming, presence — lighting is irrelevant).
 */
export type ScorecardMode = "app" | "irl";

export interface ScorecardBucket {
  label: string;
  score: number; // 0..10
  band: ScorecardBand;
  notes: string[];
}

export interface ScorecardVerdict {
  bucket: "primary" | "secondary" | "fix" | "reframe";
  headline: string;
  reason: string;
}

export interface ScorecardReport {
  overall: number; // 0..10
  /** Which context this score was computed for. */
  mode: ScorecardMode;
  buckets: {
    approachability: ScorecardBucket;
    // "app" mode: photo quality (lighting/technical). "irl" mode: grooming & style.
    photoQuality: ScorecardBucket;
    // "app" mode: style & grooming. "irl" mode: presence & energy.
    style: ScorecardBucket;
  };
  verdict: ScorecardVerdict;
  tips: string[];
}
