// Mewing & Posture Routine engine — the exercise library, personalization from
// the latest scan, and the points/level system for the /habits module.
//
// All storage goes through the per-user hub (lib/hub.ts):
//   • facefitness:${date}   → { completed: ExerciseId[] }  (day-keyed log)
//   • facefitness:points    → lifetime points total
//   • facefitness:days      → set of dateKeys with ≥1 exercise done
//   • facefitness:last      → ISO date of the last active day
//
// Points are the "streak points" the user sees: every completed exercise
// scores, and finishing the full personalized routine on a day adds a bonus.

import { hubGet, hubSet, todayKey } from "./hub";
import type { AnalysisReport } from "@/types/analysis";

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------

export type ExerciseId =
  | "mewing-posture"
  | "mewing-chew"
  | "mewing-swallow"
  | "neck-curl"
  | "chin-tuck"
  | "jaw-release";

export interface ExerciseStep {
  label: string;
  detail: string;
  /** Simple inline SVG path keys rendered as the visual guide. */
  visual: VisualKey;
}

export type VisualKey =
  | "tongue"
  | "teeth"
  | "swallow"
  | "curl"
  | "tuck"
  | "circle";

export interface Exercise {
  id: ExerciseId;
  name: string;
  category: "Mewing" | "Posture" | "Facial fitness";
  /** Seconds per set. */
  seconds: number;
  sets: number;
  points: number;
  why: string;
  steps: ExerciseStep[];
}

export const EXERCISES: Exercise[] = [
  {
    id: "mewing-posture",
    name: "Tongue posture hold",
    category: "Mewing",
    seconds: 60,
    sets: 3,
    points: 15,
    why: "The foundational mewing hold — trains the tongue's default resting position, supporting upper-airway posture and a more defined lower face over time.",
    steps: [
      {
        label: "Find the spot",
        detail:
          "Place the tip of your tongue just behind your top front teeth, on the ridge (not touching the teeth).",
        visual: "tongue",
      },
      {
        label: "Engage the back",
        detail:
          "Press the entire tongue — tip, middle, and back — flat against the roof of your mouth. It should feel effortful, like a gentle suction hold.",
        visual: "tongue",
      },
      {
        label: "Seal & breathe",
        detail:
          "Lips closed, teeth lightly touching or slightly apart. Breathe through your nose for the full hold.",
        visual: "teeth",
      },
    ],
  },
  {
    id: "mewing-chew",
    name: "Balanced chewing set",
    category: "Facial fitness",
    seconds: 45,
    sets: 2,
    points: 10,
    why: "Alternating chewing sides evens out masseter development, keeping the jawline visually balanced.",
    steps: [
      {
        label: "Center your bite",
        detail:
          "Chew on your non-dominant side for the first half of the set, then switch. Keep the bite even, not forceful.",
        visual: "teeth",
      },
      {
        label: "Stay tall",
        detail:
          "Keep your head stacked over your shoulders while you chew — jutting the chin forward works the wrong muscles.",
        visual: "tuck",
      },
    ],
  },
  {
    id: "mewing-swallow",
    name: "Correct swallow reps",
    category: "Mewing",
    seconds: 30,
    sets: 3,
    points: 10,
    why: "Re-patterns the swallow so the tongue (not cheek muscles) does the work — reinforces the mewing hold between meals.",
    steps: [
      {
        label: "Sip water",
        detail: "Take a small sip and hold it on your tongue.",
        visual: "swallow",
      },
      {
        label: "Tongue press",
        detail:
          "Press the full tongue to the palate, then swallow — teeth stay together, cheeks stay relaxed.",
        visual: "swallow",
      },
      {
        label: "Reset",
        detail:
          "Feel your tongue return to the hold position automatically. That's the pattern you're building.",
        visual: "tongue",
      },
    ],
  },
  {
    id: "neck-curl",
    name: "Neck curls",
    category: "Posture",
    seconds: 40,
    sets: 2,
    points: 12,
    why: "Strengthens the deep neck flexors — the muscles behind a crisp jaw–neck angle and forward-head correction.",
    steps: [
      {
        label: "Lie back",
        detail:
          "On your back, knees bent, arms relaxed. Head resting in your hands or flat on the floor.",
        visual: "curl",
      },
      {
        label: "Nod slowly",
        detail:
          "Gently nod your chin toward your chest, lifting only your head — shoulders stay down.",
        visual: "curl",
      },
      {
        label: "Lower slow",
        detail:
          "Take a full breath to lower back down. Control beats speed here.",
        visual: "curl",
      },
    ],
  },
  {
    id: "chin-tuck",
    name: "Chin tucks",
    category: "Posture",
    seconds: 30,
    sets: 3,
    points: 10,
    why: "The fastest daily fix for forward head posture — directly improves how defined your jawline reads in photos.",
    steps: [
      {
        label: "Stack up",
        detail:
          "Sit or stand tall, eyes level. Imagine a string pulling the crown of your head upward.",
        visual: "tuck",
      },
      {
        label: "Glide back",
        detail:
          "Slide your chin straight back (like making a double chin), keeping your gaze level — don't nod.",
        visual: "tuck",
      },
      {
        label: "Hold & release",
        detail:
          "Hold 3 seconds, release forward. Feel the stretch at the base of the skull.",
        visual: "tuck",
      },
    ],
  },
  {
    id: "jaw-release",
    name: "Jaw release circles",
    category: "Facial fitness",
    seconds: 30,
    sets: 2,
    points: 8,
    why: "Releases masseter and temporalis tension from clenching or one-sided chewing habits, so the jaw reads relaxed and defined.",
    steps: [
      {
        label: "Loosen",
        detail:
          "Lips closed, teeth apart. Let your jaw hang loose.",
        visual: "circle",
      },
      {
        label: "Circle",
        detail:
          "Draw slow, small circles with your lower jaw — smooth, no forcing.",
        visual: "circle",
      },
      {
        label: "Switch",
        detail:
          "Reverse direction halfway through the set.",
        visual: "circle",
      },
    ],
  },
];

