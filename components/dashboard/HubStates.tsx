import { Skeleton } from "@/components/Skeleton";

/**
 * Shared shimmer loading skeleton for the dashboard and its feature pages,
 * shown while local scan/hub data loads. The blocks mirror the real card
 * anatomy (heading, copy, thumbnail, chip) so nothing jumps on swap-in.
 */
export function HubLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">Loading your data…</span>
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6">
        <div className="space-y-6">
          {/* Greeting / header card */}
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          {/* Primary content card */}
          <div className="space-y-3 rounded-3xl border border-white/5 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-44 max-w-full" />
              </div>
              <Skeleton className="hidden h-8 w-24 rounded-full sm:block" />
            </div>
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-[82%]" />
          </div>
          {/* Two-up cards */}
          <div className="grid gap-6 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="space-y-3 rounded-3xl border border-white/5 bg-white/[0.03] p-5"
              >
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-2.5 w-[70%]" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shown when the Supabase keys are missing in the environment. */
export function HubNotConfigured() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-amber-400/25 bg-amber-400/10 p-6 text-sm leading-relaxed text-amber-100">
      Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in
      Settings → Environment to enable your dashboard.
    </div>
  );
}