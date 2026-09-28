"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [entries, setEntries] = useState<PersistedAnalysis[]>([]);
  const [ready, setReady] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured()) {
        setNotConfigured(true);
        setReady(true);
        return;
      }
      const supabase = createClient();
      // Offline-tolerant: getUser() alone reports "no user" whenever the
      // auth server is unreachable, which would bounce a service-worker-
      // cached offline dashboard straight to /auth.
      const currentUser = await resolveClientUser(supabase);
      if (cancelled) return;
      if (!currentUser) {
        router.replace("/auth?returnTo=/dashboard");
        return;
      }
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
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return {
    user,
    profile,
    entries,
    latest: entries[0] ?? null,
    ready,
    notConfigured,
  };
}