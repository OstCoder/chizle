"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Beaker,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  FlaskConical,
  Loader2,
  Play,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { testGallery } from "@/data/test-gallery";
import {
  fileToDataURL,
  imageToImageData,
  loadImageFromUrl,
} from "@/lib/imageData";
import {
  buildExpectedRanges,
  evaluateFixture,
  serializeExpected,
  type FixtureExpected,
  type FixtureResult,
} from "@/lib/testGallery";
import { IMAGE_QUALITY_TIPS } from "@/lib/diagnostics";
import type { AnalysisReport, ImageChecks } from "@/types/analysis";
import {
  detectFromImageData,
  getBundleStatus,
  subscribeBundleStatus,
  type BundleStatus,
} from "@/lib/mediapipe";
import { analyze } from "@/lib/analysis";

export default function TestGalleryPage() {
  const [bundleStatus, setBundleStatus] = useState<BundleStatus>(
    getBundleStatus(),
  );
  const [results, setResults] = useState<FixtureResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeBundleStatus(setBundleStatus);
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    try {
      const out: FixtureResult[] = [];
      for (const fixture of testGallery.fixtures) {
        const img = await loadImageFromUrl(fixture.image);
        const imageData = imageToImageData(img);
        const raw = await detectFromImageData(imageData);
        const report = analyze(raw ?? null, imageData);
        out.push(evaluateFixture(fixture, report));
      }
      setResults(out);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, []);

  // Auto-run on mount once we're in a runnable state. We deliberately allow
  // `idle` here — running the first fixture is what warms the bundle, and the
  // condition would otherwise deadlock the page for users landing on /test-
  // gallery without first visiting /analyze. `loading` is excluded so we
  // don't fire again mid-warm while the singleton is being touched.
  useEffect(() => {
    if (
      bundleStatus !== "loading" &&
      !results &&
      !running &&
      !error
    ) {
      void runAll();
    }
  }, [bundleStatus, results, running, error, runAll]);

  const summary = useMemo(
    () =>
      summarize(results, bundleStatus, running, error),
    [results, bundleStatus, running, error],
  );

  const isBusy = running || bundleStatus === "loading";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-accent-400" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Test gallery
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-white/55">
            Runs the analysis pipeline against {testGallery.fixtures.length}{" "}
            fixed fixtures and reports pass/fail per assertion. Use this to
            catch regressions in the lighting, face, and weakspot pipelines
            before they reach the UI.
          </p>
        </div>
        <button
          type="button"
          onClick={runAll}
          disabled={isBusy}
          className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {running ? "Running…" : "Re-run"}
        </button>
      </header>

      <StatusBanner
        title={summary.title}
        detail={summary.detail}
        tone={summary.tone}
      />

      <CalibrationSection bundleStatus={bundleStatus} />

      {results && (
        <div className="grid gap-4">
          {results.map((r) => (
            <FixtureCard key={r.fixture.id} result={r} />
          ))}
        </div>
      )}

      <Docs />
    </div>
  );
}

interface SummaryState {
  title: string;
  detail: string;
  tone: "error" | "busy" | "info" | "success";
}

function summarize(
  results: FixtureResult[] | null,
  bundleStatus: BundleStatus,
  running: boolean,
  error: string | null,
): SummaryState {
  if (error) {
    return { title: "Run failed", detail: error, tone: "error" };
  }
  if (bundleStatus === "loading") {
    return {
      title: "Loading face detector…",
      detail:
        "First run only — about 36 MB of model assets. Subsequent fixtures share this singleton.",
      tone: "busy",
    };
  }
  if (running) {
    const idx = results?.length ?? 0;
    return {
      title: `Running fixture ${idx + 1} of ${testGallery.fixtures.length}…`,
      detail: "Each fixture reuses the warmed-up MediaPipe bundle.",
      tone: "busy",
    };
  }
  if (!results || results.length === 0) {
    return {
      title: "Waiting for the analyzer to settle…",
      detail: "Will start automatically once MediaPipe is ready.",
      tone: "info",
    };
  }
  const total = results.length;
  const passing = results.filter((r) => r.passed).length;
  return {
    title:
      passing === total
        ? `All ${total} fixtures passing 🎉`
        : `${passing} of ${total} fixtures passing`,
    detail:
      passing === total
        ? "Pipeline stable against the bundled fixtures."
        : "See highlighted rows below for failing assertions.",
    tone: passing === total ? "success" : "info",
  };
}

