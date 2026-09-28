"use client";

import { Skeleton } from "@/components/Skeleton";
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
    <div
      role="status"
      aria-busy="true"
      className="card min-h-[200px] p-6"
    >
      {/* Shimmer stand-in for the scan preview and the result rows being
          built — a skeleton of the card that's about to appear, so the swap
          from "processing" to "results" doesn't shift the layout. */}
      <div className="flex items-start gap-3">
        <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-36 max-w-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="hidden h-8 w-24 rounded-full sm:block" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-[72%]" />
      </div>
      <p className="mt-4 text-sm font-medium text-white/80">{label}</p>
      <p className="mt-1 max-w-sm text-xs text-white/40">{detail}</p>
      <div className="relative mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-white/5">
        <div className="shimmer absolute inset-0" />
      </div>
    </div>
  );
}
