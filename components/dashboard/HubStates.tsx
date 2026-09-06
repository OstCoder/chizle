/** Shared loading skeleton for the dashboard and its feature pages. */
export function HubLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
        <div className="space-y-6">
          <div className="h-32 animate-pulse rounded-3xl bg-white/[0.04]" />
          <div className="h-72 animate-pulse rounded-3xl bg-white/[0.04]" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-3xl bg-white/[0.04]" />
            <div className="h-64 animate-pulse rounded-3xl bg-white/[0.04]" />
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