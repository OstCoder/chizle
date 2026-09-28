// Weekly summary trigger — builds a "latest scan vs. start date" comparison
// from the persisted scan history and delivers it through the channels the
// user configured (local browser notification, their own webhook, or both).
// Everything runs locally: the payload only leaves the browser when a
// webhook URL is set, and that endpoint is free to relay it as an email
// (Zapier, Make, n8n, Knock inbound, a serverless function, …).
//
// Cadence is visit-based — the trigger fires on the first app open after
// seven days (or immediately when never sent), gated by `lastSentAt` in the
// per-user hub config. No server, no scheduler; it works offline-first.

import type { AnalysisReport } from "@/types/analysis";
import type { WeeklySummaryConfig } from "./hub";
import type { PersistedAnalysis } from "./persistence";
import { rateFace } from "./ratings";

/** Hub key the config + last-send record lives under (per user). */
export const WEEKLY_HUB_KEY = "weekly-summary";

export const WEEKLY_INTERVAL_DAYS = 7;

export const DEFAULT_WEEKLY_CONFIG: WeeklySummaryConfig = {
  enabled: false,
  channel: "notification",
  webhookUrl: "",
  lastSentAt: null,
};

export interface WeeklyMetric {
  key: string;
  label: string;
  start: number; // baseline (first scan) value
  latest: number; // most recent scan value
  delta: number; // latest - start
  unit: "" | "%" | "/100" | "/10" | "°";
  betterWhen: "up" | "down";
}

export interface WeeklySummary {
  /** Fixed schema id so webhook consumers can switch on it. */
  event: "chizle.weekly_summary";
  generatedAt: string; // ISO
  subject: string; // notification title / email subject line
  text: string; // plain-text body — drop straight into an email
  appUrl: string;
  startDate: string; // ISO of the first scan (the "start date")
  latestDate: string; // ISO of the newest scan
  scans: number; // total face-detected scans
  scansThisWeek: number;
  metrics: WeeklyMetric[];
}

const APP_URL = "https://chizle.app";

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Jawline sharpness 0..100 — inverted angle read (bell around ~100°),
 *  same formula the progress tracker plots so the email matches the chart. */
