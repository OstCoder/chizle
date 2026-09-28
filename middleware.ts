import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/grooming",
  "/habits",
  "/analyze",
  "/compare",
  "/scorecard",
];

/**
 * True when a getUser() failure is an *infrastructure* problem — the auth API
 * was unreachable, rate-limited (429), or returned a 5xx — rather than a
 * definitive rejection of the session. Only a definitive rejection may read as
 * "signed out"; a failed validation must never 307 a perfectly good session
 * back to /auth (that is exactly what threw freshly signed-in accounts back
 * to the login page on every in-app navigation until they refreshed).
 */
function isRetryableAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; status?: number };
  // AuthRetryableFetchError — auth-js's own "safe to retry" classification.
  if (typeof e.name === "string" && e.name.includes("Retryable")) return true;
  // fetch() network failure (TypeError: fetch failed).
  if (e.name === "TypeError") return true;
  return (
    typeof e.status === "number" && (e.status === 0 || e.status === 429 || e.status >= 500)
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validate against the auth API, but distinguish "session rejected" from
  // "validation failed": on a retryable failure the request still carries a
  // session cookie, so fall back to it for routing and let the client
  // re-validate. Only a definitively absent/rejected session redirects.
  let user: { id: string } | null = null;
  let userError: unknown = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    userError = result.error;
  } catch (err) {
    userError = err;
  }
  if (!user && isRetryableAuthError(userError)) {
    try {
      const { data } = await supabase.auth.getSession();
      user = data.session?.user ?? null;
    } catch {
      user = null;
    }
  }

  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAuth = pathname === "/auth";
  const isOnboarding = pathname === "/onboarding";
  const isHome = pathname === "/";

  if (!user && (isProtected || isOnboarding)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!user) return response;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  // Tri-state: a failed profile read (flaky network / RLS hiccup) is *unknown*,
  // not "not onboarded". Treating an error as false used to ping-pong a
  // completed account between /onboarding and /dashboard on transient failures.
  const completed = profileError ? null : profile?.onboarding_completed === true;

  if (isAuth || isHome) {
    const destination = completed === false ? "/onboarding" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isProtected && completed === false) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isOnboarding && completed === true && request.nextUrl.searchParams.get("edit") !== "true") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/auth",
    "/onboarding",
    "/dashboard",
    "/grooming/:path*",
    "/habits/:path*",
    "/analyze/:path*",
    "/compare/:path*",
    "/scorecard/:path*",
  ],
};