export const EXERCISE_MAP: Record<ExerciseId, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
) as Record<ExerciseId, Exercise>;

// ---------------------------------------------------------------------------
// Personalization — which exercises today's routine emphasizes
// ---------------------------------------------------------------------------

export interface RoutineItem {
  exercise: Exercise;
  /** Why this one is in today's routine (scan-derived when available). */
  reason: string | null;
}

/**
 * Build today's routine. Every core movement is always included; the scan's
 * posture + jawline reads decide the **order** and the highlighted reason.
 * Falls back to a stable default order for fresh accounts.
 */
export function buildRoutine(report: AnalysisReport | null): RoutineItem[] {
  const reasons = new Map<ExerciseId, string>();

  if (report) {
    const p = report.posture;
    if (p.pitchDeg > 4 || p.chinToCamera < 0.9) {
      reasons.set(
        "neck-curl",
        `Your scan read a slightly lifted chin (${p.pitchDeg.toFixed(0)}°) — deep-neck work helps`,
      );
    }
    if (p.rollDeg > 3 || p.headTiltDeg > 2.5) {
      reasons.set(
        "chin-tuck",
        `Scan noticed head tilt (${p.headTiltDeg.toFixed(0)}°) — resets your resting posture`,
      );
    }
    if (p.yawDeg > 3) {
      reasons.set(
        "chin-tuck",
        `Scan read a turned head (${p.yawDeg.toFixed(0)}°) — re-centering helps`,
      );
    }
    const jawAngle = report.ratios.jawlineAngle;
    if (jawAngle < 118) {
      reasons.set(
        "mewing-chew",
        `Jaw angle read soft (${Math.round(jawAngle)}°) — balanced chewing builds the sides evenly`,
      );
    }
    if (report.symmetry.overall < 88) {
      reasons.set(
        "jaw-release",
        `Symmetry read ${Math.round(report.symmetry.overall)}/100 — releasing one-sided tension helps`,
      );
    }
  }

  // Personalized exercises first (scan-driven), then the rest in library order.
  const prioritized = EXERCISES.filter((e) => reasons.has(e.id));
  const rest = EXERCISES.filter((e) => !reasons.has(e.id));

  return [...prioritized, ...rest].map((exercise) => ({
    exercise,
    reason: reasons.get(exercise.id) ?? null,
  }));
}

