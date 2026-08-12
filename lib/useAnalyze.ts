// useAnalyze hook: subscribes to MediaPipe loader status and runs the full
// pipeline when an image is supplied. Returns report, landmarks, loading,
// error, and the bundle status (for friendlier in-flight labels).

"use client";

import { useEffect, useState } from "react";
import type { AnalysisReport, LandmarkPoint } from "@/types/analysis";
import type { BundleStatus } from "./mediapipe";
import type { PersistedAnalysis } from "./persistence";
import {
  detectFromImageData,
  getBundleStatus,
  subscribeBundleStatus,
} from "./mediapipe";
import { analyze } from "./analysis";

export interface UseAnalyzeResult {
  report: AnalysisReport | null;
  landmarks: LandmarkPoint[] | null;
  bundle: BundleStatus;
  loading: boolean;
  error: string | null;
}

const initial: UseAnalyzeResult = {
  report: null,
  landmarks: null,
  bundle: "idle",
  loading: false,
  error: null,
};

// Single source of truth for the bundle-status diff rule so the mount-time
// hydration and the subscription callback stay in sync.
function withBundle(prev: UseAnalyzeResult, next: BundleStatus): UseAnalyzeResult {
  return prev.bundle === next ? prev : { ...prev, bundle: next };
}

export function useAnalyze(
  image: ImageData | null,
  restored?: PersistedAnalysis | null,
): UseAnalyzeResult {
  const [state, setState] = useState<UseAnalyzeResult>(initial);

  // Subscribe to MediaPipe loader status so the UI can show "Loading face
  // detector…" vs "Analyzing…" appropriately.
  useEffect(() => {
    setState((prev) => withBundle(prev, getBundleStatus()));
    return subscribeBundleStatus((s) => {
      setState((prev) => withBundle(prev, s));
    });
  }, []);

  useEffect(() => {
    // A freshly-set image always wins over any restored report: the user
    // uploaded/selected something new, so re-run the pipeline.
    if (image) {
      let cancelled = false;
      setState((s) => ({ ...s, loading: true, error: null }));
      (async () => {
        try {
          const result = await detectFromImageData(image);
          if (cancelled) return;
          const landmarks = (result?.faceLandmarks?.[0] ?? null) as
            | LandmarkPoint[]
            | null;
          const report = analyze(result ?? null, image);
          if (cancelled) return;
          setState({
            report,
            landmarks,
            bundle: getBundleStatus(),
            loading: false,
            error: null,
          });
        } catch (err) {
          console.error(err);
          if (cancelled) return;
          setState({
            ...initial,
            bundle: getBundleStatus(),
            error:
              err instanceof Error
                ? err.message
                : "Could not analyze this image.",
          });
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // No new image: surface the persisted report from a previous session so
    // the page shows the last result instantly on refresh. Only when there is
    // genuinely nothing to show do we fall through to the idle state.
    if (restored) {
      setState({
        report: restored.report,
        landmarks: restored.landmarks,
        bundle: getBundleStatus(),
        loading: false,
        error: null,
      });
      return;
    }

    setState({ ...initial, bundle: getBundleStatus() });
  }, [image, restored]);

  return state;
}
