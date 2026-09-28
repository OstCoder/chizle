// ---------------------------------------------------------------------------
// Runtime schemas for every state object that crosses a trust boundary.
//
// Three domains are covered, per the type-safety pass:
//   • Scan outputs    — AnalysisReport and its persisted history wrappers.
//   • Habits          — daily logs, face-fitness days, hub trackers (hair,
//                       products, scents, water, training variant, routine ids).
//   • Preferences     — theme + scorecard mode.
//
// Every schema is pinned to its hand-written interface with an `Expect<Equal<…>>`
// contract at the bottom of this file. If an interface gains/loses/retypes a
// field, the contract fails to compile — you cannot change one side without
// the other. At runtime the same schemas validate localStorage reads (dropping
// or repairing malformed data instead of crashing the dashboard) and, in
// development only, loudly check the values we write so a mismatch surfaces
// the moment the producing code is wrong — not three screens later.
//
// Domain interfaces intentionally stay in their owning modules (hub.ts,
// persistence.ts, facefitness.ts …) and are imported here as types only, so
// there is never a runtime import cycle.
//
// Legacy-tolerant defaults (weakspots, hair, weakspot timing, product
// category, scent notes, scentOfDay.scentId) exist because older builds wrote
// payloads without those fields; defaults keep those entries readable while
// still producing output that satisfies the current interface exactly.

import { z } from "zod";
import type {
  AnalysisReport,
  LandmarkPoint,
  ScorecardMode,
} from "@/types/analysis";
import type { Theme } from "@/components/ThemeToggle";
import type { PersistedAnalysis, PersistedCompareEntry } from "./persistence";
import type {
  DailyLogs,
  GroomingProduct,
  HairStatus,
  NpsPromptRecord,
  Scent,
  ScentOfDay,
  SleepQuality,
  WaterGoal,
  WeeklySummaryConfig,
} from "./hub";
import type { FaceFitnessDay } from "./facefitness";
import type { TrainingVariant } from "./training";

// ---------------------------------------------------------------------------
// Structural parser contract.
//
// Deliberately not `z.ZodType` so the rest of the app (hub, persistence,
// cards) can accept schemas without importing zod itself — zod stays
// confined to this module. Any zod schema satisfies this structurally.
// ---------------------------------------------------------------------------

export interface Parser<T> {
  safeParse(
    data: unknown,
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: readonly unknown[] } };
}

/**
 * Read-path validation: returns the *parsed* value (defaults applied, unknown
 * keys stripped) or null. In development, logs exactly which paths failed so
 * schema drift shows up early instead of as a mystery blank widget.
 */
