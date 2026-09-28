"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Droplets,
  Dumbbell,
  Moon,
  Scissors,
  Sparkle,
  Sun,
} from "lucide-react";
import { CheckCircle, TactileButton } from "@/components/motion";
import { sculptList } from "@/lib/glow";
import {
  daysSince,
  EMPTY_HAIR_STATUS,
  hubGet,
  hubSet,
  ampmSchema,
  groomingProductArraySchema,
  hairStatusSchema,
  dailyLogsSchema,
  numberValueSchema,
  scentArraySchema,
  scentOfDaySchema,
  loadDayIds,
  todayKey,
  type DailyLogs,
  type GroomingProduct,
  type HairStatus,
  type Scent,
  type ScentOfDay,
} from "@/lib/hub";
import type { AnalysisReport } from "@/types/analysis";
import { waterTarget } from "@/lib/glow";

interface DailyRoutineChecklistProps {
  userId: string;
  profile: { weight?: number | null; weight_unit?: string | null } | null;
  report: AnalysisReport | null;
}

interface Row {
  id: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  done: boolean;
  onToggle: () => void;
  href: string;
}

/**
 * The dashboard's single consolidated widget: one glanceable daily checklist
 * combining the Sculpt List, workout, water, grooming products, and scent —
 * each row links to the page where the detail lives.
 */
