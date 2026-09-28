"use client";

import { useCallback, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  createClient,
  isSupabaseConfigured,
  resolveClientUser,
} from "@/lib/supabase/browser";
import { buildRoutine, greetingName } from "@/lib/glow";
import type { PersistedAnalysis } from "@/lib/persistence";
import type { RatingResult } from "@/lib/ratings";

interface ExportReportButtonProps {
  entry: PersistedAnalysis;
  rating: RatingResult;
}

type State = "idle" | "working" | "done" | "error";

/**
 * "Export Full Report" — compiles the latest scan's ratings, detected
 * attributes, and the personalized daily routine into a downloadable
 * one-page PDF. All client-side; the photo never leaves the browser.
 */
export function ExportReportButton({ entry, rating }: ExportReportButtonProps) {
  const [state, setState] = useState<State>("idle");

  const handleClick = useCallback(async () => {
    if (state === "working") return;
    setState("working");
    try {
      // Resolve the signed-in user's name + profile so the PDF's routine
      // section matches the dashboard (water target, hair type, etc.).
      let userName: string | null = null;
      let profile: Parameters<typeof buildRoutine>[1] = null;
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          // Offline-tolerant: local-session fallback keeps the greeting
          // name available on a cached page (see resolveClientUser).
          const user = await resolveClientUser(supabase);
          if (user) {
            userName = greetingName(user.email) || null;
            const { data: prof } = await supabase
              .from("profiles")
              .select("weight, weight_unit, hair_type")
              .eq("id", user.id)
              .maybeSingle();
            if (prof) profile = prof as Parameters<typeof buildRoutine>[1];
          }
        } catch {
          // Export still works without a name/profile — degrade gracefully.
        }
      }

      const { downloadReportPdf } = await import("@/lib/reportPdf");
      await downloadReportPdf({
        entry,
        rating,
        routine: buildRoutine(entry.report, profile),
        userName,
      });
      setState("done");
      window.setTimeout(() => setState("idle"), 2200);
    } catch (err) {
      console.warn("[chizle] PDF export failed", err);
      setState("error");
      window.setTimeout(() => setState("idle"), 3200);
    }
  }, [entry, rating, state]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "working"}
      aria-live="polite"
      className={
        state === "error"
          ? "inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-200 transition-colors"
          : state === "done"
            ? "inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition-colors"
            : "inline-flex items-center gap-1.5 rounded-lg border border-accent-500/25 bg-accent-500/10 px-2.5 py-1.5 text-xs font-medium text-accent-200 transition-colors hover:bg-accent-500/20 hover:text-accent-100 disabled:opacity-60"
      }
    >
      {state === "working" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {state === "working"
        ? "Building PDF…"
        : state === "done"
          ? "Downloaded"
          : state === "error"
            ? "Export failed — retry"
            : "Export Full Report"}
    </button>
  );
}
