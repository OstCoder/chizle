"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { GroomingScanCard } from "@/components/dashboard/GroomingScanCard";
import { HaircutMatchCard } from "@/components/dashboard/HaircutMatchCard";
import { HubLoading, HubNotConfigured } from "@/components/dashboard/HubStates";
import { useHubData } from "@/lib/useHubData";

export default function GroomingPage() {
  const { user, profile, latest, ready, notConfigured } = useHubData();

  if (!ready) return <HubLoading />;
  if (notConfigured) return <HubNotConfigured />;
  if (!user) return null;

  const report = latest?.report ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hair & Grooming"
        title="Reads, tips & try-ons"
        subtitle="Your latest scan drives this page: beard, brow, and neckline reads become specific tips, a beard try-on, and product picks — no daily logging required."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <GroomingScanCard
          userId={user.id}
          report={report}
          landmarks={latest?.landmarks ?? null}
          image={latest?.image ?? latest?.thumb ?? null}
        />
        <HaircutMatchCard userId={user.id} report={report} profile={profile} />
      </div>
    </div>
  );
}
