"use client";

import type { FaceShape, HairProfile } from "@/types/analysis";
import { Scissors, Sparkles, EyeOff } from "lucide-react";
import { HAIR_COLOR_LABEL, hairStyleAdvice, hairTextureLabel } from "@/lib/hair";
import { formatHairAdvice } from "@/lib/share";
import { cap } from "@/lib/utils";
import { CopyButton } from "./CopyButton";

interface HairCardProps {
  shape: FaceShape;
  hair: HairProfile;
}

export function HairCard({ shape, hair }: HairCardProps) {
  const styles = hairStyleAdvice(shape, hair);

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Scissors className="h-4 w-4 text-accent-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
          Hair &amp; Style
        </h2>
        <CopyButton
          text={formatHairAdvice(shape, hair)}
          label="Copy hair advice"
          className="ml-auto"
        />
      </div>

      {hair.visible ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-white/5 text-white/75">
              <Sparkles className="h-3.5 w-3.5 text-accent-300" />
              {HAIR_COLOR_LABEL[hair.color]}
            </span>
            <span className="chip bg-white/5 text-white/75">
              <Sparkles className="h-3.5 w-3.5 text-accent-300" />
              {hairTextureLabel(hair)}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/35">
              approximate read
            </span>
          </div>
          <p className="mt-2 text-xs text-white/45">
            Sampled from the pixels above your hairline — color and texture are
            estimates, not a trichology report.
            {(hair.confidence < 0.5 || (hair.textureConfidence ?? 1) < 0.45) &&
              " The read is a rough estimate, so treat the texture as approximate."}
          </p>
        </>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
          <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
          <p className="text-xs leading-relaxed text-white/55">
            Hair isn&apos;t clearly visible in this shot (pulled back, covered,
            or cropped), so style advice is based on your {shape} face shape
            alone. Re-shoot with your hairline in frame for a texture read.
          </p>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
          {cap(shape)} face{styles.length > 0 ? " — styles that work" : ""}
        </p>
        <ul className="space-y-1.5 text-sm leading-relaxed text-white/80">
          {styles.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-400" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
