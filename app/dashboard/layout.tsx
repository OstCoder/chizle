import type { Metadata } from "next";

const URL = "https://chizle.app";
const OG = `${URL}/api/og`;

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your Chizle dashboard: latest scan score, daily routine checklist, streak tracker, and progress over time.",
  openGraph: {
    title: "Your Chizle Dashboard",
    description:
      "Your latest scan score, daily routine checklist, streak tracker, and progress over time.",
    images: [
      {
        url: `${OG}?title=Your+Glow-Up+Dashboard&subtitle=Scan+score%2C+daily+routine%2C+streak+tracker%2C+and+progress+over+time.&tag=Dashboard`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Chizle Dashboard",
    description:
      "Your latest scan score, daily routine checklist, streak tracker, and progress over time.",
    images: [
      {
        url: `${OG}?title=Your+Glow-Up+Dashboard&subtitle=Scan+score%2C+daily+routine%2C+streak+tracker%2C+and+progress+over+time.&tag=Dashboard`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
