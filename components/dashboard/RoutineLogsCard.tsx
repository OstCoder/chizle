"use client";

import { useEffect, useState } from "react";
import { BedDouble, Dumbbell, Salad } from "lucide-react";
import { CheckCircle, TactileButton } from "@/components/motion";
import {
  consecutiveDays,
  EMPTY_LOGS,
  hubGet,
  hubSet,
  isLogsShape,
  todayKey,
  type DailyLogs,
} from "@/lib/hub";

interface RoutineLogsCardProps {
  userId: string;
}

const SLEEP_OPTIONS: Array<{ value: DailyLogs["sleep"]; label: string }> = [
  { value: "good", label: "Good" },
  { value: "ok", label: "Okay" },
  { value: "poor", label: "Poor" },
];

/**
 * Daily routine check-ins — a 30-second tap-through: completed workout,
 * clean eating, and sleep quality. One tap each, streaks for motivation.
 * Data is per account + calendar day.
 */
export function RoutineLogsCard({ userId }: RoutineLogsCardProps) {
  const dateKey = todayKey();
  const [logs, setLogs] = useState<DailyLogs>(EMPTY_LOGS);

  useEffect(() => {
    setLogs(hubGet<DailyLogs>(userId, `logs:${dateKey}`, EMPTY_LOGS, isLogsShape));
  }, [userId, dateKey]);

  const update = (patch: Partial<DailyLogs>) => {
    const next = { ...logs, ...patch };
    setLogs(next);
    hubSet(userId, `logs:${dateKey}`, next);
  };

  const workoutStreak = consecutiveDays(userId, "logs", (l) => l.workout);
  const eatStreak = consecutiveDays(userId, "logs", (l) => l.cleanEating);
  const sleepStreak = consecutiveDays(userId, "logs", (l) => l.sleep === "good");

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Daily routine
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Today&apos;s check-in
          </h2>
        </div>
        {workoutStreak > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
            <Dumbbell className="h-3.5 w-3.5 text-accent-400" />
            {workoutStreak}-day streak
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {toggleRow(
          logs.workout,
          () => update({ workout: !logs.workout }),
          "Completed daily workout",
          <Dumbbell className="h-4 w-4" />,
          "Gym session, at-home circuit, or a solid active day — it all counts.",
        )}
        {toggleRow(
          logs.cleanEating,
          () => update({ cleanEating: !logs.cleanEating }),
          "Ate clean today",
          <Salad className="h-4 w-4" />,
          "Whole foods, mostly unprocessed — skin and energy both reward it.",
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-white/70">
          <BedDouble className="h-3.5 w-3.5 text-accent-300" />
          Last night&apos;s sleep
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SLEEP_OPTIONS.map((opt) => {
            const active = logs.sleep === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ sleep: active ? null : opt.value })}
                aria-pressed={active}
                className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "border-accent-400/50 bg-accent-500/10 text-accent-200"
                    : "border-white/10 bg-white/[0.02] text-white/45 hover:text-white/75"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-white/45">
          Three taps a day — recovery is where visible change happens.
        </p>
        {eatStreak > 0 && (
          <span className="chip shrink-0 border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            <Salad className="mr-1 inline h-3 w-3" />
            {eatStreak}-day
          </span>
        )}
        {sleepStreak > 0 && (
          <span className="chip shrink-0 border-white/10 bg-white/[0.03] text-white/55">
            <BedDouble className="mr-1 inline h-3 w-3" />
            {sleepStreak}-night
          </span>
        )}
      </div>
    </section>
  );
}

function toggleRow(
  active: boolean,
  onToggle: () => void,
  label: string,
  icon: React.ReactNode,
  detail: string,
) {
  return (
    <TactileButton
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
        active
          ? "border-accent-500/40 bg-accent-500/[0.08]"
          : "border-white/10 bg-white/[0.02] hover:border-accent-400/30 hover:bg-white/[0.04]"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors ${
          active
            ? "bg-accent-500/15 text-accent-300"
            : "bg-white/[0.04] text-white/45"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span
          className={`block text-sm font-medium transition-colors ${
            active
              ? "text-white/40 line-through decoration-white/25"
              : "text-white/85"
          }`}
        >
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-white/45">{detail}</span>
      </span>
      <CheckCircle done={active} />
    </TactileButton>
  );
}
