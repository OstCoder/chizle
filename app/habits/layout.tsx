import type { Metadata } from "next";

const URL = "https://chizle.app";
const OG = `${URL}/api/og`;

export const metadata: Metadata = {
  title: "Fitness & Habits",
  description:
    "Facial fitness sculpt list, skincare AM/PM, a training plan built around your profile, hydration, and daily 30-second check-ins.",
  openGraph: {
    title: "Fitness & Habits — Chizle",
    description:
      "Facial fitness, skincare routine, a training plan built around your profile, hydration, and daily check-ins.",
    images: [
      {
        url: `${OG}?title=Fitness+%26+Habits&subtitle=Facial+fitness%2C+skincare%2C+training+plan%2C+hydration%2C+and+daily+check-ins.&tag=Habits`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fitness & Habits — Chizle",
    description:
      "Facial fitness, skincare routine, a training plan built around your profile, hydration, and daily check-ins.",
    images: [
      {
        url: `${OG}?title=Fitness+%26+Habits&subtitle=Facial+fitness%2C+skincare%2C+training+plan%2C+hydration%2C+and+daily+check-ins.&tag=Habits`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function HabitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
