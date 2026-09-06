"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { ScentOfDayCard } from "@/components/dashboard/ScentOfDayCard";
import { FragranceWardrobeCard } from "@/components/dashboard/FragranceWardrobeCard";
import { HubLoading, HubNotConfigured } from "@/components/dashboard/HubStates";
import { useHubData } from "@/lib/useHubData";

export default function FragrancePage() {
  const { user, ready, notConfigured } = useHubData();

  if (!ready) return <HubLoading />;
  if (notConfigured) return <HubNotConfigured />;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fragrance Profile"
        title="Scent & wardrobe"
        subtitle="Log today's pick by occasion or mood, and curate the bottles you rotate through with their note profiles."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ScentOfDayCard userId={user.id} />
        <FragranceWardrobeCard userId={user.id} />
      </div>
    </div>
  );
}