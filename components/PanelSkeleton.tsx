/**
 * Placeholder shown while a lazily-loaded (next/dynamic) panel chunk is
 * fetching. Mimics the card shell so the layout doesn't jump when the real
 * component swaps in.
 */
export function PanelSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      className="card flex min-h-[160px] flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-accent-400" />
      <p className="text-xs text-white/40">{label}</p>
    </div>
  );
}