export function parseOrDrop<T>(
  parser: Parser<T>,
  value: unknown,
  label: string,
): T | null {
  const result = parser.safeParse(value);
  if (result.success) return result.data;
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[chizle] dropping malformed ${label}:`,
      result.error.issues.slice(0, 5),
    );
  }
  return null;
}

/**
 * Write-path check, development only. Never throws and never blocks a save —
 * it just makes a produced-but-mismatched object impossible to miss while
 * building. Production skips the parse entirely.
 */
export function devValidate<T>(
  parser: Parser<T>,
  value: unknown,
  label: string,
): void {
  if (process.env.NODE_ENV === "production") return;
  const result = parser.safeParse(value);
  if (!result.success) {
    console.error(
      `[chizle] ${label} failed schema validation:`,
      result.error.issues,
    );
  }
}

// ---------------------------------------------------------------------------
// Shared enum-like primitives (mirrors of the unions in types/analysis.ts)
// ---------------------------------------------------------------------------

const faceShapeSchema = z.enum([
  "oval",
  "square",
  "round",
  "heart",
  "oblong",
  "diamond",
]);
const angleSchema = z.enum(["front", "45", "profile", "unknown"]);
const hairColorSchema = z.enum([
  "black",
  "dark-brown",
  "brown",
  "light-brown",
  "blonde",
  "auburn",
  "gray",
  "unknown",
]);
const hairTextureSchema = z.enum([
  "straight",
  "wavy",
  "curly",
  "coily",
  "unknown",
]);
const actionTimingSchema = z.enum(["now", "soon", "later"]);
const imageQualitySchema = z.enum(["good", "ok", "poor"]);
const orientationSourceSchema = z.enum(["matrix", "heuristic"]);
const weakspotAreaSchema = z.enum([
  "skin",
  "jawline",
  "hair",
  "posture",
  "expression",
  "lighting",
  "symmetry",
  "framing",
  "brow",
  "depth",
]);
const severitySchema = z.enum(["low", "medium", "high"]);

// ---------------------------------------------------------------------------
// Scan outputs
// ---------------------------------------------------------------------------

export const landmarkPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  visibility: z.number().optional(),
  presence: z.number().optional(),
});

const hairProfileSchema = z.object({
  visible: z.boolean(),
  color: hairColorSchema,
  texture: hairTextureSchema,
  confidence: z.number(),
  textureConfidence: z.number().optional(),
});

const imageChecksSchema = z.object({
  quality: imageQualitySchema,
  hasFace: z.boolean(),
  reason: z.string().optional(),
});

const faceRatiosSchema = z.object({
  faceLength: z.number(),
  foreheadWidth: z.number(),
  cheekboneWidth: z.number(),
  jawWidth: z.number(),
  upperThird: z.number(),
  middleThird: z.number(),
  lowerThird: z.number(),
  thirdsBalance: z.number(),
  facialIndex: z.number(),
  jawlineAngle: z.number(),
  cheekToJawRatio: z.number(),
  foreheadToJawRatio: z.number(),
  chinProjection: z.number(),
  midfaceProjection: z.number(),
  landmarksConfidence: z.number(),
});

const symmetryReportSchema = z.object({
  overall: z.number(),
  eyeLevel: z.number(),
  cheekLevel: z.number(),
  lipLevel: z.number(),
  meanOffsetNorm: z.number(),
});

const postureReportSchema = z.object({
  headTiltDeg: z.number(),
  yawDeg: z.number(),
  pitchDeg: z.number(),
  rollDeg: z.number(),
  orientationSource: orientationSourceSchema,
  shoulderVisible: z.boolean(),
  chinToCamera: z.number(),
  angle: angleSchema,
});

const smileReportSchema = z.object({
  score: z.number(),
  detected: z.boolean(),
  mouthOpen: z.number(),
  lipCornerLift: z.number(),
  smileLeft: z.number(),
  smileRight: z.number(),
  smileAsymmetry: z.number(),
  mouthFrown: z.number(),
});

const eyeReportSchema = z.object({
  leftOpen: z.number(),
  rightOpen: z.number(),
  gazeForward: z.number(),
  eyeBlinkLeft: z.number(),
  eyeBlinkRight: z.number(),
  eyeWideLeft: z.number(),
  eyeWideRight: z.number(),
  eyeSquintLeft: z.number(),
  eyeSquintRight: z.number(),
  browInnerUp: z.number(),
  browOuterUpLeft: z.number(),
  browOuterUpRight: z.number(),
});

const lightQualityReportSchema = z.object({
  brightness: z.number(),
  contrast: z.number(),
  evenness: z.number(),
  sharpness: z.number(),
  redness: z.number().optional(),
});

const weakspotSchema = z.object({
  id: z.string(),
  area: weakspotAreaSchema,
  severity: severitySchema,
  // Legacy persisted reports predate the timing field — default them so old
  // history entries still parse and land in a timing group in AnalysisView.
  timing: actionTimingSchema.default("soon"),
  title: z.string(),
  findings: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// Reports persisted by builds that predate the hair-read feature parse with an
// "unknown hair" default instead of being dropped from history.
const UNKNOWN_HAIR: z.infer<typeof hairProfileSchema> = {
  visible: false,
  color: "unknown",
  texture: "unknown",
  confidence: 0,
};

export const analysisReportSchema = z.object({
  angle: angleSchema,
  // Optional so pre-angle-guard persisted reports still type-check and parse.
  sideAngle: z.boolean().optional(),
  shape: faceShapeSchema,
  ratios: faceRatiosSchema,
  symmetry: symmetryReportSchema,
  posture: postureReportSchema,
  smile: smileReportSchema,
  eyes: eyeReportSchema,
  light: lightQualityReportSchema,
  hair: hairProfileSchema.default(UNKNOWN_HAIR),
  weakspots: z.array(weakspotSchema).default([]),
  imageQuality: imageChecksSchema,
  summary: z.string(),
  generatedAt: z.string(),
});

export const persistedAnalysisSchema = z.object({
  id: z.string(),
  report: analysisReportSchema,
  landmarks: z.array(landmarkPointSchema).nullable(),
  image: z.string().nullable(),
  thumb: z.string(),
  savedAt: z.string(),
});

export const persistedCompareEntrySchema = z.object({
  id: z.string(),
  before: persistedAnalysisSchema,
  after: persistedAnalysisSchema,
  savedAt: z.string(),
});

// ---------------------------------------------------------------------------
// Habits — day logs, face fitness, hub trackers
// ---------------------------------------------------------------------------

export const sleepQualitySchema = z.enum(["good", "ok", "poor"]);

export const dailyLogsSchema = z.object({
  workout: z.boolean(),
  sleep: sleepQualitySchema.nullable(),
  cleanEating: z.boolean(),
});

export const ampmSchema = z.object({
  am: z.boolean(),
  pm: z.boolean(),
});

/**
 * Canonical exercise id list for the Mewing & Posture Routine. Owned here (not
 * in facefitness.ts) so the schema and the derived ExerciseId type share one
 * runtime source of truth without an import cycle.
 */
export const EXERCISE_IDS = [
  "mewing-posture",
  "mewing-chew",
  "mewing-swallow",
  "neck-curl",
  "chin-tuck",
  "jaw-release",
] as const;

export type ExerciseId = (typeof EXERCISE_IDS)[number];

export const exerciseIdSchema = z.enum(EXERCISE_IDS);

export const faceFitnessDaySchema = z.object({
  // Unknown ids (an exercise removed in a later build, or hand-edited storage)
  // are filtered out rather than failing the parse — losing a whole day's log
  // would silently break the streak, while a stray id is harmless downstream
  // (points lookups and render checks both tolerate absence).
  completed: z.preprocess(
    (v) =>
      Array.isArray(v)
        ? v.filter(
            (x): x is ExerciseId =>
              typeof x === "string" &&
              (EXERCISE_IDS as readonly string[]).includes(x),
          )
        : v,
    z.array(exerciseIdSchema),
  ),
});

export const hairStatusSchema = z.object({
  lastTrim: z.string().nullable(),
  nextAppointment: z.string().nullable(),
  status: z.enum(["maintaining", "growing", "beard"]),
  note: z.string(),
});

export const groomingProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Older builds didn't persist a category — default it rather than rejecting
  // the user's whole regimen.
  category: z.string().default(""),
});

export const groomingProductArraySchema = z.array(groomingProductSchema);

export const scentSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.array(z.string()).default([]),
});

export const scentArraySchema = z.array(scentSchema);

export const scentOfDaySchema = z.object({
  scentId: z.string().nullable().default(null),
  occasion: z.string(),
});

export const waterGoalSchema = z.object({
  mode: z.enum(["auto", "manual"]),
  value: z.number().nullable(),
});

/** Day-keyed id arrays (routine checklists, applied products, sculpt list). */
export const dayIdArraySchema = z.array(z.string());

/** Finite numbers stored as JSON values (water ml, lifetime points). */
export const numberValueSchema = z.number();

export const trainingVariantSchema = z.enum(["gym", "home"]);

/**
 * One-shot record for the post-7-day-streak recommendation prompt (hub key
 * "nps-7d"). Exists so the prompt shows at most once per account; the score
 * range is pinned to the 0–10 scale the UI offers.
 */
export const npsPromptRecordSchema = z.object({
  promptedAt: z.string(),
  score: z.number().min(0).max(10).nullable(),
  answeredAt: z.string().nullable(),
});

/**
 * Weekly summary trigger config (hub key "weekly-summary"): opt-in toggle,
 * delivery channel, the user's own webhook relay URL, and the last-send
 * timestamp that gates the once-per-7-days cadence.
 */
export const weeklySummaryConfigSchema = z.object({
  enabled: z.boolean(),
  channel: z.enum(["notification", "webhook", "both"]),
  webhookUrl: z.string(),
  lastSentAt: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export const themeSchema = z.enum(["system", "light", "dark"]);

export const scorecardModeSchema = z.enum(["app", "irl"]);

// ---------------------------------------------------------------------------
// Compile-time contracts: schema ⇄ interface equality.
//
// If any line below stops typechecking, the schema and the hand-written
// interface have drifted — update both together. This is the "catch data
// mismatch bugs early during development" mechanism: interfaces protect the
// app's own code, these contracts protect the *boundary* where persisted and
// externally-shaped data enters it.
// ---------------------------------------------------------------------------

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

type _ScanReport = Expect<
  Equal<z.infer<typeof analysisReportSchema>, AnalysisReport>
>;
type _LandmarkPoint = Expect<
  Equal<z.infer<typeof landmarkPointSchema>, LandmarkPoint>
>;
type _PersistedAnalysis = Expect<
  Equal<z.infer<typeof persistedAnalysisSchema>, PersistedAnalysis>
>;
type _PersistedCompareEntry = Expect<
  Equal<z.infer<typeof persistedCompareEntrySchema>, PersistedCompareEntry>
>;
type _DailyLogs = Expect<
  Equal<z.infer<typeof dailyLogsSchema>, DailyLogs>
>;
type _SleepQuality = Expect<
  Equal<z.infer<typeof sleepQualitySchema>, SleepQuality>
>;
type _HairStatus = Expect<
  Equal<z.infer<typeof hairStatusSchema>, HairStatus>
>;
type _GroomingProduct = Expect<
  Equal<z.infer<typeof groomingProductSchema>, GroomingProduct>
>;
type _Scent = Expect<Equal<z.infer<typeof scentSchema>, Scent>>;
type _ScentOfDay = Expect<
  Equal<z.infer<typeof scentOfDaySchema>, ScentOfDay>
>;
type _WaterGoal = Expect<
  Equal<z.infer<typeof waterGoalSchema>, WaterGoal>
>;
type _FaceFitnessDay = Expect<
  Equal<z.infer<typeof faceFitnessDaySchema>, FaceFitnessDay>
>;
type _TrainingVariant = Expect<
  Equal<z.infer<typeof trainingVariantSchema>, TrainingVariant>
>;
type _NpsPromptRecord = Expect<
  Equal<z.infer<typeof npsPromptRecordSchema>, NpsPromptRecord>
>;
type _WeeklySummaryConfig = Expect<
  Equal<z.infer<typeof weeklySummaryConfigSchema>, WeeklySummaryConfig>
>;
type _Theme = Expect<Equal<z.infer<typeof themeSchema>, Theme>>;
type _ScorecardMode = Expect<
  Equal<z.infer<typeof scorecardModeSchema>, ScorecardMode>
>;
