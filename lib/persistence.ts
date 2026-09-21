// localStorage persistence for analysis history (last N entries per page).
//
// Storing the full ImageData isn't feasible (multi-MB pixel buffers), so each
// history entry persists a compact JSON payload: the report, the landmarks, a
// small thumbnail (always kept, for the history strip), and a full-size JPEG
// data URL (kept ONLY on the most recent entry, so the mesh overlay stays
// sharp on refresh). Older entries keep their thumbnail but drop the full
// image — five full images per slot would blow the ~5 MB localStorage quota.
//
// On a refresh the page restores the latest entry instantly instead of
// re-running MediaPipe (which costs a 36 MB model load). Entries are
// individually removable.

import type { AnalysisReport, LandmarkPoint } from "@/types/analysis";

export interface PersistedAnalysis {
  id: string;
  report: AnalysisReport;
  landmarks: LandmarkPoint[] | null;
  /** Full-size JPEG data URL — only kept on the most recent entry. */
  image: string | null;
  /** Small JPEG thumbnail — always kept, for the history strip. */
  thumb: string;
  savedAt: string;
}

export interface PersistedCompareEntry {
  id: string;
  before: PersistedAnalysis;
  after: PersistedAnalysis;
  savedAt: string;
}

export type PersistSlot = "analyze" | "scorecard" | "compare";

const PREFIX = "chizle:v2:";
// 12 entries gives the progress tracker a real trend line while staying well
// inside the localStorage quota (only the newest entry keeps a full image).
const MAX_HISTORY = 12;

// Namespaces persisted history to the signed-in user so a shared browser
// never surfaces one account's photos in another account's history strip.
// Analyzer pages call setStorageScope() once the Supabase session resolves;
// until then (or when no user is known) entries land in the "anon" bucket,
// which is never rendered to a signed-in user.
let storageScope = "anon";

export function setStorageScope(scope: string | null | undefined): void {
  storageScope = scope && scope.trim() ? scope.trim() : "anon";
}

function scopedPrefix(): string {
  return PREFIX + storageScope + ":";
}

/** Runs once to carry v1 single-slot entries into the v2 history format. */
const MIGRATION_FLAG = PREFIX + "migrated:v1";

/** Skip persisting the full image when the data URL would eat too much quota. */
const MAX_IMAGE_CHARS = 800_000;

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn("[chizle] failed to read persisted analysis", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Schema validation & versioning. localStorage survives app upgrades, so a
// payload written by an older (or newer) build can drift from what the
// current render code expects. Rather than trusting a cast, every read
// validates the shape and silently drops malformed entries — corrupt data
// degrades to "no history" instead of crashing the dashboard.
// ---------------------------------------------------------------------------

/** Current schema version written into every history payload. */
export const SCHEMA_VERSION = 3;

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Structural check for an AnalysisReport — deep enough to catch drift and
 *  corruption without validating all ~40 fields. */
function isReportShape(v: unknown): boolean {
  if (!isObj(v)) return false;
  const r = v as Record<string, unknown>;
  const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  return (
    isObj(r.ratios) &&
    num((r.ratios as Record<string, unknown>).jawlineAngle) &&
    isObj(r.symmetry) &&
    num((r.symmetry as Record<string, unknown>).overall) &&
    isObj(r.posture) &&
    isObj(r.smile) &&
    num((r.smile as Record<string, unknown>).score) &&
    isObj(r.eyes) &&
    isObj(r.light) &&
    num((r.light as Record<string, unknown>).brightness) &&
    isObj(r.imageQuality) &&
    typeof r.summary === "string" &&
    typeof r.generatedAt === "string"
  );
}

function isLandmarksShape(v: unknown): boolean {
  return (
    v === null ||
    (Array.isArray(v) &&
      (v.length === 0 ||
        (isObj(v[0]) &&
          typeof v[0].x === "number" &&
          typeof v[0].y === "number")))
  );
}

function isPersistedAnalysisShape(v: unknown): boolean {
  if (!isObj(v)) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    isReportShape(e.report) &&
    isLandmarksShape(e.landmarks) &&
    (e.image === null || typeof e.image === "string") &&
    typeof e.thumb === "string" &&
    typeof e.savedAt === "string"
  );
}

