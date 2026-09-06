"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Scissors, Save } from "lucide-react";
import {
  daysSince,
  daysUntil,
  EMPTY_HAIR_STATUS,
  hubGet,
  hubSet,
  type HairStatus,
} from "@/lib/hub";

interface StyleTrackerCardProps {
  userId: string;
}

const STATUS_LABEL: Record<HairStatus["status"], string> = {
  maintaining: "Maintaining",
  growing: "Growing out",
  beard: "Beard goal",
};

/**
 * Style & maintenance tracker: days since last trim, next-appointment
 * countdown, and a growth goal. All values are user-set and persisted per
 * account in localStorage.
 */
export function StyleTrackerCard({ userId }: StyleTrackerCardProps) {
  const [status, setStatus] = useState<HairStatus>(EMPTY_HAIR_STATUS);
  const [draft, setDraft] = useState<HairStatus>(EMPTY_HAIR_STATUS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = hubGet<HairStatus>(
      userId,
      "haircare",
      EMPTY_HAIR_STATUS,
    );
    setStatus(stored);
    setDraft(stored);
  }, [userId]);

  const lastTrimDays = daysSince(status.lastTrim);
  const nextTrimDays = daysUntil(status.nextAppointment);

  const save = () => {
    setStatus(draft);
    hubSet(userId, "haircare", draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const statTile = (label: string, value: string, sub: string) => (
    <div className="rounded-2xl bg-white/[0.03] px-3.5 py-3 text-center ring-1 ring-white/5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/40">{sub}</p>
    </div>
  );

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20 [color-scheme:dark]";

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Hair &amp; grooming
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Style &amp; maintenance tracker
          </h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-accent-400 ring-1 ring-white/10">
          <Scissors className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {statTile(
          "Since last trim",
          lastTrimDays === null ? "—" : `${lastTrimDays} d`,
          lastTrimDays === null ? "Set a date below" : "growing since",
        )}
        {statTile(
          "Next trim",
          nextTrimDays === null
            ? "—"
            : nextTrimDays === 0
              ? "Today"
              : `in ${nextTrimDays} d`,
          nextTrimDays === null ? "no appointment" : "countdown",
        )}
        <div className="rounded-2xl bg-white/[0.03] px-3.5 py-3 text-center ring-1 ring-white/5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">
            Goal
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {STATUS_LABEL[status.status]}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-white/40">
            {status.note || "no note yet"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-white/60">
            Last trim / cut
            <input
              type="date"
              value={draft.lastTrim ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, lastTrim: e.target.value || null }))
              }
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          <label className="block text-xs font-medium text-white/60">
            Next appointment
            <input
              type="date"
              value={draft.nextAppointment ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  nextAppointment: e.target.value || null,
                }))
              }
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-white/60">
            Goal
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: e.target.value as HairStatus["status"],
                }))
              }
              className={`mt-1.5 ${inputClass}`}
            >
              <option value="maintaining">Maintaining</option>
              <option value="growing">Growing out</option>
              <option value="beard">Beard goal</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-white/60">
            Note (e.g. length / beard goal)
            <input
              type="text"
              maxLength={60}
              value={draft.note}
              onChange={(e) =>
                setDraft((d) => ({ ...d, note: e.target.value }))
              }
              placeholder="2-inch taper, beard to #4"
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={save}
          className="btn-secondary flex w-full items-center justify-center gap-1.5 sm:w-auto"
        >
          {saved ? (
            <>
              <Save className="h-4 w-4 text-accent-300" /> Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save tracker
            </>
          )}
        </button>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-white/45">
        <CalendarClock className="h-3.5 w-3.5 text-accent-300" />
        Stored on this device for your account — set it once, revisit anytime.
      </p>
    </section>
  );
}