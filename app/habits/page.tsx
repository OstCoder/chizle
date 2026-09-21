"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { FaceFitnessCard } from "@/components/dashboard/FaceFitnessCard";
import { SculptListCard } from "@/components/dashboard/SculptListCard";
import { SkinHealthCard } from "@/components/dashboard/SkinHealthCard";
import { SkincareAMPMCard } from "@/components/dashboard/SkincareAMPMCard";
import { SkincarePicksCard } from "@/components/dashboard/SkincarePicksCard";
import { TrainingPlanCard } from "@/components/dashboard/TrainingPlanCard";
import { WaterTrackerCard } from "@/components/dashboard/WaterTrackerCard";
import { RoutineLogsCard } from "@/components/dashboard/RoutineLogsCard";
import { HubLoading, HubNotConfigured } from "@/components/dashboard/HubStates";
import { EmptyStateCard } from "@/components/EmptyState";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import { useHubData } from "@/lib/useHubData";
import { waterTarget } from "@/lib/glow";
import { hubGet, hubSet } from "@/lib/hub";
import type { TrainingVariant } from "@/lib/training";

export default function HabitsPage() {
  const { user, profile, entries, latest, ready, notConfigured } = useHubData();
  const userId = user?.id ?? "";
  const [variant, setVariant] = useState<TrainingVariant>("gym");

  // All hooks run unconditionally (before the auth early-return).
  useEffect(() => {
    if (!userId) return;
    setVariant(hubGet<TrainingVariant>(userId, "training-variant", "gym"));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    hubSet(userId, "training-variant", variant);
  }, [variant, userId]);

  if (!ready) return <HubLoading />;
  if (notConfigured) return <HubNotConfigured />;
  if (!user) return null;

  const report = latest?.report ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fitness & Habits"
        title="Sculpt, train & recover"
        subtitle="A daily facial-fitness practice, a training plan built around your profile, hydration, and 30-second check-ins — the inputs that show up in your next scan."
      />

      {!latest && (
        <EmptyStateCard
          eyebrow="Habits hub"
          title="Build your routine — scan to personalize it"
          body="The daily checklist works without a scan, but one photo tailors it: face-shape exercises, complexion metrics, a training plan built around your profile, and streak points for every completion."
          ctaLabel="Scan to personalize"
          ctaHref="/analyze"
          steps={["Scan", "Check in daily", "Glow up"]}
          footnote="Your streak starts the moment you complete today's checklist."
        />
      )}

      {/* 01 — Facial fitness */}
      <div className="space-y-6">
        <SectionHeader
          index="01"
          title="Facial Fitness & Complexion"
          subtitle="The daily Sculpt List, paired with how your skin photographs in each scan."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <WidgetErrorBoundary label="Sculpt list">
            <SculptListCard userId={user.id} report={report} />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary label="Complexion metrics">
            <SkinHealthCard entries={entries} />
          </WidgetErrorBoundary>
        </div>
        <WidgetErrorBoundary label="AM/PM skincare">
          <SkincareAMPMCard userId={user.id} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary label="Face fitness">
          <FaceFitnessCard userId={user.id} report={report} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary label="Smart picks">
          <SkincarePicksCard report={report} profile={profile} />
        </WidgetErrorBoundary>
      </div>

      {/* 02 — Training plan */}
      <div className="space-y-6">
        <SectionHeader
          index="02"
          title="Training Plan"
          subtitle="A gym or at-home split built from your profile — log the day with one tap below."
        />
        <WidgetErrorBoundary label="Training plan">
          <TrainingPlanCard
            profile={profile}
            report={report}
            variant={variant}
            onVariantChange={setVariant}
          />
        </WidgetErrorBoundary>
      </div>

      {/* 03 — Fuel & recovery */}
      <div className="space-y-6">
        <SectionHeader
          index="03"
          title="Fuel & Recovery"
          subtitle="Hydration and a 30-second daily check-in."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <WidgetErrorBoundary label="Water tracker">
            <WaterTrackerCard
              userId={user.id}
              recommended={waterTarget(profile ?? {})}
            />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary label="Routine check-in">
            <RoutineLogsCard userId={user.id} />
          </WidgetErrorBoundary>
        </div>
      </div>
    </div>
  );
}
