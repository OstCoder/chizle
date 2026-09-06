"use client";

import { ScanFace } from "lucide-react";

/**
 * Shown in place of analysis output when the uploaded photo is a side /
 * profile shot. FaceMesh geometry (ratios, symmetry) is only meaningful
 * front-on, so instead of producing misleading scores we explain why the
 * photo can't be analyzed and how to fix it.
 */
export function AngleGuard() {
  return (
    <div className="card animate-fade-up p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20">
          <ScanFace className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-white">
            Can&apos;t analyze photo due to angle
          </h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
            This photo was taken from the side. Chizle measures symmetry and
            facial thirds front-on, so a profile or three-quarter shot would
            give you made-up numbers — and we don&apos;t do that.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            Retake it facing the camera straight-on, with your whole face in
            frame and both eyes visible.
          </p>
        </div>
      </div>
    </div>
  );
}