function jawlineSharpness(report: AnalysisReport): number {
  return (
    Math.max(0, 1 - Math.abs(report.ratios.jawlineAngle - 100) / 30) * 100
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown date";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "6.8 → 7.4" style value pair, honouring the metric's unit. */
function valuePair(m: WeeklyMetric): string {
  const digits = m.unit === "/10" || m.unit === "°" ? 1 : 0;
  return `${m.start.toFixed(digits)}${m.unit} → ${m.latest.toFixed(digits)}${m.unit}`;
}

/** "(+4)" / "(−2.1°)" / "(±0)". */
function deltaPair(m: WeeklyMetric): string {
  const digits = m.unit === "/10" || m.unit === "°" ? 1 : 0;
  const d = round(m.delta, digits);
  if (d === 0) return "(±0)";
  const sign = d > 0 ? "+" : "−";
  return `(${sign}${Math.abs(d).toFixed(digits)}${m.unit === "%" ? "%" : ""})`;
}

function improved(m: WeeklyMetric): boolean {
  return m.betterWhen === "up" ? m.delta > 0 : m.delta < 0;
}

/** Did enough time pass since the last send (or was it never sent)? */
export function isWeeklyDue(
  config: WeeklySummaryConfig,
  now: Date = new Date(),
): boolean {
  if (!config.enabled) return false;
  if (!config.lastSentAt) return true;
  const last = new Date(config.lastSentAt).getTime();
  if (Number.isNaN(last)) return true; // corrupt timestamp — resend
  return now.getTime() - last >= WEEKLY_INTERVAL_DAYS * 86_400_000;
}

/**
 * Build the weekly recap from scan history (newest first). Compares the
 * oldest face-detected scan (start date) with the newest one across the
 * metrics the app charts/scores, plus a plain-text body ready to email.
 * Returns null when there is no scan to summarize.
 */
export function buildWeeklySummary(
  entries: PersistedAnalysis[],
  now: Date = new Date(),
): WeeklySummary | null {
  // Oldest → newest; no-face entries have no metrics to compare.
  const scans = entries
    .filter((e) => e.report.imageQuality.hasFace)
    .slice()
    .reverse();
  if (scans.length === 0) return null;

  const first = scans[0];
  const latest = scans[scans.length - 1];

  const pair = (
    key: string,
    label: string,
    unit: WeeklyMetric["unit"],
    betterWhen: "up" | "down",
    read: (r: AnalysisReport) => number,
    digits: number,
  ): WeeklyMetric => {
    const start = round(read(first.report), digits);
    const latestValue = round(read(latest.report), digits);
    return {
      key,
      label,
      start,
      latest: latestValue,
      delta: round(latestValue - start, digits),
      unit,
      betterWhen,
    };
  };

  const metrics: WeeklyMetric[] = [
    pair("overall", "Overall rating", "/10", "up", (r) => rateFace(r).current, 1),
    pair("symmetry", "Symmetry", "/100", "up", (r) => r.symmetry.overall, 0),
    pair("jawline", "Jawline sharpness", "/100", "up", jawlineSharpness, 0),
    pair("smile", "Smile", "/100", "up", (r) => r.smile.score, 0),
    pair(
      "balance",
      "Thirds balance",
      "%",
      "up",
      (r) => r.ratios.thirdsBalance * 100,
      0,
    ),
    // Closer to level is better, so lower wins.
    pair(
      "tilt",
      "Head tilt",
      "°",
      "down",
      (r) => Math.abs(r.posture.headTiltDeg),
      1,
    ),
  ];

  const startLabel = dayLabel(first.savedAt);
  const wins = metrics.filter(improved);
  // Lead with the two biggest wins so the subject line earns the open.
  const top = wins.slice(0, 2).map((m) => {
    const digits = m.unit === "/10" || m.unit === "°" ? 1 : 0;
    const sign = m.delta > 0 ? "+" : "−";
    return `${m.label.toLowerCase()} ${sign}${Math.abs(m.delta).toFixed(digits)}${m.unit === "%" ? "%" : ""}`;
  });
  const subject =
    top.length > 0
      ? `Chizle weekly summary: ${top.join(", ")} since ${startLabel}`
      : `Chizle weekly summary since ${startLabel}`;

  const weekAgo = now.getTime() - WEEKLY_INTERVAL_DAYS * 86_400_000;
  const scansThisWeek = scans.filter(
    (s) => new Date(s.savedAt).getTime() >= weekAgo,
  ).length;

  const lines = [
    subject,
    "",
    `Baseline: ${startLabel} (first scan) · Latest scan: ${dayLabel(latest.savedAt)}`,
    `${scans.length} scan${scans.length === 1 ? "" : "s"} in total · ${scansThisWeek} this week`,
    "",
    ...metrics.map((m) => {
      const label = `${m.label}`.padEnd(19, " ");
      return `${label} ${valuePair(m).padEnd(22, " ")} ${deltaPair(m)}`;
    }),
    "",
    wins.length > 0
      ? `${wins.length}/${metrics.length} metrics moved the right way this week. Open Chizle to see the full trend chart.`
      : `Open Chizle to see the full trend chart and log this week's scans.`,
    "",
    APP_URL,
  ];

  return {
    event: "chizle.weekly_summary",
    generatedAt: now.toISOString(),
    subject,
    text: lines.join("\n"),
    appUrl: `${APP_URL}/dashboard`,
    startDate: first.savedAt,
    latestDate: latest.savedAt,
    scans: scans.length,
    scansThisWeek,
    metrics,
  };
}

export interface DeliveryResult {
  ok: boolean;
  error?: string;
}

export interface DeliveryReport {
  notification: DeliveryResult | null;
  webhook: DeliveryResult | null;
  /** True when at least one configured channel accepted the summary. */
  anyOk: boolean;
}

/** Short body for the OS notification bubble (title + first lines). */
function notificationBody(summary: WeeklySummary): string {
  const brief = summary.text.split("\n").slice(2, 4).join(" · ");
  return brief || summary.subject;
}

async function sendNotification(
  summary: WeeklySummary,
): Promise<DeliveryResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, error: "This browser doesn't support notifications." };
  }
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission was denied." };
  }
  try {
    new Notification(summary.subject, {
      body: notificationBody(summary),
      tag: "chizle-weekly",
      icon: "/icons/icon-192.png",
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Notification failed.",
    };
  }
}

async function sendWebhook(
  url: string,
  summary: WeeklySummary,
): Promise<DeliveryResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "The webhook URL isn't a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "The webhook URL must be http(s)." };
  }
  try {
    const res = await fetch(parsed.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `source`/`event` let the receiving automation (Zapier, Make, n8n,
      // Knock, …) route the payload straight into an email step.
      body: JSON.stringify({
        source: "chizle",
        ...summary,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `The webhook responded with ${res.status}.` };
    }
    return { ok: true };
  } catch (err) {
    // Most common cause: the endpoint doesn't allow cross-origin (CORS) POSTs.
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Webhook request failed (${err.message}). The endpoint must allow browser CORS POSTs.`
          : "Webhook request failed.",
    };
  }
}

/**
 * Deliver the summary through the configured channel(s). Both channels are
 * attempted independently when channel is "both", so a blocked notification
 * permission still lets the webhook through (and vice versa).
 */
export async function deliverWeeklySummary(
  summary: WeeklySummary,
  config: WeeklySummaryConfig,
): Promise<DeliveryReport> {
  const wantsNotification = config.channel !== "webhook";
  const wantsWebhook = config.channel !== "notification";

  const notification = wantsNotification
    ? await sendNotification(summary)
    : null;
  const webhook =
    wantsWebhook && config.webhookUrl.trim()
      ? await sendWebhook(config.webhookUrl.trim(), summary)
      : wantsWebhook
        ? { ok: false, error: "No webhook URL configured yet." }
        : null;

  return {
    notification,
    webhook,
    anyOk: (notification?.ok ?? false) || (webhook?.ok ?? false),
  };
}
