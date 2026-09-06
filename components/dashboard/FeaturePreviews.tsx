"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Dumbbell,
  Scissors,
  SprayCan,
} from "lucide-react";
import {
  hubGet,
  todayKey,
  type Scent,
  type ScentOfDay,
} from "@/lib/hub";
import { setsThisWeek } from "@/lib/training";
import type { AnalysisReport } from "@/types/analysis";
import type { ProfileRow } from "@/lib/useHubData";

interface HubPreviewsProps {
  userId: string;
  profile: ProfileRow | null;
  report: AnalysisReport | null;
}

interface PreviewTile {
  href: string;
  icon: React.ReactNode;
  title: string;
  blurb: string;
  stat: string;
}

/**
 * Dashboard previews for the four feature pages. Each tile shows one live,
 * account-scoped stat so the dashboard stays a hub rather than a wall of
 * widgets.
 */
export function HubPreviews({ userId, profile, report }: HubPreviewsProps) {
  const dateKey = todayKey();

  // Fragrance
  const scents = hubGet<Scent[]>(userId, "scents", []);
  const scentPick = hubGet<ScentOfDay>(userId, `scent:${dateKey}`, {
    scentId: null,
    occasion: "Everyday",
  });
  const todayScent = scents.find((s) => s.id === scentPick.scentId)?.name;

  // Training & habits
  const weekSets = setsThisWeek(userId);

  const tiles: PreviewTile[] = [
    {
      href: "/habits",
      icon: <Dumbbell className="h-4 w-4" />,
      title: "Train & Recover",
      blurb: "Training plan, sets, water, and recovery",
      stat: `${weekSets} set${weekSets === 1 ? "" : "s"} this week`,
    },
    {
      href: "/grooming",
      icon: <Scissors className="h-4 w-4" />,
      title: "Hair & Grooming",
      blurb: "Scan-driven reads, beard try-on, product picks",
      stat: report
        ? "Scan ready — reads + try-on loaded"
        : "Analyze a photo to unlock reads",
    },
    {
      href: "/fragrance",
      icon: <SprayCan className="h-4 w-4" />,
      title: "Fragrance Profile",
      blurb: "Scent of the day and your wardrobe",
      stat: todayScent ? `Today: ${todayScent}` : "Pick today's scent",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="card group flex flex-col gap-3 p-5 transition-all hover:border-accent-400/30 hover:bg-white/[0.04]"
        >
          <div className="flex items-start justify-between">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
              {tile.icon}
            </span>
            <ArrowUpRight className="h-4 w-4 text-white/25 transition-colors group-hover:text-accent-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{tile.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/45">
              {tile.blurb}
            </p>
          </div>
          <p className="mt-auto text-xs font-semibold text-accent-300">
            {tile.stat}
          </p>
        </Link>
      ))}
    </div>
  );
}