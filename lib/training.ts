// Training domain: a personalized plan with gym and at-home variants, weekly
// set goals (recommended vs manual), and per-day set logging. Persistence is
// per account in localStorage via lib/hub.

import { dateKey, hubGet, hubSet, todayKey } from "./hub";
import type { AnalysisReport } from "@/types/analysis";
import type { ProfileRow } from "./useHubData";

export type TrainingVariant = "gym" | "home";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  note?: string;
}

export interface PlanDay {
  id: string;
  label: string;
  focus: string;
  exercises: Exercise[];
}

export interface TrainingPlan {
  variant: TrainingVariant;
  title: string;
  description: string;
  days: PlanDay[];
}

export interface PlanInputs {
  weightKg: number | null;
  age: number | null;
  postureWeak: boolean;
}

export interface TrainingLog {
  variant: TrainingVariant;
  day: number; // index into plan.days
  done: Record<string, number>; // exercise id -> sets completed
}

export const EMPTY_TRAINING_LOG: TrainingLog = {
  variant: "gym",
  day: 0,
  done: {},
};

export interface TrainingGoal {
  mode: "auto" | "manual";
  value: number | null; // weekly sets when manual
}

export const EMPTY_TRAINING_GOAL: TrainingGoal = { mode: "auto", value: null };

/** Profile + latest scan -> plan personalization inputs. */
export function planInputsFrom(
  profile: ProfileRow | null,
  report: AnalysisReport | null,
): PlanInputs {
  const weightKg = profile?.weight
    ? profile.weight_unit === "imperial"
      ? profile.weight * 0.4536
      : profile.weight
    : null;
  return {
    weightKg,
    age: profile?.age ?? null,
    postureWeak: report ? report.posture.chinToCamera < 0.7 : false,
  };
}

function weightNote(weightKg: number | null): string {
  if (weightKg === null) return "balanced starting loads";
  if (weightKg < 65) return "lighter starting loads with steady progression";
  if (weightKg > 85) return "stronger base — push intensity, protect form on heavy compounds";
  return "mid-range loads — progressive overload week over week";
}

function ageNote(age: number | null): string {
  if (age === null) return "";
  if (age >= 45) return " Recovery guidance included: extra rest between sessions.";
  if (age <= 24) return " Recovery is fast at your age — safe to push progression.";
  return "";
}

function postureNote(postureWeak: boolean): string {
  return postureWeak
    ? " Your scan flagged posture, so chin-tuck finishers are built into every day."
    : "";
}

const POSTURE_FINISHER: Exercise = {
  id: "chin-tucks",
  name: "Chin Tucks",
  sets: 3,
  reps: "10",
  note: "Posture finisher from your scan",
};

function gymPlan(inputs: PlanInputs): TrainingPlan {
  const days: PlanDay[] = [
    {
      id: "gym-push",
      label: "Day 1",
      focus: "Upper push",
      exercises: [
        { id: "bench", name: "Bench Press", sets: 4, reps: "8", note: "Barbell or dumbbell — shoulders pinned back" },
        { id: "ohp", name: "Overhead Press", sets: 3, reps: "10", note: "Brace your core, avoid arching" },
        { id: "inc-db", name: "Incline Dumbbell Press", sets: 3, reps: "10" },
        { id: "pushdown", name: "Tricep Pushdown", sets: 3, reps: "12" },
        ...(inputs.postureWeak ? [POSTURE_FINISHER] : []),
      ],
    },
    {
      id: "gym-pull",
      label: "Day 2",
      focus: "Pull & back",
      exercises: [
        { id: "deadlift", name: "Deadlift", sets: 4, reps: "6", note: "RDL alternative if mobility limits depth" },
        { id: "pulldown", name: "Lat Pulldown", sets: 3, reps: "10" },
        { id: "row", name: "Seated Cable Row", sets: 3, reps: "10" },
        { id: "curl", name: "Dumbbell Curl", sets: 3, reps: "12" },
        ...(inputs.postureWeak ? [POSTURE_FINISHER] : []),
      ],
    },
    {
      id: "gym-legs",
      label: "Day 3",
      focus: "Legs & glutes",
      exercises: [
        { id: "squat", name: "Back Squat", sets: 4, reps: "8" },
        { id: "leg-press", name: "Leg Press", sets: 3, reps: "12" },
        { id: "rdl", name: "Romanian Deadlift", sets: 3, reps: "10" },
        { id: "calf", name: "Standing Calf Raise", sets: 4, reps: "15" },
      ],
    },
  ];
  return {
    variant: "gym",
    title: "3-Day Gym Split",
    description: `Your gym plan is built for ${weightNote(inputs.weightKg)}.${ageNote(inputs.age)}${postureNote(inputs.postureWeak)} Train the three days with a rest day between — each session runs ~45 minutes.`,
    days,
  };
}

