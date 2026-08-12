"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { ScorecardView } from "@/components/ScorecardView";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SamplePicker } from "@/components/SamplePicker";
import { HistoryStrip, type HistoryItem } from "@/components/HistoryStrip";
import { formatScorecardReport } from "@/lib/share";
import { useAnalyze } from "@/lib/useAnalyze";
import {
  clearAnalysis,
  loadHistory,
  loadLatest,
  removeHistoryEntry,
  savedAtLabel,
  saveAnalysis,
  type PersistedAnalysis,
} from "@/lib/persistence";
import {
  imageDataToDataURL,
  imageDataToThumbURL,
  loadImageFromUrl,
} from "@/lib/imageData";
import { cap } from "@/lib/utils";
import { scorecard } from "@/lib/scorecard";
import type { ScorecardMode } from "@/types/analysis";
import { Smartphone, Sparkles, Users } from "lucide-react";

const MODE_STORAGE_KEY = "chizle:v2:scorecard-mode";

/**
 * Reads the persisted mode. Kept out of the useState initializer because the
 * page is statically prerendered: reading localStorage during the lazy init
 * would make the hydrated DOM disagree with the server HTML (hydration
 * mismatch). Instead we start at the safe default and apply the stored value
 * in an effect after mount.
 */
function readStoredMode(): ScorecardMode {
  if (typeof window === "undefined") return "app";
  try {
    const raw = window.localStorage.getItem(MODE_STORAGE_KEY);
    return raw === "irl" ? "irl" : "app";
  } catch {
    return "app";
  }
}

