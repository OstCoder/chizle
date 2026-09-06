"use client";

import { useEffect, useState } from "react";
import { Check, Dumbbell } from "lucide-react";
import { sculptList } from "@/lib/glow";
import {
  loadDayIds,
  todayKey,
  toggleDayId,
} from "@/lib/hub";
import type { AnalysisReport } from "@/types/analysis";

interface SculptListCardProps {
  userId: string;
  report: AnalysisReport | null;
}

const CATEGORY_TONE: Record<string, string> = {
  Jawline: "border-accent-400/25 bg-accent-400/10 text-accent-300",
  "Face yoga": "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  Mewing: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  Eyes: "border-violet-400/25 bg-violet-400/10 text-violet-300",
};

/** The Sculpt List — a daily facial-fitness checklist that resets each day. */
export function SculptListCard({ userId, report }: SculptListCardProps) {
  const dateKey = todayKey();
  const items = sculptList(report);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setCompleted(loadDayIds(userId, "sculpt", dateKey));
  }, [userId, dateKey]);

  const toggle = (id: string) => {
    setCompleted(toggleDayId(userId, "sculpt", dateKey, id));
  };

  const done = items.filter((i) => completed.includes(i.id)).length;

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Skincare &amp; facial fitness
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            The Sculpt List
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <Dumbbell className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300 transition-[width] duration-500"
            style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-white/60">
          {done} / {items.length}
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {items.map((item) => {
          const isDone = completed.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-pressed={isDone}
                className={`group flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all ${
                  isDone
                    ? "border-accent-500/40 bg-accent-500/[0.08]"
                    : "border-white/5 bg-white/[0.02] hover:border-accent-400/30 hover:bg-white/[0.04]"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                    isDone
                      ? "border-accent-500 bg-accent-500 text-white"
                      : "border-white/25 bg-transparent text-transparent group-hover:border-accent-400"
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="flex-1">
                  <span
                    className={`block text-sm font-medium ${
                      isDone
                        ? "text-white/40 line-through decoration-white/25"
                        : "text-white/85"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/45">
                    {item.detail}
                  </span>
                </span>
                <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                  <span className="font-mono text-[10px] text-white/40">
                    {item.duration}
                  </span>
                  <span
                    className={`chip ring-1 ${CATEGORY_TONE[item.category] ?? "border-white/10 bg-white/[0.03] text-white/50"}`}
                  >
                    {item.category}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        Short daily practice beats intense sessions. Each item is derived from
        your latest scan and resets tomorrow.
      </p>
    </section>
  );
}