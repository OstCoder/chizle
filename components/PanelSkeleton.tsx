import { Skeleton } from "@/components/Skeleton";

/**
 * Placeholder shown while a lazily-loaded (next/dynamic) panel chunk is
 * fetching. A shimmer skeleton of the card shell — heading, copy lines, and a
 * content block — so the layout doesn't jump when the real component swaps in.
 */
export function PanelSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      role="status"
      className="card min-h-[160px] space-y-4 p-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-48 max-w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-[88%]" />
        <Skeleton className="h-2.5 w-[64%]" />
      </div>
      <p className="text-xs text-white/40">{label}</p>
    </div>
  );
}
