// Daily streak engine — the single source of truth for "did the user complete
// their routine today" and how many consecutive days they've kept it up.
//
// A day counts as complete when every tracked pillar for that day is done:
//   • AM skincare   — hub key  ampm:${date}.am
//   • PM skincare   — hub key  ampm:${date}.pm
//   • Grooming      — all regimen products applied  (products-applied:${date})
//   • Workout       — daily workout logged          (logs:${date}.workout)
//   • Facial fit    — ≥1 mewing/posture exercise    (facefitness:${date})
//
// Grooming and workout only gate the day when the user actually has data for
// them (products in the regimen; has ever used the check-in), so an empty
// regimen or a fresh account doesn't force a false "incomplete" and break the
// streak.

import {
  ampmSchema,
  dailyLogsSchema,
  dateKey,
  groomingProductArraySchema,
  hubGet,
  loadDayIds,
  type DailyLogs,
  type GroomingProduct,
} from "./hub";
import { loadActiveDays, loadFaceFitnessDay } from "./facefitness";

export interface DayStatus {
  am: boolean;
  pm: boolean;
  skincare: boolean; // AM + PM both done
  grooming: boolean;
  workout: boolean;
  facialFitness: boolean; // ≥1 mewing/posture exercise logged
  complete: boolean; // every applicable pillar done
  parts: number; // completed pillar count
  total: number; // pillar count that applies for the day
}

const EMPTY_DAY_LOGS: DailyLogs = {
  workout: false,
  sleep: null,
  cleanEating: false,
};

function dayLogs(userId: string, date: string): DailyLogs {
  // Validated: a corrupted logs entry must not crash the header streak badge
  // (which renders on every page) — fall back to an empty day instead.
  return hubGet<DailyLogs>(userId, `logs:${date}`, EMPTY_DAY_LOGS, dailyLogsSchema);
}

/** Has the user ever used the daily check-in (workout / sleep / clean eating)? */
function hasAnyLogs(userId: string): boolean {
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const logs = dayLogs(userId, dateKey(d));
    if (logs.workout || logs.sleep !== null || logs.cleanEating) return true;
  }
  return false;
}

/** Has the user ever completed a mewing/posture exercise? */
function hasAnyFaceFitness(userId: string): boolean {
  return loadActiveDays(userId).length > 0;
}

export function productCount(userId: string): number {
  return hubGet<GroomingProduct[]>(userId, "products", [], groomingProductArraySchema).length;
}

export function dayStatus(
  userId: string,
  date: string,
  opts: { workoutApplies?: boolean; fitnessApplies?: boolean } = {},
): DayStatus {
  const hasProducts = productCount(userId) > 0;

  const ampm = hubGet<{ am: boolean; pm: boolean }>(
    userId,
    `ampm:${date}`,
    { am: false, pm: false },
    ampmSchema,
  );
  const am = Boolean(ampm.am);
  const pm = Boolean(ampm.pm);
  const skincare = am && pm;

  let grooming = true;
  if (hasProducts) {
    grooming =
      loadDayIds(userId, "products-applied", date).length >= productCount(userId);
  }

  const workout = Boolean(dayLogs(userId, date).workout);
  const workoutApplies = opts.workoutApplies ?? hasAnyLogs(userId);

  const facialFitness =
    loadFaceFitnessDay(userId, date).completed.length > 0;
  const fitnessApplies = opts.fitnessApplies ?? hasAnyFaceFitness(userId);

  const pillars = [skincare, grooming, workout, facialFitness];
  const applies = [true, hasProducts, workoutApplies, fitnessApplies];
  const parts = pillars.filter(Boolean).length;
  const total = applies.filter(Boolean).length;
  const complete = pillars.every((p, i) => !applies[i] || p);

  return { am, pm, skincare, grooming, workout, facialFitness, complete, parts, total };
}

/** Consecutive days ending today (or yesterday, if today isn't done yet). */
export function currentStreak(userId: string): number {
  // If today is already complete, count from today; otherwise start from
  // yesterday so the streak doesn't visually reset mid-day before the user
  // has had a chance to finish today's routine.
  const workoutApplies = hasAnyLogs(userId); // computed once, reused per day
  const fitnessApplies = hasAnyFaceFitness(userId); // computed once, reused per day
  const today = dayStatus(userId, todayKeySafe(), {
    workoutApplies,
    fitnessApplies,
  });
  const start = today.complete ? 0 : 1;

  let streak = 0;
  for (let i = start; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (!dayStatus(userId, dateKey(d), { workoutApplies, fitnessApplies }).complete)
      break;
    streak++;
  }
  return streak;
}

function todayKeySafe(): string {
  return dateKey(new Date());
}

// ---------------------------------------------------------------------------
// Milestones — visual tiers the header badge celebrates
// ---------------------------------------------------------------------------

export interface Milestone {
  label: string;
  at: number; // streak length that unlocks it
}

/** Milestones in ascending order; the label shown is the highest one reached. */
export const MILESTONES: Milestone[] = [
  { label: "Routine started", at: 1 },
  { label: "2-Day Momentum", at: 2 },
  { label: "3-Day Streak", at: 3 },
  { label: "5-Day Consistency", at: 5 },
  { label: "7-Day Glow-Up Streak!", at: 7 },
  { label: "14-Day Glow-Up Streak!", at: 14 },
  { label: "21-Day Habit Locked In", at: 21 },
  { label: "30-Day Glow-Up Streak!", at: 30 },
  { label: "60-Day Unstoppable", at: 60 },
  { label: "100-Day Legend", at: 100 },
];

/** The highest milestone reached for a given streak length. */
export function milestoneFor(streak: number): Milestone {
  let current = MILESTONES[0];
  for (const m of MILESTONES) {
    if (streak >= m.at) current = m;
  }
  return current;
}

/** The next milestone to chase, or null once everything is unlocked. */
export function nextMilestone(streak: number): Milestone | null {
  return MILESTONES.find((m) => m.at > streak) ?? null;
}
