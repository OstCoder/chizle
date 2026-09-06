// Per-user, per-day persistence for the dashboard's daily routine checklist.
// Completed item ids are stored in localStorage under a key namespaced by the
// signed-in user and the calendar date, so one account never sees another's
// (or yesterday's) checklist state.

const PREFIX = "chizle:routine:";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function routineKey(userId: string, dateKey: string): string {
  return `${PREFIX}${userId}:${dateKey}`;
}

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore quota / privacy-mode failures */
  }
}

/** Completed routine item ids for a user on a given day. */
export function loadCompleted(userId: string, dateKey: string): string[] {
  return readIds(routineKey(userId, dateKey));
}

/** Toggle one item and return the updated completed list. */
export function toggleCompleted(
  userId: string,
  dateKey: string,
  itemId: string,
): string[] {
  const key = routineKey(userId, dateKey);
  const current = readIds(key);
  const next = current.includes(itemId)
    ? current.filter((id) => id !== itemId)
    : [...current, itemId];
  writeIds(key, next);
  return next;
}