"use client";

import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { GlowCard } from "@/components/dashboard/GlowCard";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { HubPreviews } from "@/components/dashboard/FeaturePreviews";
import { HubLoading, HubNotConfigured } from "@/components/dashboard/HubStates";
import {
  dailyTip,
  greetingName,
  greetingTagline,
  lastScanLabel,
} from "@/lib/glow";
import { useHubData } from "@/lib/useHubData";

export default function DashboardPage() {
  const { user, profile, entries, latest, ready, notConfigured } = useHubData();

  if (!ready) return <HubLoading />;
  if (notConfigured) return <HubNotConfigured />;
  if (!user) return null;

  const firstName = greetingName(user.email);
  const tip = dailyTip(latest?.report ?? null, firstName);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-4 sm:p-6">
        <div className="space-y-6">
          <GreetingCard
            firstName={firstName}
            tagline={greetingTagline()}
            lastScan={latest ? lastScanLabel(latest.savedAt) : "No scan yet"}
            hasScan={Boolean(latest)}
            tip={tip}
          />

          {/* 01 — Analysis & Tracking */}
          <div className="space-y-6">
            <SectionHeader
              index="01"
              title="Analysis & Tracking"
              subtitle="Your latest read, score, and movement over time."
            />
            <GlowCard entry={latest} />
            <ProgressCard entries={entries} />
          </div>

          {/* 02 — Your toolkit (feature previews) */}
          <div className="space-y-6">
            <SectionHeader
              index="02"
              title="Your Toolkit"
              subtitle="Jump into each practice — every module lives on its own page."
            />
            <HubPreviews userId={user.id} profile={profile} report={latest?.report ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}