/**
 * Read + validate + repair a history array, dropping malformed entries.
 * Handles both storage layouts:
 *  • Legacy raw array (written before schema versioning) — accepted, entries
 *    still deep-validated.
 *  • Versioned envelope { version, entries } — envelopes stamped by a NEWER
 *    schema than this build understands are discarded whole (reading them
 *    would misinterpret fields); current/older versions are read normally.
 * The next save re-writes the payload in the current format, completing the
 * forward migration.
 */
function readHistory(slot: PersistSlot): PersistedAnalysis[] {
  const raw = readJson<unknown>(historyKey(slot));
  if (Array.isArray(raw)) {
    return raw.filter(isPersistedAnalysisShape);
  }
  if (isObj(raw) && Array.isArray(raw.entries)) {
    if (
      typeof raw.version === "number" &&
      raw.version > SCHEMA_VERSION
    ) {
      console.warn(
        `[chizle] ${slot} history written by newer schema v${raw.version} — ignoring until resaved`,
      );
      return [];
    }
    return raw.entries.filter(isPersistedAnalysisShape);
  }
  return [];
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("[chizle] failed to persist analysis", err);
  }
}

function historyKey(slot: PersistSlot): string {
  return scopedPrefix() + "history:" + slot;
}

function writeHistory(slot: PersistSlot, list: PersistedAnalysis[]): void {
  // Version-stamped so future schema changes can detect (and migrate or
  // discard) payloads written by other builds.
  writeJson(historyKey(slot), {
    version: SCHEMA_VERSION,
    entries: list.slice(0, MAX_HISTORY),
  });
}

function readCompareHistory(): PersistedCompareEntry[] {
  const raw = readJson<unknown>(scopedPrefix() + "history:compare");
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is PersistedCompareEntry =>
      isObj(v) &&
      isPersistedAnalysisShape(v.before) &&
      isPersistedAnalysisShape(v.after),
  );
}

function writeCompareHistory(list: PersistedCompareEntry[]): void {
  writeJson(scopedPrefix() + "history:compare", list.slice(0, MAX_HISTORY));
}

/** Drop the full-size image from the oldest entry so only the latest keeps it. */
function demoteOldestImage(list: PersistedAnalysis[]): PersistedAnalysis[] {
  if (list.length === 0) return list;
  const [oldest, ...rest] = list;
  return [{ ...oldest, image: null }, ...rest];
}

export interface SavePayload {
  report: AnalysisReport;
  landmarks: LandmarkPoint[] | null;
  image: string | null;
  thumb: string;
}

/** Push a new single-slot analysis to the front of its history. */
export function saveAnalysis(
  slot: "analyze" | "scorecard",
  payload: SavePayload,
): PersistedAnalysis {
  const entry: PersistedAnalysis = {
    id: makeId(),
    report: payload.report,
    landmarks: payload.landmarks,
    image:
      payload.image && payload.image.length <= MAX_IMAGE_CHARS
        ? payload.image
        : null,
    thumb: payload.thumb,
    savedAt: new Date().toISOString(),
  };
  const list = readHistory(slot);
  writeHistory(slot, [entry, ...demoteOldestImage(list)]);
  return entry;
}

/** Push a new before/after pair to the front of the compare history. */
export function saveComparePair(payload: {
  before: SavePayload;
  after: SavePayload;
}): PersistedCompareEntry {
  const entry: PersistedCompareEntry = {
    id: makeId(),
    before: {
      id: makeId(),
      report: payload.before.report,
      landmarks: payload.before.landmarks,
      image:
        payload.before.image && payload.before.image.length <= MAX_IMAGE_CHARS
          ? payload.before.image
          : null,
      thumb: payload.before.thumb,
      savedAt: new Date().toISOString(),
    },
    after: {
      id: makeId(),
      report: payload.after.report,
      landmarks: payload.after.landmarks,
      image:
        payload.after.image && payload.after.image.length <= MAX_IMAGE_CHARS
          ? payload.after.image
          : null,
      thumb: payload.after.thumb,
      savedAt: new Date().toISOString(),
    },
    savedAt: new Date().toISOString(),
  };
  const list = readCompareHistory();
  const demoted = list.length > 0 ? [{ ...list[0], before: { ...list[0].before, image: null }, after: { ...list[0].after, image: null } }, ...list.slice(1)] : list;
  writeCompareHistory([entry, ...demoted]);
  return entry;
}

