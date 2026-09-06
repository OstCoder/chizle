"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Flame, Minus, Plus, Target } from "lucide-react";
import {
  buildTrainingPlan,
  loadTrainingGoal,
  loadTrainingLog,
  nextTrainingDay,
  planInputsFrom,
  saveTrainingGoal,
  saveTrainingLog,
  setsThisWeek,
  trainingWorkoutStreak,
  weeklySets,
  EMPTY_TRAINING_GOAL,
  type TrainingGoal,
  type TrainingLog,
  type TrainingVariant,
} from "@/lib/training";
import { todayKey } from "@/lib/hub";
import type { AnalysisReport } from "@/types/analysis";
import type { ProfileRow } from "@/lib/useHubData";

interface SetTrackerCardProps {
  userId: string;
  profile: ProfileRow | null;
  report: AnalysisReport | null;
  variant: TrainingVariant;
}

/** Briefly flashes the `pop` class so a value change animates. */
function usePop(value: number): string {
  const [popping, setPopping] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPopping(true);
    const t = window.setTimeout(() => setPopping(false), 400);
    return () => window.clearTimeout(t);
  }, [value]);
  return popping ? " animate-counter-pop" : "";
}

/**
 * Set tracker — log completed sets for today's plan day with tap steppers,
 * against a weekly goal that is recommended from the active plan by default,
 * with a manual override. Per-account, per-calendar-day persistence.
 */
