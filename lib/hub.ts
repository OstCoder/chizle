// Per-user scoped storage for the dashboard's self-improvement trackers
// (sculpt list, haircare, products, fragrance, water, habit logs). Everything
// is namespaced by the signed-in user, so one account never reads another's
// data, and day-keyed values reset naturally each day.

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
 * Read a JSON value from scoped storage. When `validate` is provided, a value
 * that fails it (corrupted JSON, a shape from an older/newer schema version,
 * or hand-edited storage) is discarded and the fallback is returned instead
 * of propagating data that could crash downstream render code.
 */
export function hubGet<T>(
  userId: string,
  key: string,
  fallback: T,
  validate?: (value: unknown) => boolean,
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(hubKey(userId, key));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (validate && !validate(parsed)) {
      console.warn(`[chizle] discarding malformed hub value for "${key}"`);
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Shared shape validators for the structured hub values. Guards against
// corrupted or schema-drifted storage crashing the dashboard — every one of
// these used to be an unchecked cast that could throw at render time.
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export function isLogsShape(v: unknown): boolean {
  return (
    isObj(v) &&
    typeof v.workout === "boolean" &&
    (v.sleep === null || typeof v.sleep === "string") &&
    typeof v.cleanEating === "boolean"
  );
}

export function isAmpmShape(v: unknown): boolean {
  return isObj(v) && typeof v.am === "boolean" && typeof v.pm === "boolean";
}

export function isFaceFitnessDayShape(v: unknown): boolean {
  return (
    isObj(v) &&
    Array.isArray(v.completed) &&
    v.completed.every((x) => typeof x === "string")
  );
}

export function isGroomingProductArray(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every(
      (p) =>
        isObj(p) && typeof p.id === "string" && typeof p.name === "string",
    )
  );
}

export function isScentArray(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        isObj(s) && typeof s.id === "string" && typeof s.name === "string",
    )
  );
}

export function isScentOfDayShape(v: unknown): boolean {
  return isObj(v) && typeof v.occasion === "string";
}

export function isWaterGoalShape(v: unknown): boolean {
  return (
    isObj(v) &&
    (v.mode === "auto" || v.mode === "manual") &&
    (v.value === null || typeof v.value === "number")
  );
}

export function isHairStatusShape(v: unknown): boolean {
  return (
    isObj(v) &&
    (v.lastTrim === null || typeof v.lastTrim === "string") &&
    (v.nextAppointment === null || typeof v.nextAppointment === "string") &&
    (v.status === "maintaining" ||
      v.status === "growing" ||
      v.status === "beard") &&
    typeof v.note === "string"
  );
}

export function isNumberValue(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v);
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
  const raw = hubGet<unknown[]>(userId, `${key}:${date}`, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
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
      isLogsShape,
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

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}