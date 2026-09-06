import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/grooming",
  "/fragrance",
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  const completed = profile?.onboarding_completed === true;

  if (isAuth || isHome) {
    const destination = completed ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isProtected && !completed) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isOnboarding && completed && request.nextUrl.searchParams.get("edit") !== "true") {
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
    "/fragrance/:path*",
    "/habits/:path*",
    "/analyze/:path*",
    "/compare/:path*",
    "/scorecard/:path*",
  ],
};
