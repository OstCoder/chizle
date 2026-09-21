"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Camera, Check, Loader2, Sparkles } from "lucide-react";
import { saveOnboardingProfile } from "@/app/actions/profile";
import { GOALS, type Goal } from "@/lib/supabase/types";

const steps = [
  { eyebrow: "One question", title: "What are you working toward?" },
  { eyebrow: "Last detail", title: "How old are you?" },
  { eyebrow: "You're in", title: "Get your first read." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | "">("");
  const [age, setAge] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const progress = ((step + 1) / steps.length) * 100;
  const current = steps[step];

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(goal);
    return Boolean(age && Number(age) >= 13 && Number(age) <= 120);
  }, [goal, age, step]);

  function next() {
    if (!canContinue) {
      setError(step === 0 ? "Pick the goal that fits best." : "Enter an age between 13 and 120.");
      return;
    }
    setError(null);
    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await saveOnboardingProfile({ primaryGoal: goal as Goal, age });
      router.replace("/dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500/15 text-accent-300">
            <Sparkles className="h-4 w-4" />
          </span>
          Chizle setup
        </div>
        <span className="text-xs font-medium uppercase tracking-wider text-white/40">
          Step {step + 1} of {steps.length}
        </span>
      </div>
      <div className="mb-10 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="card p-6 sm:p-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-300">
              {current.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {current.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              {step < 2
                ? "This takes about ten seconds."
                : "That's everything — your first scan is the last step."}
            </p>
          </motion.div>
        </AnimatePresence>

        {step === 0 && (
          <fieldset className="mt-8">
            <legend className="text-sm font-medium text-white/75">Primary goal</legend>
            <div className="mt-3 grid gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGoal(g);
                    setError(null);
                  }}
                  aria-pressed={goal === g}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                    goal === g
                      ? "border-accent-400/60 bg-accent-500/10 text-accent-100"
                      : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span>{g}</span>
                  {goal === g && <Check className="h-4 w-4 text-accent-300" />}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <label className="mt-8 block text-sm font-medium text-white/75">
            Age
            <input
              type="number"
              min="13"
              max="120"
              value={age}
              onChange={(event) => {
                setAge(event.target.value);
                setError(null);
              }}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20"
              placeholder="28"
              autoFocus
            />
          </label>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-accent-400/25 bg-accent-500/[0.06] p-5">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-accent-300" />
                <p className="text-sm font-semibold text-white">Your first scan</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Drop a front-facing photo and Chizle maps 468 landmarks, scores
                your read, and hands you a personalized daily routine — all
                processed on your device, nothing uploaded.
              </p>
              <button
                type="button"
                onClick={() => router.replace("/analyze")}
                className="btn-primary mt-4"
              >
                <Camera className="h-4 w-4" />
                Scan now <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-white/40">
              Prefer to look around first? Finish setup below and you can scan
              any time from the dashboard.
            </p>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-9 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep((currentStep) => Math.max(currentStep - 1, 0));
            }}
            disabled={step === 0 || saving}
            className="btn-ghost disabled:opacity-30"
          >
            Back
          </button>
          {step === 2 ? (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="btn-secondary disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Finish setup"}
            </button>
          ) : (
            <button type="button" onClick={next} className="btn-primary">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
