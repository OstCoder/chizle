"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Custom "face under a scanner" graphic: corner viewfinder brackets, a face
 * silhouette with landmark dots, and a scan line sweeping through. Purely
 * decorative — SVG + one CSS-animated line, no images to load.
 */
function FaceScanGraphic() {
  return (
    <div
      aria-hidden="true"
      className="relative grid h-32 w-36 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
    >
      <svg viewBox="0 0 120 96" className="h-full w-full p-2">
        {/* Corner viewfinder brackets */}
        <g
          stroke="#fb923c"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        >
          <path d="M10 22 V12 a4 4 0 0 1 4 -4 H24" />
          <path d="M96 8 H106 a4 4 0 0 1 4 4 V22" />
          <path d="M110 74 V84 a4 4 0 0 1 -4 4 H96" />
          <path d="M24 88 H14 a4 4 0 0 1 -4 -4 V74" />
        </g>
        {/* Face silhouette */}
        <ellipse
          cx="60"
          cy="50"
          rx="17"
          ry="22"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Landmark dots */}
        <g fill="#fdba74">
          <circle cx="52.5" cy="44" r="1.7" opacity="0.85" />
          <circle cx="67.5" cy="44" r="1.7" opacity="0.85" />
          <circle cx="60" cy="52" r="1.4" opacity="0.65" />
          <circle cx="53.5" cy="60" r="1.4" opacity="0.65" />
          <circle cx="66.5" cy="60" r="1.4" opacity="0.65" />
          <circle cx="60" cy="68" r="1.4" opacity="0.65" />
        </g>
        {/* Center guide */}
        <line
          x1="60"
          y1="16"
          x2="60"
          y2="84"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      </svg>
      {/* Sweeping scan line */}
      <span className="animate-scan absolute left-3 right-3 h-px rounded-full bg-gradient-to-r from-transparent via-accent-400 to-transparent shadow-[0_0_12px_rgba(249,115,22,0.7)]" />
    </div>
  );
}

interface EmptyStateCardProps {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  /** Route the CTA navigates to. */
  ctaHref: string;
  /** Optional extra action on CTA press (e.g. open the file picker). */
  onCtaClick?: () => void;
  /** Where the user is in the journey — the active chip lights up. */
  steps?: string[];
  activeStep?: number;
  footnote?: string;
  /** Small status line under the CTA (e.g. "warming up the detector…"). */
  statusNote?: string;
  className?: string;
}

const DEFAULT_STEPS = ["Scan", "Routine", "Glow-up"];

/**
 * First-run empty state: a custom scan graphic, a three-step journey tracker
 * so users always know what comes next, and one primary CTA that takes them
 * straight into the next action.
 */
export function EmptyStateCard({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  onCtaClick,
  steps = DEFAULT_STEPS,
  activeStep = 0,
  footnote = "Runs on-device — your photo never leaves the browser.",
  statusNote,
  className,
}: EmptyStateCardProps) {
  return (
    <section className={cn("card animate-fade-up overflow-hidden p-6", className)}>
      <div className="grid items-center gap-6 sm:grid-cols-[auto,1fr]">
        <div className="mx-auto">
          <FaceScanGraphic />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-300">
            {eyebrow}
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {title}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55 sm:mx-0">
            {body}
          </p>

          {/* Journey tracker — step 1 is lit, later steps stay dim */}
          <ol className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            {steps.map((label, i) => (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  i === activeStep
                    ? "border-accent-400/30 bg-accent-500/10 text-accent-200"
                    : "border-white/10 text-white/40",
                )}
              >
                <span className="font-mono">{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
            {onCtaClick ? (
              <button type="button" onClick={onCtaClick} className="btn-primary">
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link href={ctaHref} className="btn-primary">
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          {statusNote && (
            <p className="mt-2.5 text-xs text-accent-300">{statusNote}</p>
          )}
          {footnote && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/40 sm:justify-start">
              <ShieldCheck className="h-3.5 w-3.5" />
              {footnote}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

interface MiniNudgeProps {
  icon: ReactNode;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}

/**
 * Compact inline nudge for feature cards that light up once a scan exists —
 * one-line pitch plus a direct CTA into the scan flow.
 */
export function MiniNudge({
  icon,
  title,
  body,
  ctaLabel,
  ctaHref,
  className,
}: MiniNudgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-accent-400/20 bg-accent-500/[0.05] px-4 py-3.5",
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-500/15 text-accent-300 ring-1 ring-accent-400/25">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/50">{body}</p>
      </div>
      <Link href={ctaHref} className="btn-primary shrink-0 !px-3.5 !py-2 text-xs">
        {ctaLabel}
      </Link>
    </div>
  );
}
