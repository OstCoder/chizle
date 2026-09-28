import { cn } from "@/lib/utils";

/**
 * Shimmer skeleton block — the app's generic placeholder while a face scan is
 * processing or local data is loading. Composes the shared `.shimmer` sweep
 * from app/globals.css (which needs `relative` + `overflow-hidden` so the
 * highlight stays clipped inside the block); size and shape come from
 * className (e.g. `h-3 w-40`, `h-16 w-full rounded-3xl`).
 *
 * The fill uses the remapped `white` token, so the block flips between
 * light-on-dark and dark-on-light automatically with the theme.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shimmer relative block overflow-hidden rounded-lg bg-white/[0.05]",
        className,
      )}
    />
  );
}
