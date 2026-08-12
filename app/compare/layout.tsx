import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Then vs Now — Chizle",
  description:
    "Compare two photos side by side and see measurable changes in symmetry, facial thirds, jawline, posture, expression, lighting, and your dating-profile score.",
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