export function DailyRoutineChecklist({
  userId,
  profile,
  report,
}: DailyRoutineChecklistProps) {
  const dateKey = todayKey();
  const [tick, setTick] = useState(0);

  // Re-read persisted state on mount and whenever a toggle fires (tick bump).
  useEffect(() => {
    setTick((t) => t);
  }, [tick]);

  const sculptItems = sculptList(report);
  const sculptDone = loadDayIds(userId, "sculpt", dateKey);
  const sculptComplete = sculptDone.length >= sculptItems.length;

  const logs = hubGet<DailyLogs>(
    userId,
    `logs:${dateKey}`,
    { workout: false, sleep: null, cleanEating: false },
    dailyLogsSchema,
  );

  const waterGoal = waterTarget(profile ?? {});
  const waterMl = hubGet<number>(userId, `water:${dateKey}`, 0, numberValueSchema);
  const waterDone = waterMl >= waterGoal;

  const products = hubGet<GroomingProduct[]>(
    userId,
    "products",
    [],
    groomingProductArraySchema,
  );
  const applied = loadDayIds(userId, "products-applied", dateKey).filter((id) =>
    products.some((p) => p.id === id),
  );
  const groomingDone = products.length > 0 && applied.length >= products.length;

  const scents = hubGet<Scent[]>(userId, "scents", [], scentArraySchema);
  const scentPick = hubGet<ScentOfDay>(
    userId,
    `scent:${dateKey}`,
    { scentId: null, occasion: "Everyday" },
    scentOfDaySchema,
  );
  const scentDone = scents.some((s) => s.id === scentPick.scentId);

  const toggleWater = () => {
    // A tap on the row fills to the goal (or resets if already there).
    hubSet(userId, `water:${dateKey}`, waterDone ? 0 : waterGoal);
    setTick((t) => t + 1);
  };

  const toggleLogs = (patch: Partial<DailyLogs>) => {
    const next = { ...logs, ...patch };
    hubSet(userId, `logs:${dateKey}`, next);
    setTick((t) => t + 1);
  };

  const toggleSculptAll = () => {
    const next = sculptComplete ? [] : sculptItems.map((i) => i.id);
    hubSet(userId, `sculpt:${dateKey}`, next);
    setTick((t) => t + 1);
  };

  const toggleGrooming = () => {
    const next = groomingDone ? [] : products.map((p) => p.id);
    hubSet(userId, `products-applied:${dateKey}`, next);
    setTick((t) => t + 1);
  };

  const toggleScent = () => {
    if (scents.length === 0) return;
    const next = scentDone
      ? { ...scentPick, scentId: null }
      : { ...scentPick, scentId: scents[0].id };
    hubSet(userId, `scent:${dateKey}`, next);
    setTick((t) => t + 1);
  };

  const ampm = hubGet<{ am: boolean; pm: boolean }>(
    userId,
    `ampm:${dateKey}`,
    { am: false, pm: false },
    ampmSchema,
  );
  const toggleAmpm = (slot: "am" | "pm") => {
    const next = { ...ampm, [slot]: !ampm[slot] };
    hubSet(userId, `ampm:${dateKey}`, next);
    setTick((t) => t + 1);
  };

  const rows: Row[] = [
    {
      id: "am",
      label: "AM skincare",
      detail: ampm.am ? "Morning routine logged" : "Cleanse + moisturize + SPF",
      icon: <Sun className="h-4 w-4" />,
      done: Boolean(ampm.am),
      onToggle: () => toggleAmpm("am"),
      href: "/habits",
    },
    {
      id: "pm",
      label: "PM skincare",
      detail: ampm.pm ? "Evening routine logged" : "Cleanse + treat + moisturize",
      icon: <Moon className="h-4 w-4" />,
      done: Boolean(ampm.pm),
      onToggle: () => toggleAmpm("pm"),
      href: "/habits",
    },
    {
      id: "sculpt",
      label: "Sculpt practice",
      detail:
        sculptItems.length > 0
          ? `${sculptDone.length} of ${sculptItems.length} exercises done`
          : "Jawline, face yoga, mewing",
      icon: <Sparkle className="h-4 w-4" />,
      done: sculptComplete,
      onToggle: toggleSculptAll,
      href: "/habits",
    },
    {
      id: "workout",
      label: "Daily workout",
      detail: logs.workout ? "Logged today — streak alive" : "One tap to log it",
      icon: <Dumbbell className="h-4 w-4" />,
      done: logs.workout,
      onToggle: () => toggleLogs({ workout: !logs.workout }),
      href: "/habits",
    },
    {
      id: "water",
      label: "Hit your water goal",
      detail: `${(waterMl / 1000).toFixed(1)} L of ${(waterGoal / 1000).toFixed(1)} L`,
      icon: <Droplets className="h-4 w-4" />,
      done: waterDone,
      onToggle: toggleWater,
      href: "/habits",
    },
    {
      id: "grooming",
      label: "Grooming products",
      detail:
        products.length > 0
          ? `${applied.length} of ${products.length} applied${daysSince(
              hubGet<HairStatus>(userId, "haircare", EMPTY_HAIR_STATUS, hairStatusSchema)
                .lastTrim,
            ) !== null ? ` · ${daysSince(
              hubGet<HairStatus>(userId, "haircare", EMPTY_HAIR_STATUS, hairStatusSchema)
                .lastTrim,
            )}d since trim` : ""}`
          : "Add products to build your regimen",
      icon: <Scissors className="h-4 w-4" />,
      done: groomingDone,
      onToggle: toggleGrooming,
      href: "/grooming",
    },
    {
      id: "scent",
      label: "Scent of the day",
      detail: scentDone ? "Logged for today" : "Pick from your list",
      icon: <Sparkle className="h-4 w-4" />,
      done: scentDone,
      onToggle: toggleScent,
      href: "/grooming",
    },
  ];

  const doneCount = rows.filter((r) => r.done).length;

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Your toolkit
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Daily routine checklist
          </h2>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
            doneCount === rows.length
              ? "bg-accent-500/15 text-accent-200 ring-accent-400/30"
              : "bg-white/[0.04] text-white/70 ring-white/10"
          }`}
        >
          {doneCount} / {rows.length} today
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300"
          initial={false}
          animate={{ width: `${(doneCount / rows.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {rows.map((row, i) => (
          <motion.li
            key={row.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04, duration: 0.3, ease: "easeOut" }}
            className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors ${
              row.done
                ? "border-accent-500/40 bg-accent-500/[0.08]"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <TactileButton
              type="button"
              onClick={row.onToggle}
              aria-pressed={row.done}
              aria-label={`${row.done ? "Uncheck" : "Check"} ${row.label}`}
              className="shrink-0"
            >
              <CheckCircle
                done={row.done}
                className={row.done ? "" : "hover:border-accent-400"}
              />
            </TactileButton>
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                row.done
                  ? "bg-accent-500/15 text-accent-300"
                  : "bg-white/[0.04] text-white/45"
              }`}
            >
              {row.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm font-medium ${
                  row.done
                    ? "text-white/50"
                    : "text-white/85"
                }`}
              >
                {row.label}
              </span>
              <span className="mt-0.5 block truncate text-xs text-white/45">
                {row.detail}
              </span>
            </span>
            <Link
              href={row.href}
              aria-label={`Open ${row.label}`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/30 transition-colors hover:bg-white/5 hover:text-accent-300"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        One tap per row — detailed tracking (sets, product logs, wardrobe)
        lives on each page.
      </p>
    </section>
  );
}