function homePlan(inputs: PlanInputs): TrainingPlan {
  const days: PlanDay[] = [
    {
      id: "home-push",
      label: "Day 1",
      focus: "Upper push · no equipment",
      exercises: [
        { id: "pushup", name: "Push-ups", sets: 3, reps: "10–15", note: "Hands elevated = easier, feet elevated = harder" },
        { id: "pike", name: "Pike Push-ups", sets: 3, reps: "8" },
        { id: "dips", name: "Chair Tricep Dips", sets: 3, reps: "12" },
        { id: "plank", name: "Plank", sets: 3, reps: "45s" },
        ...(inputs.postureWeak ? [POSTURE_FINISHER] : []),
      ],
    },
    {
      id: "home-pull",
      label: "Day 2",
      focus: "Pull & core · no equipment",
      exercises: [
        { id: "door-row", name: "Towel Doorway Rows", sets: 3, reps: "10", note: "Anchor a towel in the door hinge, lean back and row" },
        { id: "superman", name: "Superman Hold", sets: 3, reps: "30s" },
        { id: "hollow", name: "Hollow Hold", sets: 3, reps: "20s" },
        { id: "snow-angel", name: "Reverse Snow Angels", sets: 3, reps: "12" },
      ],
    },
    {
      id: "home-legs",
      label: "Day 3",
      focus: "Legs & glutes · no equipment",
      exercises: [
        { id: "bw-squat", name: "Bodyweight Squats", sets: 3, reps: "15" },
        { id: "split", name: "Split Squats", sets: 3, reps: "10 / leg" },
        { id: "bridge", name: "Glute Bridge", sets: 3, reps: "15" },
        { id: "calf-bw", name: "Calf Raises", sets: 4, reps: "15" },
      ],
    },
  ];
  return {
    variant: "home",
    title: "3-Day At-Home Circuit",
    description: `Your home plan needs zero equipment and fits any room. Built for ${weightNote(inputs.weightKg)}.${ageNote(inputs.age)}${postureNote(inputs.postureWeak)} Three sessions a week, roughly 30 minutes each.`,
    days,
  };
}

export function buildTrainingPlan(inputs: PlanInputs): Record<TrainingVariant, TrainingPlan> {
  return { gym: gymPlan(inputs), home: homePlan(inputs) };
}

/** Total planned sets across a plan (the recommended weekly goal). */
export function weeklySets(plan: TrainingPlan): number {
  return plan.days.reduce(
    (sum, d) => sum + d.exercises.reduce((s, e) => s + e.sets, 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// Persistence (per user, localStorage via lib/hub)
// ---------------------------------------------------------------------------

export function loadTrainingVariant(userId: string): TrainingVariant {
  const v = hubGet<TrainingVariant>(userId, "training-variant", "gym");
  return v === "home" ? "home" : "gym";
}

export function saveTrainingVariant(userId: string, variant: TrainingVariant): void {
  hubSet(userId, "training-variant", variant);
}

export function loadTrainingGoal(userId: string): TrainingGoal {
  return hubGet<TrainingGoal>(userId, "training-goal", EMPTY_TRAINING_GOAL);
}

export function saveTrainingGoal(userId: string, goal: TrainingGoal): void {
  hubSet(userId, "training-goal", goal);
}

export function loadTrainingLog(userId: string, date: string): TrainingLog {
  return {
    ...EMPTY_TRAINING_LOG,
    ...hubGet<Partial<TrainingLog>>(userId, `training:${date}`, {}),
  };
}

export function saveTrainingLog(userId: string, date: string, log: TrainingLog): void {
  hubSet(userId, `training:${date}`, log);
}

// Fallback schedule used until the user logs their first session:
// Sun..Sat -> plan day indexes (Mon/Thu Day 1, Tue/Fri Day 2, Wed/Sat Day 3).
const DAY_MAP = [0, 0, 1, 2, 0, 1, 2];

/**
 * Which plan day (index into plan.days) is scheduled today. Advances through
 * the split after each completed session; ignores today's log so a reload
 * mid-session never skips ahead.
 */
export function nextTrainingDay(userId: string): number {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  for (let i = 0; i < 30; i++) {
    const log = loadTrainingLog(userId, dateKey(d));
    if (log.day >= 0 && Object.values(log.done).some((v) => v > 0)) {
      return (log.day + 1) % 3;
    }
    d.setDate(d.getDate() - 1);
  }
  return DAY_MAP[new Date().getDay()];
}

/** Sets completed in the last 7 days (including today). */
export function setsThisWeek(userId: string): number {
  let total = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const log = loadTrainingLog(userId, dateKey(d));
    total += Object.values(log.done).reduce((s, v) => s + v, 0);
    d.setDate(d.getDate() - 1);
  }
  return total;
}

/** Consecutive days (ending today) with at least one logged set. */
export function trainingWorkoutStreak(userId: string): number {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const log = loadTrainingLog(userId, dateKey(d));
    const sets = Object.values(log.done).reduce((s, v) => s + v, 0);
    if (sets === 0) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}