"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  FULL_ROUTINE_BONUS,
  EXERCISE_MAP,
  fitnessStreak,
  loadActiveDays,
  loadFaceFitnessDay,
  loadPoints,
  levelFor,
  saveFaceFitnessDay,
  savePoints,
  todaysRoutine,
  type Exercise,
  type ExerciseId,
  type RoutineItem,
  type VisualKey,
} from "@/lib/facefitness";
import { todayKey } from "@/lib/hub";
import type { AnalysisReport } from "@/types/analysis";

interface FaceFitnessCardProps {
  userId: string;
  report: AnalysisReport | null;
}

/** Step visuals as tiny inline SVGs — abstract, friendly line diagrams. */
function StepVisual({ kind }: { kind: VisualKey }) {
  const common = "h-10 w-10 text-accent-300";
  switch (kind) {
    case "tongue":
      return (
        <svg viewBox="0 0 40 40" fill="none" className={common} aria-hidden>
          {/* Palate + tongue press */}
          <path d="M6 14 Q20 4 34 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M20 30 Q13 26 14 19 Q16 14 20 15 Q24 14 26 19 Q27 26 20 30Z" fill="currentColor" opacity="0.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="22" r="1.4" fill="currentColor" />
          <path d="M20 15 L20 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.5 2.5" />
        </svg>
      );
    case "teeth":
      return (
        <svg viewBox="0 0 40 40" fill="none" className={common} aria-hidden>
          <path d="M7 20 Q20 10 33 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 21 Q20 31 33 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          {[12, 16, 20, 24, 28].map((x) => (
            <line key={x} x1={x} y1={13} x2={x} y2={17.5} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          ))}
          {[12, 16, 20, 24, 28].map((x) => (
            <line key={`b${x}`} x1={x} y1={27.5} x2={x} y2={23.5} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          ))}
        </svg>
      );
    case "swallow":
      return (
        <svg viewBox="0 0 40 40" fill="none" className={common} aria-hidden>
          <path d="M16 6 Q20 12 20 20 Q20 28 17 34" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M24 6 Q20 12 20 20 Q20 28 23 34" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="24" r="3.4" fill="currentColor" opacity="0.4" />
          <path d="M20 27 L20 32" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.5 2.5" />
          <path d="M10 12 Q8 16 10 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          <path d="M30 12 Q32 16 30 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
        </svg>
      );
    case "curl":
      return (
        <svg viewBox="0 0 40 40" fill="none" className={common} aria-hidden>
          {/* Supine figure: torso line + nodding head arc */}
          <path d="M8 30 L32 30" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 30 Q10 24 16 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="24" cy="22" r="4.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M24 17.5 L24 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.5 2.5" />
          <path d="M14 14 Q24 8 33 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        </svg>
      );
    case "tuck":
      return (
        <svg viewBox="0 0 40 40" fill="none" className={common} aria-hidden>
          {/* Side profile with chin gliding back */}
          <path d="M10 34 L10 22 Q10 12 20 12 Q30 12 30 22 L30 34" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="21" cy="20" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M17 24 L14 27" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M26 21 L31 21" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.5 2.5" />
          <path d="M29 19 L31 21 L29 23" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "circle":
      return (
        <svg viewBox="0 0 40 40" fill="none" className={common} aria-hidden>
          <circle cx="20" cy="20" r="9" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4 3.2" strokeLinecap="round" />
          <circle cx="20" cy="26" r="3.2" fill="currentColor" opacity="0.4" />
          <path d="M29 13 L32 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M11 13 L8 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
  }
}

const CATEGORY_TONE: Record<Exercise["category"], string> = {
  Mewing: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  Posture: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  "Facial fitness": "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
};

/**
 * Mewing & Posture Routine — interactive timers, step-by-step visual guides,
 * and streak points for the daily facial-muscle practice.
 */
