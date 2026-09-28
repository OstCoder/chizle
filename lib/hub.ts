// Per-user scoped storage for the dashboard's self-improvement trackers
// (sculpt list, haircare, products, fragrance, water, habit logs). Everything
// is namespaced by the signed-in user, so one account never reads another's
// data, and day-keyed values reset naturally each day.

import {
  ampmSchema,
  dailyLogsSchema,
  dayIdArraySchema,
  groomingProductArraySchema,
  hairStatusSchema,
  npsPromptRecordSchema,
  numberValueSchema,
  scentArraySchema,
  scentOfDaySchema,
  trainingVariantSchema,
  waterGoalSchema,
  weeklySummaryConfigSchema,
  type Parser,
} from "./schemas";

// Value schemas for every hub-stored state object are re-exported here so
// callers keep using hub.ts as the single public API for scoped storage
// (hubGet(userId, key, fallback, schema)). The schemas themselves live in
// lib/schemas.ts next to their compile-time interface contracts.
export {
  ampmSchema,
  dailyLogsSchema,
  groomingProductArraySchema,
  hairStatusSchema,
  npsPromptRecordSchema,
  numberValueSchema,
  scentArraySchema,
  scentOfDaySchema,
  trainingVariantSchema,
  waterGoalSchema,
  weeklySummaryConfigSchema,
};

const PREFIX = "chizle:hub:";

// ---------------------------------------------------------------------------
// Date helpers (local-time calendar days, not UTC)
// ---------------------------------------------------------------------------

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function daysSince(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const then = new Date(`${isoDate}T00:00:00`).getTime();
  if (Number.isNaN(then)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now.getTime() - then) / 86_400_000));
}

export function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const then = new Date(`${isoDate}T00:00:00`).getTime();
  if (Number.isNaN(then)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((then - now.getTime()) / 86_400_000));
}

// ---------------------------------------------------------------------------
// Scoped JSON storage
// ---------------------------------------------------------------------------

function hubKey(userId: string, key: string): string {
  return `${PREFIX}${userId}:${key}`;
}

/**
 * Read a JSON value from scoped storage, validated against `schema`.
 *
 * The schema is required (not optional) so no read path can silently revert
 * to an unchecked cast. The *parsed* value is returned — schema defaults are
 * applied and unknown keys stripped — so the declared return type T is
 * always honest at runtime. Corrupted JSON, drifted shapes from older/newer
 * builds, or hand-edited storage fall back instead of crashing downstream
 * render code, with a dev-only warning naming the failing paths.
 */
export function hubGet<T>(
  userId: string,
  key: string,
  fallback: T,
  schema: Parser<T>,
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(hubKey(userId, key));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[chizle] discarding malformed hub value for "${key}":`,
        result.error.issues.slice(0, 3),
      );
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function hubSet(userId: string, key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(hubKey(userId, key), JSON.stringify(value));
    // Notify other live components (e.g. the header streak badge) on this page
    // that hub data changed, so they can re-read without a reload.
    window.dispatchEvent(new CustomEvent(HUB_UPDATED_EVENT));
  } catch {
    /* ignore quota / privacy-mode failures */
  }
}

/** Fired on window whenever any hub value is written. */
export const HUB_UPDATED_EVENT = "chizle:hub-updated";

// ---------------------------------------------------------------------------
// Day-keyed id sets (checklists: sculpt items, applied products)
// ---------------------------------------------------------------------------

export function loadDayIds(
  userId: string,
  key: string,
  date: string,
): string[] {
  return hubGet<string[]>(userId, `${key}:${date}`, [], dayIdArraySchema);
}

export function toggleDayId(
  userId: string,
  key: string,
  date: string,
  id: string,
): string[] {
  const current = loadDayIds(userId, key, date);
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  hubSet(userId, `${key}:${date}`, next);
  return next;
}

// ---------------------------------------------------------------------------
// Habit logs & streaks
// ---------------------------------------------------------------------------

export type SleepQuality = "good" | "ok" | "poor";

export interface DailyLogs {
  workout: boolean;
  sleep: SleepQuality | null;
  cleanEating: boolean;
}

export const EMPTY_LOGS: DailyLogs = {
  workout: false,
  sleep: null,
  cleanEating: false,
};

/** Consecutive days ending today for which the predicate is true. */
export function consecutiveDays(
  userId: string,
  key: string,
  predicate: (logs: DailyLogs) => boolean,
): number {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const logs = hubGet<DailyLogs>(
      userId,
      `${key}:${dateKey(d)}`,
      EMPTY_LOGS,
      dailyLogsSchema,
    );
    if (!predicate(logs)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Tracker types
// ---------------------------------------------------------------------------

/**
 * Water goal override for the hydration tracker: derived ("auto") from the
 * user's profile by default, or a manual ml target.
 */
export interface WaterGoal {
  mode: "auto" | "manual";
  value: number | null; // ml when manual
}

export interface HairStatus {
  lastTrim: string | null; // ISO date (yyyy-mm-dd)
  nextAppointment: string | null; // ISO date
  status: "maintaining" | "growing" | "beard";
  note: string;
}

export const EMPTY_HAIR_STATUS: HairStatus = {
  lastTrim: null,
  nextAppointment: null,
  status: "maintaining",
  note: "",
};

export interface GroomingProduct {
  id: string;
  name: string;
  category: string;
}

export interface Scent {
  id: string;
  name: string;
  notes: string[];
}

export interface ScentOfDay {
  scentId: string | null;
  occasion: string;
}

/**
 * One-shot record for the post-7-day-streak recommendation (NPS) prompt.
 * Written the moment the prompt is first shown so it can never interrupt
 * twice; `score`/`answeredAt` are filled in only if the user actually answers.
 */
export interface NpsPromptRecord {
  promptedAt: string; // ISO timestamp of the single showing
  score: number | null; // 0–10, null when dismissed without answering
  answeredAt: string | null; // ISO timestamp of the answer
}

/**
 * Config + delivery record for the weekly summary trigger (hub key
 * "weekly-summary"). The channel picks how the recap leaves the browser:
 * a local Notification, a POST to the user's own webhook URL (which can
 * relay it as an email — Zapier, Make, n8n, Knock, a serverless fn), or
 * both. `lastSentAt` gates cadence so it fires at most once every 7 days.
 */
export interface WeeklySummaryConfig {
  enabled: boolean;
  channel: "notification" | "webhook" | "both";
  webhookUrl: string; // "" until the user sets one
  lastSentAt: string | null; // ISO timestamp of the last successful send
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}