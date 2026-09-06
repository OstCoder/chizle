"use client";

import { useEffect, useState } from "react";
import { Check, Droplets, Minus, Plus, RotateCcw } from "lucide-react";
import { hubGet, hubSet, todayKey } from "@/lib/hub";

interface WaterTrackerCardProps {
  userId: string;
  recommended: number; // ml goal derived from the user's profile
}

interface WaterGoal {
  mode: "auto" | "manual";
  value: number | null; // ml when manual
}

const EMPTY_WATER_GOAL: WaterGoal = { mode: "auto", value: null };

const QUICK = [250, 500];

const fmtMl = (ml: number) =>
  ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`;

/**
 * Fuel & hydration: tap-to-log water intake against a daily goal. The goal is
 * recommended from the user's profile by default, with a manual override.
 */
export function WaterTrackerCard({ userId, recommended }: WaterTrackerCardProps) {
  const dateKey = todayKey();
  const [ml, setMl] = useState(0);
  const [goal, setGoal] = useState<WaterGoal>(EMPTY_WATER_GOAL);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setMl(hubGet<number>(userId, `water:${dateKey}`, 0));
    const stored = hubGet<WaterGoal>(userId, "water-goal", EMPTY_WATER_GOAL);
    setGoal(stored);
    setDraft(stored.mode === "manual" && stored.value ? String(stored.value) : "");
  }, [userId, dateKey]);

  const target =
    goal.mode === "manual" && goal.value ? goal.value : recommended;

  const setGoalMode = (mode: WaterGoal["mode"]) => {
    const next: WaterGoal = { mode, value: goal.value };
    setGoal(next);
    hubSet(userId, "water-goal", next);
  };

  const applyManual = () => {
    const parsed = Math.round(Number(draft));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const next: WaterGoal = { mode: "manual", value: parsed };
    setGoal(next);
    hubSet(userId, "water-goal", next);
  };

  const update = (delta: number) => {
    const next = Math.max(0, ml + delta);
    setMl(next);
    hubSet(userId, `water:${dateKey}`, next);
  };

  const reset = () => {
    setMl(0);
    hubSet(userId, `water:${dateKey}`, 0);
  };

  const pct = Math.min(100, Math.round((ml / target) * 100));
  const remaining = Math.max(0, target - ml);

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Hydration &amp; recovery
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Fuel &amp; hydration
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <Droplets className="h-4 w-4" />
        </span>
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
            Recommended · {fmtMl(recommended)}
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
              min={250}
              step={250}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyManual();
              }}
              placeholder={`ml, e.g. ${recommended}`}
              className="w-28 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-accent-400/60 [color-scheme:dark]"
              aria-label="Custom daily water goal in ml"
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

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold tracking-tight text-white">
            {ml >= 1000 ? (ml / 1000).toFixed(1) : ml}
            <span className="ml-1 text-sm font-normal text-white/40">
              {ml >= 1000 ? "L" : "ml"}
            </span>
          </p>
          <p className="mt-1 text-xs text-white/45">
            {remaining > 0
              ? `${fmtMl(remaining)} to goal`
              : "Goal reached — nice work"}
          </p>
        </div>
        <p className="font-mono text-xs text-white/40">
          goal {fmtMl(target)}
        </p>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-accent-300 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => update(q)}
            className="btn-secondary !px-2 !py-2.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {q} ml
          </button>
        ))}
        <button
          type="button"
          onClick={() => update(-250)}
          className="btn-secondary !px-2 !py-2.5 text-xs"
          aria-label="Remove 250 ml"
        >
          <Minus className="h-3.5 w-3.5" />
          250
        </button>
        <button
          type="button"
          onClick={reset}
          className="btn-ghost !px-2 !py-2.5 text-xs"
          aria-label="Reset water counter"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        Your recommended goal is sized from your profile. Every glass counts —
        the counter resets fresh each morning.
      </p>
    </section>
  );
}