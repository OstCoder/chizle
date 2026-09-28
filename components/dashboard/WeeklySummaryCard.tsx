"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, Loader2, Send } from "lucide-react";
import {
  hubGet,
  hubSet,
  weeklySummaryConfigSchema,
  type WeeklySummaryConfig,
} from "@/lib/hub";
import type { PersistedAnalysis } from "@/lib/persistence";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WEEKLY_CONFIG,
  WEEKLY_HUB_KEY,
  buildWeeklySummary,
  deliverWeeklySummary,
  isWeeklyDue,
} from "@/lib/weeklySummary";

interface Props {
  userId: string;
  entries: PersistedAnalysis[]; // newest first
}

type Status = { kind: "ok" | "error" | "info"; text: string } | null;

const CHANNELS: WeeklySummaryConfig["channel"][] = [
  "notification",
  "webhook",
  "both",
];

const CHANNEL_LABELS: Record<WeeklySummaryConfig["channel"], string> = {
  notification: "Notification",
  webhook: "Webhook",
  both: "Both",
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Settings + trigger for the weekly summary: compares the latest scan with
 * the start date and delivers it as a local browser notification and/or a
 * POST to the user's own webhook (which can relay it as an email). Opt-in;
 * fires automatically on the first visit after 7 days, or on demand via
 * "Send test now". Config lives in the per-user hub under "weekly-summary".
 */
export function WeeklySummaryCard({ userId, entries }: Props) {
  const [config, setConfig] =
    useState<WeeklySummaryConfig>(DEFAULT_WEEKLY_CONFIG);
  const [urlDraft, setUrlDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  // Auto-fire guard: at most one automatic attempt per page session, so a
  // failed delivery can't loop every time `busy` flips back to false.
  const attempted = useRef(false);
  // Mirror of `config` for patch-time reads: an async send finishing after
  // the user changed the channel must merge into the *current* config, not
  // the closure the send started with.
  const configRef = useRef<WeeklySummaryConfig>(DEFAULT_WEEKLY_CONFIG);

  // Load this account's config once the hub scope is known.
  useEffect(() => {
    const loaded = hubGet(
      userId,
      WEEKLY_HUB_KEY,
      DEFAULT_WEEKLY_CONFIG,
      weeklySummaryConfigSchema,
    );
    configRef.current = loaded;
    setConfig(loaded);
  }, [userId]);

  useEffect(() => {
    setUrlDraft(config.webhookUrl);
  }, [config.webhookUrl]);

  useEffect(() => {
    setPermission(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported",
    );
  }, []);

  const patch = useCallback(
    (p: Partial<WeeklySummaryConfig>) => {
      const next = { ...configRef.current, ...p };
      configRef.current = next;
      setConfig(next);
      hubSet(userId, WEEKLY_HUB_KEY, next);
    },
    [userId],
  );

  const send = useCallback(
    async (manual: boolean) => {
      if (busy) return;
      const summary = buildWeeklySummary(entries);
      if (!summary) {
        if (manual) {
          setStatus({
            kind: "info",
            text: "Run your first scan to build a summary.",
          });
        }
        return;
      }
      // Automatic sends wait for a real start-vs-latest comparison; a manual
      // test always goes out, even with a single baseline scan.
      if (!manual && summary.scans < 2) return;

      setBusy(true);
      try {
        const report = await deliverWeeklySummary(summary, config);
        if (typeof window !== "undefined" && "Notification" in window) {
          setPermission(Notification.permission);
        }
        const parts: string[] = [];
        if (report.notification) {
          parts.push(
            report.notification.ok
              ? "browser notification sent"
              : `notification failed — ${report.notification.error}`,
          );
        }
        if (report.webhook) {
          parts.push(
            report.webhook.ok
              ? "webhook delivered"
              : `webhook failed — ${report.webhook.error}`,
          );
        }
        if (report.anyOk) {
          patch({ lastSentAt: new Date().toISOString() });
          const degraded = parts.some((p) => p.includes("failed"));
          setStatus({ kind: degraded ? "info" : "ok", text: parts.join(" · ") });
        } else {
          setStatus({
            kind: "error",
            text: parts.join(" · ") || "Nothing was delivered.",
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, entries, config, patch],
  );

  // Automatic trigger: first visit with the feature enabled where 7 days
  // have passed since the last send (never sent = due immediately).
  useEffect(() => {
    if (attempted.current || !config.enabled || !isWeeklyDue(config)) return;
    const timer = window.setTimeout(() => {
      attempted.current = true;
      void send(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [config, send]);

  // Ask for notification permission on the user gesture that enables the
  // channel — browsers ignore requests made without one.
  const ensurePermission = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "default"
    )
      return;
    void Notification.requestPermission().then((p) => {
      setPermission(p);
      if (p !== "granted") {
        setStatus({
          kind: "info",
          text: "Notifications are blocked — allow them for this site in your browser settings.",
        });
      }
    });
  }, []);

  const toggleEnabled = (on: boolean) => {
    patch({ enabled: on });
    if (on && config.channel !== "webhook") ensurePermission();
  };

  const setChannel = (channel: WeeklySummaryConfig["channel"]) => {
    patch({ channel });
    if (channel !== "webhook") ensurePermission();
  };

  const commitUrl = () => {
    const value = urlDraft.trim();
    if (value !== config.webhookUrl) patch({ webhookUrl: value });
  };

  const webhookInUse = config.channel !== "notification";
  const notificationInUse = config.channel !== "webhook";

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-500/15 text-accent-300">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">Weekly summary</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-white/50">
            Your latest scan vs. your start date, once a week — as a local
            browser notification, or POSTed to your own webhook (which can
            email it).
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          aria-label="Enable weekly summary"
          onClick={() => toggleEnabled(!config.enabled)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            config.enabled ? "bg-accent-500" : "bg-white/15",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
              config.enabled ? "left-[22px]" : "left-0.5",
            )}
          />
        </button>
      </div>

      {config.enabled ? (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Delivery channel"
          >
            <span className="mr-1 text-[11px] uppercase tracking-wider text-white/40">
              Deliver via
            </span>
            {CHANNELS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={config.channel === c}
                onClick={() => setChannel(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  config.channel === c
                    ? "border-accent-400/50 bg-accent-500/15 text-accent-200"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white/80",
                )}
              >
                {CHANNEL_LABELS[c]}
              </button>
            ))}
          </div>

          {webhookInUse && (
            <label className="block">
              <span className="text-[11px] font-medium text-white/60">
                Webhook URL
              </span>
              <input
                type="url"
                inputMode="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={commitUrl}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="https://hooks.zapier.com/…"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20"
              />
              <span className="mt-1 block text-[11px] leading-relaxed text-white/40">
                POSTs JSON with a ready-to-send <code>subject</code> and{" "}
                <code>text</code> body plus the per-metric deltas. Point it at
                Zapier, Make, n8n, or Knock to land in your inbox — the
                endpoint must allow browser (CORS) POSTs. Saved when you
                click away.
              </span>
            </label>
          )}

          {notificationInUse && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {permission === "granted" && (
                <span className="text-emerald-300/80">
                  Browser notifications allowed.
                </span>
              )}
              {permission === "default" && (
                <button
                  type="button"
                  onClick={ensurePermission}
                  className="rounded-lg bg-white/[0.06] px-2.5 py-1 font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Enable browser notifications
                </button>
              )}
              {permission === "denied" && (
                <span className="flex items-center gap-1.5 text-amber-300/90">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Notifications are blocked — allow them in your browser&apos;s
                  site settings.
                </span>
              )}
              {permission === "unsupported" && (
                <span className="text-white/40">
                  This browser doesn&apos;t support notifications.
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <p className="text-[11px] text-white/40">
              {config.lastSentAt
                ? `Last sent ${shortDate(config.lastSentAt)} — next one on your first visit after 7 days.`
                : "Not sent yet — fires on your next visit, or send a test now."}
            </p>
            <button
              type="button"
              onClick={() => void send(true)}
              disabled={busy}
              className="btn-secondary !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {busy ? "Sending…" : "Send test now"}
            </button>
          </div>

          {status && (
            <p
              role="status"
              className={cn(
                "text-[11px] leading-relaxed",
                status.kind === "ok" && "text-emerald-300/90",
                status.kind === "error" && "text-red-300",
                status.kind === "info" && "text-white/50",
              )}
            >
              {status.text}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-white/35">
          Off — turn on to get your first recap (latest scan vs. start date)
          on the next visit after seven days.
        </p>
      )}
    </div>
  );
}
