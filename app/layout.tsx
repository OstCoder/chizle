import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { FirstRunTour } from "@/components/FirstRunTour";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppMotionConfig } from "@/components/motion";
import { themePreloadScript } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = "https://chizle.app";

export const metadata: Metadata = {
  title: {
    default: "Chizle — Objective, Actionable Photo Feedback",
    template: "%s — Chizle",
  },
  description:
    "Upload a photo and get private, in-browser analysis of symmetry, ratios, posture, expression, and dating profile quality.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  // Add-to-home-screen niceties for iOS (Android uses the manifest above).
  appleWebApp: {
    capable: true,
    title: "Chizle",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Chizle",
    title: "Chizle — Objective, Actionable Photo Feedback",
    description:
      "Upload a photo and get private, in-browser analysis of symmetry, ratios, posture, expression, and dating profile quality.",
    images: [
      {
        url: `${BASE_URL}/api/og?title=Chizle&subtitle=Objective%2C+actionable+photo+feedback+%E2%80%94+100%25+on-device.&tag=Face+Analysis`,
        width: 1200,
        height: 630,
        alt: "Chizle — AI face analysis that runs entirely in your browser",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chizle — Objective, Actionable Photo Feedback",
    description:
      "Upload a photo and get private, in-browser analysis of symmetry, ratios, posture, expression, and dating profile quality.",
    images: [
      {
        url: `${BASE_URL}/api/og?title=Chizle&subtitle=Objective%2C+actionable+photo+feedback+%E2%80%94+100%25+on-device.&tag=Face+Analysis`,
        width: 1200,
        height: 630,
        alt: "Chizle — AI face analysis that runs entirely in your browser",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      {/* Apply saved theme before first paint to prevent FOUC. */}
      <head>
        {/* Installed-PWA / browser chrome colors. Rendered here (not via the
            metadata API) so they belong to the layout: the ThemeToggle only
            ever updates their content in place and never detaches them —
            removing a Next/React-tracked <head> node crashes the next head
            commit with "Cannot read properties of null (reading
            'removeChild')" during navigation. */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#f5f5fa"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#08090d"
        />
        <script
          dangerouslySetInnerHTML={{ __html: themePreloadScript }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <AppMotionConfig>
          <SiteHeader />
          {/* One-shot 3-step product tour for first-time visitors (shows
              once per browser, on landing or dashboard). */}
          <FirstRunTour />
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-10 text-sm text-white/40">
            <p>Chizle runs entirely in your browser. Your photos never leave your device.</p>
          </footer>
        </AppMotionConfig>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
