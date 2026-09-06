"use client";

import { useEffect, useState } from "react";
import { Check, FlaskConical, Plus, X } from "lucide-react";
import {
  hubGet,
  hubSet,
  loadDayIds,
  makeId,
  todayKey,
  toggleDayId,
  type GroomingProduct,
} from "@/lib/hub";

interface ProductRegimenCardProps {
  userId: string;
}

const CATEGORIES = ["Serum", "Oil", "Clay", "Wax", "Pomade", "Cream", "Mask", "Other"];

const CATEGORY_TONE: Record<string, string> = {
  Serum: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  Oil: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  Clay: "border-stone-400/25 bg-stone-400/10 text-stone-300",
  Wax: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  Pomade: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  Cream: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  Mask: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
  Other: "border-white/10 bg-white/[0.03] text-white/50",
};

/**
 * Daily hair/beard product regimen: a personal product list with a per-day
 * "applied" toggle, persisted per account in localStorage.
 */
export function ProductRegimenCard({ userId }: ProductRegimenCardProps) {
  const dateKey = todayKey();
  const [products, setProducts] = useState<GroomingProduct[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  useEffect(() => {
    setProducts(hubGet<GroomingProduct[]>(userId, "products", []));
    setApplied(loadDayIds(userId, "products-applied", dateKey));
  }, [userId, dateKey]);

  const addProduct = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const product: GroomingProduct = {
      id: makeId(),
      name: trimmed,
      category,
    };
    const next = [...products, product];
    setProducts(next);
    hubSet(userId, "products", next);
    setName("");
  };

  const removeProduct = (id: string) => {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    hubSet(userId, "products", next);
    setApplied((cur) => cur.filter((x) => x !== id));
    if (applied.includes(id)) {
      const nextApplied = applied.filter((x) => x !== id);
      setApplied(nextApplied);
      hubSet(userId, `products-applied:${dateKey}`, nextApplied);
    }
  };

  const toggleApplied = (id: string) => {
    setApplied(toggleDayId(userId, "products-applied", dateKey, id));
  };

  const done = products.filter((p) => applied.includes(p.id)).length;

  return (
    <section className="card animate-fade-up p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            Hair &amp; grooming
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Product regimen
          </h2>
        </div>
        <span className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 ring-1 ring-white/10">
          {done} / {products.length} applied
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addProduct();
          }}
          placeholder="e.g. Beard oil, sea salt spray…"
          className="w-full min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20 placeholder:text-white/30"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="shrink-0 rounded-xl border border-white/10 bg-ink-700 px-2.5 py-2 text-xs text-white/80 outline-none transition focus:border-accent-400/60 [color-scheme:dark]"
          aria-label="Product category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addProduct}
          disabled={!name.trim()}
          className="btn-primary shrink-0 !px-3 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Add product"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {products.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <FlaskConical className="h-5 w-5 text-accent-400" />
          <p className="text-sm font-medium text-white/80">
            No products yet
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-white/45">
            Add your daily lineup — serums, oils, clays — then tap to log when
            you apply each one today.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {products.map((p) => {
            const isApplied = applied.includes(p.id);
            return (
              <li key={p.id}>
                <div
                  className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-all ${
                    isApplied
                      ? "border-accent-500/40 bg-accent-500/[0.08]"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleApplied(p.id)}
                    aria-pressed={isApplied}
                    aria-label={`Mark ${p.name} applied today`}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                      isApplied
                        ? "border-accent-500 bg-accent-500 text-white"
                        : "border-white/25 bg-transparent text-transparent hover:border-accent-400"
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </button>
                  <span
                    className={`flex-1 truncate text-sm font-medium ${
                      isApplied
                        ? "text-white/40 line-through decoration-white/25"
                        : "text-white/85"
                    }`}
                  >
                    {p.name}
                  </span>
                  <span
                    className={`chip ring-1 ${CATEGORY_TONE[p.category] ?? CATEGORY_TONE.Other}`}
                  >
                    {p.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProduct(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="grid h-6 w-6 place-items-center rounded-full text-white/35 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        Application tracking resets daily, so “applied today” is always honest.
      </p>
    </section>
  );
}