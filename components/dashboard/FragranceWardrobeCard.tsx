"use client";

import { useEffect, useState } from "react";
import { Plus, SprayCan, X } from "lucide-react";
import { hubGet, hubSet, makeId, type Scent } from "@/lib/hub";

interface FragranceWardrobeCardProps {
  userId: string;
}

const NOTE_OPTIONS = [
  "Woody",
  "Fresh",
  "Citrus",
  "Spicy",
  "Sweet",
  "Floral",
  "Aquatic",
  "Amber",
];

const NOTE_TONE: Record<string, string> = {
  Woody: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  Fresh: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  Citrus: "border-yellow-400/25 bg-yellow-400/10 text-yellow-300",
  Spicy: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  Sweet: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300",
  Floral: "border-pink-400/25 bg-pink-400/10 text-pink-300",
  Aquatic: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
  Amber: "border-orange-400/25 bg-orange-400/10 text-orange-300",
};

/** Personal fragrance collection with a woody/fresh/citrus… notes breakdown. */
export function FragranceWardrobeCard({ userId }: FragranceWardrobeCardProps) {
  const [scents, setScents] = useState<Scent[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    setScents(hubGet<Scent[]>(userId, "scents", []));
  }, [userId]);

  const toggleNote = (note: string) => {
    setNotes((cur) =>
      cur.includes(note) ? cur.filter((n) => n !== note) : [...cur, note],
    );
  };

  const addScent = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const scent: Scent = { id: makeId(), name: trimmed, notes };
    const next = [...scents, scent];
    setScents(next);
    hubSet(userId, "scents", next);
    setName("");
    setNotes([]);
  };

  const removeScent = (id: string) => {
    const next = scents.filter((s) => s.id !== id);
    setScents(next);
    hubSet(userId, "scents", next);
  };

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Fragrance profile
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Fragrance wardrobe
          </h2>
        </div>
        <span className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 ring-1 ring-white/10">
          {scents.length} {scents.length === 1 ? "scent" : "scents"}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addScent();
          }}
          placeholder="Add a cologne or perfume…"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20 placeholder:text-white/30"
        />
        <div className="flex flex-wrap gap-1.5">
          {NOTE_OPTIONS.map((note) => {
            const active = notes.includes(note);
            return (
              <button
                key={note}
                type="button"
                onClick={() => toggleNote(note)}
                aria-pressed={active}
                className={`chip ring-1 transition-colors ${
                  active
                    ? (NOTE_TONE[note] ?? "border-white/10 bg-white/[0.03] text-white/50")
                    : "border-white/10 bg-white/[0.02] text-white/45 hover:text-white/75"
                }`}
              >
                {note}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addScent}
          disabled={!name.trim()}
          className="btn-secondary flex w-full items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add to wardrobe
        </button>
      </div>

      {scents.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <SprayCan className="h-5 w-5 text-accent-400" />
          <p className="text-sm font-medium text-white/80">Your scent shelf is empty</p>
          <p className="max-w-xs text-xs leading-relaxed text-white/45">
            Add the bottles you rotate through, tag their notes, and they&apos;ll
            be one tap away in Scent of the Day.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {scents.map((scent) => (
            <li
              key={scent.id}
              className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 transition-colors hover:border-accent-400/25"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white/90">
                  {scent.name}
                </p>
                <button
                  type="button"
                  onClick={() => removeScent(scent.id)}
                  aria-label={`Remove ${scent.name}`}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/30 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {scent.notes.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {scent.notes.map((n) => (
                    <span
                      key={n}
                      className={`chip ring-1 ${NOTE_TONE[n] ?? "border-white/10 bg-white/[0.03] text-white/50"}`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-white/35">
                  No notes tagged yet
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}