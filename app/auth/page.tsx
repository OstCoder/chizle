"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, ScanFace, ShieldCheck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser";

function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = useMemo(() => isSupabaseConfigured(), []);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(returnTo);
    });
  }, [configured, returnTo, router]);

  async function handleForgotPassword() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!configured) throw new Error("Supabase environment keys are not configured yet.");
      if (!email) throw new Error("Enter your email address first.");
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });
      if (resetError) throw resetError;
      setMessage("If an account exists for that email, a password reset link is on its way.");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (!configured) throw new Error("Supabase environment keys are not configured yet.");
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.replace("/onboarding");
        } else {
          setMessage("Check your email to confirm your account, then return here to continue.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.replace(returnTo);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.85fr,1.15fr] lg:items-center">
      <section className="hidden lg:block">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-500/15 text-accent-300">
          <ScanFace className="h-6 w-6" />
        </span>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-accent-300">Private by design</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Build a better read on yourself.</h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-white/55">
          Create your Chizle profile once. Your answers make every analysis more relevant while your photos stay on your device.
        </p>
        <div className="mt-8 flex items-center gap-2 text-sm text-white/45">
          <ShieldCheck className="h-4 w-4 text-accent-400" />
          Your profile is protected by Supabase auth and row-level security.
        </div>
      </section>

      <section className="card mx-auto w-full max-w-md p-6 sm:p-8">
        <div className="mb-7 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-accent-500 text-white" : "text-white/50 hover:text-white"}`}>Create account</button>
          <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === "login" ? "bg-accent-500 text-white" : "text-white/50 hover:text-white"}`}>Log in</button>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{mode === "signup" ? "Start your profile" : "Welcome back"}</h2>
        <p className="mt-1.5 text-sm text-white/50">{mode === "signup" ? "A few quick questions are waiting after you sign up." : "Continue to your analyzer."}</p>

        {!configured && <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100">Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Settings → Environment to enable accounts.</div>}
        {message && <div className="mt-5 rounded-xl border border-accent-400/25 bg-accent-400/10 p-3 text-sm leading-relaxed text-accent-100">{message}</div>}
        {error && <div className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm leading-relaxed text-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-white/70">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20" placeholder="you@example.com" /></label>
          <label className="block text-sm text-white/70">Password<input required minLength={8} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-white outline-none transition focus:border-accent-400/60 focus:ring-2 focus:ring-accent-500/20" placeholder="At least 8 characters" /></label>
          {mode === "login" && (
            <div className="-mt-2 flex justify-end">
              <button type="button" onClick={handleForgotPassword} disabled={busy} className="text-xs font-medium text-accent-300 transition hover:text-accent-200 disabled:opacity-50">
                Forgot password?
              </button>
            </div>
          )}
          <button disabled={busy || !configured} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{busy ? "Working…" : mode === "signup" ? "Create account" : "Log in"}</button>
        </form>
        <p className="mt-6 text-center text-xs leading-relaxed text-white/35">By continuing, you agree to use Chizle for practical feedback, not medical or professional advice.</p>
        <Link href="/" className="mt-5 block text-center text-sm text-white/45 transition hover:text-white">Back to Chizle</Link>
      </section>
    </div>
  );
}

function AuthLoading() {
  return <div className="card mx-auto h-[520px] w-full max-w-md animate-pulse bg-white/[0.03]" aria-label="Loading authentication" />;
}
