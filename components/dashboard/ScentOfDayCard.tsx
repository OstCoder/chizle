"use client";

import { useEffect, useState } from "react";
import { Check, Sparkle } from "lucide-react";
import {
  hubGet,
  hubSet,
  todayKey,
  type Scent,
  type ScentOfDay,
} from "@/lib/hub";

interface ScentOfDayCardProps {
  userId: string;
}

const OCCASIONS = [
  "Work",
  "Date night",
  "Night out",
  "Gym",
  "Weekend",
  "Everyday",
];

const OCCASION_TONE: Record<string, string> = {
  Work: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  "Date night": "border-rose-400/25 bg-rose-400/10 text-rose-300",
  "Night out": "border-violet-400/25 bg-violet-400/10 text-violet-300",
  Gym: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  Weekend: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  Everyday: "border-white/10 bg-white/[0.03] text-white/50",
};

/** Log today's fragrance + occasion. Reads the wardrobe to offer choices. */
export function ScentOfDayCard({ userId }: ScentOfDayCardProps) {
  const dateKey = todayKey();
  const [scents, setScents] = useState<Scent[]>([]);
  const [pick, setPick] = useState<ScentOfDay>({ scentId: null, occasion: "Everyday" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setScents(hubGet<Scent[]>(userId, "scents", []));
    setPick(
      hubGet<ScentOfDay>(userId, `scent:${dateKey}`, {
        scentId: null,
        occasion: "Everyday",
      }),
    );
  }, [userId, dateKey]);

  const currentScent = scents.find((s) => s.id === pick.scentId) ?? null;

  const save = () => {
    hubSet(userId, `scent:${dateKey}`, pick);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Fragrance profile
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Scent of the day
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <Sparkle className="h-4 w-4" />
        </span>
      </div>

      {currentScent ? (
        <div className="mt-4 rounded-2xl border border-accent-500/30 bg-accent-500/[0.08] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent-300">
            Today you&apos;re wearing
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {currentScent.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`chip ring-1 ${OCCASION_TONE[pick.occasion] ?? OCCASION_TONE.Everyday}`}
            >
              {pick.occasion}
            </span>
            {currentScent.notes.map((n) => (
              <span
                key={n}
                className="chip border-white/10 bg-white/[0.03] text-white/55"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-sm font-medium text-white/80">No scent logged yet today</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-white/45">
            Pick from your wardrobe and match the occasion — it takes two taps.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-medium text-white/60">
          Choose a fragrance
          <select
            value={pick.scentId ?? ""}
            onChange={(e) =>
              setPick((p) => ({
                ...p,
                scentId: e.target.value || null,
              }))
            }
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20 [color-scheme:dark]"
          >
            <option value="">— select —</option>
            {scents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-white/60">
          Occasion / mood
          <select
            value={pick.occasion}
            onChange={(e) =>
              setPick((p) => ({ ...p, occasion: e.target.value }))
            }
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20 [color-scheme:dark]"
          >
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={!pick.scentId}
          className="btn-secondary flex w-full items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4 text-accent-300" /> Logged for today
            </>
          ) : (
            <>
              <Sparkle className="h-4 w-4" /> Log scent for today
            </>
          )}
        </button>
        {scents.length === 0 && (
          <p className="text-center text-xs text-white/40">
            Your wardrobe is empty — add scents in the Fragrance Wardrobe card.
          </p>
        )}
      </div>
    </section>
  );
}