export function FaceFitnessCard({ userId, report }: FaceFitnessCardProps) {
  const dateKey = todayKey();
  const routine = useMemo(() => todaysRoutine(report), [report]);

  const [completed, setCompleted] = useState<string[]>([]);
  const [points, setPoints] = useState(0);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [timer, setTimer] = useState<{ id: string; left: number; running: boolean } | null>(null);

  useEffect(() => {
    setCompleted(loadFaceFitnessDay(userId, dateKey).completed);
    setPoints(loadPoints(userId));
    setActiveDays(loadActiveDays(userId));
  }, [userId, dateKey]);

  // Countdown tick.
  const finishRef = useRef<(() => void) | null>(null);
  finishRef.current = null;
  const timerRef = useRef(timer);
  timerRef.current = timer;

  useEffect(() => {
    if (!timer?.running) return;
    const t = window.setInterval(() => {
      const cur = timerRef.current;
      if (!cur) return;
      if (cur.left <= 1) {
        setTimer(null);
        finishRef.current?.();
      } else {
        setTimer({ ...cur, left: cur.left - 1 });
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [timer?.running]);

  const active = timer ? routine.find((r) => r.exercise.id === timer.id) ?? null : null;

  const toggleDone = useCallback(
    (id: ExerciseId) => {
      const cur = loadFaceFitnessDay(userId, dateKey).completed;
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      saveFaceFitnessDay(userId, dateKey, { completed: next });
      setCompleted(next);
      setPoints(loadPoints(userId));
      setActiveDays(loadActiveDays(userId));
    },
    [userId, dateKey],
  );

  const completeExercise = useCallback(
    (item: RoutineItem) => {
      const id = item.exercise.id;
      const cur = loadFaceFitnessDay(userId, dateKey).completed;
      if (cur.includes(id)) {
        toggleDone(id);
        return;
      }
      const next = [...cur, id];
      saveFaceFitnessDay(userId, dateKey, { completed: next });
      // Award points: exercise points + full-routine bonus when today's
      // whole routine is now complete.
      const full = routine.every((r) => next.includes(r.exercise.id));
      const earned = item.exercise.points + (full ? FULL_ROUTINE_BONUS : 0);
      savePoints(userId, loadPoints(userId) + earned);
      setCompleted(next);
      setPoints(loadPoints(userId));
      setActiveDays(loadActiveDays(userId));
    },
    [userId, dateKey, routine, toggleDone],
  );

  const startTimer = (item: RoutineItem) => {
    const ex = item.exercise;
    setTimer({ id: ex.id, left: ex.seconds, running: true });
    setOpenId(ex.id);
    finishRef.current = () => completeExercise(item);
  };
  const toggleTimer = () => {
    setTimer((t) => (t ? { ...t, running: !t.running } : t));
  };
  const stopTimer = () => setTimer(null);

  const doneCount = routine.filter((r) => completed.includes(r.exercise.id)).length;
  const remainingSeconds = routine
    .filter((r) => !completed.includes(r.exercise.id))
    .reduce((s, r) => s + r.exercise.seconds * r.exercise.sets, 0);
  const dayPointsToday = completed.reduce(
    (sum, id) => sum + (EXERCISE_MAP[id as keyof typeof EXERCISE_MAP]?.points ?? 0),
    0,
  );
  const level = levelFor(points);
  const streak = fitnessStreak(userId);
  const dayComplete = doneCount === routine.length;

  const mm = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <section className="card animate-fade-up p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Mewing &amp; posture
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Daily face &amp; posture routine
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <Sparkles className="h-4 w-4" />
        </span>
      </div>

      {/* Points / level / streak strip */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Points
          </p>
          <p className="score-value mt-0.5 text-lg text-white">
            {points}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Level {level.level}
          </p>
          <p className="mt-0.5 text-lg font-semibold text-white">{level.title}</p>
        </div>
        <div className="rounded-2xl border border-accent-500/25 bg-accent-500/[0.07] px-3 py-2.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">
            <Flame className="h-3 w-3" /> Streak
          </p>
          <p className="score-value mt-0.5 text-lg text-accent-200">
            {streak} {streak === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-[width] duration-500"
            style={{ width: `${routine.length ? (doneCount / routine.length) * 100 : 0}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-white/60">
          {doneCount} / {routine.length}
          {doneCount > 0 && (
            <span className="ml-1.5 text-accent-300">+{dayPointsToday} pts</span>
          )}
        </span>
      </div>

      {/* Active timer banner */}
      {active && timer && (
        <div className="mt-4 rounded-2xl border border-accent-500/30 bg-accent-500/[0.08] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-300">
                Now playing
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">{active.exercise.name}</p>
            </div>
            <p className="score-value text-3xl text-accent-200">
              {mm(timer.left)}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300"
              style={{ width: `${100 - (timer.left / active.exercise.seconds) * 100}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={toggleTimer} className="btn-primary flex-1 !py-2 text-xs">
              {timer.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {timer.running ? "Pause" : "Resume"}
            </button>
            <button type="button" onClick={() => completeExercise(active)} className="btn-secondary flex-1 !py-2 text-xs">
              <Check className="h-3.5 w-3.5" /> Complete early
            </button>
            <button type="button" onClick={stopTimer} className="btn-ghost !py-2 text-xs" aria-label="Dismiss timer">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Routine list */}
      <ul className="mt-4 space-y-2">
        {routine.map((item, idx) => {
          const ex = item.exercise;
          const isDone = completed.includes(ex.id);
          const isOpen = openId === ex.id;
          const isTimerActive = timer?.id === ex.id;
          return (
            <li
              key={ex.id}
              className={`rounded-2xl border transition-colors ${
                isDone
                  ? "border-accent-500/40 bg-accent-500/[0.06]"
                  : isTimerActive
                    ? "border-accent-500/30 bg-accent-500/[0.05]"
                    : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : ex.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                    isDone
                      ? "border-accent-500 bg-accent-500 text-white"
                      : "border-white/20 text-white/45"
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${isDone ? "text-white/45" : "text-white/90"}`}>
                      {ex.name}
                    </span>
                    <span className={`chip ring-1 ${CATEGORY_TONE[ex.category]}`}>
                      {ex.category}
                    </span>
                    {item.reason && (
                      <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        scan pick
                      </span>
                    )}
                  </span>
                  {item.reason && (
                    <span className="mt-0.5 block truncate text-[11px] text-amber-300/80">
                      {item.reason}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/45">
                  <Timer className="h-3.5 w-3.5" />
                  {mm(ex.seconds * ex.sets)}
                  <span className="text-white/25">·</span>
                  <span className="font-mono">+{ex.points}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-white/35 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="px-3.5 pb-4 pt-3">
                  <p className="text-xs leading-relaxed text-white/50">{ex.why}</p>
                  <ol className="mt-3 space-y-3">
                    {ex.steps.map((step, si) => (
                      <li key={si} className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3">
                        <StepVisual kind={step.visual} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-white/85">
                            {si + 1}. {step.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-white/50">
                            {step.detail}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startTimer(item)}
                      disabled={isTimerActive}
                      className="btn-primary !px-3 !py-2 text-xs disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start {mm(ex.seconds)} timer
                    </button>
                    <button
                      type="button"
                      onClick={() => completeExercise(item)}
                      className={`btn-secondary !px-3 !py-2 text-xs ${isDone ? "!text-white/45" : ""}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isDone ? "Done — undo?" : "Mark complete"}
                    </button>
                    <span className="font-mono text-[10px] text-white/35">
                      {ex.sets} sets · {EXERCISE_MAP[ex.id].seconds}s each
                    </span>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      {/* Completion footer */}
      {dayComplete ? (
        <p className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3 text-xs leading-relaxed text-emerald-200">
          Full routine complete — +{FULL_ROUTINE_BONUS} bonus points. Your
          streak, level, and points updated live. See you tomorrow.
        </p>
      ) : (
        <p className="mt-4 text-xs leading-relaxed text-white/45">
          {routine.length - doneCount} exercise
          {routine.length - doneCount === 1 ? "" : "s"} left today — about{" "}
          {Math.ceil(remainingSeconds / 60)} min. Tap an exercise to expand its
          step-by-step guide.
        </p>
      )}

      {activeDays.length > 0 && (
        <p className="mt-1 text-[11px] text-white/35">
          Active on {activeDays.length} {activeDays.length === 1 ? "day" : "days"} ·
          streak counts consecutive days with at least one exercise.
        </p>
      )}
    </section>
  );
}
