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

export function hubGet<T>(userId: string, key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(hubKey(userId, key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function hubSet(userId: string, key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(hubKey(userId, key), JSON.stringify(value));
    // Broadcast to same-tab subscribers (the native `storage` event only
    // fires across tabs), so sibling cards re-read shared state instantly —
    // e.g. adding a scent to the wardrobe updates Scent of the Day.
    window.dispatchEvent(new CustomEvent(HUB_EVENT, { detail: { userId, key } }));
  } catch {
    /* ignore quota / privacy-mode failures */
  }
}

const HUB_EVENT = "chizle:hub";

/**
 * Subscribe to same-tab hub writes. `keyFilter` optionally scopes the
 * callback to a single storage key. Returns an unsubscribe function.
 */
export function subscribeHub(
  userId: string,
  keyFilter: string | null,
  onChange: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ userId: string; key: string }>).detail;
    if (!detail || detail.userId !== userId) return;
    if (keyFilter && detail.key !== keyFilter) return;
    onChange();
  };
  window.addEventListener(HUB_EVENT, handler);
  return () => window.removeEventListener(HUB_EVENT, handler);
}

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
    const logs = hubGet<DailyLogs>(userId, `${key}:${dateKey(d)}`, EMPTY_LOGS);
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