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

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  /**
   * Redirect, carrying any cookies the session work below accumulated on
   * `response` (a token refresh inside getUser()/getSession() rotates the
   * refresh token and records the new pair via setAll).
   *
   * Dropping them on a redirect — which is exactly what building a fresh
   * NextResponse.redirect() did — leaves the browser holding a refresh
   * token the server has already consumed. Supabase refresh tokens are
   * single-use, so the next navigation's validation fails *definitively*
   * (status 400 "Invalid Refresh Token"), the cookie fallback below finds
   * nothing usable, and the user is 307'd back to /auth: the "click a tab
   * and get sent to login" bug. Every redirect must therefore inherit the
   * refreshed cookies.
   */
  const redirectWithCookies = (destination: URL) => {
    const redirectResponse = NextResponse.redirect(destination);
    // ResponseCookies entries are flat ({name, value, path, expires, ...});
    // the set() overload accepts the whole object as-is.
    response.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie),
    );
    return redirectResponse;
  };

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

  // Validate against the auth API, but never let a failed *lookup* read as
  // "signed out": whenever getUser() can't produce a user for any reason —
  // flaky network, rate limit, transient auth-API error — fall back to the
  // session cookie the request already carries and let the client
  // re-validate. Middleware only gates *routing* here; real data access is
  // enforced by RLS on every query, so the conservative failure mode is
  // "render the page and let the client sort it out", never "307 a good
  // session back to the login page".
  let user: { id: string } | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }
  if (!user) {
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
    return redirectWithCookies(loginUrl);
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
    return redirectWithCookies(new URL(destination, request.url));
  }

  if (isProtected && completed === false) {
    return redirectWithCookies(new URL("/onboarding", request.url));
  }

  if (isOnboarding && completed === true && request.nextUrl.searchParams.get("edit") !== "true") {
    return redirectWithCookies(new URL("/dashboard", request.url));
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
