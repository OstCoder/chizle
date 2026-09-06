"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

/** Standalone feature-page header with a back link to the dashboard. */
export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <div className="card animate-fade-up p-6 sm:p-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs font-medium text-white/40 transition-colors hover:text-white/75"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dashboard
      </Link>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
        {eyebrow}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/55">
        {subtitle}
      </p>
    </div>
  );
}