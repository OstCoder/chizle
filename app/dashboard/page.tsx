"use client";

import dynamic from "next/dynamic";
import { GreetingCard } from "@/components/dashboard/GreetingCard";
import { GlowCard } from "@/components/dashboard/GlowCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { DailyRoutineChecklist } from "@/components/dashboard/DailyRoutineChecklist";
import { HubLoading, HubNotConfigured } from "@/components/dashboard/HubStates";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import {
  dailyTip,
  greetingName,
  greetingTagline,
  lastScanLabel,
} from "@/lib/glow";
import { useHubData } from "@/lib/useHubData";

// The Before vs. Now split-screen slider is media-heavy (full-size scan
// images) — load its chunk only once there's history to show.
const ProgressCard = dynamic(
  () => import("@/components/dashboard/ProgressCard").then(
    (m) => m.ProgressCard,
  ),
  {
    loading: () => <PanelSkeleton label="Loading progress tracker…" />,
    ssr: false,
  },
);

export default function DashboardPage() {
  const { user, profile, entries, latest, ready, notConfigured } = useHubData();

  if (!ready) return <HubLoading />;
  if (notConfigured) return <HubNotConfigured />;
  if (!user) return null;

  const firstName = greetingName(user.email);
  const tip = dailyTip(latest?.report ?? null, firstName);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-4 sm:p-6">
        <div className="space-y-6">
          <WidgetErrorBoundary label="Your overview">
            <GreetingCard
              firstName={firstName}
              tagline={greetingTagline()}
              lastScan={latest ? lastScanLabel(latest.savedAt) : "No scan yet"}
              hasScan={Boolean(latest)}
              tip={tip}
            />
          </WidgetErrorBoundary>

          {/* 01 — Analysis & Tracking */}
          <div className="space-y-6">
            <SectionHeader
              index="01"
              title="Analysis & Tracking"
              subtitle="Your latest read, score, and movement over time."
            />
            <WidgetErrorBoundary label="Your latest scan">
              <GlowCard entry={latest} />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary label="Progress tracker">
              <ProgressCard entries={entries} />
            </WidgetErrorBoundary>
          </div>

          {/* 02 — Daily routine (consolidated checklist) */}
          <div className="space-y-6">
            <SectionHeader
              index="02"
              title="Your Daily Routine"
              subtitle="One checklist for the whole day — the detail lives one tap away."
            />
            <WidgetErrorBoundary label="Daily routine">
              <DailyRoutineChecklist
                userId={user.id}
                profile={profile}
                report={latest?.report ?? null}
              />
            </WidgetErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
