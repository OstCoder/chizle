"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [noSession, setNoSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = useMemo(() => isSupabaseConfigured(), []);

  useEffect(() => {
    if (!configured) {
      setChecking(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) setNoSession(true);
      setChecking(false);
    });
  }, [configured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      router.replace("/dashboard");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <div className="card mx-auto h-[380px] w-full max-w-md animate-pulse bg-white/[0.03]" aria-label="Checking reset link" />;
  }

  return (
    <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-500/15 text-accent-300">
        <KeyRound className="h-6 w-6" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-1.5 text-sm text-white/50">Choose a new password for your Chizle account.</p>

      {noSession && (
        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100">
            This reset link is missing, expired, or was already used. Request a new one from the sign-in page.
          </div>
          <Link href="/auth" className="btn-primary w-full">
            Back to log in
          </Link>
        </div>
      )}

      {!noSession && (
        <>
          {!configured && (
            <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100">
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Settings → Environment to enable accounts.
            </div>
          )}
          {error && <div className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm leading-relaxed text-red-200">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm text-white/70">
              New password
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20"
                placeholder="At least 8 characters"
              />
            </label>
            <label className="block text-sm text-white/70">
              Confirm new password
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20"
                placeholder="Repeat your password"
              />
            </label>
            <button disabled={busy || !configured} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
          <div className="mt-6 flex items-center gap-2 text-xs text-white/45">
            <ShieldCheck className="h-4 w-4 text-accent-400" />
            You&apos;ll be signed in after updating.
          </div>
        </>
      )}
    </div>
  );
}