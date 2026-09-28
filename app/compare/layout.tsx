import type { Metadata } from "next";

const URL = "https://chizle.app";
const OG = `${URL}/api/og`;

export const metadata: Metadata = {
  title: "Compare Progress",
  description:
    "Pick two scans from your history and drag the slider to see facial changes side by side — symmetry, jawline, posture, and expression deltas.",
  openGraph: {
    title: "Compare Progress — Chizle",
    description:
      "Pick two scans from your history and drag the slider to see facial changes side by side.",
    images: [
      {
        url: `${OG}?title=Before+vs.+Now&subtitle=Side-by-side+comparison+of+symmetry%2C+jawline%2C+posture+and+expression+deltas.&tag=Progress`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Compare Progress — Chizle",
    description:
      "Pick two scans and drag the slider to see facial changes side by side.",
    images: [
      {
        url: `${OG}?title=Before+vs.+Now&subtitle=Side-by-side+comparison+of+symmetry%2C+jawline%2C+posture+and+expression+deltas.&tag=Progress`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
