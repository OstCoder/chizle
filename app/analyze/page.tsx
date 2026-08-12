"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { AnalysisView } from "@/components/AnalysisView";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SamplePicker } from "@/components/SamplePicker";
import { HistoryStrip, type HistoryItem } from "@/components/HistoryStrip";
import { CopyButton } from "@/components/CopyButton";
import { formatAnalysisReport } from "@/lib/share";
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
import { HAIR_COLOR_LABEL, hairTextureLabel } from "@/lib/hair";
import { ScanFace, Sparkles } from "lucide-react";

const SAMPLES = [
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
];

export default function AnalyzePage() {
  const [image, setImage] = useState<ImageData | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [restored, setRestored] = useState<PersistedAnalysis | null>(null);
  const [history, setHistory] = useState<PersistedAnalysis[]>([]);
  const { report, landmarks, bundle, loading, error } = useAnalyze(
    image,
    restored,
  );

  const refreshHistory = useCallback(() => {
    setHistory(loadHistory("analyze") as PersistedAnalysis[]);
  }, []);

  // Restore the latest analysis from a previous session, if any.
  useEffect(() => {
    const saved = loadLatest("analyze");
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

  // Persist the freshest analysis to the front of the history.
  useEffect(() => {
    if (!report || !image) return;
    saveAnalysis("analyze", {
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
      removeHistoryEntry("analyze", id);
      refreshHistory();
      // If the deleted entry was the one being shown, fall back to the new
      // latest (or nothing).
      if (restored?.id === id) {
        const next = loadLatest("analyze");
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
    clearAnalysis("analyze");
    setHistory([]);
    setResetKey((k) => k + 1);
  }, []);

  const historyItems: HistoryItem[] = history.map((entry) => ({
    id: entry.id,
    thumbs: [entry.thumb],
    title: `${cap(entry.report.shape)} · Sym ${Math.round(
      entry.report.symmetry.overall,
    )}`,
    subtitle: savedAtLabel(entry.savedAt),
    active: restored?.id === entry.id,
    onClick: () => handleRestore(entry),
    onDelete: () => handleDelete(entry.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Analyze a photo
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/55">
          Drop a front-facing photo. Chizle maps 468 landmarks, scores
          symmetry, ratios, posture, and expression, reads your hair type, and
          returns prioritized fixes — ordered from things you can do in the
          next shot to habits that build over time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <div className="space-y-3">
          <ImageUploader
            onImage={(data, img) => {
              if (!data) {
                setImage(null);
                setImgEl(null);
                return;
              }
              setImage(data);
              setImgEl(img);
              setRestored(null);
            }}
            resetSignal={resetKey}
          />
          {!image && !restored && (
            <SamplePicker
              samples={SAMPLES}
              slotLabel="Analyze this"
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
              Clear and start over
            </button>
          )}
        </div>

        <div className="space-y-3">
          {!image && !restored && (
            <div className="card flex h-full min-h-[260px] flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5">
                <ScanFace className="h-5 w-5 text-white/50" />
              </span>
              <p className="text-sm font-medium">No image yet</p>
              <p className="max-w-xs text-xs text-white/40">
                Your photo will be processed entirely in the browser. Nothing
                is uploaded.
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
                <ScanFace className="h-5 w-5 text-white/50" />
              </span>
              <p className="text-sm font-medium">Restored last analysis</p>
              <p className="max-w-xs text-xs text-white/40">
                Your last result survived the refresh ({" "}
                {savedAtLabel(restored.savedAt) ?? "from a previous session"}
                ). Upload a new photo or clear to start over.
              </p>
            </div>
          )}
          <LoadingPanel loading={loading} bundle={bundle} variant="analyze" />
          {error && (
            <div className="card p-5 text-sm text-red-300">{error}</div>
          )}
          {report && (image || restored) && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  Quick read
                </h2>
                <div className="ml-auto flex items-center gap-2">
                  {restored && !image && (
                    <span className="chip bg-white/5 text-white/50">
                      Restored
                    </span>
                  )}
                  <CopyButton
                    text={formatAnalysisReport(report)}
                    label="Copy report"
                  />
                </div>
              </div>
              <p className="text-sm text-white/80">{report.summary}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat label="Shape" value={report.shape} />
                <Stat label="Symmetry" value={`${Math.round(report.symmetry.overall)}/100`} />
                <Stat label="Smile" value={`${report.smile.score}/100`} />
                <Stat label="Angle" value={report.angle} />
                <Stat
                  label="Photo quality"
                  value={
                    report.imageQuality.quality === "good"
                      ? "Good"
                      : report.imageQuality.quality === "ok"
                        ? "OK"
                        : "Poor"
                  }
                />
                <Stat
                  label="Hair"
                  value={
                    report.hair?.visible
                      ? `${hairTextureLabel(report.hair)} · ${HAIR_COLOR_LABEL[report.hair.color]}`
                      : "Not in frame"
                  }
                />
              </div>
              {report.imageQuality.reason && (
                <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-white/65">
                  <span className="font-medium text-amber-200">
                    Quality flags:
                  </span>{" "}
                  {report.imageQuality.reason}
                </p>
              )}
              <p className="mt-4 text-xs text-white/40">
                Scroll for the full breakdown below.
              </p>
            </div>
          )}
        </div>
      </div>

      {report && imgEl && (
        <div className="pt-2">
          <AnalysisView report={report} image={imgEl} landmarks={landmarks} />
        </div>
      )}

      <HistoryStrip items={historyItems} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium capitalize text-white/85">
        {value}
      </div>
    </div>
  );
}
