import type { Metadata } from "next";

const URL = "https://chizle.app";
const OG = `${URL}/api/og`;

export const metadata: Metadata = {
  title: "Grooming & Style",
  description:
    "Haircuts matched to your face shape, a daily product regimen, ingredient safety, and your scent of the day — the fastest visible upgrade.",
  openGraph: {
    title: "Grooming & Style — Chizle",
    description:
      "Haircuts matched to your face shape, a daily product regimen, ingredient safety, and your scent of the day.",
    images: [
      {
        url: `${OG}?title=Grooming+%26+Style&subtitle=Haircuts+matched+to+your+face+shape%2C+product+regimen%2C+ingredient+guidance%2C+and+scent.&tag=Grooming`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Grooming & Style — Chizle",
    description:
      "Haircuts matched to your face shape, a daily product regimen, ingredient safety, and your scent of the day.",
    images: [
      {
        url: `${OG}?title=Grooming+%26+Style&subtitle=Haircuts+matched+to+your+face+shape%2C+product+regimen%2C+ingredient+guidance%2C+and+scent.&tag=Grooming`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function GroomingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
