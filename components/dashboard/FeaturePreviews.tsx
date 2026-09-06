"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Dumbbell,
  Scissors,
  SprayCan,
} from "lucide-react";
import { sculptList } from "@/lib/glow";
import {
  daysSince,
  EMPTY_HAIR_STATUS,
  hubGet,
  loadDayIds,
  todayKey,
  type GroomingProduct,
  type HairStatus,
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

  // Facial fitness (Sculpt List)
  const sculptItems = sculptList(report);
  const sculptDone = sculptItems.filter((i) =>
    loadDayIds(userId, "sculpt", dateKey).includes(i.id),
  ).length;

  // Grooming
  const hair = hubGet<HairStatus>(userId, "haircare", EMPTY_HAIR_STATUS);
  const trimDays = daysSince(hair.lastTrim);
  const products = hubGet<GroomingProduct[]>(userId, "products", []);
  const appliedToday = loadDayIds(userId, "products-applied", dateKey).filter(
    (id) => products.some((p) => p.id === id),
  ).length;

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
      title: "Sculpt, Train & Recover",
      blurb: "Facial fitness, training plan, sets, water, and recovery",
      stat:
        sculptItems.length > 0
          ? `${sculptDone}/${sculptItems.length} sculpt reps · ${weekSets} set${weekSets === 1 ? "" : "s"} this week`
          : `${weekSets} set${weekSets === 1 ? "" : "s"} this week · open the sculpt list`,
    },
    {
      href: "/grooming",
      icon: <Scissors className="h-4 w-4" />,
      title: "Hair & Grooming",
      blurb: "Trim cadence, appointments, product regimen",
      stat:
        trimDays !== null
          ? `${trimDays} days since trim · ${appliedToday} product${appliedToday === 1 ? "" : "s"} applied`
          : `${products.length} product${products.length === 1 ? "" : "s"} · set your trim date`,
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
    <div className="grid gap-4 sm:grid-cols-2">
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