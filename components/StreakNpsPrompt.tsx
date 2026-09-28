"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, PartyPopper, X } from "lucide-react";
import { TactileButton } from "@/components/motion";
import {
  HUB_UPDATED_EVENT,
  hubGet,
  hubSet,
  npsPromptRecordSchema,
  type NpsPromptRecord,
} from "@/lib/hub";
import { currentStreak } from "@/lib/streak";

// Hub key for the one-shot prompt record. Scoping is handled by hubGet/hubSet
// (chizle:hub:<uid>:…), so each account is asked at most once.
const RECORD_KEY = "nps-7d";
const NPS_STREAK = 7;

type Phase = "hidden" | "ask" | "thanks";

function loadRecord(userId: string): NpsPromptRecord | null {
  return hubGet<NpsPromptRecord | null>(
    userId,
    RECORD_KEY,
    null,
    npsPromptRecordSchema.nullable(),
  );
}

/**
 * Post-milestone recommendation prompt: the first time a user's streak
 * reaches 7 days, a gentle bottom card asks how likely they are to recommend
 * Chizle (0–10). The record is written the moment the prompt is shown, so it
 * can never interrupt twice — dismissing, navigating away, or never answering
 * all count as final. Purely local (works offline); the score lives in
 * per-user localStorage next to the trackers.
 */
export function StreakNpsPrompt({ userId }: { userId: string }) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [selected, setSelected] = useState<number | null>(null);
  const [highScore, setHighScore] = useState(false);
  const thanksTimer = useRef<number | null>(null);

  const dismiss = useCallback(() => setPhase("hidden"), []);

  const evaluate = useCallback(() => {
    if (!userId || typeof window === "undefined") return;
    // Already shown (or answered) once — never again.
    if (loadRecord(userId)) return;
    if (currentStreak(userId) < NPS_STREAK) return;
    // Persist *before* showing so a remount / navigation never re-asks.
    hubSet(userId, RECORD_KEY, {
      promptedAt: new Date().toISOString(),
      score: null,
      answeredAt: null,
    });
    setSelected(null);
    setPhase("ask");
  }, [userId]);

  // Evaluate on mount and after any hub write (the final pillar tap that
  // completes day 7 fires HUB_UPDATED_EVENT). Debounced so the prompt lands
  // a beat after the streak celebration instead of mid-tap.
  useEffect(() => {
    if (!userId) return;
    let timer: number | null = null;
    const schedule = (delay: number) => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(evaluate, delay);
    };
    const onHubUpdate = () => schedule(900);
    schedule(1400);
    window.addEventListener(HUB_UPDATED_EVENT, onHubUpdate);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener(HUB_UPDATED_EVENT, onHubUpdate);
    };
  }, [userId, evaluate]);

  // Escape dismisses while the prompt is up.
  useEffect(() => {
    if (phase === "hidden") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhase("hidden");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  useEffect(
    () => () => {
      if (thanksTimer.current !== null) window.clearTimeout(thanksTimer.current);
    },
    [],
  );

  const answer = (score: number) => {
    if (selected !== null) return;
    setSelected(score);
    setHighScore(score >= 9);
    const record = loadRecord(userId);
    hubSet(userId, RECORD_KEY, {
      promptedAt: record?.promptedAt ?? new Date().toISOString(),
      score,
      answeredAt: new Date().toISOString(),
    });
    setPhase("thanks");
    thanksTimer.current = window.setTimeout(() => setPhase("hidden"), 3200);
  };

  return (
    <AnimatePresence>
      {phase !== "hidden" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
        >
          {/* Backdrop: click away to gently dismiss (the record already
              exists, so it never comes back). */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={dismiss}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Recommend Chizle"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-ink-800/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            {phase === "ask" ? (
              <>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white/75"
                >
                  <X className="h-4 w-4" />
                </button>

                <p className="pr-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
                  🔥 {NPS_STREAK}-day glow-up streak!
                </p>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                  You kept it up for a full week.
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  That&apos;s the hard part done. One quick favor — how likely
                  are you to recommend Chizle to a friend?
                </p>

                <div
                  role="group"
                  aria-label="Likelihood to recommend, 0 to 10"
                  className="mt-4 grid grid-cols-11 gap-1"
                >
                  {Array.from({ length: 11 }, (_, score) => (
                    <TactileButton
                      key={score}
                      type="button"
                      onClick={() => answer(score)}
                      aria-label={`${score} — ${score === 0 ? "not likely at all" : score === 10 ? "extremely likely" : ""}`.trim()}
                      className={`h-9 rounded-lg text-[11px] font-semibold ring-1 transition-colors ${
                        selected === score
                          ? "bg-accent-500 text-white ring-accent-400"
                          : "bg-white/[0.04] text-white/70 ring-white/10 hover:bg-accent-500/15 hover:text-accent-200 hover:ring-accent-500/40"
                      }`}
                    >
                      {score}
                    </TactileButton>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] font-medium text-white/40">
                  <span>Not likely</span>
                  <span>Extremely likely</span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <p className="text-[11px] leading-relaxed text-white/40">
                    Two seconds, stays on this device.
                  </p>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="shrink-0 text-xs font-medium text-white/50 transition-colors hover:text-white/80"
                  >
                    Maybe later
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center px-2 py-3 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-500/15 text-accent-400">
                  {highScore ? (
                    <PartyPopper className="h-5 w-5" />
                  ) : (
                    <Heart className="h-5 w-5" />
                  )}
                </span>
                <h2 className="mt-3 text-lg font-semibold tracking-tight">
                  {highScore
                    ? "Means a lot — thank you!"
                    : "Thanks for the honest read."}
                </h2>
                <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/60">
                  {highScore
                    ? "You're exactly who we build Chizle for. Now go keep that streak alive."
                    : "Every answer shapes what we improve next. Your streak is safe either way."}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
