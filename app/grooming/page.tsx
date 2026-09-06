"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { HaircutMatchCard } from "@/components/dashboard/HaircutMatchCard";
import { StyleTrackerCard } from "@/components/dashboard/StyleTrackerCard";
import { ProductRegimenCard } from "@/components/dashboard/ProductRegimenCard";
import { HubLoading, HubNotConfigured } from "@/components/dashboard/HubStates";
import { useHubData } from "@/lib/useHubData";

export default function GroomingPage() {
  const { user, profile, latest, ready, notConfigured } = useHubData();

  if (!ready) return <HubLoading />;
  if (notConfigured) return <HubNotConfigured />;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hair & Grooming"
        title="Style, match & maintain"
        subtitle="Haircuts and products matched to your face analysis, your trim cadence, and a daily product regimen — grooming is the fastest visible upgrade."
      />
      <HaircutMatchCard
        userId={user.id}
        report={latest?.report ?? null}
        profile={profile}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <StyleTrackerCard userId={user.id} />
        <ProductRegimenCard userId={user.id} />
      </div>
    </div>
  );
}