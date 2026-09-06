"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, Menu, ScanFace, X } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/grooming", label: "Grooming" },
  { href: "/fragrance", label: "Fragrance" },
  { href: "/habits", label: "Habits" },
  { href: "/analyze", label: "Analyze" },
  { href: "/compare", label: "Then vs Now" },
  { href: "/scorecard", label: "Scorecard" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    if (!isSupabaseConfigured()) return;
    await createClient().auth.signOut();
    setSignedIn(false);
    setOpen(false);
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500/15 text-accent-400">
            <ScanFace className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">Chizle</span>
        </Link>

        <nav className="hidden items-center gap-0.5 text-[13px] lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="btn-ghost">
              {item.label}
            </Link>
          ))}
          {signedIn ? (
            <button type="button" onClick={signOut} className="btn-ghost" title="Sign out">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <Link href="/auth" className="btn-primary">
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </nav>

        <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-white/5 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white">
                {item.label}
              </Link>
            ))}
            {signedIn ? (
              <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : (
              <Link href="/auth" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-accent-200 transition-colors hover:bg-accent-500/10">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
