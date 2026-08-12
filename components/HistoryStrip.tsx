"use client";

import { History, X } from "lucide-react";

export interface HistoryItem {
  id: string;
  /** One thumbnail for single analyses, two for compare pairs. */
  thumbs: string[];
  title: string;
  subtitle: string | null;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}

/**
 * Horizontal history strip for restored analyses. Each card shows the
 * thumbnail(s), a title (e.g. "Oval · Sym 81"), a relative-time subtitle, and
 * a delete affordance. The active (currently restored) entry is highlighted.
 */
export function HistoryStrip({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-accent-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
          History
        </h2>
        <span className="text-xs text-white/40">
          {items.length} saved {items.length === 1 ? "analysis" : "analyses"}
        </span>
      </div>
      <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={item.onClick}
            title={`Restore ${item.title}`}
            className={`group relative w-40 shrink-0 cursor-pointer overflow-hidden rounded-xl border text-left transition-all ${
              item.active
                ? "border-accent-500/50 bg-accent-500/[0.06]"
                : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex h-24 w-full">
              {item.thumbs.map((src, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={src}
                  alt=""
                  className={`h-24 bg-white/[0.03] object-cover ${
                    item.thumbs.length === 2 ? "w-1/2" : "w-full"
                  }`}
                />
              ))}
            </div>
            <div className="space-y-0.5 p-2.5">
              <p className="truncate text-xs font-medium text-white/85">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-[10px] text-white/40">{item.subtitle}</p>
              )}
            </div>
            <button
              type="button"
              aria-label={`Delete ${item.title}`}
              onClick={(e) => {
                e.stopPropagation();
                item.onDelete();
              }}
              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white/60 opacity-0 backdrop-blur transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
