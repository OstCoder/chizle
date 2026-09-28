"use client";

import Link from "next/link";
import { LayoutDashboard, RefreshCw, WifiOff } from "lucide-react";

/**
 * Shown by the service worker (via /offline) when a page has no cached
 * copy and the network is unreachable. Reassures the user that locally
 * stored data (photos, scans, habit logs) is untouched.
 */
export function OfflineFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-500/10 ring-1 ring-accent-500/25">
        <WifiOff className="h-8 w-8 text-accent-300" />
      </span>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-white/55">
          No connection right now — but Chizle keeps working. Pages
          you&apos;ve opened (dashboard, habit checklists, grooming guides)
          are saved on this device, and everything you log is stored locally
          as usual.
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link href="/dashboard" className="btn-secondary">
          <LayoutDashboard className="h-4 w-4" />
          Open dashboard
        </Link>
      </div>
      <p className="max-w-sm text-xs leading-relaxed text-white/35">
        Photos and scan history never leave this device — going offline never
        puts them at risk.
      </p>
    </div>
  );
}
