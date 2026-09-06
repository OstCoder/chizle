"use client";

interface ScanPhotoProps {
  src: string;
  alt: string;
  className?: string;
}

const CORNERS = [
  "left-3 top-3 rounded-tl-xl border-l-2 border-t-2",
  "right-3 top-3 rounded-tr-xl border-r-2 border-t-2",
  "left-3 bottom-3 rounded-bl-xl border-b-2 border-l-2",
  "right-3 bottom-3 rounded-br-xl border-b-2 border-r-2",
];

const DOTS = [
  { style: { left: "38%", top: "30%" } },
  { style: { left: "61%", top: "33%" } },
  { style: { left: "47%", top: "52%" } },
  { style: { left: "31%", top: "62%" } },
  { style: { left: "67%", top: "58%" } },
  { style: { left: "49%", top: "74%" } },
];

/**
 * Latest analyzed photo with a subtle scan line, corner brackets, and
 * decorative facial-mapping dots. Purely presentational — the dots are a
 * design cue, not a claim about detected landmarks.
 */
export function ScanPhoto({ src, alt, className }: ScanPhotoProps) {
  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-ink-800 ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
      />
      {/* Soft legibility gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

      {/* Animated scan line */}
      <div className="pointer-events-none absolute inset-x-2 top-0 h-[2px] animate-scan rounded-full bg-gradient-to-r from-transparent via-accent-400/80 to-transparent" />

      {/* Corner brackets */}
      {CORNERS.map((pos) => (
        <div
          key={pos}
          className={`pointer-events-none absolute h-6 w-6 border-white/80 ${pos}`}
        />
      ))}

      {/* Symmetry guide lines: vertical midline + facial-third guides */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/25" />
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/15" />
      <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/15" />

      {/* Decorative facial-mapping dots */}
      {DOTS.map((dot, i) => (
        <span
          key={i}
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-accent-400/90 ring-2 ring-black/30"
          style={dot.style}
        />
      ))}
    </div>
  );
}