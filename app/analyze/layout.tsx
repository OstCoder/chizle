import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyze a Photo — Chizle",
  description:
    "Upload a photo and get an in-browser breakdown of face shape, symmetry, facial ratios, posture, expression, hair, and prioritized weakspots ordered from immediate fixes to long-term habits.",
};

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
