"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Ruler, Sparkles } from "lucide-react";
import { saveOnboardingProfile } from "@/app/actions/profile";
import { EMPTY_ONBOARDING_PROFILE, GENDERS, GOALS, HAIR_TYPES, type OnboardingProfile } from "@/lib/supabase/types";

const steps = [
  { eyebrow: "About you", title: "How should we personalize your read?" },
  { eyebrow: "Your baseline", title: "A few numbers help us calibrate." },
  { eyebrow: "Your style", title: "Tell us what you want to work on." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile>(EMPTY_ONBOARDING_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const progress = ((step + 1) / steps.length) * 100;
  const current = steps[step];

  // Canonical height: cm for metric, total inches for imperial (feet*12 + inches).
  const heightValue = useMemo(() => {
    if (profile.unitSystem === "metric") return profile.height;
    const feet = Number(profile.heightFeet);
    const inches = Number(profile.heightInches || 0);
    if (!Number.isFinite(feet) || !Number.isFinite(inches) || (feet <= 0 && inches <= 0)) return "";
    return String(feet * 12 + inches);
  }, [profile.unitSystem, profile.height, profile.heightFeet, profile.heightInches]);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(profile.gender && profile.age);
    if (step === 1) return Boolean(heightValue && Number(heightValue) > 0 && Number(profile.weight) > 0);
    return Boolean(profile.hairType && profile.goals.length);
  }, [profile, step, heightValue]);

  function update<K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) {
    setProfile((currentProfile) => ({ ...currentProfile, [key]: value }));
    setError(null);
  }

  function next() {
    if (!canContinue) {
      setError(step === 0 ? "Choose your gender and enter your age." : step === 1 ? "Add your height and weight." : "Choose a hair type and at least one goal.");
      return;
    }
    setError(null);
    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  }

  async function finish() {
    if (!canContinue) {
      setError("Choose a hair type and at least one goal.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveOnboardingProfile({ ...profile, height: heightValue });
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
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500/15 text-accent-300"><Sparkles className="h-4 w-4" /></span>Chizle setup</div>
        <span className="text-xs font-medium uppercase tracking-wider text-white/40">Step {step + 1} of {steps.length}</span>
      </div>
      <div className="mb-10 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent-500 transition-all duration-300" style={{ width: `${progress}%` }} /></div>

      <div className="card p-6 sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-300">{current.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{current.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">This takes about a minute. You can update these details later.</p>

        {step === 0 && <StepAbout profile={profile} update={update} />}
        {step === 1 && <StepBaseline profile={profile} update={update} />}
        {step === 2 && <StepStyle profile={profile} update={update} />}

        {error && <div className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        <div className="mt-9 flex items-center justify-between gap-3">
          <button type="button" onClick={() => { setError(null); setStep((currentStep) => Math.max(currentStep - 1, 0)); }} disabled={step === 0 || saving} className="btn-ghost disabled:opacity-30"><ArrowLeft className="h-4 w-4" />Back</button>
          {step < steps.length - 1 ? <button type="button" onClick={next} className="btn-primary">Continue<ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={finish} disabled={saving} className="btn-primary disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? "Saving…" : "Finish setup"}</button>}
        </div>
      </div>
    </div>
  );
}

function StepAbout({ profile, update }: { profile: OnboardingProfile; update: <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) => void }) {
  return <div className="mt-8 grid gap-8 md:grid-cols-2"><fieldset><legend className="text-sm font-medium text-white/75">Gender</legend><div className="mt-3 grid gap-2">{GENDERS.map((gender) => <Choice key={gender} selected={profile.gender === gender} onClick={() => update("gender", gender)}>{gender}</Choice>)}</div></fieldset><label className="block text-sm font-medium text-white/75">Age<input type="number" min="13" max="120" value={profile.age} onChange={(event) => update("age", event.target.value)} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20" placeholder="28" /></label></div>;
}

function StepBaseline({ profile, update }: { profile: OnboardingProfile; update: <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) => void }) {
  const metric = profile.unitSystem === "metric";
  return (
    <div className="mt-8">
      <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
        <button type="button" onClick={() => update("unitSystem", "imperial")} className={`rounded-lg px-4 py-2 text-sm font-medium ${!metric ? "bg-accent-500 text-white" : "text-white/50"}`}>Imperial</button>
        <button type="button" onClick={() => update("unitSystem", "metric")} className={`rounded-lg px-4 py-2 text-sm font-medium ${metric ? "bg-accent-500 text-white" : "text-white/50"}`}>Metric</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {metric ? (
          <NumberField label="Height (cm)" value={profile.height} placeholder="178" onChange={(value) => update("height", value)} />
        ) : (
          <fieldset>
            <legend className="text-sm font-medium text-white/75">Height (feet + inches)</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumberField label="Feet" value={profile.heightFeet} placeholder="5" onChange={(value) => update("heightFeet", value)} />
              <NumberField label="Inches" value={profile.heightInches} placeholder="10" onChange={(value) => update("heightInches", value)} />
            </div>
            <p className="mt-2 text-xs text-white/40">e.g. 5 ft 10 in</p>
          </fieldset>
        )}
        <NumberField label={`Weight (${metric ? "kg" : "lb"})`} value={profile.weight} placeholder={metric ? "75" : "165"} onChange={(value) => update("weight", value)} />
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55"><Ruler className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />Use your best estimate. These stats help tailor recommendations; they are not used to judge your appearance.</div>
    </div>
  );
}

function StepStyle({ profile, update }: { profile: OnboardingProfile; update: <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) => void }) {
  function toggleGoal(goal: (typeof GOALS)[number]) { update("goals", profile.goals.includes(goal) ? profile.goals.filter((currentGoal) => currentGoal !== goal) : [...profile.goals, goal]); }
  return <div className="mt-8 space-y-8"><fieldset><legend className="text-sm font-medium text-white/75">Hair type</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{HAIR_TYPES.map((hairType) => <Choice key={hairType} selected={profile.hairType === hairType} onClick={() => update("hairType", hairType)}>{hairType}</Choice>)}</div></fieldset><fieldset><legend className="text-sm font-medium text-white/75">What are you working toward?</legend><p className="mt-1 text-xs text-white/40">Select all that apply.</p><div className="mt-3 grid gap-2">{GOALS.map((goal) => <Choice key={goal} selected={profile.goals.includes(goal)} onClick={() => toggleGoal(goal)}>{goal}</Choice>)}</div></fieldset></div>;
}

function NumberField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) { return <label className="block text-sm font-medium text-white/75">{label}<input type="number" min="0" step="any" value={value} onChange={(event) => onChange(event.target.value)} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20" placeholder={placeholder} /></label>; }

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} aria-pressed={selected} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${selected ? "border-accent-400/60 bg-accent-500/10 text-accent-100" : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white"}`}><span>{children}</span>{selected && <Check className="h-4 w-4 text-accent-300" />}</button>; }
