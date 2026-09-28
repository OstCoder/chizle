import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured.");
  }

  return createBrowserClient(url, key);
}

/**
 * Resolve the signed-in user for client-side gating and storage scoping.
 *
 * Reads the locally stored session only (no auth-API roundtrip): getUser()
 * validation could never change the answer — on an offline or rate-limited
 * connection it reports "no user" even though a perfectly valid local session
 * exists, and the old code already fell back to that session in every case.
 * Skipping it keeps each dashboard/feature mount free of network calls and
 * removes an entire class of "looks signed out until refresh" glitches.
 * Middleware still validates the session against the auth server on every
 * real navigation, so this is scoping UX, not an auth decision.
 */
export async function resolveClientUser(
  client: SupabaseClient = createClient(),
): Promise<User | null> {
  try {
    const { data } = await client.auth.getSession();
    return data.session?.user ?? null;
  } catch {
    return null;
  }
}
