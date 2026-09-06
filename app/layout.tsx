import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chizle — Objective, Actionable Photo Feedback",
  description:
    "Upload a photo and get private, in-browser analysis of symmetry, ratios, posture, expression, and dating profile quality.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-10 text-sm text-white/40">
          <p>Chizle runs entirely in your browser. Your photos never leave your device.</p>
        </footer>
      </body>
    </html>
  );
}
