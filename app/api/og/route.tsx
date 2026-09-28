/**
 * Dynamic Open Graph image generator.
 *
 * Every route in the app builds its own ?title=...&subtitle=...&tag=... URL
 * pointing here; social crawlers (X/Twitter, Facebook, LinkedIn, WhatsApp)
 * fetch the URL, read the PNG bytes, and render the preview card.
 *
 * Dimensions follow the Open Graph spec: 1200 × 630 px.
 */

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const title = searchParams.get("title") ?? "Chizle";
  const subtitle =
    searchParams.get("subtitle") ??
    "Objective, actionable photo feedback — 100% on-device.";
  const tag = searchParams.get("tag") ?? "";

  // Inter (variable weight) — same font the app uses at runtime.
  const fontData = await fetch(
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-c2Q.woff2",
  ).then((r) => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "#08090d",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent gradient — matches the body radial in globals.css */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 260,
            background:
              "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(249,115,22,0.18), transparent 70%)",
          }}
        />

        {/* Corner viewfinder brackets — echoes the scan motif */}
        <svg
          width="120"
          height="96"
          viewBox="0 0 120 96"
          fill="none"
          style={{ position: "absolute", top: 48, right: 64 }}
        >
          <g
            stroke="#fb923c"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.55"
          >
            <path d="M8 20 V12a4 4 0 0 1 4-4H24" />
            <path d="M96 8h10a4 4 0 0 1 4 4v8" />
            <path d="M112 76v8a4 4 0 0 1-4 4H96" />
            <path d="M24 88H12a4 4 0 0 1-4-4v-8" />
          </g>
          <g fill="#fdba74" opacity="0.5">
            <circle cx="50" cy="38" r="2" />
            <circle cx="70" cy="38" r="2" />
            <circle cx="60" cy="48" r="1.6" />
            <circle cx="52" cy="58" r="1.6" />
            <circle cx="68" cy="58" r="1.6" />
          </g>
        </svg>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "64px 80px 0",
            position: "relative",
            zIndex: 1,
            flex: 1,
          }}
        >
          {/* Brand bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: "white",
              }}
            >
              CHIZLE
            </span>
            {tag && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "4px 14px",
                  borderRadius: 20,
                  background: "rgba(249,115,22,0.12)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  color: "#fdba74",
                }}
              >
                {tag}
              </span>
            )}
          </div>

          {/* Title */}
          <div
            style={{
              marginTop: 52,
              fontSize: 56,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.12,
              letterSpacing: "-0.025em",
              maxWidth: 820,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              marginTop: 18,
              fontSize: 22,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.45,
              maxWidth: 720,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 80px 36px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: "rgba(255,255,255,0.38)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.333A6.667 6.667 0 1 0 14.667 8 6.674 6.674 0 0 0 8 1.333Zm0 12.16a5.5 5.5 0 1 1 5.5-5.5 5.506 5.506 0 0 1-5.5 5.5Z"
                fill="rgba(255,255,255,0.38)"
              />
              <path
                d="M10.667 8A2.667 2.667 0 1 1 8 5.333 2.669 2.669 0 0 1 10.667 8Zm-1.334 0A1.333 1.333 0 1 0 8 9.333 1.335 1.335 0 0 0 9.333 8Z"
                fill="rgba(255,255,255,0.38)"
              />
            </svg>
            100% On-Device &amp; Private
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.25)" }}>
            chizle.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Inter", data: fontData, style: "normal" }],
    },
  );
}
