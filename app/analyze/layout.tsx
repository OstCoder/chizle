import type { Metadata } from "next";

const URL = "https://chizle.app";
const OG = `${URL}/api/og`;

export const metadata: Metadata = {
  title: "Analyze a Photo",
  description:
    "Drop a front-facing photo and Chizle maps 468 facial landmarks, scores symmetry, ratios, posture, and expression, and returns prioritized fixes — entirely in your browser.",
  openGraph: {
    title: "Analyze a Photo — Chizle",
    description:
      "Drop a front-facing photo and Chizle maps 468 facial landmarks, scores symmetry, ratios, posture, and expression, and returns prioritized fixes — entirely in your browser.",
    images: [
      {
        url: `${OG}?title=Analyze+Your+Face&subtitle=468+landmarks%2C+symmetry+scores%2C+and+personalized+fixes+%E2%80%94+all+on-device.&tag=Scan&url=${encodeURIComponent(`${URL}/analyze`)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Analyze a Photo — Chizle",
    description:
      "Drop a front-facing photo and Chizle maps 468 facial landmarks, scores symmetry, ratios, posture, and expression — entirely in your browser.",
    images: [
      {
        url: `${OG}?title=Analyze+Your+Face&subtitle=468+landmarks%2C+symmetry+scores%2C+and+personalized+fixes+%E2%80%94+all+on-device.&tag=Scan`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
