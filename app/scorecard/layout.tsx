import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dating Profile Scorecard — Chizle",
  description:
    "Get a 1–10 score across approachability, photo quality, and style for the photo you're considering, plus a verdict on using it as primary or secondary.",
};

export default function ScorecardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
