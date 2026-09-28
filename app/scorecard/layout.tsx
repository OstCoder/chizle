import type { Metadata } from "next";

const URL = "https://chizle.app";
const OG = `${URL}/api/og`;

export const metadata: Metadata = {
  title: "Face Scorecard",
  description:
    "A dating-profile-style scorecard: overall face rating, approachability, photo quality, and style — scored from your latest scan.",
  openGraph: {
    title: "Face Scorecard — Chizle",
    description:
      "A dating-profile-style scorecard: overall face rating, approachability, photo quality, and style — scored from your latest scan.",
    images: [
      {
        url: `${OG}?title=Face+Scorecard&subtitle=Overall+rating%2C+approachability%2C+photo+quality%2C+and+style+scored+from+your+scan.&tag=Score`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Face Scorecard — Chizle",
    description:
      "A dating-profile-style scorecard: overall face rating, approachability, photo quality, and style.",
    images: [
      {
        url: `${OG}?title=Face+Scorecard&subtitle=Overall+rating%2C+approachability%2C+photo+quality%2C+and+style+scored+from+your+scan.&tag=Score`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function ScorecardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
