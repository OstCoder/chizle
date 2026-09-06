"use client";

import { CalendarClock, Sparkles, Target } from "lucide-react";
import type { DailyTip } from "@/lib/glow";

interface GreetingCardProps {
  firstName: string;
  tagline: string;
  lastScan: string;
  hasScan: boolean;
  tip: DailyTip;
}

export function GreetingCard({
  firstName,
  tagline,
  lastScan,
  hasScan,
  tip,
}: GreetingCardProps) {
  return (
    <section className="card animate-fade-up p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Your Chizle dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {firstName ? (
              <>
                Welcome back, {firstName}!{" "}
                <span aria-hidden="true">✨</span>
              </>
            ) : (
              "Welcome back! ✨"
            )}
          </h1>
          <p className="mt-1.5 text-sm text-white/55">{tagline}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/60 ring-1 ring-white/10">
          <CalendarClock className="h-3.5 w-3.5 text-accent-400" />
          Last scan:{" "}
          <span className={hasScan ? "text-white" : "text-white/40"}>
            {hasScan ? lastScan : "not yet — let's fix that"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-accent-500/10 p-4 ring-1 ring-accent-400/20">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-500/15 text-accent-300">
          <Target className="h-4 w-4" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5 text-accent-300" aria-hidden="true" />
            {tip.headline}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/55">{tip.body}</p>
        </div>
      </div>
    </section>
  );
}