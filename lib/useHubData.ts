"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { loadHistory, setStorageScope } from "./persistence";
import type { PersistedAnalysis } from "./persistence";
import { createClient, isSupabaseConfigured, resolveClientUser } from "./supabase/browser";

export interface ProfileRow {
  id: string;
  gender: string | null;
  age: number | null;
  height: number | null;
  height_unit: string | null;
  weight: number | null;
  weight_unit: string | null;
  hair_type: string | null;
  goals: string[] | null;
  onboarding_completed: boolean;
}

export interface HubData {
  user: User | null;
  profile: ProfileRow | null;
  entries: PersistedAnalysis[]; // newest first
  latest: PersistedAnalysis | null;
  ready: boolean;
  notConfigured: boolean;
}

/**
 * Shared data loading for the dashboard and its feature pages: resolves the
 * Supabase session, scopes persisted history to the account, and loads the
 * onboarding profile + scan history. All reads happen only after the scope is
 * set, so one account never sees another's data.
 */
export function useHubData(): HubData {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [entries, setEntries] = useState<PersistedAnalysis[]>([]);
  const [ready, setReady] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setNotConfigured(true);
      setReady(true);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let subscription: { unsubscribe(): void } | null = null;

    const stopWaiting = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      subscription?.unsubscribe();
      subscription = null;
    };

    const activate = async (currentUser: User) => {
      if (cancelled || settled) return;
      settled = true;
      stopWaiting();
      setStorageScope(currentUser.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle<ProfileRow>();
      if (cancelled) return;
      setUser(currentUser);
      setProfile((prof as ProfileRow | null) ?? null);
      setEntries(loadHistory("analyze"));
      setReady(true);
    };

    (async () => {
      // Local-session read (offline-tolerant): only a genuinely absent
      // session can mean "signed out" — see resolveClientUser.
      const currentUser = await resolveClientUser(supabase);
      if (cancelled) return;
      if (currentUser) {
        await activate(currentUser);
        return;
      }
      // No session *yet*: a fresh sign-in can still be settling when this
      // page mounts (cookie write / token refresh in flight). Give auth a
      // moment to announce a session before concluding the visitor is
      // signed out — the old immediate router.replace() is what threw new
      // accounts back to the login page while clicking around the hub.
      timer = setTimeout(() => {
        if (cancelled || settled) return;
        settled = true;
        stopWaiting();
        router.replace(`/auth?returnTo=${encodeURIComponent(pathname)}`);
      }, 1200);
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) void activate(session.user);
      });
      subscription = sub.subscription;
    })();

    return () => {
      cancelled = true;
      stopWaiting();
    };
  }, [router, pathname]);

  return {
    user,
    profile,
    entries,
    latest: entries[0] ?? null,
    ready,
    notConfigured,
  };
}