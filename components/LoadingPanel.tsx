"use client";

import { Loader2 } from "lucide-react";
import type { BundleStatus } from "@/lib/mediapipe";

interface LoadingPanelProps {
  loading: boolean;
  bundle: BundleStatus;
  variant?: "analyze" | "compare" | "scorecard";
}

export function LoadingPanel({
  loading,
  bundle,
  variant = "analyze",
}: LoadingPanelProps) {
  if (!loading) return null;

  const label =
    bundle === "loading"
      ? "Loading face detector…"
      : bundle === "ready"
        ? variant === "compare"
          ? "Comparing faces…"
          : variant === "scorecard"
            ? "Scoring the photo…"
            : "Analyzing face…"
        : "Preparing…";

  const detail =
    bundle === "loading"
      ? "First run only — about 36 MB of model assets."
      : "Processed entirely in your browser. Nothing is uploaded.";

  return (
    <div className="card flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white/60">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
      <p className="text-sm font-medium text-white/80">{label}</p>
      <p className="max-w-sm text-xs text-white/40">{detail}</p>
      <div className="relative mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-white/5">
        <div className="shimmer absolute inset-0" />
      </div>
    </div>
  );
}
