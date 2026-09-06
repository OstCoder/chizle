"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { SkinHealthCard } from "@/components/dashboard/SkinHealthCard";
import { TrainingPlanCard } from "@/components/dashboard/TrainingPlanCard";
import { SetTrackerCard } from "@/components/dashboard/SetTrackerCard";
import { WaterTrackerCard } from "@/components/dashboard/WaterTrackerCard";
import { RoutineLogsCard } from "@/components/dashboard/RoutineLogsCard";
import { HubLoading, HubNotConfigured } from "@/components/dashboard/HubStates";
import { useHubData } from "@/lib/useHubData";
import { waterTarget } from "@/lib/glow";
import {
  loadTrainingVariant,
  saveTrainingVariant,
  type TrainingVariant,
} from "@/lib/training";

export default function HabitsPage() {
  const { user, profile, entries, latest, ready, notConfigured } = useHubData();
  const userId = user?.id ?? "";
  const [variant, setVariant] = useState<TrainingVariant>("gym");

  // All hooks run unconditionally (before the auth early-return).
  useEffect(() => {
    if (!userId) return;
    setVariant(loadTrainingVariant(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    saveTrainingVariant(userId, variant);
  }, [variant, userId]);

  if (!ready) return <HubLoading />;
  if (notConfigured) return <HubNotConfigured />;
  if (!user) return null;

  const report = latest?.report ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fitness & Habits"
        title="Train & recover"
        subtitle="A training plan built around your profile, set-by-set logging, hydration goals, and recovery check-ins — the inputs that show up in your next scan."
      />

      {/* 01 — Skin */}
      <SectionHeader
        index="01"
        title="Complexion"
        subtitle="How your skin photographs across scans."
      />
      <SkinHealthCard entries={entries} />

      {/* 02 — Training plan & sets */}
      <SectionHeader
        index="02"
        title="Training Plan & Sets"
        subtitle="A gym or at-home split built from your profile, with daily set logging."
      />
      <TrainingPlanCard
        profile={profile}
        report={report}
        variant={variant}
        onVariantChange={setVariant}
      />
      <SetTrackerCard
        userId={user.id}
        profile={profile}
        report={report}
        variant={variant}
      />

      {/* 03 — Fuel & recovery */}
      <SectionHeader
        index="03"
        title="Fuel & Recovery"
        subtitle="Hydration goals and recovery check-ins between sessions."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <WaterTrackerCard
          userId={user.id}
          recommended={waterTarget(profile ?? {})}
        />
        <RoutineLogsCard userId={user.id} />
      </div>
    </div>
  );
}