function StatusBanner({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: "error" | "busy" | "info" | "success";
}) {
  const accent =
    tone === "error"
      ? "border-red-500/40 bg-red-500/5"
      : tone === "success"
        ? "border-emerald-500/40 bg-emerald-500/5"
        : tone === "busy"
          ? "border-accent-500/40 bg-accent-500/5"
          : "border-white/10 bg-white/[0.02]";
  const Icon =
    tone === "error"
      ? TriangleAlert
      : tone === "busy"
        ? Loader2
        : tone === "success"
          ? FlaskConical
          : FlaskConical;
  return (
    <div className={`card flex items-start gap-3 border p-4 ${accent}`}>
      <Icon
        className={
          "mt-0.5 h-4 w-4 shrink-0 " +
          (tone === "busy"
            ? "animate-spin text-accent-300"
            : tone === "error"
              ? "text-red-300"
              : tone === "success"
                ? "text-emerald-300"
                : "text-white/55")
        }
      />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-white/85">{title}</p>
        <p className="text-xs text-white/55">{detail}</p>
      </div>
    </div>
  );
}

function FixtureCard({ result }: { result: FixtureResult }) {
  const [open, setOpen] = useState(false);
  const failing = result.assertions.filter((a) => !a.passed).length;

  return (
    <article className="card overflow-hidden">
      <div className="grid gap-4 md:grid-cols-[180px,1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.fixture.image}
          alt={result.fixture.name}
          className="h-44 w-full bg-white/[0.03] object-cover"
        />
        <div className="flex flex-col gap-3 p-4 pt-4 md:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold leading-tight">
                {result.fixture.name}
              </h3>
              <p className="text-xs text-white/50">
                {result.fixture.description}
              </p>
            </div>
            <span
              className={
                "chip flex items-center gap-1.5 " +
                (result.passed
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-red-400/30 bg-red-500/10 text-red-200")
              }
            >
              {result.passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {result.passed
                ? "All assertions"
                : `${failing} of ${result.assertions.length} failing`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/60 hover:bg-white/[0.04]"
          >
            <span>
              {result.assertions.length} assertion
              {result.assertions.length === 1 ? "" : "s"}
            </span>
            {open ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {open && <AssertionList assertions={result.assertions} />}

          {result.report.summary && (
            <blockquote className="rounded-lg border-l-2 border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-white/60">
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-white/30">
                Analyzer summary
              </span>
              {result.report.summary}
            </blockquote>
          )}
          {result.report.imageQuality.quality !== "good" && (
            <FailureDiagnostics
              imageQuality={result.report.imageQuality}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function AssertionList({ assertions }: { assertions: FixtureResult["assertions"] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/5">
      <table className="w-full text-left text-xs">
        <thead className="bg-white/[0.02] text-white/45">
          <tr>
            <th className="px-3 py-2 font-medium">Key</th>
            <th className="px-3 py-2 font-medium">Expected</th>
            <th className="px-3 py-2 font-medium">Actual</th>
            <th className="px-3 py-2 font-medium text-right">Pass</th>
          </tr>
        </thead>
        <tbody>
          {assertions.map((a) => (
            <tr
              key={a.key}
              className={
                a.passed ? "text-white/75" : "bg-red-500/5 text-red-100"
              }
            >
              <td className="px-3 py-2 font-mono">{a.key}</td>
              <td className="px-3 py-2 font-mono text-white/55">
                {a.expected}
              </td>
              <td className="px-3 py-2 font-mono">{a.actual}</td>
              <td className="px-3 py-2 text-right">
                {a.passed ? (
                  <Check className="ml-auto h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <X className="ml-auto h-3.5 w-3.5 text-red-300" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalibrationSection({
  bundleStatus,
}: {
  bundleStatus: BundleStatus;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setReport(null);
    setError(null);
    setRunning(true);
    setCopied(false);
    setPreviewUrl(null);
    try {
      const dataUrl = await fileToDataURL(f);
      setPreviewUrl(dataUrl);
      const img = await loadImageFromUrl(dataUrl);
      const imageData = imageToImageData(img);
      const raw = await detectFromImageData(imageData);
      const rep = analyze(raw ?? null, imageData);
      setReport(rep);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, []);

  const expected = useMemo(
    () => (report ? buildExpectedRanges(report) : null),
    [report],
  );

  const onCopy = useCallback(async () => {
    if (!expected) return;
    try {
      const json = serializeExpected(expected);
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("clipboard write failed", err);
      setError(
        "Clipboard write failed — copy the JSON manually from the block below.",
      );
    }
  }, [expected]);

  return (
    <section className="card space-y-4 p-5">
      <header>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">
            Calibrate on your photo
          </h2>
          <p className="max-w-2xl text-xs text-white/50">
            Drop a front-facing photo to capture real measurements. Runs the
            full MediaPipe pipeline (blendshapes + 3D pose + 3D depth) and
            surfaces the live metrics with reasonable tolerances — ready to
            paste into{" "}
            <code className="font-mono text-accent-300">
              data/test-gallery.ts
            </code>
            .
          </p>
          <MediaPipeHint status={bundleStatus} />
        </div>
      </header>

      <label className="block">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <div className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 px-6 py-7 text-sm transition-colors hover:border-white/20 hover:bg-white/[0.02]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
            <Camera className="h-4 w-4 text-white/70" />
          </span>
          <span className="text-white/70">
            {running
              ? "Analyzing…"
              : file
                ? "Choose another photo"
                : "Drop or upload a front-facing photo"}
          </span>
        </div>
      </label>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {report && expected && previewUrl && (
        <div className="grid gap-4 md:grid-cols-[180px,1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Calibration photo"
            className="h-44 w-full rounded-lg border border-white/5 bg-white/[0.03] object-cover"
          />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
              Live measurements
            </h3>
            <CalibrationSnapshot report={report} />
            {report.summary && (
              <blockquote className="rounded-lg border-l-2 border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-white/60">
                <span className="mb-1 block text-[10px] uppercase tracking-wider text-white/30">
                  Analyzer summary
                </span>
                {report.summary}
              </blockquote>
            )}
          </div>
        </div>
      )}

      {report && expected && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
              Suggested expected ranges
            </h3>
            <button
              type="button"
              onClick={onCopy}
              disabled={copied}
              className="btn-secondary flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" /> Copied
                </>
              ) : (
                <>
                  <Clipboard className="h-3.5 w-3.5" /> Copy as fixture JSON
                </>
              )}
            </button>
          </div>
          {report.ratios.faceLength === 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-white/70">
              <TriangleAlert className="mr-1.5 inline h-3.5 w-3.5 -translate-y-0.5 text-amber-300" />
              <strong className="text-amber-200">
                No face detected.
              </strong>{" "}
              This calibration captures{" "}
              <em>lighting only</em> — pasting it as a fixture will exercise
              the no-face code path (emptyReport). For a real-face fixture,
              re-run with a front-facing photo where the analyzer summary
              above mentions a face.
            </div>
          )}
          <p className="text-xs text-white/45">
            Paste this object into a new fixture entry in{" "}
            <code className="font-mono text-accent-300">
              data/test-gallery.ts
            </code>
            . The browser and CLI agree within ±0.01 on most metrics now, so
            leave the suggested ranges as-is for the first pass.
          </p>
          <CalibrationReadout report={report} expected={expected} />
          <details className="overflow-hidden rounded-lg border border-white/5">
            <summary className="cursor-pointer border-b border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/60 hover:text-white/85">
              Show raw JSON
            </summary>
            <pre className="max-h-96 overflow-auto bg-white/[0.03] p-3 font-mono text-xs leading-relaxed text-white/85">
              {serializeExpected(expected)}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}

// Demoted from a prominent BadgeChip to a one-time inline hint now that the
// model is reliable: when MediaPipe warms up, show a single subtle line of
// text below the section title; auto-fade to nothing once `ready` so the
// calibration workspace isn't cluttered with dev-only status. The
// `Loading face detector…` summary banner at the top of the page still
// surfaces progress during the cold start.
function MediaPipeHint({ status }: { status: BundleStatus }) {
  if (status === "ready") return null;
  return (
    <p className="flex items-center gap-1.5 text-[10px] text-white/40">
      {status === "loading" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Warming up MediaPipe — one-time, ~36 MB.
        </>
      ) : (
        <>
          <FlaskConical className="h-3 w-3" />
          Click or drop a photo to begin.
        </>
      )}
    </p>
  );
}

function CalibrationSnapshot({ report }: { report: AnalysisReport }) {
  const rows: Array<[string, string]> = [
    ["shape", report.shape],
    ["angle", report.angle],
    ["symmetry", `${report.symmetry.overall.toFixed(1)} / 100`],
    ["smile", `${report.smile.score} / 100`],
    ["thirds balance", `${(report.ratios.thirdsBalance * 100).toFixed(0)}%`],
    ["facial index", report.ratios.facialIndex.toFixed(2)],
    [
      "yaw / pitch / roll",
      `${Math.abs(report.posture.yawDeg).toFixed(0)}\u00b0 / ` +
        `${Math.abs(report.posture.pitchDeg).toFixed(0)}\u00b0 / ` +
        `${Math.abs(report.posture.rollDeg).toFixed(0)}\u00b0`,
    ],
    ["chin projection", report.ratios.chinProjection.toFixed(3)],
    ["light evenness", report.light.evenness.toFixed(2)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
        >
          <dt className="text-[10px] uppercase tracking-wider text-white/40">
            {k}
          </dt>
          <dd className="mt-0.5 font-mono text-white/85">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function FailureDiagnostics({
  imageQuality,
}: {
  imageQuality: ImageChecks;
}) {
  const reasons = (imageQuality.reason ?? "")
    .split(";")
    .map((r) => r.trim())
    .filter(Boolean);
  if (reasons.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2">
        <TriangleAlert className="h-3.5 w-3.5 text-amber-300" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">
          Why this fixture failed
        </h4>
      </div>
      <ul className="mt-2 space-y-1.5">
        {reasons.map((r) => (
          <li
            key={r}
            className="text-xs leading-relaxed text-white/70"
          >
            <strong className="text-amber-200">{r}.</strong>{" "}
            {((IMAGE_QUALITY_TIPS as Record<string, string>)[r] ?? (
              <span className="text-white/45">
                Try uploading a clearer front-facing photo.
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CalibrationRow {
  label: string;
  actual: string;
  rangeText: string;
}

interface CalibrationSection {
  title: string;
  rows: CalibrationRow[];
}

function buildCalibrationSections(
  report: AnalysisReport,
  expected: FixtureExpected,
): CalibrationSection[] {
  const fmt = (n: number, digits = 2) => n.toFixed(digits);
  const range = (r?: [number, number]) =>
    r ? `${fmt(r[0])}–${fmt(r[1])}` : "—";
  return [
    {
      title: "Lighting",
      rows: [
        {
          label: "Brightness",
          actual: fmt(report.light.brightness, 1),
          rangeText: range(expected.light?.brightness),
        },
        {
          label: "Contrast",
          actual: fmt(report.light.contrast),
          rangeText: range(expected.light?.contrast),
        },
        {
          label: "Evenness",
          actual: fmt(report.light.evenness),
          rangeText: range(expected.light?.evenness),
        },
        {
          label: "Sharpness",
          actual: fmt(report.light.sharpness),
          rangeText: range(expected.light?.sharpness),
        },
      ],
    },
    {
      title: "Shape & Angle",
      rows: [
        {
          label: "Shape",
          actual: report.shape,
          rangeText: expected.shape ?? "—",
        },
        {
          label: "Angle",
          actual: report.angle,
          rangeText: expected.angle ?? "—",
        },
      ],
    },
    {
      title: "Symmetry",
      rows: [
        {
          label: "Overall (/100)",
          actual: fmt(report.symmetry.overall, 1),
          rangeText: range(expected.symmetry?.overall),
        },
        {
          label: "Eye level",
          actual: fmt(report.symmetry.eyeLevel, 1),
          rangeText: range(expected.symmetry?.eyeLevel),
        },
        {
          label: "Lip level",
          actual: fmt(report.symmetry.lipLevel, 1),
          rangeText: range(expected.symmetry?.lipLevel),
        },
      ],
    },
    {
      title: "Smile",
      rows: [
        {
          label: "Score (/100)",
          actual: String(report.smile.score),
          rangeText: range(expected.smile?.score),
        },
        {
          label: "Smile left",
          actual: fmt(report.smile.smileLeft),
          rangeText: range(expected.smile?.smileLeft),
        },
        {
          label: "Smile right",
          actual: fmt(report.smile.smileRight),
          rangeText: range(expected.smile?.smileRight),
        },
        {
          label: "Detected",
          actual: String(report.smile.detected),
          rangeText:
            expected.smile?.detected === undefined
              ? "—"
              : String(expected.smile.detected),
        },
      ],
    },
    {
      title: "Ratios",
      rows: [
        {
          label: "Facial index",
          actual: fmt(report.ratios.facialIndex),
          rangeText: range(expected.ratios?.facialIndex),
        },
        {
          label: "Jawline angle (°)",
          actual: fmt(report.ratios.jawlineAngle, 1),
          rangeText: range(expected.ratios?.jawlineAngle),
        },
        {
          label: "Thirds balance",
          actual: fmt(report.ratios.thirdsBalance),
          rangeText: range(expected.ratios?.thirdsBalance),
        },
        {
          label: "Chin projection",
          actual: fmt(report.ratios.chinProjection, 3),
          rangeText: range(expected.ratios?.chinProjection),
        },
        {
          label: "Midface projection",
          actual: fmt(report.ratios.midfaceProjection, 3),
          rangeText: range(expected.ratios?.midfaceProjection),
        },
        {
          label: "Landmarks confidence",
          actual: fmt(report.ratios.landmarksConfidence),
          rangeText: range(expected.ratios?.landmarksConfidence),
        },
      ],
    },
    {
      title: "Posture",
      rows: [
        {
          label: "Yaw abs (°)",
          actual: fmt(Math.abs(report.posture.yawDeg), 1),
          rangeText: range(expected.posture?.yawAbs),
        },
        {
          label: "Pitch abs (°)",
          actual: fmt(Math.abs(report.posture.pitchDeg), 1),
          rangeText: range(expected.posture?.pitchAbs),
        },
        {
          label: "Roll abs (°)",
          actual: fmt(Math.abs(report.posture.rollDeg), 1),
          rangeText: range(expected.posture?.rollAbs),
        },
        {
          label: "Head tilt abs (°)",
          actual: fmt(Math.abs(report.posture.headTiltDeg), 1),
          rangeText: range(expected.posture?.headTiltAbs),
        },
      ],
    },
  ];
}

function CalibrationReadout({
  report,
  expected,
}: {
  report: AnalysisReport;
  expected: FixtureExpected;
}) {
  const sections = buildCalibrationSections(report, expected);
  return (
    <div className="space-y-1.5">
      {sections.map((section, idx) => (
        <details
          key={section.title}
          open={idx < 2}
          className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]"
        >
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 hover:bg-white/[0.04]">
            <span>{section.title}</span>
            <span className="text-[10px] font-normal normal-case tracking-normal text-white/40">
              {section.rows.length} metrics
            </span>
          </summary>
          <div className="overflow-hidden border-t border-white/5">
            <table className="w-full text-left text-xs">
              <tbody>
                {section.rows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <td className="py-1.5 pl-3 pr-3 font-medium text-white/70">
                      {row.label}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-white/95">
                      {row.actual}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-white/45">
                      <span className="text-[10px] text-white/35">
                        {row.rangeText === "—" ? "" : "in "}
                      </span>
                      {row.rangeText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}

function Docs() {
  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
        How to add a real-face fixture
      </h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-white/65">
        <li>
          Drop a JPEG/PNG into <code className="font-mono text-accent-300">/public/test-faces/</code>{" "}
          (front-facing, well-lit photos work best).
        </li>
        <li>
          Add a new entry in{" "}
          <code className="font-mono text-accent-300">data/test-gallery.ts</code>{" "}
          pointing at the new image and set{" "}
          <code className="font-mono">expected.hasFace = true</code>.
        </li>
        <li>
          Run the pipeline on the photo once with{" "}
          <code className="font-mono">{"expected: {}"}</code>{" "}
          and copy the actual values into your{" "}
          <code className="font-mono">expected</code> block. With the pipeline
          fix in place, the browser and CLI now agree within ±0.01 on every
          lighting metric and exactly on sharpness when clamped, so use
          starting tolerances appropriate to the metric&apos;s unit:
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/55">
            <li>
              <em>Fractions</em> (facialIndex, thirdsBalance, chinProjection,
              midfaceProjection, smileLeft/Right, light.evenness,
              light.contrast):{" "}
              <code className="font-mono">
                {"[actual - 0.05, actual + 0.05]"}
              </code>
            </li>
            <li>
              <em>Brightness</em> (light.brightness, 0–255 scale):{" "}
              <code className="font-mono">{"[actual - 3, actual + 3]"}</code>
            </li>
            <li>
              <em>Degrees</em> (posture yaw/pitch/roll, jawlineAngle,
              headTilt):{" "}
              <code className="font-mono">{"[actual - 3, actual + 3]"}</code>
            </li>
            <li>
              <em>Percentage scores</em> (symmetry.overall, symmetry.eyeLevel,
              symmetry.lipLevel, smile.score, 0–100):{" "}
              <code className="font-mono">{"[actual - 3, actual + 3]"}</code>
            </li>
            <li>
              <em>Categorical</em> (shape, angle): exact match — widen by
              dropping the assertion if your photo could read either side of
              a classifier boundary.
            </li>
          </ul>
        </li>
        <li>
          Re-run; the fixture should pass. Tighten further until something
          breaks — that is the regression boundary you care about.
        </li>
      </ol>
      <p className="text-xs text-white/40">
        The MediaPipe bundle is loaded once per session (~36 MB, ~5-10 s on
        first visit). Subsequent fixtures share the same singleton, so they
        run near-instantly.
      </p>
      <p className="text-xs text-white/40">
        Need to test interactive flows? Use{" "}
        <Link href="/analyze" className="text-accent-300 underline">
          /analyze
        </Link>
        ,{" "}
        <Link href="/compare" className="text-accent-300 underline">
          /compare
        </Link>
        , or{" "}
        <Link href="/scorecard" className="text-accent-300 underline">
          /scorecard
        </Link>
        .
      </p>
    </section>
  );
}