/** Latest single-slot entry, or null. */
export function loadLatest(slot: "analyze" | "scorecard"): PersistedAnalysis | null {
  const list = readHistory(slot);
  return list[0] ?? null;
}

/** Latest compare pair, or null. */
export function loadLatestCompare(): PersistedCompareEntry | null {
  const list = readCompareHistory();
  return list[0] ?? null;
}

/** Full history for a slot, newest first. */
export function loadHistory(slot: PersistSlot): PersistedAnalysis[] | PersistedCompareEntry[] {
  return slot === "compare" ? readCompareHistory() : readHistory(slot);
}

/** Remove a single entry by id. Returns true if it was removed. */
export function removeHistoryEntry(
  slot: "analyze" | "scorecard",
  id: string,
): boolean {
  const list = readHistory(slot);
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return false;
  writeHistory(slot, next);
  return true;
}

/** Remove a compare entry by id. Returns true if it was removed. */
export function removeCompareEntry(id: string): boolean {
  const list = readCompareHistory();
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return false;
  writeCompareHistory(next);
  return true;
}

// One-time migration from the v1 layout (a single entry per slot under
// chizle:v1:) into the v2 history arrays. Old keys are removed after import.
// v1 had no thumbnails, so the full image doubles as the thumb for the
// imported entry (still fine for the strip).
function migrateV1Once(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG)) return;
    const importSingle = (key: string, slot: "analyze" | "scorecard") => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        report?: AnalysisReport;
        landmarks?: LandmarkPoint[] | null;
        image?: string | null;
        savedAt?: string;
      };
      if (!parsed || !parsed.report) return;
      const list = readHistory(slot);
      writeHistory(slot, [
        {
          id: makeId(),
          report: parsed.report,
          landmarks: parsed.landmarks ?? null,
          image: parsed.image ?? null,
          thumb: parsed.image ?? "",
          savedAt: parsed.savedAt ?? new Date().toISOString(),
        },
        ...demoteOldestImage(list),
      ]);
    };
    importSingle("chizle:v1:analyze", "analyze");
    importSingle("chizle:v1:scorecard", "scorecard");
    const rawA = window.localStorage.getItem("chizle:v1:compare-a");
    const rawB = window.localStorage.getItem("chizle:v1:compare-b");
    if (rawA && rawB) {
      const mk = (raw: string): PersistedAnalysis | null => {
        const p = JSON.parse(raw) as {
          report?: AnalysisReport;
          landmarks?: LandmarkPoint[] | null;
          image?: string | null;
          savedAt?: string;
        };
        if (!p || !p.report) return null;
        return {
          id: makeId(),
          report: p.report,
          landmarks: p.landmarks ?? null,
          image: p.image ?? null,
          thumb: p.image ?? "",
          savedAt: p.savedAt ?? new Date().toISOString(),
        };
      };
      const before = mk(rawA);
      const after = mk(rawB);
      if (before && after) {
        const list = readCompareHistory();
        writeCompareHistory([
          {
            id: makeId(),
            before,
            after,
            savedAt: before.savedAt,
          },
          ...list,
        ]);
      }
    }
    for (const key of [
      "chizle:v1:analyze",
      "chizle:v1:scorecard",
      "chizle:v1:compare-a",
      "chizle:v1:compare-b",
    ]) {
      window.localStorage.removeItem(key);
    }
    window.localStorage.setItem(MIGRATION_FLAG, "1");
  } catch (err) {
    console.warn("[chizle] v1 migration failed", err);
  }
}

export function clearAnalysis(slot: PersistSlot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(historyKey(slot));
  } catch (err) {
    console.warn("[chizle] failed to clear persisted analysis", err);
  }
}

// Ensure any v1 data is imported into the v2 history arrays before reads.
// Called lazily on the first public read/write path so SSR is unaffected.
migrateV1Once();

/**
 * Friendly "x minutes ago" label for a persisted savedAt timestamp, e.g.
 * "from earlier today" / "from 2 days ago". Returns null when the timestamp
 * is missing or unparsable.
 */
export function savedAtLabel(savedAt: string | undefined): string | null {
  if (!savedAt) return null;
  const then = new Date(savedAt).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(1, Math.round((Date.now() - then) / 60_000));
  if (mins < 60) return `from ${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `from ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `from ${days} day${days === 1 ? "" : "s"} ago`;
}
