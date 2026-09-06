"use client";

import { useMemo } from "react";
import { Dumbbell, Home, Sparkles } from "lucide-react";
import {
  buildTrainingPlan,
  planInputsFrom,
  type TrainingVariant,
} from "@/lib/training";
import type { AnalysisReport } from "@/types/analysis";
import type { ProfileRow } from "@/lib/useHubData";

interface TrainingPlanCardProps {
  profile: ProfileRow | null;
  report: AnalysisReport | null;
  variant: TrainingVariant;
  onVariantChange: (variant: TrainingVariant) => void;
}

const VARIANTS: Array<{
  value: TrainingVariant;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "gym", label: "Gym split", icon: <Dumbbell className="h-3.5 w-3.5" /> },
  { value: "home", label: "At-home", icon: <Home className="h-3.5 w-3.5" /> },
];

/**
 * Personalized training plan — a 3-day gym split or a no-equipment at-home
 * circuit, sized from the user's profile (weight/age) and latest scan
 * (posture flag). The active variant is owned by the /habits page so the set
 * tracker stays in sync.
 */
export function TrainingPlanCard({
  profile,
  report,
  variant,
  onVariantChange,
}: TrainingPlanCardProps) {
  const plans = useMemo(
    () => buildTrainingPlan(planInputsFrom(profile, report)),
    [profile, report],
  );
  const plan = plans[variant];
  const postureFlagged = planInputsFrom(profile, report).postureWeak;

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Training plan
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Your personalized plan
          </h2>
        </div>
        <span className="chip border-accent-400/25 bg-accent-500/10 text-accent-200">
          <Sparkles className="h-3 w-3" />
          Built from your profile + latest scan
        </span>
      </div>

      {/* Variant toggle */}
      <div className="mt-4 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:w-fit">
        {VARIANTS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => onVariantChange(v.value)}
            aria-pressed={variant === v.value}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              variant === v.value
                ? "bg-accent-500 text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{plan.title}</h3>
          <span className="font-mono text-xs text-white/40">
            3 days · ~30–45 min
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-white/55">
          {plan.description}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {plan.days.map((day) => (
          <div
            key={day.id}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-accent-200">{day.label}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                {day.focus}
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              {day.exercises.map((ex) => (
                <li key={ex.id} className="text-xs">
                  <span className="font-medium text-white/80">{ex.name}</span>
                  <span className="text-white/35"> · {ex.sets}×{ex.reps}</span>
                  {ex.note && (
                    <span className="mt-0.5 block leading-relaxed text-white/40">
                      {ex.note}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {postureFlagged && (
        <p className="mt-4 text-xs text-white/45">
          Your scan flagged posture, so a chin-tuck finisher is built into every
          session — it pulls the whole read up over time.
        </p>
      )}
    </section>
  );
}