/** Today's full routine, cached per date so ordering doesn't flip mid-session. */
export function todaysRoutine(report: AnalysisReport | null): RoutineItem[] {
  return buildRoutine(report);
}

// ---------------------------------------------------------------------------
// Completion log + points
// ---------------------------------------------------------------------------

export interface FaceFitnessDay {
  completed: ExerciseId[];
}

const EMPTY_DAY: FaceFitnessDay = { completed: [] };

export function loadFaceFitnessDay(userId: string, date: string): FaceFitnessDay {
  // Validated: corrupted storage must degrade to an empty day, not crash the
  // fitness card or the streak engine that reads it.
  return hubGet<FaceFitnessDay>(
    userId,
    `facefitness:${date}`,
    EMPTY_DAY,
    (v) =>
      !!v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Array.isArray((v as FaceFitnessDay).completed) &&
      (v as FaceFitnessDay).completed.every((x) => typeof x === "string"),
  );
}

export function saveFaceFitnessDay(
  userId: string,
  date: string,
  day: FaceFitnessDay,
): void {
  hubSet(userId, `facefitness:${date}`, day);
  // Points bookkeeping: one entry per active day.
  if (day.completed.length > 0) {
    const days = loadActiveDays(userId);
    if (!days.includes(date)) {
      hubSet(userId, "facefitness:days", [...days, date].sort());
      hubSet(userId, "facefitness:last", date);
    }
  }
}

export function loadActiveDays(userId: string): string[] {
  const days = hubGet<string[]>(userId, "facefitness:days", []);
  return Array.isArray(days) ? days.filter((d) => typeof d === "string") : [];
}

export function loadPoints(userId: string): number {
  return hubGet<number>(userId, "facefitness:points", 0);
}

export function savePoints(userId: string, points: number): void {
  hubSet(userId, "facefitness:points", Math.max(0, Math.round(points)));
}

// ---------------------------------------------------------------------------
// Points math
// ---------------------------------------------------------------------------

/** Points earned today (sum of completed exercises + full-routine bonus). */
export function pointsForDay(day: FaceFitnessDay): number {
  const base = day.completed.reduce(
    (sum, id) => sum + (EXERCISE_MAP[id]?.points ?? 0),
    0,
  );
  const fullRoutine = buildRoutine(null).every((item) =>
    day.completed.includes(item.exercise.id),
  );
  return base + (fullRoutine ? FULL_ROUTINE_BONUS : 0);
}

export const FULL_ROUTINE_BONUS = 25;

// ---------------------------------------------------------------------------
// Levels — a light progression layer on top of lifetime points
// ---------------------------------------------------------------------------

export interface FitnessLevel {
  level: number;
  title: string;
  /** Points earned within the current level. */
  into: number;
  /** Points needed to reach the next level (or null at max). */
  span: number | null;
}

const LEVELS: { title: string; at: number }[] = [
  { title: "Beginner", at: 0 },
  { title: "Trained", at: 150 },
  { title: "Disciplined", at: 400 },
  { title: "Defined", at: 800 },
  { title: "Sculpted", at: 1500 },
];

export function levelFor(points: number): FitnessLevel {
  let level = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].at) level = i;
  }
  const current = LEVELS[level];
  const next = LEVELS[level + 1] ?? null;
  return {
    level: level + 1,
    title: current.title,
    into: points - current.at,
    span: next ? next.at - current.at : null,
  };
}

// ---------------------------------------------------------------------------
// Streak helper — consecutive days with at least one exercise completed
// ---------------------------------------------------------------------------

/** Consecutive days ending today (or yesterday) with ≥1 exercise done. */
export function fitnessStreak(userId: string): number {
  let streak = 0;
  const d = new Date();
  const days = loadActiveDays(userId);
  const daySet = new Set(days);

  // Allow today to be in progress (not yet done) without breaking the streak.
  if (!daySet.has(todayKey())) d.setDate(d.getDate() - 1);

  for (let i = 0; i < 365; i++) {
    if (!daySet.has(fmt(d))) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
