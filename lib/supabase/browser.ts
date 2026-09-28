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
 * getUser() validates against the auth server, so on an offline or flaky
 * connection it reports "no user" (or rejects) even though a perfectly valid
 * local session exists — which would bounce a just-signed-in dashboard
 * straight back to /auth until a refresh. Start from the locally stored
 * session instead and prefer the server's answer only when it has one; a
 * failed *validation* must never downgrade a present session to "signed out".
 * Middleware keeps re-validating the session on every real navigation once
 * connectivity returns, so this is scoping UX, not an auth decision.
 */
export async function resolveClientUser(
  client: SupabaseClient = createClient(),
): Promise<User | null> {
  // Local-only read: survives an unreachable auth server.
  let local: User | null = null;
  try {
    const { data } = await client.auth.getSession();
    local = data.session?.user ?? null;
  } catch {
    local = null;
  }
  if (!local) return null;

  // Validate against the server, but fall back to the local session when
  // validation fails — only a genuinely absent session means "signed out".
  try {
    const { data: validated } = await client.auth.getUser();
    return validated.user ?? local;
  } catch {
    return local;
  }
}
