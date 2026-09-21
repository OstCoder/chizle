"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for diagnostics without exposing internals to the user.
    console.error("[chizle] route error", error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25">
        <RotateCcw className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-white">
        Something went sideways
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/55">
        This page hit an unexpected error — usually a hiccup with locally
        saved data. Retrying loads it fresh; your photos and streaks are
        stored on this device and stay safe.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2.5">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <a href="/dashboard" className="btn-secondary">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
