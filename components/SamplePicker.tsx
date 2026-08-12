"use client";

import { useCallback, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { imageToImageData, loadImageFromUrl } from "@/lib/imageData";

export interface SamplePhoto {
  id: string;
  src: string;
  label: string;
  hint?: string;
}

interface SamplePickerProps {
  samples: SamplePhoto[];
  onSample: (
    imageData: ImageData,
    img: HTMLImageElement,
    sample: SamplePhoto,
  ) => void;
  /** Optional action label when a sample is loaded into a specific slot. */
  slotLabel?: string;
}

/**
 * "No photo handy?" picker. Loads a bundled sample through the exact same
 * client-side pipeline as the uploader (data URL -> Image -> ImageData) so
 * the sample behaves identically to a user-uploaded photo.
 */
export function SamplePicker({
  samples,
  onSample,
  slotLabel,
}: SamplePickerProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(
    async (sample: SamplePhoto) => {
      setBusyId(sample.id);
      setError(null);
      try {
        const img = await loadImageFromUrl(sample.src);
        const imageData = imageToImageData(img);
        onSample(imageData, img, sample);
      } catch (err) {
        console.error(err);
        setError("Could not load the sample photo. Please upload your own.");
      } finally {
        setBusyId(null);
      }
    },
    [onSample],
  );

  return (
    <div className="card p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/45">
        <Sparkles className="h-3.5 w-3.5 text-accent-400" />
        No photo handy? Try a sample
      </p>
      <div className="grid grid-cols-2 gap-2">
        {samples.map((sample) => {
          const busy = busyId === sample.id;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => pick(sample)}
              disabled={busyId !== null}
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] text-left transition-all hover:border-white/15 hover:bg-white/[0.04] disabled:cursor-wait disabled:opacity-70"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample.src}
                alt={sample.label}
                className="h-20 w-full object-cover"
              />
              <div className="p-2.5">
                <p className="text-xs font-medium text-white/80">
                  {sample.label}
                </p>
                {sample.hint && (
                  <p className="mt-0.5 text-[10px] leading-snug text-white/40">
                    {sample.hint}
                  </p>
                )}
                {slotLabel && !busy && (
                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-accent-300/80 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    {slotLabel}
                  </p>
                )}
              </div>
              {busy && (
                <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-accent-300" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