export default function ScorecardPage() {
  const [image, setImage] = useState<ImageData | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [restored, setRestored] = useState<PersistedAnalysis | null>(null);
  const [history, setHistory] = useState<PersistedAnalysis[]>([]);
  const [mode, setMode] = useState<ScorecardMode>("app");
  const { report, landmarks, bundle, loading, error } = useAnalyze(
    image,
    restored,
  );
  const card = report ? scorecard(report, mode) : null;

  // Apply the persisted mode after hydration (avoids SSR/client mismatch),
  // then remember future changes across sessions.
  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore quota / privacy-mode failures */
    }
  }, [mode]);

  const refreshHistory = useCallback(() => {
    setHistory(loadHistory("scorecard") as PersistedAnalysis[]);
  }, []);

  // Restore the latest scorecard analysis from a previous session, if any.
  useEffect(() => {
    const saved = loadLatest("scorecard");
    if (saved) {
      setRestored(saved);
      loadImageFromUrl(saved.image ?? saved.thumb)
        .then(setImgEl)
        .catch((err) => {
          console.warn("[chizle] could not restore saved image", err);
          setImgEl(null);
        });
    }
    refreshHistory();
  }, [refreshHistory]);

  // Persist the freshest scorecard analysis to the front of the history.
  useEffect(() => {
    if (!report || !image) return;
    saveAnalysis("scorecard", {
      report,
      landmarks,
      image: imageDataToDataURL(image),
      thumb: imageDataToThumbURL(image),
    });
    refreshHistory();
  }, [report, landmarks, image, refreshHistory]);

  const handleRestore = useCallback((entry: PersistedAnalysis) => {
    setImage(null);
    setImgEl(null);
    setRestored(entry);
    // Bump resetKey so the uploader drops any stale preview that disagrees
    // with the analysis being shown.
    setResetKey((k) => k + 1);
    loadImageFromUrl(entry.image ?? entry.thumb)
      .then(setImgEl)
      .catch((err) => {
        console.warn("[chizle] could not restore image", err);
        setImgEl(null);
      });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      removeHistoryEntry("scorecard", id);
      refreshHistory();
      if (restored?.id === id) {
        const next = loadLatest("scorecard");
        setRestored(next);
        setImgEl(null);
        if (next) {
          loadImageFromUrl(next.image ?? next.thumb)
            .then(setImgEl)
            .catch(() => setImgEl(null));
        }
      }
    },
    [refreshHistory, restored],
  );

  const handleClear = useCallback(() => {
    setImage(null);
    setImgEl(null);
    setRestored(null);
    clearAnalysis("scorecard");
    setHistory([]);
    setResetKey((k) => k + 1);
  }, []);

  const historyItems: HistoryItem[] = history.map((entry) => {
    const sc = scorecard(entry.report, mode);
    return {
      id: entry.id,
      thumbs: [entry.thumb],
      title: `${sc.overall.toFixed(1)}/10 · ${cap(sc.verdict.bucket)}`,
      subtitle: savedAtLabel(entry.savedAt),
      active: restored?.id === entry.id,
      onClick: () => handleRestore(entry),
      onDelete: () => handleDelete(entry.id),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dating profile scorecard
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/55">
          Score a photo the way it will actually be judged. Choose{" "}
          <span className="text-white/75">Dating app</span> to grade lighting,
          filters, and technical quality — or{" "}
          <span className="text-white/75">Real life</span> to drop lighting
          entirely and grade grooming and presence instead. Your choice is
          remembered on this device.
        </p>

        <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setMode("app")}
            aria-pressed={mode === "app"}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              mode === "app"
                ? "bg-accent-500/15 text-accent-200 shadow-sm ring-1 ring-inset ring-accent-400/30"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Dating app
          </button>
          <button
            type="button"
            onClick={() => setMode("irl")}
            aria-pressed={mode === "irl"}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              mode === "irl"
                ? "bg-accent-500/15 text-accent-200 shadow-sm ring-1 ring-inset ring-accent-400/30"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Real life
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <div className="space-y-3">
          <ImageUploader
            onImage={(d, img) => {
              if (!d) {
                setImage(null);
                setImgEl(null);
                return;
              }
              setImage(d);
              setImgEl(img);
              setRestored(null);
            }}
            label="Drop the dating app photo"
            hint="Front-facing, single subject, clear background."
            resetSignal={resetKey}
          />
          {!image && !restored && (
            <SamplePicker
              samples={[
                {
                  id: "sample-1",
                  src: "/test-faces/IMG_5735.jpg",
                  label: "Sample photo 1",
                  hint: "Soft daylight, front-facing",
                },
                {
                  id: "sample-2",
                  src: "/test-faces/IMG_6399.jpg",
                  label: "Sample photo 2",
                  hint: "Brighter outdoor light",
                },
              ]}
              slotLabel="Score this"
              onSample={(data, img) => {
                setImage(data);
                setImgEl(img);
                setRestored(null);
              }}
            />
          )}
          {(image || restored) && (
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary w-full"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-3">
          {!image && !restored && (
            <div className="card flex h-full min-h-[260px] flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5">
                <Sparkles className="h-5 w-5 text-white/50" />
              </span>
              <p className="text-sm font-medium">No image yet</p>
              <p className="max-w-xs text-xs text-white/40">
                Test the photo you&apos;d actually upload — filters and angles
                included.
              </p>
              {bundle === "loading" && (
                <p className="mt-2 text-xs text-accent-300">
                  Warming up the face detector in the background…
                </p>
              )}
            </div>
          )}
          {!image && restored && (
            <div className="card flex h-full min-h-[260px] flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5">
                <Sparkles className="h-5 w-5 text-white/50" />
              </span>
              <p className="text-sm font-medium">Restored last scorecard</p>
              <p className="max-w-xs text-xs text-white/40">
                Your last result survived the refresh ({" "}
                {savedAtLabel(restored.savedAt) ?? "from a previous session"}
                ). Upload a new photo or clear to start over.
              </p>
            </div>
          )}
          <LoadingPanel loading={loading} bundle={bundle} variant="scorecard" />
          {error && (
            <div className="card p-5 text-sm text-red-300">{error}</div>
          )}
          {report && card && (
            <div className="card p-5">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  Quick read
                </h2>
                <div className="ml-auto flex items-center gap-2">
                  {restored && !image && (
                    <span className="chip bg-white/5 text-white/50">
                      Restored
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-white/75">{report.summary}</p>
            </div>
          )}
        </div>
      </div>

      {card && (
        <div className="pt-2">
          <ScorecardView
            report={card}
            image={imgEl}
            copyText={formatScorecardReport(card)}
          />
        </div>
      )}

      <HistoryStrip items={historyItems} />
    </div>
  );
}
