"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { CheckCircle, TactileButton } from "@/components/motion";
import { HUB_UPDATED_EVENT, hubGet, hubSet, ampmSchema, todayKey } from "@/lib/hub";
import { dayStatus } from "@/lib/streak";

interface SkincareAMPMCardProps {
  userId: string;
}

interface SlotRow {
  slot: "am" | "pm";
  label: string;
  hint: string;
  icon: React.ReactNode;
}

const SLOTS: SlotRow[] = [
  {
    slot: "am",
    label: "Morning (AM)",
    hint: "Cleanse · moisturize · SPF",
    icon: <Sun className="h-4 w-4" />,
  },
  {
    slot: "pm",
    label: "Evening (PM)",
    hint: "Cleanse · treat · moisturize",
    icon: <Moon className="h-4 w-4" />,
  },
];

/**
 * AM/PM skincare log: two daily toggles (morning + evening routine) that feed
 * the streak engine — the skincare pillar is done when both slots are.
 */
export function SkincareAMPMCard({ userId }: SkincareAMPMCardProps) {
  const dateKey = todayKey();
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    window.addEventListener(HUB_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(HUB_UPDATED_EVENT, refresh);
  }, [refresh]);

  const ampm = hubGet<{ am: boolean; pm: boolean }>(
    userId,
    `ampm:${dateKey}`,
    { am: false, pm: false },
    ampmSchema,
  );
  const status = dayStatus(userId, dateKey);
  const doneCount = Number(ampm.am) + Number(ampm.pm);

  const toggle = (slot: "am" | "pm") => {
    const next = { ...ampm, [slot]: !ampm[slot] };
    hubSet(userId, `ampm:${dateKey}`, next);
    refresh();
  };

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Skincare
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            AM / PM routine
          </h2>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
            status.skincare
              ? "bg-accent-500/15 text-accent-200 ring-accent-400/30"
              : "bg-white/[0.04] text-white/70 ring-white/10"
          }`}
        >
          {status.skincare ? "Complete" : `${doneCount} / 2 today`}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SLOTS.map((s) => {
          const done = Boolean(ampm[s.slot]);
          return (
            <TactileButton
              key={s.slot}
              type="button"
              onClick={() => toggle(s.slot)}
              aria-pressed={done}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                done
                  ? "border-accent-500/40 bg-accent-500/[0.08]"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${
                  done
                    ? "bg-accent-500/15 text-accent-300"
                    : "bg-white/[0.04] text-white/45"
                }`}
              >
                {s.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium transition-colors ${
                    done ? "text-white/50" : "text-white/85"
                  }`}
                >
                  {s.label}
                </span>
                <span className="mt-0.5 block text-xs text-white/45">
                  {s.hint}
                </span>
              </span>
              <CheckCircle done={done} />
            </TactileButton>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        Both slots done = your skincare pillar for the day — it keeps the
        streak alive in the header badge.
      </p>
    </section>
  );
}
