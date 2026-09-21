"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { HaircutMatchCard } from "@/components/dashboard/HaircutMatchCard";
import { StyleTrackerCard } from "@/components/dashboard/StyleTrackerCard";
import { ProductRegimenCard } from "@/components/dashboard/ProductRegimenCard";
import { IngredientSafetyCard } from "@/components/dashboard/IngredientSafetyCard";
import { ScentOfDayCard } from "@/components/dashboard/ScentOfDayCard";
import { HubLoading, HubNotConfigured } from "@/components/dashboard/HubStates";
import { EmptyStateCard } from "@/components/EmptyState";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import { useHubData } from "@/lib/useHubData";

export default function GroomingPage() {
  const { user, profile, latest, ready, notConfigured } = useHubData();

  if (!ready) return <HubLoading />;
  if (notConfigured) return <HubNotConfigured />;
  if (!user) return null;

  const hasScan = Boolean(latest?.report);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hair, Grooming & Finish"
        title="Style, match & maintain"
        subtitle="Haircuts and products matched to your face analysis, your trim cadence, a daily product regimen, and the scent that finishes the look — grooming is the fastest visible upgrade."
      />
      {!hasScan && (
        <EmptyStateCard
          eyebrow="Grooming hub"
          title="Unlock your matched haircut & regimen"
          body="Your grooming plan is generic until you scan. One photo tells Chizle your face shape and hair read, and every card below personalizes to it — cuts, products, and ingredient guidance included."
          ctaLabel="Take the scan"
          ctaHref="/analyze"
          steps={["Scan", "Match", "Maintain"]}
          footnote="Takes about 10 seconds, entirely on-device."
        />
      )}
      <WidgetErrorBoundary label="Haircut match">
        <HaircutMatchCard
          userId={user.id}
          report={latest?.report ?? null}
          profile={profile}
        />
      </WidgetErrorBoundary>
      <div className="grid gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary label="Style tracker">
          <StyleTrackerCard userId={user.id} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary label="Product regimen">
          <ProductRegimenCard userId={user.id} />
        </WidgetErrorBoundary>
      </div>
      <WidgetErrorBoundary label="Ingredient safety">
        <IngredientSafetyCard report={latest?.report ?? null} profile={profile} />
      </WidgetErrorBoundary>
      <WidgetErrorBoundary label="Scent of the day">
        <ScentOfDayCard userId={user.id} />
      </WidgetErrorBoundary>
    </div>
  );
}
