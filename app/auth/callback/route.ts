import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/onboarding";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Prefer forwarded headers: behind the hosting proxy the raw Host header is
  // rewritten to the internal address (localhost:3000), so requestUrl.origin
  // would bounce the freshly confirmed account to a URL their browser can't
  // reach. X-Forwarded-Host/Proto carry the real public origin instead; fall
  // back to requestUrl.origin when no proxy headers exist (plain `next dev`).
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  // Proxy headers can be comma-joined lists — the first value is the client-
  // facing origin.
  const host =
    (forwardedHost ?? request.headers.get("host"))?.split(",")[0].trim() || null;
  const proto =
    (forwardedProto ?? requestUrl.protocol.replace(":", ""))
      .split(",")[0]
      .trim();
  const origin = host ? `${proto}://${host}` : requestUrl.origin;

  return NextResponse.redirect(new URL(next, origin));
}
