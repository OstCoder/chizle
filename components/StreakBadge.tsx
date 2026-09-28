"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Flame,
  Sun,
  Moon,
  Scissors,
  Dumbbell,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, TactileButton } from "@/components/motion";
import {
  HUB_UPDATED_EVENT,
  hubGet,
  hubSet,
  ampmSchema,
  todayKey,
} from "@/lib/hub";
import {
  currentStreak,
  dayStatus,
  milestoneFor,
  nextMilestone,
  productCount,
} from "@/lib/streak";

interface StreakBadgeProps {
  userId: string;
}

/**
 * Header streak badge: a flame + consecutive-day count with a popover
 * breaking down today's pillars (AM skincare, PM skincare, grooming products,
 * workout), the milestone reached, and progress toward the next one.
 */
export function StreakBadge({ userId }: StreakBadgeProps) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Live-update: any hub write anywhere on the page (checklist taps, water,
  // regimen toggles) refreshes the streak instantly, no reload needed.
  useEffect(() => {
    window.addEventListener(HUB_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(HUB_UPDATED_EVENT, refresh);
  }, [refresh]);

  // Close the popover when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-streak-badge]")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dateKey = todayKey();
  const status = dayStatus(userId, dateKey);
  const streak = currentStreak(userId);
  const milestone = milestoneFor(streak);
  const next = nextMilestone(streak);
  const products = productCount(userId);

  const toggleAmpm = (slot: "am" | "pm") => {
    const cur = hubGet<{ am: boolean; pm: boolean }>(
      userId,
      `ampm:${dateKey}`,
      { am: false, pm: false },
      ampmSchema,
    );
    hubSet(userId, `ampm:${dateKey}`, { ...cur, [slot]: !cur[slot] });
    refresh();
  };

  return (
    <div className="relative" data-streak-badge>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Glow-up streak: ${streak} days. ${milestone.label}`}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-sans text-[13px] font-semibold ring-1 transition-colors ${
          streak > 0
            ? "bg-accent-500/10 text-accent-200 ring-accent-500/30 hover:bg-accent-500/20"
            : "bg-white/[0.04] text-white/50 ring-white/10 hover:bg-white/[0.07]"
        }`}
      >
        <Flame
          className={`h-4 w-4 ${streak > 0 ? "text-accent-400" : "text-white/40"}`}
        />
        {streak}
        {streak > 0 && (
          <span className="hidden text-[11px] font-medium text-white/50 sm:inline">
            day{streak === 1 ? "" : "s"}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-2xl border border-white/10 bg-ink-800/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
                Glow-up streak
              </p>
              <p className="score-value mt-0.5 text-2xl text-white">
                {streak} {streak === 1 ? "day" : "days"}</p>
            </div>
            <Flame
              className={`h-7 w-7 ${
                streak > 0 ? "text-accent-400" : "text-white/25"
              }`}
            />
          </div>
          {streak > 0 && (
            <p className="mt-1 rounded-lg bg-accent-500/10 px-2.5 py-1.5 text-xs font-semibold text-accent-200">
              🔥 {milestone.label}
            </p>
          )}

          <div className="mt-3 space-y-1.5">
            <PillarRow
              icon={<Sun className="h-3.5 w-3.5" />}
              label="AM skincare"
              done={status.am}
              onToggle={() => toggleAmpm("am")}
            />
            <PillarRow
              icon={<Moon className="h-3.5 w-3.5" />}
              label="PM skincare"
              done={status.pm}
              onToggle={() => toggleAmpm("pm")}
            />
            <PillarRow
              icon={<Scissors className="h-3.5 w-3.5" />}
              label={
                products > 0
                  ? "Grooming products"
                  : "Grooming (no products yet)"
              }
              done={status.grooming}
              disabled={products === 0}
              href="/grooming"
            />
            <PillarRow
              icon={<Dumbbell className="h-3.5 w-3.5" />}
              label="Workout"
              done={status.workout}
              href="/habits"
            />
          </div>

          {next ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-white/45">
                <span>Next milestone</span>
                <span>
                  {next.at - streak} {next.at - streak === 1 ? "day" : "days"} to go
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-[width] duration-500"
                  style={{
                    width: `${Math.min(100, (streak / next.at) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] font-medium text-white/55">
                {next.at}-day: {next.label}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-white/45">
              Every milestone unlocked — legendary.
            </p>
          )}

          <p className="mt-3 border-t border-white/10 pt-2.5 text-[11px] leading-relaxed text-white/40">
            A day counts when AM + PM skincare are both done, plus grooming and
            workout once you&apos;ve started tracking them.
          </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PillarRow({
  icon,
  label,
  done,
  onToggle,
  href,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  done: boolean;
  onToggle?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <CheckCircle done={done} className={disabled ? "opacity-50" : ""} />
      <span
        className={`flex-1 text-xs font-medium ${
          done ? "text-white/45" : "text-white/85"
        }`}
      >
        {label}
      </span>
      {icon && (
        <span
          className={`shrink-0 ${done ? "text-white/30" : "text-accent-300/80"}`}
        >
          {icon}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
          done
            ? "border-accent-500/40 bg-accent-500/[0.08]"
            : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
      >
        {inner}
      </a>
    );
  }

  return (
    <TactileButton
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={done}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
        done
          ? "border-accent-500/40 bg-accent-500/[0.08]"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
      } ${disabled ? "cursor-not-allowed" : ""}`}
    >
      {inner}
    </TactileButton>
  );
}

