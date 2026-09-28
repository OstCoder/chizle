"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ScanFace,
  TrendingUp,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { TactileButton } from "@/components/motion";
import { cn } from "@/lib/utils";

// One-shot flag, browser-local (same convention as chizle:theme): a
// first-time visitor sees the tour exactly once, on whichever page they
// land first (landing or dashboard), and never again on any device sync.
const STORAGE_KEY = "chizle:tour:v1";

// Let the page paint first so the tour lands on a beat, not mid-render.
const SHOW_DELAY_MS = 1000;

interface TourStep {
  icon: LucideIcon;
  tint: string; // icon tile colors — one accent per pillar
  kicker: string;
  title: string;
  body: string;
  points: string[];
}

/**
 * The three things Chizle wants a first-time visitor to know: scans are
 * analyzed on-device, the scan builds a daily habit routine, and progress
 * is charted over time. Mirrors the StreakNpsPrompt modal shell (backdrop
 * click / Escape dismiss, framer-motion rise) so overlays feel like one
 * family.
 */
const STEPS: TourStep[] = [
  {
    icon: ScanFace,
    tint: "bg-emerald-500/10 text-emerald-300",
    kicker: "On-device analysis",
    title: "Your scan never leaves this device",
    body: "Chizle maps 468 facial landmarks and scores symmetry, ratios, posture, and expression with MediaPipe — right inside your browser tab.",
    points: [
      "No uploads: your photo stays in this browser's storage",
      "Works offline once the app has loaded",
    ],
  },
  {
    icon: CalendarCheck,
    tint: "bg-sky-500/10 text-sky-300",
    kicker: "Daily habits",
    title: "A short routine built from your scan",
    body: "Your results turn into a daily checklist of the tweaks that actually move your read — skincare, grooming, and expression drills aimed at your weakspots.",
    points: [
      "One tap to check off today's routine",
      "Streaks keep the habit from slipping",
    ],
  },
  {
    icon: TrendingUp,
    tint: "bg-accent-500/15 text-accent-300",
    kicker: "Progress tracking",
    title: "Watch the trend move, week over week",
    body: "Symmetry, jawline sharpness, and skin clarity are charted across every scan, so progress is a line you can point at — not a guess.",
    points: [
      "Tap any point on the timeline to revisit that day's scan",
      "Compare any two scans side by side",
    ],
  },
];

function alreadySeen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // quota / privacy mode — fail open to showing it once per mount
  }
}

function markSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* quota / privacy mode */
  }
}

export function FirstRunTour() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Auth and the profile wizard run their own flow — the tour waits until
  // the visitor is actually looking at the product (landing or dashboard),
  // and doesn't burn its one-shot flag in the meantime.
  const skippedRoute =
    pathname.startsWith("/auth") || pathname.startsWith("/onboarding");

  useEffect(() => {
    if (skippedRoute || alreadySeen()) return;
    // Persist at show time (inside the timer) so StrictMode's double-effect
    // still schedules exactly one show, and a remount/navigation after the
    // flag is written can never re-show it.
    const timer = window.setTimeout(() => {
      markSeen();
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [skippedRoute]);

  // Escape dismisses (same contract as StreakNpsPrompt).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
        >
          {/* Backdrop: click away to dismiss (the flag already exists, so
              it never comes back). */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={close}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="first-run-tour-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Skip the tour"
              className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white/75"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="pr-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
              Welcome to Chizle
            </p>

            {/* Fixed-height step area so the footer never jumps between
                steps while the content slides. */}
            <div className="mt-4 min-h-[210px]" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-xl",
                      current.tint,
                    )}
                  >
                    <current.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-3.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
                    {current.kicker} · Step {step + 1} of {STEPS.length}
                  </p>
                  <h2
                    id="first-run-tour-title"
                    className="mt-1 text-lg font-semibold leading-snug tracking-tight text-white"
                  >
                    {current.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                    {current.body}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {current.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-xs leading-relaxed text-white/50"
                      >
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400"
                          aria-hidden="true"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              {/* Step dots — clickable to jump between pillars. */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <button
                    key={s.kicker}
                    type="button"
                    onClick={() => setStep(i)}
                    aria-label={`Go to step ${i + 1}: ${s.kicker}`}
                    aria-current={i === step ? "step" : undefined}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-200",
                      i === step
                        ? "w-5 bg-accent-400"
                        : "w-1.5 bg-white/20 hover:bg-white/45",
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {step > 0 && (
                  <TactileButton
                    type="button"
                    onClick={() => setStep((n) => n - 1)}
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                  >
                    Back
                  </TactileButton>
                )}
                <TactileButton
                  type="button"
                  onClick={() => (last ? close() : setStep((n) => n + 1))}
                  className="btn-primary !px-4 !py-2 text-xs"
                >
                  {last ? "Get started" : "Next"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </TactileButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
