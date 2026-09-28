import type { Metadata } from "next";
import { OfflineFallback } from "@/components/OfflineFallback";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

// Served from the page cache by the service worker when a navigation has
// neither network nor a cached copy (see public/sw.js).
export default function OfflinePage() {
  return <OfflineFallback />;
}
