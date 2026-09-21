"use client";

import { PageTransition } from "@/components/motion";

// Remounted by Next.js on every navigation — this is what makes each route
// change replay the page entrance animation.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
