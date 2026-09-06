"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { ComparisonView } from "@/components/ComparisonView";
import { LoadingPanel } from "@/components/LoadingPanel";
import { HistoryStrip, type HistoryItem } from "@/components/HistoryStrip";
import { CopyButton } from "@/components/CopyButton";
import { formatComparisonReport } from "@/lib/share";
import { useAnalyze } from "@/lib/useAnalyze";
import { compareImages } from "@/lib/comparison";
import { scorecard } from "@/lib/scorecard";
import {
  clearAnalysis,
  loadHistory,
  loadLatestCompare,
  removeCompareEntry,
  savedAtLabel,
  saveComparePair,
  setStorageScope,
  type PersistedAnalysis,
  type PersistedCompareEntry,
} from "@/lib/persistence";
import {
  imageDataToDataURL,
  imageDataToThumbURL,
  loadImageFromUrl,
} from "@/lib/imageData";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser";
import { GitCompareArrows } from "lucide-react";

export default function ComparePage() {
  const [a, setA] = useState<ImageData | null>(null);
  const [b, setB] = useState<ImageData | null>(null);
  const [aImg, setAImg] = useState<HTMLImageElement | null>(null);
  const [bImg, setBImg] = useState<HTMLImageElement | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [restoredA, setRestoredA] = useState<PersistedAnalysis | null>(null);
  const [restoredB, setRestoredB] = useState<PersistedAnalysis | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [history, setHistory] = useState<PersistedCompareEntry[]>([]);

  const aR = useAnalyze(a, restoredA);
  const bR = useAnalyze(b, restoredB);

  const ready = !!aR.report && !!bR.report;
  const comparison = ready ? compareImages(aR.report!, bR.report!) : null;
  const aLoading = aR.loading;
  const bLoading = bR.loading;
  const anyLoading = aLoading || bLoading;
  const [scopeReady, setScopeReady] = useState(false);

  const refreshHistory = useCallback(() => {
    setHistory(loadHistory("compare") as PersistedCompareEntry[]);
  }, []);

  // Resolve the signed-in user before touching persisted history so each
  // account only ever sees its own photos in the history strip.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured()) {
        setScopeReady(true);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setStorageScope(data.user?.id ?? null);
      setScopeReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore the latest comparison from a previous session, if both sides exist.
  useEffect(() => {
    if (!scopeReady) return;
    const saved = loadLatestCompare();
    if (saved) {
      setRestoredA(saved.before);
      setRestoredB(saved.after);
      setActiveEntryId(saved.id);
      loadImageFromUrl(saved.before.image ?? saved.before.thumb)
        .then(setAImg)
        .catch(() => setAImg(null));
      loadImageFromUrl(saved.after.image ?? saved.after.thumb)
        .then(setBImg)
        .catch(() => setBImg(null));
    }
    refreshHistory();
  }, [scopeReady, refreshHistory]);

  // Persist a pair to the front of history once both sides have fresh analyses.
  useEffect(() => {
    if (!aR.report || !bR.report || !a || !b || !scopeReady) return;
    const entry = saveComparePair({
      before: {
        report: aR.report,
        landmarks: aR.landmarks,
        image: imageDataToDataURL(a),
        thumb: imageDataToThumbURL(a),
      },
      after: {
        report: bR.report,
        landmarks: bR.landmarks,
        image: imageDataToDataURL(b),
        thumb: imageDataToThumbURL(b),
      },
    });
    setActiveEntryId(entry.id);
    refreshHistory();
  }, [aR.report, aR.landmarks, a, bR.report, bR.landmarks, b, scopeReady, refreshHistory]);

  const handleRestore = useCallback((entry: PersistedCompareEntry) => {
    setA(null);
    setB(null);
    setAImg(null);
    setBImg(null);
    setRestoredA(entry.before);
    setRestoredB(entry.after);
    setActiveEntryId(entry.id);
    // Bump resetKey so both uploaders drop stale previews that disagree with
    // the restored pair being shown.
    setResetKey((k) => k + 1);
    loadImageFromUrl(entry.before.image ?? entry.before.thumb)
      .then(setAImg)
      .catch(() => setAImg(null));
    loadImageFromUrl(entry.after.image ?? entry.after.thumb)
      .then(setBImg)
      .catch(() => setBImg(null));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      removeCompareEntry(id);
      refreshHistory();
      if (activeEntryId === id) {
        const next = loadLatestCompare();
        setRestoredA(next?.before ?? null);
        setRestoredB(next?.after ?? null);
        setActiveEntryId(next?.id ?? null);
        setAImg(null);
        setBImg(null);
        if (next) {
          loadImageFromUrl(next.before.image ?? next.before.thumb)
            .then(setAImg)
            .catch(() => setAImg(null));
          loadImageFromUrl(next.after.image ?? next.after.thumb)
            .then(setBImg)
            .catch(() => setBImg(null));
        }
      }
    },
    [refreshHistory, activeEntryId],
  );

  const handleClearBoth = useCallback(() => {
    // Clear state directly (covers sample-loaded images, which never passed
    // through the uploader's preview) and bump resetKey so the uploaders also
    // reset their own previews.
    setA(null);
    setAImg(null);
    setB(null);
    setBImg(null);
    setRestoredA(null);
    setRestoredB(null);
    setActiveEntryId(null);
    clearAnalysis("compare");
    setHistory([]);
    setResetKey((k) => k + 1);
  }, []);

  const historyItems: HistoryItem[] = history.map((entry) => {
    const beforeScore = scorecard(entry.before.report);
    const afterScore = scorecard(entry.after.report);
    return {
      id: entry.id,
      thumbs: [entry.before.thumb, entry.after.thumb],
      title: `${beforeScore.overall.toFixed(1)} → ${afterScore.overall.toFixed(1)} / 10`,
      subtitle: savedAtLabel(entry.savedAt),
      active: activeEntryId === entry.id,
      onClick: () => handleRestore(entry),
      onDelete: () => handleDelete(entry.id),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Then vs Now</h1>
        <p className="mt-1 text-sm text-white/55">
          Drop the &quot;then&quot; photo on the left, the &quot;now&quot; photo on the right.
          Chizle aligns the measurements and surfaces what changed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Label color="bg-white/15">Image A · Past</Label>
          <ImageUploader
            onImage={(d, img) => {
              if (!d) {
                setA(null);
                setAImg(null);
                return;
              }
              setA(d);
              setAImg(img);
              setRestoredA(null);
              setActiveEntryId(null);
            }}
            label="Drop the older photo"
            hint="Front-facing, similar angle to the current photo works best."
            resetSignal={resetKey}
          />
        </div>
        <div className="space-y-3">
          <Label color="bg-accent-500">Image B · Current</Label>
          <ImageUploader
            onImage={(d, img) => {
              if (!d) {
                setB(null);
                setBImg(null);
                return;
              }
              setB(d);
              setBImg(img);
              setRestoredB(null);
              setActiveEntryId(null);
            }}
            label="Drop the current photo"
            hint="Try to match the lighting and angle of the past photo."
            resetSignal={resetKey}
          />
        </div>
      </div>

      {(a || b || restoredA || restoredB) && (
        <button
          type="button"
          onClick={handleClearBoth}
          className="btn-secondary"
        >
          Clear both
        </button>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <LoadingPanel loading={aLoading} bundle={aR.bundle} variant="compare" />
        <LoadingPanel loading={bLoading} bundle={bR.bundle} variant="compare" />
      </div>

      {(aR.error || bR.error) && (
        <div className="grid gap-3 md:grid-cols-2">
          {aR.error && (
            <div className="card p-4 text-sm text-red-300">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Image A failed
              </p>
              <p className="mt-1">{aR.error}</p>
            </div>
          )}
          {bR.error && (
            <div className="card p-4 text-sm text-red-300">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Image B failed
              </p>
              <p className="mt-1">{bR.error}</p>
            </div>
          )}
        </div>
      )}

      {!ready && !anyLoading && !aR.error && !bR.error && (
        <div className="card flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5">
            <GitCompareArrows className="h-5 w-5 text-white/50" />
          </span>
          <p className="text-sm font-medium">Both photos needed to compare</p>
          <p className="max-w-md text-xs text-white/40">
            Differences in lighting, angle, and camera distance will register
            as &quot;regressions.&quot; Use shots taken in similar conditions.
          </p>
        </div>
      )}

      {ready && comparison && (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <CopyButton
              text={formatComparisonReport(comparison)}
              label="Copy report"
            />
          </div>
          <ComparisonView
            before={aR.report!}
            after={bR.report!}
            report={comparison}
            beforeImage={aImg}
            afterImage={bImg}
            restored={!!restoredA || !!restoredB}
          />
        </div>
      )}

      <HistoryStrip items={historyItems} />
    </div>
  );
}

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs font-medium uppercase tracking-wider text-white/50">
        {children}
      </span>
    </div>
  );
}
