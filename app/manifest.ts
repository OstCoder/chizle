import type { MetadataRoute } from "next";

// Web app manifest — Next.js serves this at /manifest.webmanifest and adds
// the <link rel="manifest"> automatically. start_url points at the dashboard
// so an installed icon opens the product directly (middleware handles the
// signed-out case by bouncing to /auth with a returnTo).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chizle — Objective, Actionable Photo Feedback",
    short_name: "Chizle",
    description:
      "Private, on-device face analysis with a daily grooming and self-improvement routine. Works offline.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#08090d",
    theme_color: "#08090d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