export function SetTrackerCard({
  userId,
  profile,
  report,
  variant,
}: SetTrackerCardProps) {
  const dateKey = todayKey();
  const plans = useMemo(
    () => buildTrainingPlan(planInputsFrom(profile, report)),
    [profile, report],
  );
  const plan = plans[variant];

  const [day, setDay] = useState(0);
  const [log, setLog] = useState<TrainingLog>({ variant, day: 0, done: {} });
  const [goal, setGoal] = useState<TrainingGoal>(EMPTY_TRAINING_GOAL);
  const [draft, setDraft] = useState("");
  // Previous streak value drives the flame animation: when the streak goes
  // UP, the flame ignites (color + bounce + glow), Duolingo-style.
  const [flameUp, setFlameUp] = useState(false);
  const prevStreak = useRef<number | null>(null);

  useEffect(() => {
    const storedGoal = loadTrainingGoal(userId);
    setGoal(storedGoal);
    setDraft(
      storedGoal.mode === "manual" && storedGoal.value
        ? String(storedGoal.value)
        : "",
    );
    const scheduled = nextTrainingDay(userId);
    setDay(scheduled);
    const stored = loadTrainingLog(userId, dateKey);
    if (stored.variant !== variant || stored.day !== scheduled) {
      const fresh: TrainingLog = { variant, day: scheduled, done: {} };
      setLog(fresh);
      saveTrainingLog(userId, dateKey, fresh);
    } else {
      setLog(stored);
    }
  }, [userId, dateKey, variant]);

  const session = plan.days[day] ?? plan.days[0];

  const target =
    goal.mode === "manual" && goal.value ? goal.value : weeklySets(plan);

  const setGoalMode = (mode: TrainingGoal["mode"]) => {
    const next: TrainingGoal = { mode, value: goal.value };
    setGoal(next);
    saveTrainingGoal(userId, next);
  };

  const applyManual = () => {
    const parsed = Math.round(Number(draft));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const next: TrainingGoal = { mode: "manual", value: parsed };
    setGoal(next);
    saveTrainingGoal(userId, next);
  };

  const adjustExercise = (exerciseId: string, delta: number, max: number) => {
    const current = log.done[exerciseId] ?? 0;
    const next = Math.max(0, Math.min(max, current + delta));
    const done = { ...log.done, [exerciseId]: next };
    const updated: TrainingLog = { ...log, done };
    setLog(updated);
    saveTrainingLog(userId, dateKey, updated);
  };

  const sessionSets = session.exercises.reduce(
    (sum, ex) => sum + (log.done[ex.id] ?? 0),
    0,
  );
  const sessionTarget = session.exercises.reduce(
    (sum, ex) => sum + ex.sets,
    0,
  );
  const weekSets = setsThisWeek(userId);
  const weekPct = target > 0 ? Math.min(100, Math.round((weekSets / target) * 100)) : 0;
  const streak = trainingWorkoutStreak(userId);
  const sessionPop = usePop(sessionSets);
  const weekPop = usePop(weekSets);

  // Ignite the flame whenever the streak increases past its previous value.
  useEffect(() => {
    if (prevStreak.current === null) {
      prevStreak.current = streak;
      return;
    }
    if (streak > prevStreak.current) {
      setFlameUp(true);
      const t = window.setTimeout(() => setFlameUp(false), 1600);
      prevStreak.current = streak;
      return () => window.clearTimeout(t);
    }
    prevStreak.current = streak;
  }, [streak]);

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Gym &amp; at-home sets
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Set tracker</h2>
        </div>
        {/* Streak flame — ignites (color + bounce) when the streak goes up */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-300 ${
            streak > 0
              ? "bg-orange-500/10 text-orange-300 ring-1 ring-orange-400/25"
              : "text-white/40 ring-1 ring-white/10"
          } ${flameUp ? "animate-flame-ignite" : ""}`}
          aria-label={`${streak} day workout streak`}
        >
          <Flame
            className={`h-4 w-4 transition-all duration-300 ${
              streak > 0
                ? flameUp
                  ? "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.9)]"
                  : "text-orange-400"
                : "text-white/30"
            }`}
          />
          {streak === 0 ? "No streak yet" : `${streak}-day streak`}
        </div>
      </div>

      {/* Formatted counters */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/40">
            Today&apos;s session
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tabular-nums text-white${sessionPop}`}
          >
            {sessionSets}
            <span className="text-base font-normal text-white/40">
              {" "}
              / {sessionTarget}
              <span className="ml-1 text-xs">sets</span>
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/40">
            This week
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tabular-nums text-white${weekPop}`}
          >
            {weekSets}
            <span className="text-base font-normal text-white/40">
              {" "}
              / {target}
              <span className="ml-1 text-xs">sets</span>
            </span>
          </p>
        </div>
      </div>

      {/* Goal mode switcher */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setGoalMode("auto")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              goal.mode === "auto"
                ? "bg-accent-500 text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            Weekly goal · {weeklySets(plan)} sets
          </button>
          <button
            type="button"
            onClick={() => setGoalMode("manual")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              goal.mode === "manual"
                ? "bg-accent-500 text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            Custom
          </button>
        </div>
        {goal.mode === "manual" && (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              step={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyManual();
              }}
              placeholder={`sets, e.g. ${weeklySets(plan)}`}
              className="w-28 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-accent-400/60 [color-scheme:dark]"
              aria-label="Custom weekly sets goal"
            />
            <button
              type="button"
              onClick={applyManual}
              className="btn-secondary !px-2.5 !py-1.5 text-xs"
            >
              <Check className="h-3.5 w-3.5" /> Set
            </button>
          </div>
        )}
      </div>

      {/* Today's session */}
      <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">
            {session.label} <span className="text-white/40">·</span>{" "}
            <span className="text-accent-200">{session.focus}</span>
          </p>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {session.exercises.map((ex) => {
            const done = log.done[ex.id] ?? 0;
            const complete = done >= ex.sets;
            return (
              <li
                key={ex.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  complete
                    ? "border-accent-500/40 bg-accent-500/[0.08]"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white/85">
                    {ex.name}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {ex.sets}×{ex.reps}
                    {ex.note ? ` · ${ex.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustExercise(ex.id, -1, ex.sets)}
                    disabled={done === 0}
                    aria-label={`Remove one set of ${ex.name}`}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span
                    className={`grid h-7 min-w-8 place-items-center rounded-lg px-1 font-mono text-xs font-semibold tabular-nums ${
                      complete ? "bg-accent-500 text-white" : "text-white/70"
                    }`}
                  >
                    {done}
                    <span className="text-white/40">/{ex.sets}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustExercise(ex.id, 1, ex.sets)}
                    disabled={done >= ex.sets}
                    aria-label={`Add one set of ${ex.name}`}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Weekly progress */}
      <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-white/70">
            <Target className="h-3.5 w-3.5 text-accent-300" />
            Weekly goal
          </p>
          <p className="font-mono text-xs tabular-nums text-white/50">
            {Math.max(0, target - weekSets)} to go
          </p>
        </div>
        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-[width] duration-500"
            style={{ width: `${weekPct}%` }}
          />
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-white/45">
          {goal.mode === "auto"
            ? `Your goal is the ${weeklySets(plan)} sets your ${plan.title.toLowerCase()} calls for — log reps as you finish them.`
            : `Manual goal of ${target} sets this week. Every set logged counts toward it.`}
        </p>
      </div>
    </section>
  );
}
